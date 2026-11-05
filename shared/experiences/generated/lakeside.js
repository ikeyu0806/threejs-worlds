// Canonical source: blender-works/assets/animations/lakeside_glow/runtime/lakeside.js.
// All solid geometry comes from Blender. This file owns only rendering and effects.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const LAKESIDE_LOOP_SECONDS = 48;
export const LAKESIDE_PARTICLES = { fireflies: 720, water: 1000, stars: 360 };

function randomGenerator() {
  let seed = 261022;
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

function createSky() {
  const canvas = document.createElement('canvas');
  // A soft twilight gradient surrounds both the scene and its water reflection.
  canvas.width = 1024; canvas.height = 512;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#0d171f');
  gradient.addColorStop(.35, '#263c49');
  gradient.addColorStop(.49, '#677b7d');
  gradient.addColorStop(.54, '#475d62');
  gradient.addColorStop(1, '#101f27');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// The same phase drives every effect. Integer frequencies make the 48 s seam exact.
function createParticles(kind, count) {
  const random = randomGenerator();
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  for (let index = 0; index < count; index++) {
    const x = random(), y = random(), z = random();
    if (kind === 0) {
      positions.set([(x - .5) * 30, .4 + y * y * 5.2, 16 - z * 59], index * 3);
    } else if (kind === 1) {
      positions.set([(x - .5) * 30, .045, 17 - z * 73], index * 3);
    } else {
      positions.set([(x - .5) * 230, 19 + y * 81, -72 - z * 70], index * 3);
    }
    seeds.set([random(), random(), random(), random()], index * 4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  const material = new THREE.ShaderMaterial({
    uniforms: { uPhase: { value: 0 }, uPixelRatio: { value: 1 } },
    defines: { KIND: kind },
    vertexShader: `
      attribute vec4 aSeed;
      uniform float uPhase, uPixelRatio;
      varying float vAlpha; varying vec3 vColor;
      void main() {
        vec3 p = position;
        float phase = aSeed.x * 6.2831853;
        float pulse = .5 + .5 * sin(uPhase * (2. + floor(aSeed.w * 3.)) + phase);
        float size;
        #if KIND == 0
          p.x += sin(uPhase * 2. + phase) * (.4 + aSeed.z * .9);
          p.z += cos(uPhase + aSeed.y * 6.2831853) * .65;
          p.y += sin(uPhase * 3. + phase) * .22;
          vAlpha = .12 + .65 * pow(pulse, 2.);
          vColor = mix(vec3(.8, 1.8, 1.0), vec3(3.1, 2.4, .65), aSeed.y);
          size = 34. + aSeed.z * 42.;
        #elif KIND == 1
          p.x += sin(uPhase * 2. + phase) * .06;
          vAlpha = .32 * pow(pulse, 7.);
          vColor = mix(vec3(.35, .85, 1.1), vec3(1.1, 1.6, 1.8), aSeed.y);
          size = 20. + aSeed.z * 24.;
        #else
          vAlpha = .13 + .22 * pulse;
          vColor = vec3(.8, 1., 1.25);
          size = 145. + aSeed.z * 80.;
        #endif
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(size * uPixelRatio / max(1., -mv.z), 1., 13. * uPixelRatio);
      }`,
    fragmentShader: `
      varying float vAlpha; varying vec3 vColor;
      void main() {
        vec2 p = gl_PointCoord - .5;
        #if KIND == 1
          p.y *= 2.7;
        #endif
        float radius = dot(p, p);
        float glow = exp(-radius * 22.) * .65 + exp(-radius * 150.) * .45;
        float alpha = glow * vAlpha * (1. - smoothstep(.15, .25, radius));
        if (alpha < .003) discard;
        gl_FragColor = vec4(vColor, alpha);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const particles = new THREE.Points(geometry, material);
  particles.frustumCulled = false;
  return particles;
}

function createWater(sourceMesh) {
  sourceMesh.updateWorldMatrix(true, false);
  // Reflector expects a local +Z normal. Bake the GLB transform into its geometry.
  const geometry = sourceMesh.geometry.clone().applyMatrix4(sourceMesh.matrixWorld).rotateX(Math.PI / 2);
  const water = new Reflector(geometry, {
    textureWidth: 768, textureHeight: 768, multisample: 0, clipBias: .002,
    shader: {
      uniforms: { tDiffuse: { value: null }, color: { value: new THREE.Color() }, textureMatrix: { value: new THREE.Matrix4() }, uPhase: { value: 0 } },
      vertexShader: `
        uniform mat4 textureMatrix;
        varying vec4 vReflection; varying vec3 vWorld;
        void main() {
          vReflection = textureMatrix * vec4(position, 1.);
          vWorld = (modelMatrix * vec4(position, 1.)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
        }`,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform float uPhase;
        varying vec4 vReflection; varying vec3 vWorld;
        void main() {
          vec2 p = vWorld.xz;
          float a = sin(p.x * 1.4 + p.y * 2.2 + uPhase * 4.);
          float b = sin(p.x * 3.5 - p.y * 1.1 - uPhase * 3.);
          float c = sin(p.y * 6.3 + sin(p.x * .9) + uPhase * 5.);
          vec2 ripple = vec2(a + b * .45, c * .4 + a * .3);
          vec2 uv = vReflection.xy / vReflection.w;
          float distanceToEye = length(cameraPosition - vWorld);
          uv += ripple * .0028 * clamp(15. / distanceToEye, .25, 1.);
          vec3 reflection = texture2D(tDiffuse, clamp(uv, .001, .999)).rgb;
          float fresnel = pow(1. - abs(normalize(cameraPosition - vWorld).y), 2.);
          vec3 deep = vec3(.012, .044, .061);
          vec3 surface = mix(deep, reflection * vec3(.73, .90, .98), .45 + .38 * fresnel);
          float line = pow(.5 + .5 * sin(p.y * 8. + a * 1.5 + b * .6 + uPhase * 4.), 18.);
          float broken = .5 + .5 * sin(p.x * .8 + p.y * .6 + uPhase * 2.);
          surface += vec3(.009, .022, .029) * line * broken * (.2 + .8 * fresnel);
          gl_FragColor = vec4(surface, 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    },
  });
  water.rotation.x = -Math.PI / 2;
  sourceMesh.visible = false;
  return water;
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
  geometries.forEach((geometry) => geometry.dispose());
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
}

export function createLakesideStage(container, modelUrl, options = {}) {
  let disposed = false, playing = options.playing ?? true, visible = true;
  let frame = 0, lastTime = 0, elapsed = 8, rendering = false, water = null;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none';
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', '湖畔。湖面、蛍、光の粒子。ドラッグまたは矢印キーで視点変更。Homeキーで視点を戻します。');
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const sky = createSky();
  scene.background = sky;
  scene.fog = new THREE.FogExp2('#53686d', .009);
  const camera = new THREE.PerspectiveCamera(52, 1, .1, 330);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .07;
  controls.enablePan = false;
  controls.minDistance = 26; controls.maxDistance = 45;
  controls.minPolarAngle = 1.32; controls.maxPolarAngle = 1.49;
  controls.minAzimuthAngle = -.15; controls.maxAzimuthAngle = .48;
  function resetView() {
    camera.position.set(7.6, 5.6, 19);
    controls.target.set(-.8, 2.5, -15);
    controls.update();
    requestDraw();
  }
  scene.add(new THREE.HemisphereLight(0xb5c5ca, 0x292b24, 1.25));
  const moonlight = new THREE.DirectionalLight(0xc3d5dc, 1.7);
  moonlight.position.set(21, 26, -104);
  moonlight.castShadow = true;
  moonlight.shadow.mapSize.set(2048, 2048);
  Object.assign(moonlight.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 180 });
  moonlight.shadow.bias = -.0002;
  moonlight.shadow.normalBias = .045;
  scene.add(moonlight);
  const fill = new THREE.DirectionalLight(0xb8c3c4, .4);
  fill.position.set(2, 8, 15);
  scene.add(fill);
  const lantern = new THREE.PointLight(0xffba66, 23, 11, 2);
  lantern.position.set(-3.55, 1.25, .55);
  scene.add(lantern);
  const fireflies = createParticles(0, LAKESIDE_PARTICLES.fireflies);
  const sparkles = createParticles(1, LAKESIDE_PARTICLES.water);
  const stars = createParticles(2, LAKESIDE_PARTICLES.stars);
  scene.add(fireflies, sparkles, stars);
  const sceneTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, sceneTarget);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), .48, .65, 1.05));
  composer.addPass(new OutputPass());

  function draw(timestamp = performance.now()) {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    rendering = true;
    const delta = lastTime ? Math.min((timestamp - lastTime) / 1000, .05) : 0;
    lastTime = timestamp;
    if (playing) elapsed = (elapsed + delta) % LAKESIDE_LOOP_SECONDS;
    const phase = elapsed / LAKESIDE_LOOP_SECONDS * Math.PI * 2;
    const changed = controls.update();
    for (const particles of [fireflies, sparkles, stars]) {
      particles.material.uniforms.uPhase.value = phase;
      particles.material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    }
    if (water) water.material.uniforms.uPhase.value = phase;
    lantern.intensity = 23 + Math.sin(phase * 3) * .7;
    composer.render();
    rendering = false;
    if (playing || changed) frame = requestAnimationFrame(draw);
  }
  function requestDraw() {
    if (!frame && !rendering && !disposed && visible && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height || disposed) return;
    camera.aspect = width / height;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(52) / 2) / Math.min(1, Math.max(.74, camera.aspect))));
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    if (water) {
      const resolution = width < 600 ? 512 : 768;
      water.getRenderTarget().setSize(resolution, resolution);
    }
    requestDraw();
  }
  function visibilityChanged() {
    lastTime = 0;
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else requestDraw();
  }
  function contextLost(event) {
    event.preventDefault();
    cancelAnimationFrame(frame); frame = 0; visible = false;
    options.onError?.(new Error('WebGL context lost'));
  }
  function keydown(event) {
    if (event.key === 'Home') { event.preventDefault(); resetView(); return; }
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta = THREE.MathUtils.clamp(spherical.theta + (event.key === 'ArrowLeft' ? -.06 : event.key === 'ArrowRight' ? .06 : 0), controls.minAzimuthAngle, controls.maxAzimuthAngle);
    spherical.phi = THREE.MathUtils.clamp(spherical.phi + (event.key === 'ArrowUp' ? -.025 : event.key === 'ArrowDown' ? .025 : 0), controls.minPolarAngle, controls.maxPolarAngle);
    camera.position.copy(controls.target).add(offset.setFromSpherical(spherical));
    controls.update(); requestDraw();
  }
  renderer.domElement.addEventListener('keydown', keydown);
  controls.addEventListener('change', requestDraw);
  document.addEventListener('visibilitychange', visibilityChanged);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting; lastTime = 0;
    if (!visible) { cancelAnimationFrame(frame); frame = 0; } else requestDraw();
  });
  intersectionObserver.observe(container);
  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(modelUrl, (gltf) => {
    if (disposed) { disposeScene(gltf.scene); return; }
    const waterMesh = gltf.scene.getObjectByName('LakeWaterSurface') || gltf.scene.getObjectByName('Lake.WaterSurface');
    if (!waterMesh) { disposeScene(gltf.scene); options.onError?.(new Error('Water mesh is missing')); return; }
    gltf.scene.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = !object.name.includes('Moon') && !object.name.includes('WaterSurface');
      object.receiveShadow = true;
      for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
        if (material.map) material.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        if (material.name.includes('Needles')) material.alphaToCoverage = true;
        if (material.name.includes('Reed') || material.name.includes('Lily')) material.side = THREE.DoubleSide;
        if (material.name.includes('Moon')) material.fog = false;
      }
    });
    scene.add(gltf.scene);
    water = createWater(waterMesh);
    scene.add(water);
    renderer.shadowMap.needsUpdate = true;
    resize(); options.onReady?.(); requestDraw();
  }, undefined, (error) => { if (!disposed) options.onError?.(error); });
  resetView(); resize();
  return {
    setPlaying(value) { playing = value; lastTime = 0; requestDraw(); },
    resetView,
    dispose() {
      disposed = true; cancelAnimationFrame(frame);
      resizeObserver.disconnect(); intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', visibilityChanged);
      renderer.domElement.removeEventListener('keydown', keydown);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      controls.removeEventListener('change', requestDraw); controls.dispose();
      water?.getRenderTarget().dispose();
      for (const pass of composer.passes) pass.dispose?.();
      composer.dispose(); disposeScene(scene); sky.dispose();
      renderer.dispose(); renderer.domElement.remove();
    },
  };
}
