import * as THREE from 'three';
import { loadModel } from './models.js';

// Hidden prototypes keep shared GLB textures/geometries in the scene's ownership
// even when only clones or instanced parts are visible.
export async function loadStageModels(stage, files) {
  const sources = new THREE.Group();
  sources.name = 'Blender model sources';
  sources.visible = false;
  stage.scene.add(sources);
  const results = await Promise.allSettled(files.map(loadModel));
  for (const result of results) if (result.status === 'fulfilled') sources.add(result.value.scene);
  const failure = results.find(result => result.status === 'rejected');
  if (failure) {
    stage.dispose();
    throw new Error('風景のモデルを読み込めませんでした。通信状態を確認して再読み込みしてください。', { cause: failure.reason });
  }
  return results.map(result => result.value);
}

export function modelCopy(gltf, position = [0, 0, 0], yaw = 0, scale = 1) {
  const model = gltf.scene.clone(true);
  model.position.set(...position);
  model.rotation.y = yaw;
  if (Array.isArray(scale)) model.scale.set(...scale);
  else model.scale.setScalar(scale);
  return model;
}

function reflectionScene(skyColor, groundColor) {
  const environmentScene = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(12, 32, 16), new THREE.MeshBasicMaterial({ color: skyColor, side: THREE.BackSide }));
  const ground = new THREE.Mesh(new THREE.CircleGeometry(12, 32), new THREE.MeshBasicMaterial({ color: groundColor }));
  ground.rotation.x = -Math.PI / 2;
  const sunLight = new THREE.DirectionalLight('#fff6ea', 2.4);
  sunLight.position.set(-4, 7, 2);
  environmentScene.add(sky, ground, new THREE.HemisphereLight(skyColor, groundColor, 1.15), sunLight);
  return environmentScene;
}

export function enhanceStage(stage, sun, { extent = 30, target = [0, 0, 0], environment = 0.35, sky = '#c5d0d8', ground = '#6a6458' } = {}) {
  const pmrem = new THREE.PMREMGenerator(stage.renderer);
  const environmentScene = reflectionScene(sky, ground);
  const reflection = pmrem.fromScene(environmentScene, 0.04);
  environmentScene.traverse(object => {
    if (object.isMesh) { object.geometry.dispose(); object.material.dispose(); }
    if (object.isLight) object.dispose?.();
  });
  pmrem.dispose();
  stage.scene.environment = reflection.texture;
  stage.scene.environmentIntensity = environment;
  stage.onDispose(() => { stage.scene.environment = null; reflection.dispose(); });
  const shadows = !matchMedia('(max-width: 700px)').matches;
  stage.renderer.shadowMap.enabled = shadows;
  stage.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (sun) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: 0.5, far: 160 });
    sun.target.position.set(...target);
    stage.scene.add(sun.target);
    sun.shadow.normalBias = 0.035;
    sun.shadow.bias = -0.00015;
  }
  stage.scene.traverse(object => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (materials.every(material => material.isMeshStandardMaterial && !material.transparent)) {
      object.castShadow = true; object.receiveShadow = true;
    }
  });
  const quality = stage.quality;
  stage.quality = value => { quality(value); stage.renderer.shadowMap.enabled = shadows && value !== 'low'; };
}
