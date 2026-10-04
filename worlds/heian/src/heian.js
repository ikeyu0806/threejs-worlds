import * as THREE from 'three';
import { createStage, seededRandom } from '../../../shared/stage.js';

export const vistas = [
  { id: 'gate', number: '01', name: '朱雀門', en: 'SUZAKU', position: [0, 3.6, 16], target: [0, 5.2, -14], note: '朝の門が、砂利の道の先に立つ。' },
  { id: 'pond', number: '02', name: '庭の池', en: 'STILL POND', position: [4.5, 3.3, 8], target: [8.5, 1.4, -4], note: '水面が、空の色をたたえている。' },
  { id: 'moon', number: '03', name: '月の縁側', en: 'MOON VERANDA', position: [-10.2, 4.2, 9.2], target: [-2, 8.5, -16], note: '薄い月が、屋根の上に残っている。' },
];

export function createCapital(container, onError) {
  const stage = createStage(container, {
    background: '#d7c8b4', fog: 0.0075, position: vistas[0].position, target: vistas[0].target,
    label: '朝霧の古都。朱雀門、庭の池、縁側。ドラッグで見回せます。',
    bloom: 0.22, bloomThreshold: 0.72, exposure: 1.08, fov: 50, mobileFov: 74,
    bounds: { minX: -12, maxX: 12, minZ: 3, maxZ: 18 }, onError,
  });
  const { scene } = stage;
  const random = seededRandom(794);
  const standard = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.72, ...extra });
  const plaster = standard('#f3efe6', { roughness: 0.86 });
  const vermillion = standard('#a33b2c', { roughness: 0.48 });
  const tile = standard('#3c444c', { roughness: 0.62 });
  const stone = standard('#cfc4b4', { roughness: 0.9 });
  const lanternStone = standard('#7f7468', { roughness: 0.88 });
  const bark = standard('#6a4634', { roughness: 0.84 });
  const pineMat = standard('#2d4a3c', { roughness: 0.8 });
  const blossom = standard('#e7b7c0', { roughness: 0.7, emissive: '#e7b7c0', emissiveIntensity: 0.08 });
  const glow = new THREE.MeshBasicMaterial({ color: '#ffc98a' });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function mesh(geometry, material, position, scale = [1, 1, 1], parent = scene) {
    const result = new THREE.Mesh(geometry, material);
    result.position.set(...position); result.scale.set(...scale); parent.add(result); return result;
  }
  function box(material, position, scale, parent) { return mesh(cube, material, position, scale, parent); }
  function curvedRoof(width, depth, rise, position, parent = scene) {
    const shape = new THREE.Shape();
    const half = depth / 2;
    shape.moveTo(-half, 0);
    shape.quadraticCurveTo(-half - 0.55, rise * 0.2, -half * 0.2, rise);
    shape.lineTo(half * 0.2, rise);
    shape.quadraticCurveTo(half + 0.55, rise * 0.2, half, 0);
    shape.lineTo(-half, 0);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false, curveSegments: 12 });
    geometry.translate(0, 0, -width / 2);
    geometry.rotateY(Math.PI / 2);
    return mesh(geometry, tile, position, [1, 1, 1], parent);
  }

  scene.add(new THREE.HemisphereLight('#fff6ea', '#b7a48e', 1.7));
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

  const gate = new THREE.Group(); gate.position.set(0, 0, -14); scene.add(gate);
  box(stone, [0, 0.4, 0], [11, 0.8, 4.4], gate);
  box(stone, [0, 0.16, 2.6], [4.4, 0.32, 1.8], gate);
  box(stone, [0, 0.05, 3.6], [5.2, 0.1, 0.7], gate);
  for (const x of [-3.6, -1.25, 1.25, 3.6]) for (const z of [-1.2, 1.25]) {
    mesh(new THREE.CylinderGeometry(0.22, 0.26, 5.4, 10), vermillion, [x, 3.3, z], [1, 1, 1], gate);
  }
  box(plaster, [-2.45, 2.6, 1.25], [1.7, 3.4, 0.28], gate);
  box(plaster, [2.45, 2.6, 1.25], [1.7, 3.4, 0.28], gate);
  box(plaster, [-2.45, 2.6, -1.2], [1.7, 3.4, 0.22], gate);
  box(plaster, [2.45, 2.6, -1.2], [1.7, 3.4, 0.22], gate);
  box(vermillion, [0, 6.05, 0], [8.6, 0.42, 3.1], gate);
  box(plaster, [0, 7.05, 0], [6.2, 1.55, 2.3], gate);
  for (const x of [-2.2, 2.2]) mesh(new THREE.CylinderGeometry(0.16, 0.18, 1.5, 8), vermillion, [x, 7.05, 1.05], [1, 1, 1], gate);
  curvedRoof(10.6, 5.2, 1.35, [0, 6.15, 0], gate);
  curvedRoof(7.4, 3.6, 1.15, [0, 8.15, 0], gate);
  box(standard('#2a211c'), [0, 2.3, 0.2], [1.7, 3.5, 0.18], gate);

  const hall = new THREE.Group(); hall.position.set(0, 0, -24); scene.add(hall);
  box(plaster, [0, 2.4, 0], [16, 4.2, 6], hall);
  box(vermillion, [0, 4.7, 0], [16.4, 0.35, 6.3], hall);
  curvedRoof(18, 8, 1.8, [0, 4.9, 0], hall);
  for (const x of [-6, -2, 2, 6]) mesh(new THREE.CylinderGeometry(0.2, 0.24, 4, 8), vermillion, [x, 2.2, 3.1], [1, 1, 1], hall);

  for (const side of [-1, 1]) {
    const wing = new THREE.Group(); scene.add(wing);
    for (let i = 0; i < 5; i++) {
      const x = side * (7.2 + i * 2.5);
      mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.1, 8), vermillion, [x, 1.7, -12.2]);
      if (i < 4) box(plaster, [side * (8.4 + i * 2.5), 1.5, -12.2], [1.6, 2.2, 0.18]);
    }
    curvedRoof(12, 2.4, 0.7, [side * 12, 3.35, -12.2]);
  }

  function pine(x, z, scale = 1) {
    const tree = new THREE.Group(); tree.position.set(x, 0, z); tree.scale.setScalar(scale); scene.add(tree);
    mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.6, 6), bark, [0, 0.8, 0], [1, 1, 1], tree);
    for (let i = 0; i < 4; i++) mesh(new THREE.ConeGeometry(1.05 - i * 0.16, 0.85, 7), pineMat, [0, 1.55 + i * 0.48, 0], [1, 0.75, 1], tree);
  }
  function cherry(x, z, scale = 1) {
    const tree = new THREE.Group(); tree.position.set(x, 0, z); tree.scale.setScalar(scale); scene.add(tree);
    mesh(new THREE.CylinderGeometry(0.1, 0.16, 2.2, 6), bark, [0, 1.1, 0], [1, 1, 1], tree);
    mesh(new THREE.SphereGeometry(1, 14, 10), blossom, [0.1, 2.45, 0], [1.35, 0.85, 1.2], tree);
    mesh(new THREE.SphereGeometry(1, 12, 8), blossom, [0.7, 2.15, 0.25], [0.7, 0.5, 0.65], tree);
    mesh(new THREE.SphereGeometry(1, 12, 8), blossom, [-0.55, 2.2, -0.15], [0.6, 0.45, 0.55], tree);
  }
  pine(-12.6, -2.4, 1.45); pine(13.4, -3.2, 1.3); pine(-9.2, -8.5, 1.05); pine(11.5, -9.5, 0.85);
  cherry(-11.2, 5.4, 1); cherry(12.6, 6.4, 0.9);

  const lanterns = [];
  function lantern(x, z) {
    const post = new THREE.Group(); post.position.set(x, 0, z); scene.add(post);
    box(lanternStone, [0, 0.22, 0], [0.55, 0.44, 0.55], post);
    box(lanternStone, [0, 0.62, 0], [0.28, 0.4, 0.28], post);
    box(glow, [0, 0.95, 0], [0.36, 0.28, 0.36], post);
    mesh(new THREE.ConeGeometry(0.34, 0.36, 4), lanternStone, [0, 1.28, 0], [1, 1, 1], post);
    const light = new THREE.PointLight('#ffb56a', 3.2, 7, 2);
    light.position.set(0, 0.95, 0); post.add(light); lanterns.push(light);
  }
  for (const x of [-3.2, 3.2]) for (const z of [4.5, 11]) lantern(x, z);
  lantern(9.2, 2.4); lantern(-5.5, 3.2);

  const veranda = new THREE.Group(); veranda.position.set(-11.4, 0, 7.4); scene.add(veranda);
  box(standard('#8a6248', { roughness: 0.62 }), [0, 0.42, 0], [5.4, 0.16, 2.4], veranda);
  for (const x of [-2.2, 2.2]) for (const z of [-0.9, 0.9]) box(bark, [x, 0.2, z], [0.12, 0.4, 0.12], veranda);
  for (const x of [-2.3, 0, 2.3]) mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.7, 6), bark, [x, 1.35, -1.05], [1, 1, 1], veranda);
  curvedRoof(5.8, 2.8, 0.55, [0, 2.25, 0], veranda);
  for (let i = 0; i < 8; i++) box(standard('#d9c7a4', { roughness: 0.5 }), [0, 1.55 - i * 0.08, -0.95], [4.6, 0.025, 0.04], veranda);

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
  box(stone, [8.6, 0.08, -1.15], [1.3, 0.12, 2.4]);
  box(stone, [7.4, 0.2, -0.2], [0.9, 0.16, 0.9]);
  const rockGeometry = new THREE.DodecahedronGeometry(0.45, 0);
  const rockMaterial = standard('#9a9184', { flatShading: true });
  for (let i = 0; i < 7; i++) {
    const angle = i / 7 * Math.PI * 2;
    const rock = mesh(rockGeometry, rockMaterial, [8.6 + Math.cos(angle) * 4.3, 0.18, -4.2 + Math.sin(angle) * 3.6], [0.7 + random(), 0.45, 0.6 + random() * 0.4]);
    rock.rotation.set(random(), random() * 4, random());
  }

  for (const z of [14, 11, 8, 5]) mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 16), stone, [0, 0.05, z]);
  const mountain = standard('#c9baa8', { flatShading: true, roughness: 1 });
  mesh(new THREE.ConeGeometry(11, 16, 8), mountain, [-16, 6, -46]);
  mesh(new THREE.ConeGeometry(14, 20, 8), mountain, [6, 8, -52]);
  mesh(new THREE.ConeGeometry(9, 12, 8), mountain, [22, 4.5, -40]);

  const moon = mesh(new THREE.SphereGeometry(1.15, 24, 16), new THREE.MeshBasicMaterial({ color: '#f7f3ea' }), [-4.5, 15.5, -22]);
  mesh(new THREE.SphereGeometry(2.1, 20, 14), new THREE.MeshBasicMaterial({ color: '#fff6e8', transparent: true, opacity: 0.18, depthWrite: false }), [-4.5, 15.5, -22]);

  const mistMaterial = new THREE.MeshBasicMaterial({ color: '#efe4d4', transparent: true, opacity: 0.14, depthWrite: false });
  const mists = [];
  for (const [x, y, z, w] of [[0, 1.1, 2, 28], [6, 0.8, -6, 22], [-8, 1.4, 10, 18]]) {
    const sheet = mesh(new THREE.PlaneGeometry(w, 1.6), mistMaterial, [x, y, z]);
    mists.push(sheet);
  }

  const petalCount = matchMedia('(max-width: 700px)').matches ? 40 : 80;
  const petalGeometry = new THREE.PlaneGeometry(0.14, 0.09);
  const petals = new THREE.InstancedMesh(petalGeometry, new THREE.MeshBasicMaterial({ color: '#f3d0d4', side: THREE.DoubleSide, transparent: true, opacity: 0.88, depthWrite: false }), petalCount);
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage); petals.frustumCulled = false; scene.add(petals);
  const petalData = Array.from({ length: petalCount }, () => ({
    x: (random() - 0.35) * 22, y: random() * 8, z: -2 + random() * 18, spin: random() * 6, speed: 0.25 + random() * 0.35, drift: random() * Math.PI * 2,
  }));
  const dummy = new THREE.Object3D();

  stage.animate((time, dt) => {
    water.uniforms.time.value = time;
    lanterns.forEach((light, index) => { light.intensity = 2.6 + Math.sin(time * 2.2 + index) * 0.45; });
    moon.position.y = 15.5 + Math.sin(time * 0.15) * 0.05;
    mists.forEach((sheet, index) => { sheet.position.x += Math.sin(time * 0.2 + index) * 0.002; });
    petalData.forEach((petal, index) => {
      petal.y -= petal.speed * Math.max(dt, 0.016);
      if (petal.y < 0.05) petal.y = 6 + random() * 3;
      dummy.position.set(petal.x + Math.sin(time * 0.35 + petal.drift) * 0.6, petal.y, petal.z + Math.cos(time * 0.22 + petal.drift) * 0.3);
      dummy.rotation.set(time * 0.4, petal.spin + time * 0.5, time * 0.3);
      dummy.updateMatrix(); petals.setMatrixAt(index, dummy.matrix);
    });
    petals.instanceMatrix.needsUpdate = true;
  });
  return stage;
}
