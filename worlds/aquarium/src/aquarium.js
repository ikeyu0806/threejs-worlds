import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { disposeModelTree } from "../../../shared/models.js";

export const viewpoints = [
  {
    id: "front",
    label: "正面から",
    number: "01",
    position: [0, 1.65, 16.8],
    target: [0, 3.9, -8],
  },
  {
    id: "near",
    label: "水槽のそばへ",
    number: "02",
    position: [-3.8, 1.65, 5.8],
    target: [-1.4, 4.5, -8],
  },
  {
    id: "side",
    label: "右側から",
    number: "03",
    position: [8, 1.65, 6.5],
    target: [-1, 4.3, -9],
  },
];

// Integrate only the submerged sightline, keeping the viewing room free of fog.
function waterMaterial(material, time, swimming = false) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.waterTime = time;
    shader.vertexShader = `uniform float waterTime; varying vec3 vWaterWorld;\n${shader.vertexShader}`;
    if (swimming) {
      // All anatomical parts share baked local coordinates. Lateral movement and
      // the normal's rotation grow toward the tail, leaving the head almost still.
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <beginnormal_vertex>",
          `
        #include <beginnormal_vertex>
        float amountN = clamp((position.x+2.4)/6.6,0.,1.);
        float phaseN = waterTime*1.28-position.x*.78;
        float slope = .62*(2.*amountN/6.6*sin(phaseN)-amountN*amountN*.78*cos(phaseN));
        float angleN = atan(slope);
        objectNormal.xz = mat2(cos(angleN),sin(angleN),-sin(angleN),cos(angleN))*objectNormal.xz;
      `,
        )
        .replace(
          "#include <begin_vertex>",
          `
        #include <begin_vertex>
        float amount = clamp((position.x+2.4)/6.6,0.,1.);
        transformed.z += sin(waterTime*1.28-position.x*.78)*amount*amount*.62;
      `,
        );
    }
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      `
      #include <project_vertex>
      vWaterWorld = (modelMatrix*vec4(transformed,1.)).xyz;
    `,
    );
    shader.fragmentShader = `uniform float waterTime; varying vec3 vWaterWorld;\n${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `
      float submergedDistance = length(vWaterWorld-cameraPosition);
      float entry = clamp(cameraPosition.z / max(.001, cameraPosition.z-vWaterWorld.z),0.,1.);
      submergedDistance *= 1.-entry;
      vec3 transmittance = exp(-vec3(.095,.028,.019)*submergedDistance);
      outgoingLight = outgoingLight*transmittance + vec3(.009,.105,.16)*(1.-transmittance);
      vec2 c = vWaterWorld.xz*.95;
      float a = sin(c.x+sin(c.y*1.31+waterTime*.19)*1.7+waterTime*.12);
      float b = sin(c.y+sin(c.x*.93-waterTime*.15)*1.9);
      float caustic = pow(max(0.,1.-abs(a*.5+b*.5)),18.);
      outgoingLight += diffuseColor.rgb*caustic*.15*max(0.,normal.y);
      #include <opaque_fragment>
    `,
    );
  };
  material.customProgramCacheKey = () =>
    swimming ? "kuroshio-swim-2" : "kuroshio-water-2";
}
function box(scene, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  scene.add(mesh);
  return mesh;
}
const planeVertex =
  "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}";

export async function createAquarium(
  container,
  { onError, onProgress, reducedMotion = false },
) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#060b10");
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  container.append(canvas);
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    "暗い観覧室から見上げる青い大水槽。白い斑点のあるジンベエザメがゆっくり回遊しています。ドラッグで見回し、スクロールで拡大できます。",
  );
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.enablePan = false;
  controls.rotateSpeed = 0.25;
  controls.zoomSpeed = 0.55;
  controls.minDistance = 12;
  controls.maxDistance = 36;
  controls.minAzimuthAngle = -0.42;
  controls.maxAzimuthAngle = 0.52;
  controls.minPolarAngle = 1.45;
  controls.maxPolarAngle = 1.86;
  const destination = new THREE.Vector3(),
    focus = new THREE.Vector3();
  let travelling = false,
    paused = reducedMotion,
    disposed = false,
    last = 0,
    time = 0;
  let lost = false,
    dirty = true;
  let follow = true;
  const clock = { value: 0 },
    cleanups = [];
  const listen = (target, name, handler, options) => {
    target.addEventListener(name, handler, options);
    cleanups.push(() => target.removeEventListener(name, handler, options));
  };
  function dispose() {
    if (disposed) return;
    disposed = true;
    renderer.setAnimationLoop(null);
    for (const cleanup of cleanups) cleanup();
    controls.dispose();
    disposeModelTree(scene);
    renderer.dispose();
    canvas.remove();
  }
  const environmentScene = new RoomEnvironment(),
    pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(environmentScene, 0.12);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.34;
  environmentScene.dispose();
  pmrem.dispose();
  cleanups.push(() => environment.dispose());
  scene.add(new THREE.HemisphereLight("#9cc8d7", "#102b36", 0.72));
  const sunlight = new THREE.DirectionalLight("#d0f2f5", 2.2);
  sunlight.position.set(-8, 15, -2);
  scene.add(sunlight);
  const rim = new THREE.DirectionalLight("#379dcc", 1.5);
  rim.position.set(5, 7, -20);
  scene.add(rim);
  const front = new THREE.DirectionalLight("#70bdcc", 0.45);
  front.position.set(-3, 3, 5);
  scene.add(front);
  const wall = new THREE.MeshStandardMaterial({
    color: "#0c1115",
    roughness: 0.93,
  });
  const edge = new THREE.MeshStandardMaterial({
    color: "#182326",
    roughness: 0.52,
    metalness: 0.28,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: "#314348",
    roughness: 0.32,
    metalness: 0.65,
  });
  // 22.5 × 8.2 metre viewing aperture; 60 cm deep acrylic reveals.
  box(scene, [28, 2.4, 1.3], [0, 10.05, -0.1], wall);
  box(scene, [28, 0.55, 1.45], [0, 0.14, -0.1], wall);
  for (const side of [-1, 1]) {
    box(scene, [4, 12, 2.1], [side * 13.25, 4, 0.1], wall);
    box(scene, [0.19, 8.5, 0.64], [side * 11.25, 4.55, 0.14], edge);
    box(scene, [0.035, 8.35, 0.04], [side * 11.11, 4.55, 0.48], trim);
  }
  box(scene, [22.5, 0.18, 0.64], [0, 8.73, 0.14], edge);
  box(scene, [22.5, 0.19, 0.64], [0, 0.45, 0.14], edge);
  box(scene, [22.5, 0.035, 0.035], [0, 0.57, 0.48], trim);
  const roomFloor = new THREE.MeshStandardMaterial({
    color: "#101a20",
    roughness: 0.48,
    metalness: 0.16,
  });
  box(scene, [52, 0.18, 38], [0, -0.2, 17], roomFloor);
  const reflected = new Reflector(new THREE.PlaneGeometry(42, 24), {
    textureWidth: 768,
    textureHeight: 512,
    color: 0x1a242a,
    multisample: 0,
  });
  reflected.rotation.x = -Math.PI / 2;
  reflected.position.set(0, -0.099, 12.5);
  reflected.material.fragmentShader = reflected.material.fragmentShader.replace(
    "vec4 base = texture2DProj( tDiffuse, vUv );",
    `
    vec2 uv = vUv.xy/vUv.w;vec4 base = vec4(0.);
    for(int x=-2;x<=2;x++) for(int y=-2;y<=2;y++) base += texture2D(tDiffuse,uv+vec2(float(x),float(y))*.004)/25.;
    base.rgb *= .32;
  `,
  );
  scene.add(reflected);
  cleanups.push(() => reflected.dispose());
  const seam = new THREE.MeshBasicMaterial({ color: "#1b282d" });
  for (let x = -24; x <= 24; x += 3)
    box(scene, [0.008, 0.002, 28], [x, -0.091, 14], seam);
  for (let z = 3; z <= 24; z += 3)
    box(scene, [48, 0.002, 0.008], [0, -0.09, z], seam);
  for (const x of [-9, -6, 6, 9])
    box(scene, [0.045, 0.78, 0.045], [x, 0.3, 2.1], trim);
  for (const x of [-7.5, 7.5])
    box(scene, [3.4, 0.055, 0.07], [x, 0.7, 2.1], trim);
  const backdropMaterial = new THREE.ShaderMaterial({
    uniforms: { waterTime: clock },
    vertexShader: planeVertex,
    fragmentShader: `varying vec2 vUv; uniform float waterTime;void main(){
      vec3 c=mix(vec3(.004,.029,.060),vec3(.013,.15,.235),pow(vUv.y,1.1));
      float broad=exp(-pow((vUv.x-.39-vUv.y*.075)*3.6,2.));c+=vec3(.005,.063,.077)*broad*vUv.y;
      float ray=pow(max(0.,sin(vUv.x*73.+sin(vUv.x*143.)*.8+vUv.y*2.+sin(waterTime*.12)*.2)),18.);
      c+=vec3(.016,.07,.09)*ray*pow(vUv.y,2.)*.12;gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const backGeometry = new THREE.PlaneGeometry(60, 14, 120, 1);
  const bp = backGeometry.attributes.position;
  for (let i = 0; i < bp.count; i++)
    bp.setZ(i, Math.pow(Math.abs(bp.getX(i)) / 30, 4) * 28);
  const back = new THREE.Mesh(backGeometry, backdropMaterial);
  back.position.set(0, 6.8, -27);
  scene.add(back);

  const sandMaterial = new THREE.MeshStandardMaterial({
    color: "#485f60",
    roughness: 0.98,
  });
  waterMaterial(sandMaterial, clock);
  const sandGeometry = new THREE.PlaneGeometry(60, 28, 240, 140);
  sandGeometry.rotateX(-Math.PI / 2);
  const positions = sandGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      z = positions.getZ(i);
    positions.setY(
      i,
      0.012 * Math.sin(z * 12 + x * 0.8) +
        0.045 * Math.sin(x * 0.75 + z * 0.2) +
        0.016 * Math.sin(z * 3.1),
    );
  }
  sandGeometry.computeVertexNormals();
  const sand = new THREE.Mesh(sandGeometry, sandMaterial);
  sand.position.set(0, -0.02, -13.8);
  scene.add(sand);
  const surfaceMat = new THREE.ShaderMaterial({
    uniforms: { waterTime: clock },
    side: THREE.DoubleSide,
    vertexShader: planeVertex,
    fragmentShader: `varying vec2 vUv;uniform float waterTime;void main(){
      vec2 p=vUv*40.;float a=sin(p.x+sin(p.y*1.7+waterTime*.23)*1.4);float b=sin(p.y+sin(p.x*.8-waterTime*.19)*2.);
      float light=pow(1.-abs(a*.5+b*.5),10.);gl_FragColor=vec4(vec3(.013,.15,.235)+vec3(.009,.021,.026)*light,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(60, 28), surfaceMat);
  surface.rotation.x = Math.PI / 2;
  surface.position.set(0, 9.9, -13.8);
  scene.add(surface);
  const shaftMaterial = new THREE.ShaderMaterial({
    uniforms: { waterTime: clock },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: planeVertex,
    fragmentShader: `varying vec2 vUv;uniform float waterTime;void main(){
      float edge=pow(max(0.,1.-abs(vUv.x-.5)*2.),4.);float fade=smoothstep(0.,.7,vUv.y)*(1.-smoothstep(.95,1.,vUv.y));
      gl_FragColor=vec4(.23,.64,.74,edge*fade*.055*(.85+.15*sin(waterTime*.18+vUv.y*4.)));
    }`,
  });
  for (let i = 0; i < 11; i++) {
    const shaft = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6 + (i % 3), 12),
      shaftMaterial,
    );
    shaft.position.set(-14 + i * 2.8, 5.2, -6 - (i % 4) * 4);
    shaft.rotation.z = -0.18;
    scene.add(shaft);
  }
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#ebffff",
    transmission: 1,
    roughness: 0.009,
    thickness: 0.6,
    ior: 1.49,
    attenuationColor: new THREE.Color("#bde9e6"),
    attenuationDistance: 40,
    metalness: 0,
    envMapIntensity: 0,
    specularIntensity: 0.06,
    transparent: true,
    depthWrite: false,
  });
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(22.5, 8.2), glass);
  pane.position.set(0, 4.55, 0.3);
  pane.renderOrder = 5;
  scene.add(pane);
  const dustPositions = [];
  let seed = 71;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 420; i++)
    dustPositions.push(
      (random() - 0.5) * 32,
      random() * 9.7,
      -2 - random() * 23,
    );
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(dustPositions, 3),
  );
  const dustMat = new THREE.ShaderMaterial({
    uniforms: { waterTime: clock },
    transparent: true,
    depthWrite: false,
    vertexShader: `uniform float waterTime;varying float fade;void main(){vec3 p=position;p.x+=sin(waterTime*.07+p.z)*.12;p.y+=sin(waterTime*.09+p.x)*.08;vec4 mv=modelViewMatrix*vec4(p,1.);fade=clamp(1.+mv.z/45.,0.,1.);gl_PointSize=clamp(22./-mv.z,.6,1.7);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:
      "varying float fade;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(.55,.8,.83,(1.-smoothstep(.12,.5,d))*.16*fade);}",
  });
  scene.add(new THREE.Points(dustGeo, dustMat));
  let shark;
  try {
    const gltf = await new GLTFLoader().loadAsync(
      `${import.meta.env.BASE_URL}models/whale-shark.glb`,
      (event) => onProgress?.(event.total ? event.loaded / event.total : 0),
    );
    shark = gltf.scene;
    shark.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.frustumCulled = false;
      for (const mat of Array.isArray(obj.material)
        ? obj.material
        : [obj.material]) {
        if (mat.map)
          mat.map.anisotropy = Math.min(
            renderer.capabilities.getMaxAnisotropy(),
            8,
          );
        mat.envMapIntensity = 0.45;
        waterMaterial(mat, clock, true);
      }
    });
    scene.add(shark);
  } catch (error) {
    dispose();
    throw new Error(
      "ジンベエザメを読み込めませんでした。再読み込みしてください。",
      { cause: error },
    );
  }
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 5),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: planeVertex,
      fragmentShader:
        "varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float a=exp(-dot(p,p)*3.5)*.14;gl_FragColor=vec4(.005,.02,.03,a);}",
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.095;
  scene.add(shadow);
  function pose() {
    // A slow circuit entirely inside the tank. Starts beside the viewing window.
    const angle = time * 0.033 - 0.12,
      x = -Math.sin(angle) * 8.4,
      z = -12 + Math.cos(angle) * 5.3;
    shark.position.set(x, 4.85 + Math.sin(angle * 2) * 0.42, z);
    const dx = -Math.cos(angle) * 8.4,
      dz = -Math.sin(angle) * 5.3;
    shark.rotation.set(
      0,
      Math.atan2(dz, -dx) - Math.PI / 2,
      Math.sin(angle * 2) * 0.018,
    );
    shadow.position.x = x;
    shadow.position.z = z;
    shadow.rotation.z = shark.rotation.y + Math.PI / 2;
    clock.value = time;
  }
  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.fov = width < 700 ? 50 : 43;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    dirty = true;
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  cleanups.push(() => observer.disconnect());
  function selectView(id, immediate = false) {
    const view = viewpoints.find((item) => item.id === id) || viewpoints[0];
    follow = view.id === "front";
    destination.fromArray(view.position);
    focus.fromArray(view.target);
    if (container.clientWidth < 700) {
      destination.z += 4;
      focus.y = 4.2;
      if (follow) destination.x = focus.x = shark.position.x;
    }
    if (immediate || reducedMotion) {
      camera.position.copy(destination);
      controls.target.copy(focus);
      controls.update();
      travelling = false;
    } else travelling = true;
    dirty = true;
  }
  function render(stamp) {
    if (disposed || lost) return;
    const dt = last ? Math.min((stamp - last) / 1000, 0.05) : 0;
    last = stamp;
    if (!paused) {
      time += dt;
      pose();
      dirty = true;
    }
    if (travelling) {
      const alpha = 1 - Math.exp(-dt * 3);
      camera.position.lerp(destination, alpha);
      controls.target.lerp(focus, alpha);
      if (camera.position.distanceTo(destination) < 0.008) travelling = false;
      dirty = true;
    }
    // A portrait window cannot contain the full circuit. Move along the dry
    // gallery with the animal until the visitor takes manual control.
    if (follow && !travelling && container.clientWidth < 700) {
      const alpha = reducedMotion ? 1 : 1 - Math.exp(-dt * 2);
      const x = shark.position.x;
      if (
        Math.abs(camera.position.x - x) > 0.001 ||
        Math.abs(controls.target.x - x) > 0.001
      ) {
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, x, alpha);
        controls.target.x = THREE.MathUtils.lerp(controls.target.x, x, alpha);
        dirty = true;
      }
    }
    if (controls.update()) dirty = true;
    if (camera.position.z < 1.5) {
      camera.position.z = 1.5;
      dirty = true;
    }
    if (camera.position.y < 1.2 || camera.position.y > 2.2) {
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, 1.2, 2.2);
      dirty = true;
    }
    if (dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
  }
  listen(controls, "start", () => {
    travelling = false;
    follow = false;
    dirty = true;
  });
  listen(controls, "change", () => {
    dirty = true;
  });
  listen(document, "visibilitychange", () => {
    last = 0;
    renderer.setAnimationLoop(document.hidden || lost ? null : render);
  });
  listen(canvas, "webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
    renderer.setAnimationLoop(null);
    onError?.("3D 表示が中断されました。再読み込みしてください。");
  });
  listen(canvas, "keydown", (event) => {
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    event.preventDefault();
    travelling = false;
    follow = false;
    controls.target.x +=
      event.key === "ArrowLeft" ? -0.3 : event.key === "ArrowRight" ? 0.3 : 0;
    controls.target.y +=
      event.key === "ArrowUp" ? 0.2 : event.key === "ArrowDown" ? -0.2 : 0;
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -7, 7);
    controls.target.y = THREE.MathUtils.clamp(controls.target.y, 2, 6);
    dirty = true;
  });
  resize();
  pose();
  selectView("front", true);
  renderer.render(scene, camera);
  renderer.setAnimationLoop(document.hidden ? null : render);
  return {
    selectView,
    dispose,
    canvas,
    pause(value) {
      paused = value;
      dirty = true;
    },
    quality(value) {
      renderer.setPixelRatio(
        value === "low" ? 1 : Math.min(devicePixelRatio, 1.75),
      );
      reflected.visible = value !== "low";
      resize();
    },
    async capture() {
      renderer.render(scene, camera);
      return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    },
  };
}
