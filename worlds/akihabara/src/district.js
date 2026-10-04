import * as THREE from 'three';
import { createStage, seededRandom } from '../../../shared/stage.js';

export const vistas = [
  { id: 'street', number: '01', name: '電気街', en: 'MAIN STREET', position: [0, 3.2, 16], target: [0, 4.5, -8], note: '看板の谷間を、ゆっくり歩く。' },
  { id: 'signs', number: '02', name: '縦看板', en: 'SIGNS', position: [1.2, 6.4, 6], target: [-2, 10, -6], note: '赤と黄が、空の代わりになっている。' },
  { id: 'arcade', number: '03', name: 'アーケード', en: 'ARCADE', position: [-1.4, 2.8, 8], target: [-4.2, 2.4, -2], note: '入り口の光が、通りへこぼれる。' },
];

export function createDistrict(container, onError) {
  const stage = createStage(container, {
    background: '#c5d5e0', fog: 0.01, position: vistas[0].position, target: vistas[0].target,
    label: '秋葉原の電気街。縦看板とアーケード。ドラッグで見回せます。',
    bloom: 0.32, bloomThreshold: 0.68, exposure: 1.02, fov: 56, mobileFov: 78,
    bounds: { minX: -2.4, maxX: 2.4, minZ: 1, maxZ: 18 }, onError,
  });
  const { scene } = stage;
  seededRandom(1980);
  const standard = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.78, ...extra });
  const facade = standard('#6e655c');
  const trim = standard('#2c2826', { roughness: 0.45, metalness: 0.25 });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const signColors = ['#e23b3b', '#f0b429', '#f4f1ea', '#3ec6d8', '#ff7a3c', '#7d5cff'];
  function mesh(geometry, material, position, scale = [1, 1, 1], parent = scene) {
    const result = new THREE.Mesh(geometry, material);
    result.position.set(...position); result.scale.set(...scale); parent.add(result); return result;
  }
  function box(material, position, scale, parent) { return mesh(cube, material, position, scale, parent); }

  scene.add(new THREE.HemisphereLight('#f3fbff', '#8d7b68', 1.15));
  const sun = new THREE.DirectionalLight('#fff2dd', 1.6);
  sun.position.set(8, 22, 10); scene.add(sun);
  mesh(new THREE.PlaneGeometry(40, 70), standard('#3a4044', { roughness: 0.92 }), [0, 0, 0]).rotation.x = -Math.PI / 2;
  for (const x of [-1.15, 1.15]) box(standard('#d7d2c8'), [x, 0.02, 6], [0.08, 0.02, 28]);

  const blink = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const z = -8 + i * 3.4;
      const height = 9 + (i % 3) * 2.4;
      const depth = 3.1;
      box(facade, [side * 6.2, height / 2, z], [4.2, height, depth]);
      box(trim, [side * 4.05, 1.6, z], [0.18, 3.2, depth * 0.92]);
      for (let s = 0; s < 2; s++) {
        const color = signColors[(i + s + (side < 0 ? 1 : 0)) % signColors.length];
        const sign = box(new THREE.MeshBasicMaterial({ color }), [side * (4.15 - s * 0.55), 3.2 + s * 1.6 + (i % 2), z + (s - 0.5) * 0.8], [0.12, 2.4 + (i % 3) * 0.7, 0.7]);
        if ((i + s) % 3 === 0) blink.push(sign);
      }
      if (i % 2 === 0) {
        const glow = new THREE.PointLight(signColors[i % signColors.length], 6, 7, 2);
        glow.position.set(side * 3.6, 3.4, z); scene.add(glow);
      }
    }
  }

  for (let i = 0; i < 5; i++) {
    const z = -2 + i * 3.2;
    box(new THREE.MeshBasicMaterial({ color: i % 2 ? '#69e1ff' : '#ffd15c' }), [-4.2, 1.3, z], [0.08, 1.8, 1.1]);
    box(trim, [-4.35, 1.3, z], [0.2, 2.2, 1.35]);
  }
  const arcade = new THREE.PointLight('#7ee7ff', 18, 10, 2);
  arcade.position.set(-3.2, 2.2, 2); scene.add(arcade);

  for (let i = 0; i < 8; i++) {
    const z = -6 + i * 2.8;
    box(standard('#2a2e32', { metalness: 0.4, roughness: 0.4 }), [0, 8.6 + (i % 2) * 0.4, z], [7.4, 0.03, 0.03]);
  }
  for (const x of [-3.4, 3.4]) for (const z of [-4, 2, 8]) box(trim, [x, 4.4, z], [0.08, 8.8, 0.08]);

  const cabinets = [];
  for (let i = 0; i < 6; i++) {
    const light = box(new THREE.MeshBasicMaterial({ color: '#9af6ff' }), [3.55, 1.15, -1 + i * 1.5], [0.08, 0.7, 0.45]);
    box(trim, [3.7, 0.9, -1 + i * 1.5], [0.35, 1.5, 0.7]);
    cabinets.push(light);
  }

  stage.animate(time => {
    blink.forEach((sign, index) => { sign.material.color.set(signColors[Math.floor(time * 1.5 + index) % signColors.length]); });
    cabinets.forEach((light, index) => { light.material.color.setHSL((time * 0.08 + index * 0.17) % 1, 0.7, 0.62); });
    arcade.intensity = 14 + Math.sin(time * 3) * 3;
  });
  return stage;
}
