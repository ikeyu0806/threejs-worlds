import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export function modelUrl(file) {
  return `${import.meta.env.BASE_URL}models/${file}`;
}

export function loadModel(file) {
  return loader.loadAsync(modelUrl(file));
}

export function disposeModelTree(root, resources = new Set()) {
  root.traverse(object => {
    if (object.geometry) resources.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!material) continue;
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
      for (const uniform of Object.values(material.uniforms ?? {})) if (uniform.value?.isTexture) resources.add(uniform.value);
    }
  });
  for (const resource of resources) {
    if (resource.isTexture) resource.source?.data?.close?.();
    resource.dispose?.();
  }
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

// Shared GLB surfaces become instanced parts. Named limbs pivot independently for walking.
export function crowdFrom(root, count) {
  root.updateMatrixWorld(true);
  const parts = [];
  root.traverse(object => {
    if (!object.isMesh) return;
    const geometry = object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    const mesh = new THREE.InstancedMesh(geometry, object.material.clone(), count);
    mesh.name = `Crowd.${object.name}`;
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const tint = /Cloth|Coat/i.test(object.name);
    if (tint) mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    const limb = object.name.match(/(Leg|Arm)\.?(Left|Right)/);
    let pivot = null, swing = 0;
    if (limb) {
      const side = limb[2] === 'Left' ? -1 : 1;
      pivot = new THREE.Vector3(side * (limb[1] === 'Leg' ? .097 : .195), limb[1] === 'Leg' ? .82 : 1.27, 0);
      swing = side * (limb[1] === 'Leg' ? 1 : -0.75);
    }
    parts.push({ mesh, tint, pivot, swing });
  });
  return parts;
}

const limbMatrix = new THREE.Matrix4();
const limbBack = new THREE.Matrix4();
const limbTurn = new THREE.Matrix4();

// Build the transform around a model-space joint, then place the whole person.
export function setCrowdPose(parts, index, bodyMatrix, phase, stride = .24) {
  const angle = Math.sin(phase) * stride;
  for (const part of parts) {
    if (!part.pivot || stride === 0) part.mesh.setMatrixAt(index, bodyMatrix);
    else {
      const { x, y, z } = part.pivot;
      limbMatrix.makeTranslation(x, y, z);
      limbTurn.makeRotationX(angle * part.swing);
      limbBack.makeTranslation(-x, -y, -z);
      limbMatrix.multiply(limbTurn).multiply(limbBack).premultiply(bodyMatrix);
      part.mesh.setMatrixAt(index, limbMatrix);
    }
  }
}
