import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { disposeModelTree } from './models.js';

export function seededRandom(seed) {
  return () => {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

// Shared rendering/input lifecycle; each world owns its scene and art direction.
export function createStage(container, options) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(options.background);
  if (options.fog) scene.fog = new THREE.FogExp2(options.background, options.fog);
  const camera = new THREE.PerspectiveCamera(options.fov ?? 52, 1, 0.1, 180);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = options.exposure ?? 1;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', options.label);
  container.append(canvas);

  const composer = new EffectComposer(renderer);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), options.bloom ?? 0.3, 0.5, options.bloomThreshold ?? 0.85);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const position = new THREE.Vector3(...options.position);
  const destination = position.clone();
  const target = new THREE.Vector3(...options.target);
  const targetDestination = target.clone();
  const direction = new THREE.Vector3();
  const callbacks = [], cleanup = [];
  const keys = new Set();
  let yaw = 0, pitch = 0, paused = false, walking = false, touchX = 0, touchZ = 0;
  let time = 0, lastTime = 0, disposed = false, dragging = null, animated = false;
  const listen = (element, type, fn, config) => {
    element.addEventListener(type, fn, config);
    cleanup.push(() => element.removeEventListener(type, fn, config));
  };
  const clearInput = () => { keys.clear(); touchX = touchZ = 0; dragging = null; };
  listen(canvas, 'pointerdown', event => {
    if (event.button !== 0) return;
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    dragging = { x: event.clientX, y: event.clientY, distance: 0 };
  });
  listen(canvas, 'pointermove', event => {
    if (!dragging) { options.onHover?.(event); return; }
    const dx = event.clientX - dragging.x, dy = event.clientY - dragging.y;
    dragging.distance += Math.abs(dx) + Math.abs(dy);
    yaw = THREE.MathUtils.clamp(yaw - dx * 0.003, -0.7, 0.7);
    pitch = THREE.MathUtils.clamp(pitch - dy * 0.003, -0.3, 0.3);
    dragging.x = event.clientX; dragging.y = event.clientY;
  });
  listen(canvas, 'pointerup', event => {
    if (dragging && dragging.distance < 6) options.onSelect?.(event);
    dragging = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  });
  listen(canvas, 'pointercancel', clearInput);
  listen(canvas, 'lostpointercapture', () => { dragging = null; });
  listen(canvas, 'blur', clearInput);
  listen(window, 'blur', clearInput);
  listen(canvas, 'keydown', event => {
    if (!walking || event.altKey || event.ctrlKey || event.metaKey) return;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
      event.preventDefault(); keys.add(event.code);
    }
  });
  listen(window, 'keyup', event => keys.delete(event.code));
  listen(canvas, 'webglcontextlost', event => {
    event.preventDefault(); renderer.setAnimationLoop(null);
    options.onError?.('3D 表示が中断されました。ページを再読み込みしてください。');
  });

  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.fov = camera.aspect < 0.85 ? (options.mobileFov ?? options.fov ?? 52) : (options.fov ?? 52);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    composer.setSize(width, height);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container); resize();

  function updateCamera(dt) {
    if (walking) {
      const forward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) + touchZ;
      const side = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + touchX;
      direction.subVectors(target, position).normalize();
      const angle = Math.atan2(-direction.x, -direction.z) + yaw;
      const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 5 : 2.8) * dt / Math.max(1, Math.hypot(side, forward));
      const x = (side * Math.cos(angle) - forward * Math.sin(angle)) * speed;
      const z = (-side * Math.sin(angle) - forward * Math.cos(angle)) * speed;
      const nextX = THREE.MathUtils.clamp(position.x + x, options.bounds.minX, options.bounds.maxX);
      const nextZ = THREE.MathUtils.clamp(position.z + z, options.bounds.minZ, options.bounds.maxZ);
      target.x += nextX - position.x; target.z += nextZ - position.z;
      position.x = nextX; position.z = nextZ;
    } else {
      const smooth = motion.matches ? 1 : 1 - Math.exp(-dt * 3.5);
      position.lerp(destination, smooth); target.lerp(targetDestination, smooth);
    }
    camera.position.copy(position);
    camera.lookAt(target);
    camera.rotateY(yaw); camera.rotateX(pitch);
  }

  function render(timestamp) {
    const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.05) : 0;
    lastTime = timestamp;
    const activeDt = paused || motion.matches ? 0 : dt;
    time += activeDt;
    updateCamera(dt);
    if (activeDt > 0 || !animated) {
      for (const callback of callbacks) callback(time, activeDt);
      animated = true;
    }
    composer.render();
  }
  listen(document, 'visibilitychange', () => {
    clearInput(); lastTime = 0;
    renderer.setAnimationLoop(document.hidden ? null : render);
  });
  updateCamera(1); renderer.setAnimationLoop(render);

  return {
    scene, camera, renderer, canvas,
    animate: callback => { callbacks.push(callback); animated = false; },
    onDispose: callback => cleanup.push(callback),
    travel(nextPosition, nextTarget) {
      walking = false; clearInput(); yaw = pitch = 0;
      destination.fromArray(nextPosition); targetDestination.fromArray(nextTarget);
    },
    walk(value) {
      if (walking === value) return;
      walking = value; clearInput(); destination.copy(position); targetDestination.copy(target);
    },
    move(x, z) { touchX = x; touchZ = z; },
    pause(value) { paused = value; clearInput(); },
    quality(value) {
      renderer.setPixelRatio(value === 'low' ? 1 : Math.min(devicePixelRatio, 1.5));
      bloom.enabled = value !== 'low'; resize();
    },
    async capture() {
      composer.render();
      return new Promise(accept => canvas.toBlob(accept, 'image/png'));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      renderer.setAnimationLoop(null); observer.disconnect();
      for (const callback of cleanup) callback();
      disposeModelTree(scene);
      for (const pass of composer.passes) pass.dispose?.();
      composer.dispose(); renderer.dispose(); canvas.remove();
    },
  };
}
