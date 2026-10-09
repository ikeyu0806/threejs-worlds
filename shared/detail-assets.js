import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
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

export function enhanceStage(stage, sun, { extent = 30, target = [0, 0, 0], environment = 0.35 } = {}) {
  const pmrem = new THREE.PMREMGenerator(stage.renderer);
  const room = new RoomEnvironment();
  const reflection = pmrem.fromScene(room, 0.04);
  room.dispose(); pmrem.dispose();
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
