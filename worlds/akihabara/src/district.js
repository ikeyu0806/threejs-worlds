import * as THREE from 'three';
import { createStage, seededRandom } from '../../../shared/stage.js';
import { crowdFrom } from '../../../shared/models.js';
import { loadStageModels, modelCopy, enhanceStage } from '../../../shared/detail-assets.js';

export const vistas = [
  { id: 'street', number: '01', name: '中央通り', en: 'CHUO-DORI', position: [0, 4.2, 18], target: [0, 6, -10], note: '電気街口から、看板の谷を北へ歩く。' },
  { id: 'signs', number: '02', name: '縦看板', en: 'SIGNS', position: [-2, 5.2, 6], target: [-8, 12, 2], note: 'ガラスのホールから、色の看板が通りへ出ている。' },
  { id: 'arcade', number: '03', name: 'アーケード', en: 'ARCADE', position: [3.2, 3.4, 2], target: [10, 4, -4], note: '黄色い商業棟の足元で、ゲームの光がこぼれる。' },
];

function signTexture(lines, background, ink) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 768;
  const paint = canvas.getContext('2d');
  paint.fillStyle = background;
  paint.fillRect(0, 0, 256, 768);
  paint.strokeStyle = ink;
  paint.lineWidth = 10;
  paint.strokeRect(16, 16, 224, 736);
  paint.fillStyle = ink;
  paint.font = '700 92px "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  paint.textAlign = 'center';
  [...lines].forEach((char, index) => paint.fillText(char, 128, 150 + index * 120));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export async function createDistrict(container, onError) {
  const stage = createStage(container, {
    background: '#9eb4c6', fog: 0.011, position: vistas[0].position, target: vistas[0].target,
    label: '秋葉原の中央通り。ガラスのホール、黄色い商業棟、頭上の電車。ドラッグで見回せます。',
    bloom: 0.22, bloomThreshold: 1.1, exposure: 0.96, fov: 54, mobileFov: 76,
    bounds: { minX: -3.2, maxX: 3.2, minZ: -8, maxZ: 18 }, onError,
  });
  const { scene } = stage;
  const random = seededRandom(1980);
  const standard = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.72, ...extra });
  const trim = standard('#2c2826', { roughness: 0.45, metalness: 0.25 });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function box(material, position, scale) {
    const result = new THREE.Mesh(cube, material);
    result.position.set(...position);
    result.scale.set(...scale);
    scene.add(result);
    return result;
  }

  scene.add(new THREE.HemisphereLight('#f4fbff', '#8d7b68', 1.2));
  const sun = new THREE.DirectionalLight('#fff2dd', 1.7);
  sun.position.set(12, 24, 8);
  scene.add(sun);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(80, 90), standard('#3a4044', { roughness: 0.92 }));
  road.rotation.x = -Math.PI / 2;
  scene.add(road);
  for (const x of [-3.4, 3.4]) box(standard('#d7d2c8'), [x, 0.03, 0], [0.16, 0.02, 48]);

  const words = ['模型', '無線', 'カード', '電気', '劇場', '同人'];
  const inks = ['#e23b3b', '#f0b429', '#f4f1ea', '#3ec6d8', '#ff7a3c', '#7d5cff'];
  words.forEach((word, index) => {
    const side = index % 2 ? 1 : -1;
    const material = new THREE.MeshBasicMaterial({ map: signTexture(word, '#14181c', inks[index]), toneMapped: false });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 3.8), material);
    panel.position.set(side * 4.6, 5.2 + (index % 3) * 0.4, 8 - index * 4.2);
    panel.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    scene.add(panel);
    box(trim, [side * 4.6, 5.2, 8 - index * 4.2], [0.2, 4.2, 0.2]);
  });

  const [radio, discount, camera, train, blade, person, viaduct, arcadeFront, vending, pole] = await loadStageModels(stage, [
    'radio_hall.glb', 'discount_hall.glb', 'camera_store.glb', 'commuter_train.glb',
    'blade_sign.glb', 'street_person.glb', 'railway_viaduct.glb', 'arcade_front.glb',
    'vending_bank.glb', 'utility_pole.glb',
  ]);
  scene.add(modelCopy(radio, [-13, 0, 2], Math.PI / 2));
  scene.add(modelCopy(discount, [13, 0, -8], -Math.PI / 2));
  scene.add(modelCopy(camera, [0, 0, -32]));
  scene.add(modelCopy(viaduct, [0, 0, 12]));
  scene.add(modelCopy(arcadeFront, [9.8, 0, -5], -Math.PI / 2));
  scene.add(modelCopy(vending, [-8.5, 0, 6], Math.PI / 2));
  scene.add(modelCopy(vending, [8.2, 0, -14], -Math.PI / 2));
  for (let i = 0; i < 7; i++) {
    const z = 12 - i * 5;
    for (const side of [-1, 1]) scene.add(modelCopy(pole, [side * 7.2, 0, z]));
    box(trim, [0, 12.38, z], [14.6, 0.035, 0.035]);
  }
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1;
    scene.add(modelCopy(blade, [side * 5.2, 0, 10 - i * 4.5], side > 0 ? -Math.PI / 2 : Math.PI / 2));
  }
  const movingTrain = modelCopy(train, [-16, 8.68, 12], Math.PI / 2);
  scene.add(movingTrain);

  const arcade = new THREE.PointLight('#7ee7ff', 20, 12, 2);
  arcade.position.set(8.5, 2.4, -6);
  scene.add(arcade);
  scene.add(new THREE.PointLight('#ffb15a', 16, 14, 2).translateX(-8).translateY(4).translateZ(2));

  const count = matchMedia('(max-width: 700px)').matches ? 28 : 48;
  const parts = crowdFrom(person.scene, count);
  for (const part of parts) scene.add(part.mesh);
  const coats = ['#1d2430', '#c23b4a', '#f2f0ea', '#243c6a', '#6a4a28', '#202228'];
  const walkers = Array.from({ length: count }, () => ({
    x: (random() - 0.5) * 5.2,
    phase: random(),
    speed: 0.35 + random() * 0.35,
    coat: coats[Math.floor(random() * coats.length)],
    direction: random() > 0.5 ? 1 : -1,
  }));
  const dummy = new THREE.Object3D();
  const coatColor = new THREE.Color();

  enhanceStage(stage, sun, { extent: 38, target: [0, 0, -10], environment: 0.3 });
  stage.animate(time => {
    movingTrain.position.x = ((time * 4.2) % 40) - 20;
    arcade.intensity = 16 + Math.sin(time * 3) * 4;
    walkers.forEach((walker, index) => {
      const travel = ((walker.phase + time * walker.speed * 0.08) % 1) * 36 - 14;
      dummy.position.set(walker.x, 0, walker.direction > 0 ? travel : -travel);
      dummy.rotation.set(0, walker.direction > 0 ? 0 : Math.PI, 0);
      dummy.scale.setScalar(0.94);
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
