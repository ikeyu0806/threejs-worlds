import * as THREE from 'three';
import { enhanceStage, loadStageModels, modelCopy } from '../../../shared/detail-assets.js';
import { crowdFrom } from '../../../shared/models.js';
import { createStage, seededRandom } from '../../../shared/stage.js';

export const vistas = [
  { id: 'gate', number: '01', name: '朱雀門', en: 'SUZAKU', position: [0, 3.6, 16], target: [0, 5.2, -14], note: '朝の門が、砂利の道の先に立つ。' },
  { id: 'pond', number: '02', name: '庭の池', en: 'STILL POND', position: [4.5, 3.3, 8], target: [8.5, 1.4, -4], note: '水面が、空の色をたたえている。' },
  { id: 'moon', number: '03', name: '月の縁側', en: 'MOON VERANDA', position: [-10.2, 4.2, 9.2], target: [-2, 8.5, -16], note: '薄い月が、屋根の上に残っている。' },
];

export async function createCapital(container, onError) {
  const stage = createStage(container, {
    background: '#d7c8b4', fog: 0.006, position: vistas[0].position, target: vistas[0].target,
    label: '朝霧の古都。朱雀門、庭の池、縁側。ドラッグで見回せます。',
    bloom: 0.12, bloomThreshold: 1.25, exposure: 0.95, fov: 50, mobileFov: 74,
    bounds: { minX: -12, maxX: 12, minZ: 3, maxZ: 18 }, onError,
  });
  const { scene } = stage;
  const random = seededRandom(794);
  const standard = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.72, ...extra });
  function mesh(geometry, material, position, scale = [1, 1, 1], parent = scene) {
    const result = new THREE.Mesh(geometry, material);
    result.position.set(...position); result.scale.set(...scale); parent.add(result); return result;
  }
  scene.add(new THREE.HemisphereLight('#fff6ea', '#b7a48e', 1.1));
  const morning = new THREE.DirectionalLight('#ffe0b8', 2.5);
  morning.position.set(18, 14, 10); scene.add(morning);
  const fill = new THREE.DirectionalLight('#d5e4ea', 0.7);
  fill.position.set(-12, 8, -6); scene.add(fill);

  const gravelCanvas = document.createElement('canvas'); gravelCanvas.width = gravelCanvas.height = 512;
  const gravelPaint = gravelCanvas.getContext('2d');
  gravelPaint.fillStyle = '#e5d9c6'; gravelPaint.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 18000; i++) {
    gravelPaint.fillStyle = `rgba(${random() > 0.5 ? '120,104,84' : '255,250,240'},${random() * 0.16})`;
    gravelPaint.fillRect(random() * 512, random() * 512, 1 + random() * 2, 1 + random());
  }
  gravelPaint.strokeStyle = 'rgba(168,148,120,.28)'; gravelPaint.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    gravelPaint.beginPath(); gravelPaint.arc(256, 420, 40 + i * 22, Math.PI * 1.05, Math.PI * 1.95); gravelPaint.stroke();
  }
  const gravelMap = new THREE.CanvasTexture(gravelCanvas); gravelMap.colorSpace = THREE.SRGBColorSpace;
  gravelMap.wrapS = gravelMap.wrapT = THREE.RepeatWrapping; gravelMap.repeat.set(10, 10);
  const ground = mesh(new THREE.PlaneGeometry(90, 90), standard('#e4d8c6', { map: gravelMap, roughness: 0.95 }), [0, 0, 0]);
  ground.rotation.x = -Math.PI / 2;

  const [gate, hall, wall, lanternModel, pineModel, cherryModel, verandaModel, rocks, koiModel, stepping, ridge] = await loadStageModels(stage, ['suzaku_gate.glb', 'palace_hall.glb', 'garden_wall.glb', 'stone_lantern.glb', 'garden_pine.glb', 'cherry_tree.glb', 'veranda.glb', 'garden_rocks.glb', 'pond_koi.glb', 'stepping_stone.glb', 'distant_ridge.glb']);
  scene.add(modelCopy(gate, [0, 0, -14]), modelCopy(hall, [0, 0, -24]));
  for (const side of [-1, 1]) scene.add(modelCopy(wall, [side * 12, 0, -12.2]));
  for (const [x, z, scale] of [[-12.6, -2.4, 1.2], [13.4, -3.2, 1.15], [-9.2, -8.5, .85], [11.5, -9.5, .8]]) scene.add(modelCopy(pineModel, [x, 0, z], x * .08, scale));
  for (const [x, z, scale] of [[-11.2, 5.4, .85], [12.6, 6.4, .8]]) scene.add(modelCopy(cherryModel, [x, 0, z], x * .07, scale));
  const lanterns = [];
  for (const [x, z] of [[-3.2, 4.5], [3.2, 4.5], [-3.2, 11], [3.2, 11], [9.2, 2.4], [-5.5, 3.2]]) {
    scene.add(modelCopy(lanternModel, [x, 0, z]));
    const light = new THREE.PointLight('#ffb56a', 3.2, 7, 2);
    light.position.set(x, 1.16, z); scene.add(light); lanterns.push(light);
  }
  scene.add(modelCopy(verandaModel, [-11.4, 0, 7.4]), modelCopy(rocks, [8.6, 0, -4.2]));

  const water = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } }, transparent: true,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv; uniform float time; void main(){
      float ripple=sin(vUv.x*46.+time*.7)*sin(vUv.y*38.-time*.45);
      vec3 deep=vec3(.28,.4,.4), sky=vec3(.78,.8,.74);
      vec3 c=mix(deep,sky,smoothstep(.15,.9,vUv.y));
      c+=ripple*.035;
      float edge=smoothstep(0.,.08,vUv.x)*smoothstep(1.,.92,vUv.x)*smoothstep(0.,.08,vUv.y)*smoothstep(1.,.92,vUv.y);
      gl_FragColor=vec4(c,.82*edge);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const pond = mesh(new THREE.CircleGeometry(4.6, 48), water, [8.6, 0.035, -4.2]);
  pond.rotation.x = -Math.PI / 2;
  const koi = crowdFrom(koiModel.scene, 9);
  for (const part of koi) scene.add(part.mesh);
  const koiData = Array.from({ length: 9 }, (_, index) => ({ radius: 1.2 + (index % 3) * .9, phase: index }));
  for (const z of [14, 11, 8, 5]) scene.add(modelCopy(stepping, [0, 0, z], z * .12));
  scene.add(modelCopy(ridge, [0, 0, -46]));

  const moon = mesh(new THREE.SphereGeometry(1.15, 24, 16), new THREE.MeshBasicMaterial({ color: '#f7f3ea' }), [-4.5, 15.5, -22]);
  mesh(new THREE.SphereGeometry(2.1, 20, 14), new THREE.MeshBasicMaterial({ color: '#fff6e8', transparent: true, opacity: 0.18, depthWrite: false }), [-4.5, 15.5, -22]);

  const mistMaterial = new THREE.MeshBasicMaterial({ color: '#efe4d4', transparent: true, opacity: 0.07, depthWrite: false });
  const mists = [];
  for (const [x, y, z, w] of [[0, 1.1, 2, 28], [6, 0.8, -6, 22], [-8, 1.4, 10, 18]]) {
    const sheet = mesh(new THREE.PlaneGeometry(w, 1.6), mistMaterial, [x, y, z]);
    sheet.userData.originX = x; mists.push(sheet);
  }

  const petalCount = matchMedia('(max-width: 700px)').matches ? 40 : 80;
  const petalGeometry = new THREE.PlaneGeometry(0.14, 0.09);
  const petals = new THREE.InstancedMesh(petalGeometry, new THREE.MeshBasicMaterial({ color: '#f3d0d4', side: THREE.DoubleSide, transparent: true, opacity: 0.88, depthWrite: false }), petalCount);
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage); petals.frustumCulled = false; scene.add(petals);
  const petalData = Array.from({ length: petalCount }, () => ({
    x: (random() - 0.35) * 22, y: random() * 8, z: -2 + random() * 18, spin: random() * 6, speed: 0.25 + random() * 0.35, drift: random() * Math.PI * 2,
  }));
  const dummy = new THREE.Object3D();

  enhanceStage(stage, morning, { extent: 32, target: [0, 0, -10], environment: .25 });
  stage.animate((time, dt) => {
    water.uniforms.time.value = time;
    koiData.forEach((fish, index) => {
      const angle = fish.phase + time * 0.35;
      dummy.position.set(8.6 + Math.cos(angle) * fish.radius, 0.12, -4.2 + Math.sin(angle) * fish.radius * 0.72);
      dummy.rotation.set(0, Math.atan2(-Math.sin(angle), Math.cos(angle) * .72), 0);
      dummy.updateMatrix();
      for (const part of koi) part.mesh.setMatrixAt(index, dummy.matrix);
    });
    for (const part of koi) { part.mesh.count = koiData.length; part.mesh.instanceMatrix.needsUpdate = true; }
    lanterns.forEach((light, index) => { light.intensity = 2.6 + Math.sin(time * 2.2 + index) * 0.45; });
    moon.position.y = 15.5 + Math.sin(time * 0.15) * 0.05;
    mists.forEach((sheet, index) => { sheet.position.x = sheet.userData.originX + Math.sin(time * 0.2 + index) * .6; });
    petalData.forEach((petal, index) => {
      petal.y -= petal.speed * dt;
      if (petal.y < 0.05) petal.y = 6 + random() * 3;
      dummy.position.set(petal.x + Math.sin(time * 0.35 + petal.drift) * 0.6, petal.y, petal.z + Math.cos(time * 0.22 + petal.drift) * 0.3);
      dummy.rotation.set(time * 0.4, petal.spin + time * 0.5, time * 0.3);
      dummy.updateMatrix(); petals.setMatrixAt(index, dummy.matrix);
    });
    petals.instanceMatrix.needsUpdate = true;
  });
  return stage;
}
