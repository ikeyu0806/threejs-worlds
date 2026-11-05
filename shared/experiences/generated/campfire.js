// Canonical runtime: blender-works/assets/animations/hearth_fire/runtime.
// Solid geometry and PBR textures come from Blender. The box is a volume proxy only.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const noiseGLSL = `
float hash(vec3 p) { p=fract(p*0.3183099+vec3(.11,.23,.37)); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 p) {
 vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p) { return .57*noise(p)+.28*noise(p*2.03+12.4)+.15*noise(p*4.09+31.7); }
`;

function flames(depthTexture) {
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 5 }, uCamera: { value: new THREE.Vector3() }, uDepth: { value: depthTexture }, uResolution: { value: new THREE.Vector2() }, uViewFromLocal: { value: new THREE.Matrix4() } },
    vertexShader: `varying vec3 vPosition; void main(){ vPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uCamera; varying vec3 vPosition;
      uniform sampler2D uDepth; uniform vec2 uResolution; uniform mat4 uViewFromLocal;
      ${noiseGLSL}
      void main(){
        vec3 direction=normalize(vPosition-uCamera);
        vec3 inverseDirection=1./direction;
        vec3 t0=(-vec3(.5)-uCamera)*inverseDirection;
        vec3 t1=(vec3(.5)-uCamera)*inverseDirection;
        vec3 lo=min(t0,t1), hi=max(t0,t1);
        float start=max(max(lo.x,lo.y),max(lo.z,0.));
        float end=min(min(hi.x,hi.y),hi.z);
        if(end<=start) discard;
        float depth=texture2D(uDepth,gl_FragCoord.xy/uResolution).x;
        float sceneDistance=-(.05*40.)/((40.-.05)*depth-40.);
        float stepSize=(end-start)/56.;
        // Jitter hides raymarch bands without changing the flame's silhouette.
        float jitter=hash(vec3(gl_FragCoord.xy,uTime*.01));
        vec3 p=uCamera+direction*(start+stepSize*jitter);
        vec4 sum=vec4(0.);
        for(int i=0;i<56;i++){
          if(-(uViewFromLocal*vec4(p,1.)).z>sceneDistance) break;
          float y=p.y+.5;
          vec2 drift=vec2(sin(y*6.-uTime*1.9),cos(y*5.-uTime*1.3))*.045*y;
          vec3 turbulent=vec3((p.xz-drift)*11.,y*6.3-uTime*1.9);
          float n=fbm(turbulent);
          float width=.22*pow(max(0.,1.-y),.8);
          vec2 crossSection=p.xz-drift;
          float center=1.-length(crossSection*vec2(1.,1.13))/max(width,.015)-y*.45;
          float left=1.-length(crossSection-vec2(-.17,.02))/max(.15*pow(max(0.,1.-y/.72),.8),.005)-y*.5;
          float right=1.-length(crossSection-vec2(.17,-.06))/max(.14*pow(max(0.,1.-y/.82),.8),.005)-y*.5;
          float field=max(center,max(left,right)) + (n-.5)*2.7;
          float density=smoothstep(.16,.58,field)*smoothstep(0.,.09,y)*(1.-smoothstep(.74,1.,y));
          float heat=clamp(field*.78+(.6-y)*.3,0.,1.);
          vec3 color=mix(vec3(1.3,.065,.004),vec3(3.4,.83,.04),smoothstep(.15,.6,heat));
          color=mix(color,vec3(4.,2.5,.6),smoothstep(.63,.96,heat));
          float alpha=1.-exp(-density*stepSize*16.);
          sum.rgb+=(1.-sum.a)*color*alpha;
          sum.a+=(1.-sum.a)*alpha;
          if(sum.a>.985) break;
          p+=direction*stepSize;
        }
        if(sum.a<.004) discard;
        gl_FragColor=vec4(sum.rgb/max(sum.a,.001),sum.a);
      }`,
    transparent: true, depthWrite: false, depthTest: false, side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.position.set(0, 1.0, 0);
  mesh.scale.set(1.65, 1.8, 1.65);
  mesh.renderOrder = 2;
  return mesh;
}

function seededRandom() {
  let seed = 281;
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

function embers() {
  const count = 170;
  const random = seededRandom();
  const seeds = new Float32Array(count * 4);
  for (let index = 0; index < seeds.length; index++) seeds[index] = random();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 5 }, uPixelRatio: { value: 1 } },
    vertexShader: `
      attribute vec4 aSeed; uniform float uTime; uniform float uPixelRatio; varying float vLife; varying float vHeat;
      void main(){
        float age=fract(uTime/(2.1+aSeed.w*3.5)+aSeed.x);
        float angle=aSeed.y*6.283;
        float radius=sqrt(aSeed.z)*.4;
        float y=.38+age*(1.7+aSeed.w*1.5);
        vec3 p=vec3(cos(angle)*radius,y,sin(angle)*radius);
        p.x+=sin(age*8.+aSeed.y*30.)*.15*age+age*age*.22;
        p.z+=cos(age*7.+aSeed.z*21.)*.16*age;
        vec4 mv=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp((2.+aSeed.z*2.5)*uPixelRatio*(2.8/-mv.z),1.,8.);
        vLife=smoothstep(0.,.06,age)*(1.-smoothstep(.45,1.,age)); vHeat=aSeed.w;
      }`,
    fragmentShader: `varying float vLife; varying float vHeat; void main(){ vec2 p=gl_PointCoord-.5; float a=exp(-dot(p,p)*24.)*vLife; if(a<.01)discard; gl_FragColor=vec4(mix(vec3(2.5,.3,.015),vec3(5.,1.5,.1),vHeat),a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 3;
  return points;
}

function smoke() {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const group = new THREE.Group();
  for (let index = 0; index < 12; index++) {
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 5 }, uLife: { value: 0 }, uSeed: { value: index * 4.31 } },
      vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform float uTime,uLife,uSeed; varying vec2 vUv; ${noiseGLSL}
       void main(){vec2 p=vUv-.5; float cloud=fbm(vec3(vUv*4.,uSeed+uTime*.1)); float a=exp(-dot(p,p)*15.)*smoothstep(.25,.72,cloud)*sin(uLife*3.14159)*.075; gl_FragColor=vec4(.26,.28,.3,a);}`,
      transparent: true, depthWrite: false,
    });
    const puff = new THREE.Mesh(geometry, material);
    puff.renderOrder = 4;
    group.add(puff);
  }
  return group;
}

function disposeScene(scene) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  scene.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  for (const resource of [...geometries, ...textures, ...materials]) resource.dispose();
}

export function createCampfireStage(container, modelUrl, options = {}) {
  let disposed = false, playing = options.playing ?? true, visible = true, rendering = false, frame = 0, lastTime = 0, elapsed = 5;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;';
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', '焚き火。炎・火の粉・煙。ドラッグで視点変更。');
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#111619');
  scene.fog = new THREE.FogExp2('#111619', .055);
  const camera = new THREE.PerspectiveCamera(37, 1, .05, 40);
  camera.position.set(2.8, 2.05, 3.8);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, .85, 0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 3;
  controls.maxDistance = 7;
  controls.maxPolarAngle = Math.PI * .47;
  controls.update();
  scene.add(new THREE.HemisphereLight(0xaac7e1, 0x191817, .85));
  const moon = new THREE.DirectionalLight(0xa0bcd9, 2.3);
  moon.position.set(-3, 5, 1);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -3; moon.shadow.camera.right = 3;
  moon.shadow.camera.top = 3; moon.shadow.camera.bottom = -3;
  moon.shadow.bias = -.001;
  scene.add(moon);
  const frontFill = new THREE.DirectionalLight(0xc3cbd2, 1.1);
  frontFill.position.set(3, 2, 4);
  scene.add(frontFill);
  const fireLight = new THREE.PointLight(0xff822e, 26, 6, 2);
  fireLight.position.set(0, .9, 0);
  // Soft fill under the stack keeps individual coals and bark readable.
  scene.add(fireLight);
  const lowerLight = new THREE.PointLight(0xff3808, 3, 2, 2);
  lowerLight.position.y = .2;
  scene.add(lowerLight);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x121716, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.067; floor.receiveShadow = true;
  scene.add(floor);
  const depthTarget = new THREE.WebGLRenderTarget(1, 1);
  depthTarget.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
  const depthMaterial = new THREE.MeshDepthMaterial();
  const flame = flames(depthTarget.depthTexture), sparks = embers(), smokeGroup = smoke();
  scene.add(flame, sparks, smokeGroup);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .32, .35, 1.1);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const inverseWorld = new THREE.Matrix4();
  function draw(timestamp = performance.now()) {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    rendering = true;
    const delta = lastTime ? Math.min((timestamp - lastTime) / 1000, .05) : 0;
    lastTime = timestamp;
    if (playing) elapsed += delta;
    const controlsChanged = controls.update();
    flame.updateMatrixWorld();
    camera.updateMatrixWorld();
    flame.material.uniforms.uViewFromLocal.value.multiplyMatrices(camera.matrixWorldInverse, flame.matrixWorld);
    inverseWorld.copy(flame.matrixWorld).invert();
    flame.material.uniforms.uCamera.value.copy(camera.position).applyMatrix4(inverseWorld);
    flame.material.uniforms.uTime.value = elapsed;
    sparks.material.uniforms.uTime.value = elapsed;
    sparks.material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    smokeGroup.children.forEach((puff, index) => {
      const age = (elapsed / 6 + index / 12) % 1;
      puff.position.set(Math.sin(index * 9 + age * 4) * .12 + age * age * .6, .8 + age * 2.2, Math.cos(index * 7 + age * 3) * .12);
      puff.scale.setScalar(.55 + age * 1.5);
      puff.quaternion.copy(camera.quaternion);
      puff.rotateZ(index * 1.9 + age * .6);
      puff.material.uniforms.uTime.value = elapsed;
      puff.material.uniforms.uLife.value = age;
    });
    fireLight.intensity = 25 + 2 * Math.sin(elapsed * 6.7) + 1.5 * Math.sin(elapsed * 13.1);
    // Stop each volume ray at the opaque scene depth so fire wraps around logs.
    flame.visible = sparks.visible = smokeGroup.visible = false;
    scene.overrideMaterial = depthMaterial;
    renderer.setRenderTarget(depthTarget); renderer.render(scene, camera);
    renderer.setRenderTarget(null); scene.overrideMaterial = null;
    flame.visible = sparks.visible = smokeGroup.visible = true;
    composer.render();
    rendering = false;
    if (playing || controlsChanged) frame = requestAnimationFrame(draw);
  }
  function requestDraw() {
    if (!frame && !rendering && !disposed && visible && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height || disposed) return;
    camera.aspect = width / height;
    // Keep the full stone ring visible in a tall mobile viewport.
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(37) / 2) / Math.min(1, camera.aspect)));
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false); composer.setSize(width, height);
    const bufferSize = renderer.getDrawingBufferSize(new THREE.Vector2());
    depthTarget.setSize(bufferSize.x, bufferSize.y);
    flame.material.uniforms.uResolution.value.copy(bufferSize);
    requestDraw();
  }
  function visibility() { lastTime = 0; if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else requestDraw(); }
  controls.addEventListener('change', requestDraw);
  document.addEventListener('visibilitychange', visibility);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting; lastTime = 0;
    if (!visible) { cancelAnimationFrame(frame); frame = 0; } else requestDraw();
  });
  intersectionObserver.observe(container);
  new GLTFLoader().load(modelUrl, (gltf) => {
    if (disposed) { disposeScene(gltf.scene); return; }
    gltf.scene.traverse((object) => {
      if (object.isMesh) { object.castShadow = true; object.receiveShadow = true;
        for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
          if (material.map) material.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        }
      }
    });
    scene.add(gltf.scene); options.onReady?.(); requestDraw();
  }, undefined, (error) => { if (!disposed) options.onError?.(error); });
  resize();
  return {
    setPlaying(value) { playing = value; lastTime = 0; requestDraw(); },
    dispose() {
      disposed = true; cancelAnimationFrame(frame);
      resizeObserver.disconnect(); intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      controls.removeEventListener('change', requestDraw); controls.dispose();
      for (const pass of composer.passes) pass.dispose?.();
      composer.dispose(); depthTarget.dispose(); depthMaterial.dispose(); disposeScene(scene); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
