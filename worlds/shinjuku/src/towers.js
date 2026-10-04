import * as THREE from 'three';
import { createStage, seededRandom } from '../../../shared/stage.js';

export const vistas = [
  { id: 'avenue', number: '01', name: '大通り', en: 'AVENUE', position: [0, 5.4, 16], target: [0, 18, -24], note: '塔の足元で、夜が濃くなる。' },
  { id: 'rise', number: '02', name: '高層', en: 'RISE', position: [5, 9, 6], target: [-8, 36, -24], note: '窓の光が、縦に積もっている。' },
  { id: 'tocho', number: '03', name: '都庁', en: 'TWIN TOWERS', position: [-2, 7, 8], target: [0, 32, -32], note: 'ふたつの塔が、夜の先に立つ。' },
];

export function createTowers(container, onError) {
  const stage = createStage(container, {
    background: '#070b16', fog: 0.008, position: vistas[0].position, target: vistas[0].target,
    label: '新宿の夜。高層ビルと都庁のツインタワー。ドラッグで見回せます。',
    bloom: 0.4, bloomThreshold: 0.7, exposure: 1.08, fov: 52, mobileFov: 74,
    bounds: { minX: -6, maxX: 6, minZ: 2, maxZ: 20 }, onError,
  });
  const { scene } = stage;
  const random = seededRandom(1603);
  const standard = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
  const podium = standard('#1a140f', { roughness: 0.55 });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function mesh(geometry, material, position, scale = [1, 1, 1], parent = scene) {
    const result = new THREE.Mesh(geometry, material);
    result.position.set(...position); result.scale.set(...scale); parent.add(result); return result;
  }
  function box(material, position, scale, parent) { return mesh(cube, material, position, scale, parent); }

  scene.add(new THREE.HemisphereLight('#1c3358', '#07060c', 0.55));
  const moon = new THREE.DirectionalLight('#d7e4ff', 0.85);
  moon.position.set(-20, 30, 12); scene.add(moon);
  mesh(new THREE.SphereGeometry(1.1, 20, 14), new THREE.MeshBasicMaterial({ color: '#f4f0e4' }), [16, 28, -20]);

  const windows = document.createElement('canvas'); windows.width = windows.height = 256;
  const paint = windows.getContext('2d');
  paint.fillStyle = '#000000'; paint.fillRect(0, 0, 256, 256);
  for (let y = 8; y < 256; y += 14) for (let x = 8; x < 256; x += 12) {
    if (random() > 0.28) {
      paint.fillStyle = random() > 0.72 ? '#d7e6ff' : '#ffe1a4';
      paint.fillRect(x, y, 6, 8);
    }
  }
  const windowMap = new THREE.CanvasTexture(windows); windowMap.colorSpace = THREE.SRGBColorSpace;
  windowMap.wrapS = windowMap.wrapT = THREE.RepeatWrapping;
  windowMap.repeat.set(1, 4);
  const towerMaterial = new THREE.MeshStandardMaterial({
    color: '#101820', emissive: '#ffffff', emissiveMap: windowMap, emissiveIntensity: 1.45,
    roughness: 0.62, metalness: 0.12,
  });

  mesh(new THREE.PlaneGeometry(80, 90), standard('#12151c', { roughness: 0.94 }), [0, 0, -8]).rotation.x = -Math.PI / 2;
  for (const x of [-4.2, 4.2]) box(new THREE.MeshBasicMaterial({ color: '#f2e2b0' }), [x, 0.04, 4], [0.08, 0.02, 36]);

  const heights = [28, 42, 36, 50, 33, 46];
  heights.forEach((height, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const z = -6 - Math.floor(index / 2) * 9;
    const width = 6 + (index % 3);
    box(towerMaterial, [side * 12, height / 2, z], [width, height, 7]);
    box(podium, [side * 9, 2.2, z + 4], [8, 4.4, 3]);
    const shop = new THREE.PointLight(index % 2 ? '#ffb15a' : '#7eb6ff', 12, 12, 2);
    shop.position.set(side * 6.5, 2.4, z + 4); scene.add(shop);
  });

  const tochoMat = towerMaterial;
  for (const x of [-3.2, 3.2]) {
    box(tochoMat, [x, 34, -32], [4.2, 68, 4.2]);
    box(tochoMat, [x, 70, -32], [2.2, 6, 2.2]);
  }
  box(tochoMat, [0, 62, -32], [6.4, 2.2, 2.4]);
  const crown = new THREE.PointLight('#f0d7a0', 40, 50, 2);
  crown.position.set(0, 66, -28); scene.add(crown);

  const flickers = [];
  for (let i = 0; i < 18; i++) {
    const light = mesh(new THREE.SphereGeometry(0.08, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffe1a8' }), [(random() - 0.5) * 18, 4 + random() * 40, -8 - random() * 30]);
    flickers.push(light);
  }

  stage.animate(time => {
    flickers.forEach((light, index) => { light.visible = Math.sin(time * 2 + index) > -0.85; });
  });
  return stage;
}
