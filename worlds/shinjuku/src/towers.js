import * as THREE from 'three';
import { createStage, seededRandom } from '../../../shared/stage.js';
import { crowdFrom, loadModel } from '../../../shared/models.js';

export const vistas = [
  { id: 'avenue', number: '01', name: '西新宿', en: 'AVENUE', position: [0, 6.2, 22], target: [0, 24, -36], note: '通りの先に、段状の双塔が立つ。' },
  { id: 'rise', number: '02', name: 'コクーン', en: 'COCOON', position: [-6, 8, 8], target: [-16, 28, -10], note: '楕円の塔を、白い斜めの肋骨が包む。' },
  { id: 'tocho', number: '03', name: '都庁', en: 'TWIN TOWERS', position: [2, 9, 4], target: [0, 40, -40], note: 'ふたつの冠が、夜の先で対になっている。' },
];

export async function createTowers(container, onError) {
  const stage = createStage(container, {
    background: '#070b16', fog: 0.007, position: vistas[0].position, target: vistas[0].target,
    label: '新宿の夜。都庁の双塔と、楕円の格子塔。ドラッグで見回せます。',
    bloom: 0.45, bloomThreshold: 0.68, exposure: 1.1, fov: 50, mobileFov: 72,
    bounds: { minX: -7, maxX: 7, minZ: 2, maxZ: 24 }, onError,
  });
  const { scene } = stage;
  const random = seededRandom(1603);
  const standard = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, ...extra });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function box(material, position, scale) {
    const result = new THREE.Mesh(cube, material);
    result.position.set(...position);
    result.scale.set(...scale);
    scene.add(result);
    return result;
  }

  scene.add(new THREE.HemisphereLight('#1c3358', '#07060c', 0.7));
  const moon = new THREE.DirectionalLight('#d7e4ff', 0.95);
  moon.position.set(-24, 36, 14);
  scene.add(moon);
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 16), new THREE.MeshBasicMaterial({ color: '#f4f0e4' })).translateX(18).translateY(32).translateZ(-16));

  const windows = document.createElement('canvas');
  windows.width = 128;
  windows.height = 256;
  const paint = windows.getContext('2d');
  paint.fillStyle = '#061018';
  paint.fillRect(0, 0, 128, 256);
  for (let y = 8; y < 256; y += 14) for (let x = 8; x < 128; x += 12) {
    if (random() > 0.32) {
      paint.fillStyle = random() > 0.7 ? '#d7e6ff' : '#ffe1a4';
      paint.fillRect(x, y, 6, 8);
    }
  }
  const windowMap = new THREE.CanvasTexture(windows);
  windowMap.colorSpace = THREE.SRGBColorSpace;
  windowMap.wrapS = windowMap.wrapT = THREE.RepeatWrapping;
  windowMap.repeat.set(1, 3);
  const towerMaterial = new THREE.MeshStandardMaterial({
    color: '#8ea0b4', emissive: '#ffffff', emissiveMap: windowMap, emissiveIntensity: 1.15,
    roughness: 0.45, metalness: 0.2,
  });

  const road = new THREE.Mesh(new THREE.PlaneGeometry(90, 110), standard('#10141c', { roughness: 0.28, metalness: 0.45 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, -16);
  scene.add(road);
  for (const x of [-5.2, 5.2]) box(new THREE.MeshBasicMaterial({ color: '#f2e2b0' }), [x, 0.04, 2], [0.1, 0.02, 42]);

  const heights = [32, 48, 38, 56, 34];
  heights.forEach((height, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const z = -8 - index * 8;
    box(towerMaterial, [side * 16, height / 2, z], [7 + (index % 3), height, 8]);
    const shop = new THREE.PointLight(index % 2 ? '#ffb15a' : '#7eb6ff', 14, 16, 2);
    shop.position.set(side * 8, 3, z + 4);
    scene.add(shop);
  });

  const [tocho, cocoon, person] = await Promise.all([
    loadModel('tocho.glb'),
    loadModel('cocoon.glb'),
    loadModel('street_person.glb'),
  ]);
  tocho.scene.position.set(0, 0, -48);
  cocoon.scene.position.set(-18, 0, -6);
  scene.add(tocho.scene, cocoon.scene);
  scene.add(new THREE.PointLight('#f0d7a0', 30, 40, 2).translateY(58).translateZ(-44));

  const taxis = Array.from({ length: 6 }, (_, index) => {
    const taxi = new THREE.Group();
    const body = new THREE.Mesh(cube, standard('#16181e', { metalness: 0.4, roughness: 0.35 }));
    body.scale.set(1.7, 0.55, 0.8);
    body.position.y = 0.45;
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.16), new THREE.MeshBasicMaterial({ color: '#ffd27a' }));
    lamp.position.set(0, 0.78, 0);
    taxi.add(body, lamp);
    taxi.userData.lane = index % 2 ? 2.2 : -2.2;
    taxi.userData.offset = index / 6;
    taxi.userData.direction = index % 2 ? 1 : -1;
    scene.add(taxi);
    return taxi;
  });

  const count = matchMedia('(max-width: 700px)').matches ? 24 : 40;
  const parts = crowdFrom(person.scene, count);
  for (const part of parts) scene.add(part.mesh);
  const coats = ['#141820', '#2a3344', '#d8d2c8', '#3a2a24', '#1c2830'];
  const walkers = Array.from({ length: count }, () => ({
    side: random() > 0.5 ? 6.4 : -6.4,
    phase: random(),
    speed: 0.25 + random() * 0.3,
    coat: coats[Math.floor(random() * coats.length)],
  }));
  const dummy = new THREE.Object3D();
  const coatColor = new THREE.Color();

  stage.animate(time => {
    taxis.forEach(taxi => {
      const travel = ((taxi.userData.offset + time * 0.04) % 1) * 50 - 10;
      taxi.position.set(taxi.userData.lane, 0, taxi.userData.direction > 0 ? travel : 20 - travel);
      taxi.rotation.y = taxi.userData.direction > 0 ? 0 : Math.PI;
    });
    walkers.forEach((walker, index) => {
      const z = ((walker.phase + time * walker.speed * 0.05) % 1) * 22;
      dummy.position.set(walker.side, 0, z);
      dummy.rotation.set(0, walker.side > 0 ? Math.PI : 0, 0);
      dummy.updateMatrix();
      coatColor.set(walker.coat);
      for (const part of parts) {
        part.mesh.setMatrixAt(index, dummy.matrix);
        if (part.tint) part.mesh.setColorAt(index, coatColor);
      }
    });
    for (const part of parts) {
      part.mesh.count = count;
      part.mesh.instanceMatrix.needsUpdate = true;
      if (part.mesh.instanceColor) part.mesh.instanceColor.needsUpdate = true;
    }
  });
  return stage;
}
