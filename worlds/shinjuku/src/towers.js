import * as THREE from 'three';
import { createStage, seededRandom } from '../../../shared/stage.js';
import { crowdFrom } from '../../../shared/models.js';
import { loadStageModels, modelCopy, enhanceStage } from '../../../shared/detail-assets.js';

export const vistas = [
  { id: 'avenue', number: '01', name: '西新宿', en: 'AVENUE', position: [0, 6.2, 22], target: [0, 24, -36], note: '通りの先に、段状の双塔が立つ。' },
  { id: 'rise', number: '02', name: 'コクーン', en: 'COCOON', position: [-6, 8, 8], target: [-16, 28, -10], note: '楕円の塔を、白い斜めの肋骨が包む。' },
  { id: 'tocho', number: '03', name: '都庁', en: 'TWIN TOWERS', position: [2, 9, 4], target: [0, 40, -40], note: 'ふたつの冠が、夜の先で対になっている。' },
];

export async function createTowers(container, onError) {
  const stage = createStage(container, {
    background: '#070b16', fog: 0.007, position: vistas[0].position, target: vistas[0].target,
    label: '新宿の夜。都庁の双塔と、楕円の格子塔。ドラッグで見回せます。',
    bloom: 0.28, bloomThreshold: 1.1, exposure: 1.05, fov: 50, mobileFov: 72,
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

  const road = new THREE.Mesh(new THREE.PlaneGeometry(90, 110), standard('#10141c', { roughness: 0.28, metalness: 0.45 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, -16);
  scene.add(road);
  for (const x of [-5.2, 5.2]) box(new THREE.MeshBasicMaterial({ color: '#f2e2b0' }), [x, 0.04, 2], [0.1, 0.02, 42]);

  const [tocho, cocoon, person, office, taxiModel, furniture, canopy] = await loadStageModels(stage, [
    'tocho.glb', 'cocoon.glb', 'street_person.glb', 'office_facade.glb',
    'black_taxi.glb', 'avenue_furniture.glb', 'station_canopy.glb',
  ]);
  scene.add(modelCopy(tocho, [0, 0, -48]));
  scene.add(modelCopy(cocoon, [-18, 0, -6]));
  const heights = [48, 38, 56, 34];
  heights.forEach((height, index) => {
    const side = index % 2 === 0 ? 1 : -1;
    const z = -16 - index * 8;
    scene.add(modelCopy(office, [side * 16, 0, z], side > 0 ? -Math.PI / 2 : Math.PI / 2, [(8 + index % 3) / 8, height / 40, 1]));
    scene.add(new THREE.PointLight(index % 2 ? '#ffb15a' : '#7eb6ff', 14, 16, 2).translateX(side * 8).translateY(3).translateZ(z + 4));
  });
  scene.add(modelCopy(canopy, [9.1, 0, 12], -Math.PI / 2));
  scene.add(modelCopy(furniture, [-8.6, 0, 16], Math.PI / 2));
  scene.add(new THREE.PointLight('#f0d7a0', 30, 40, 2).translateY(58).translateZ(-44));

  const taxis = Array.from({ length: 6 }, (_, index) => {
    const taxi = modelCopy(taxiModel);
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

  enhanceStage(stage, moon, { extent: 65, target: [0, 0, -28], environment: 0.4 });
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
