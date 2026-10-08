import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export function modelUrl(file) {
  return `${import.meta.env.BASE_URL}models/${file}`;
}

export function loadModel(file) {
  return loader.loadAsync(modelUrl(file));
}

export async function placeModel(scene, file, position, rotationY = 0, scale = 1) {
  const gltf = await loadModel(file);
  const model = gltf.scene;
  model.position.set(...position);
  model.rotation.y = rotationY;
  model.scale.setScalar(scale);
  scene.add(model);
  return model;
}

// One GLB person becomes paired instanced parts so a crowd stays a few draw calls.
export function crowdFrom(root, count) {
  root.updateMatrixWorld(true);
  const parts = [];
  root.traverse(object => {
    if (!object.isMesh) return;
    const geometry = object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    const mesh = new THREE.InstancedMesh(geometry, object.material.clone(), count);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const tint = /Cloth|Coat/i.test(object.name);
    if (tint) mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    parts.push({ mesh, tint });
  });
  return parts;
}
