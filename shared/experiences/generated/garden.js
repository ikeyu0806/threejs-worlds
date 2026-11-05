// Canonical source: blender-works/assets/animations/nocturnal_garden/runtime/garden.js.
// Room, UVs and petals come from Blender; only material/transform animation lives here.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const GARDEN_LOOP_SECONDS = 48;

function projectionMaterial(texture, floor) {
  return new THREE.ShaderMaterial({
    uniforms: { uPainting: { value: texture }, uPhase: { value: 0 }, uFloor: { value: floor ? 1 : 0 } },
    side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `
      uniform sampler2D uPainting;
      uniform float uPhase, uFloor;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv;
        float water = (1. - smoothstep(.32, .56, uv.y)) * (1. - smoothstep(.1, .36, abs(uv.x - .65)));
        float branches = smoothstep(.55, .95, uv.y);
        uv.x += sin(uv.y * 13. + uPhase) * .0035 * branches;
        uv.y += sin(uv.x * 16. + uPhase * 2.) * .002 * branches;
        uv.x += sin(uv.y * 85. + uPhase * 4.) * (.003 * water + .003 * uFloor);
        uv.y += sin(uv.x * 24. - uPhase * 2.) * (.0015 * water + .002 * uFloor);
        vec3 paint = texture2D(uPainting, clamp(uv, .001, .999)).rgb;
        float breath = .5 + .5 * sin(uPhase - 1.5707963);
        vec3 tint = mix(vec3(.88, .94, 1.05), vec3(1.10, 1.01, .91), breath);
        paint *= tint;
        float ripple = pow(.5 + .5 * sin(uv.y * 155. + sin(uv.x * 31.) + uPhase * 4.), 12.);
        paint += vec3(.035, .06, .07) * ripple * water;
        // Floor projection is dimmer, retaining recognizable pigment instead of mirror glare.
        paint *= mix(1., .48, uFloor);
        paint *= 1. - .14 * pow(abs(vUv.x - .5) * 2., 8.);
        gl_FragColor = vec4(paint, 1.);
        #include <colorspace_fragment>
      }`,
  });
}

function disposeScene(scene) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  scene.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      for (const uniform of Object.values(material.uniforms || {})) if (uniform.value?.isTexture) textures.add(uniform.value);
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}

export function createGardenStage(container, modelUrl, options = {}) {
  let disposed = false, visible = true, loaded = false, playing = options.playing ?? true;
  let frame = 0, lastTime = 0, elapsed = 0, yaw = 0, pitch = .021, view = 'room', drag = null;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '夜の花園。絵画が壁と床に広がる空間。ドラッグまたは矢印キーで見渡し、Homeキーで視点を戻します。');
  container.appendChild(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#071019');
  const camera = new THREE.PerspectiveCamera(72, 1, .1, 100);
  camera.rotation.order = 'YXZ';
  const projections = [], petals = [];

  function orientCamera() {
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    requestDraw();
  }
  function resetView() { yaw = 0; pitch = view === 'room' ? (container.clientWidth < 600 ? -.06 : .021) : 0; orientCamera(); }
  function setView(value) {
    view = value;
    camera.position.set(0, view === 'room' ? 3.8 : 5.5, view === 'room' ? 12 : 2);
    resetView(); resize();
  }
  function draw(timestamp) {
    frame = 0;
    if (disposed || !visible || document.hidden || !loaded) return;
    const delta = lastTime ? Math.min((timestamp - lastTime) / 1000, .06) : 0;
    lastTime = timestamp;
    if (playing) elapsed = (elapsed + delta) % GARDEN_LOOP_SECONDS;
    const phase = elapsed / GARDEN_LOOP_SECONDS * Math.PI * 2;
    for (const material of projections) material.uniforms.uPhase.value = phase;
    petals.forEach(({ object, position, rotation }, index) => {
      const seed = index * 2.399963;
      object.position.copy(position);
      object.position.x += Math.sin(phase + seed) * .48;
      object.position.y += Math.sin(phase + seed * .7) * .65;
      object.position.z += Math.cos(phase * 2 + seed) * .3;
      object.rotation.set(rotation.x + Math.sin(phase * 2 + seed) * .65, rotation.y + Math.sin(phase + seed) * .8, rotation.z + Math.sin(phase + seed) * .4);
    });
    renderer.render(scene, camera);
    if (playing) requestDraw();
  }
  function requestDraw() {
    if (!frame && !disposed && visible && !document.hidden && loaded) frame = requestAnimationFrame(draw);
  }
  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height || disposed) return;
    camera.aspect = width / height;
    camera.fov = 72;
    camera.position.z = view === 'room' ? (width < 600 ? 7 : 12) : 2;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    requestDraw();
  }
  function visibilityChanged() {
    lastTime = 0;
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else requestDraw();
  }
  function contextLost(event) {
    event.preventDefault(); visible = false;
    cancelAnimationFrame(frame); frame = 0;
    options.onError?.(new Error('WebGL context lost'));
  }
  function pointerDown(event) {
    if (!event.isPrimary || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
    canvas.focus({ preventScroll: true });
  }
  function pointerMove(event) {
    if (!drag || drag.id !== event.pointerId) return;
    yaw = THREE.MathUtils.clamp(yaw + (event.clientX - drag.x) * .0025, -1.15, 1.15);
    pitch = THREE.MathUtils.clamp(pitch + (event.clientY - drag.y) * .0025, -.48, .48);
    drag.x = event.clientX; drag.y = event.clientY;
    orientCamera();
  }
  function pointerEnd() { drag = null; }
  function keyDown(event) {
    if (event.key === 'Home') { event.preventDefault(); resetView(); return; }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    yaw = THREE.MathUtils.clamp(yaw + (event.key === 'ArrowLeft' ? .07 : event.key === 'ArrowRight' ? -.07 : 0), -1.15, 1.15);
    pitch = THREE.MathUtils.clamp(pitch + (event.key === 'ArrowUp' ? .05 : event.key === 'ArrowDown' ? -.05 : 0), -.48, .48);
    orientCamera();
  }
  const listeners = { pointerdown: pointerDown, pointermove: pointerMove, pointerup: pointerEnd, pointercancel: pointerEnd, lostpointercapture: pointerEnd, keydown: keyDown, webglcontextlost: contextLost };
  for (const [name, listener] of Object.entries(listeners)) canvas.addEventListener(name, listener);
  document.addEventListener('visibilitychange', visibilityChanged);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting; lastTime = 0;
    if (!visible) { cancelAnimationFrame(frame); frame = 0; } else requestDraw();
  });
  intersectionObserver.observe(container);

  new GLTFLoader().load(modelUrl, (gltf) => {
    if (disposed) { disposeScene(gltf.scene); return; }
    if (!gltf.scene.getObjectByName('ProjectionBack')) {
      disposeScene(gltf.scene); options.onError?.(new Error('Painting surface is missing')); return;
    }
    const replacedMaterials = new Set();
    gltf.scene.traverse((object) => {
      if (!object.isMesh) return;
      if (object.name.startsWith('Projection')) {
        const texture = object.material.emissiveMap;
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        replacedMaterials.add(object.material);
        object.material = projectionMaterial(texture, object.name === 'ProjectionFloor');
        projections.push(object.material);
      }
      if (object.name.startsWith('Petal')) petals.push({ object, position: object.position.clone(), rotation: object.rotation.clone() });
    });
    replacedMaterials.forEach((material) => material.dispose());
    scene.add(gltf.scene); loaded = true; resize(); requestDraw(); options.onReady?.();
  }, undefined, (error) => { if (!disposed) options.onError?.(error); });
  setView('room');
  return {
    setPlaying(value) { playing = value; lastTime = 0; requestDraw(); },
    resetView, setView,
    dispose() {
      disposed = true; cancelAnimationFrame(frame);
      resizeObserver.disconnect(); intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', visibilityChanged);
      for (const [name, listener] of Object.entries(listeners)) canvas.removeEventListener(name, listener);
      disposeScene(scene); renderer.dispose(); canvas.remove();
    },
  };
}
