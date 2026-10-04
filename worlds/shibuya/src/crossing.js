import * as THREE from 'three';
import { createStage, seededRandom } from '../../../shared/stage.js';

export const vistas = [
  { id: 'scramble', number: '01', name: 'スクランブル', en: 'CROSSING', position: [0, 3.4, 16], target: [0, 3.2, -4], note: '信号が変わるたび、人が街を横切る。' },
  { id: 'screens', number: '02', name: '大型ビジョン', en: 'SCREENS', position: [7, 5.2, 4], target: [-4, 8, -12], note: '壁一面の光が、夕方を染めている。' },
  { id: 'station', number: '03', name: '駅前', en: 'STATION', position: [-6, 3.2, 12], target: [4, 5, -8], note: '円いビルと、待ち人の場所。' },
];

export function createCrossing(container, onError) {
  const stage = createStage(container, {
    background: '#241820', fog: 0.018, position: vistas[0].position, target: vistas[0].target,
    label: '渋谷のスクランブル交差点。大型ビジョンと人の流れ。ドラッグで見回せます。',
    bloom: 0.35, bloomThreshold: 0.72, exposure: 1.05, fov: 54, mobileFov: 76,
    bounds: { minX: -8, maxX: 8, minZ: -2, maxZ: 16 }, onError,
  });
  const { scene } = stage;
  const random = seededRandom(109);
  const standard = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.72, ...extra });
  const concrete = standard('#3a3438');
  const dark = standard('#221c22', { roughness: 0.5, metalness: 0.2 });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function mesh(geometry, material, position, scale = [1, 1, 1], parent = scene) {
    const result = new THREE.Mesh(geometry, material);
    result.position.set(...position); result.scale.set(...scale); parent.add(result); return result;
  }
  function box(material, position, scale, parent) { return mesh(cube, material, position, scale, parent); }

  scene.add(new THREE.HemisphereLight('#ffd0c4', '#2a2030', 0.7));
  const sun = new THREE.DirectionalLight('#ffc2a0', 1.8);
  sun.position.set(16, 18, 8); scene.add(sun);

  const road = document.createElement('canvas'); road.width = road.height = 512;
  const paint = road.getContext('2d');
  paint.fillStyle = '#2c3036'; paint.fillRect(0, 0, 512, 512);
  paint.fillStyle = '#d9dde2';
  for (let i = 0; i < 8; i++) paint.fillRect(70, 40 + i * 56, 372, 22);
  for (let i = 0; i < 8; i++) paint.fillRect(40 + i * 56, 70, 22, 372);
  paint.fillStyle = '#3d4348'; paint.fillRect(0, 0, 512, 36); paint.fillRect(0, 476, 512, 36); paint.fillRect(0, 0, 36, 512); paint.fillRect(476, 0, 36, 512);
  const roadMap = new THREE.CanvasTexture(road); roadMap.colorSpace = THREE.SRGBColorSpace;
  const crossing = mesh(new THREE.PlaneGeometry(22, 22), standard('#34383e', { map: roadMap, roughness: 0.9 }), [0, 0.02, 2]);
  crossing.rotation.x = -Math.PI / 2;
  mesh(new THREE.PlaneGeometry(80, 80), standard('#2a2c30', { roughness: 0.95 }), [0, 0, 0]).rotation.x = -Math.PI / 2;

  function block(x, z, w, d, h, color = '#3c3640') {
    box(standard(color, { roughness: 0.8 }), [x, h / 2, z], [w, h, d]);
    box(dark, [x, h + 0.15, z], [w * 0.7, 0.3, d * 0.7]);
  }
  block(-14, -12, 8, 7, 18, '#4a3a44');
  block(12, -14, 9, 8, 22, '#3a3340');
  block(14, 10, 7, 8, 14, '#463848');
  block(-13, 12, 8, 6, 11, '#3e3642');
  mesh(new THREE.CylinderGeometry(4.2, 4.4, 17, 20), standard('#5a4550', { roughness: 0.62 }), [-9, 8.5, -6]);
  box(dark, [-9, 17.3, -6], [6.2, 0.5, 6.2]);

  const screens = [];
  function screen(width, height, position, rotationY, tint) {
    const material = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, tint: { value: new THREE.Color(tint) } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec2 vUv; uniform float time; uniform vec3 tint;
        void main(){
          float col=floor(vUv.x*5.);
          float row=floor(vUv.y*7.+time*.35);
          float h=fract(sin(col*127.1+row*311.7)*43758.5);
          vec3 c=mix(vec3(.04,.03,.05), mix(tint, vec3(.15,.8,.86), h), step(.28,h));
          c*=.75+.25*step(.92,fract(vUv.y*18.-time));
          gl_FragColor=vec4(c,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const panel = mesh(new THREE.PlaneGeometry(width, height), material, position);
    panel.rotation.y = rotationY; screens.push(material);
    return panel;
  }
  screen(7.2, 4.2, [12, 12, -9.85], 0, '#ff4d88');
  screen(4.4, 2.6, [8.2, 7.2, -9.9], 0, '#47d0e0');
  screen(3.2, 5.5, [-9, 11, -1.7], Math.PI / 2, '#ffd36a');
  screen(5, 2.4, [10.4, 8, 6.1], Math.PI, '#7aa2ff');

  const bronze = standard('#8d6239', { metalness: 0.55, roughness: 0.38 });
  const hachiko = new THREE.Group(); hachiko.position.set(-5.4, 0, 11.2); scene.add(hachiko);
  box(standard('#d7d2cc'), [0, 0.35, 0], [1.5, 0.7, 1.1], hachiko);
  mesh(new THREE.SphereGeometry(0.38, 12, 8), bronze, [0.05, 0.95, 0], [1.1, 0.7, 0.7], hachiko);
  mesh(new THREE.SphereGeometry(0.22, 10, 8), bronze, [0.42, 1.05, 0], [0.7, 0.6, 0.6], hachiko);
  for (const x of [-0.22, 0.18]) for (const z of [-0.18, 0.18]) mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.28, 6), bronze, [x, 0.78, z], [1, 1, 1], hachiko);

  const count = matchMedia('(max-width: 700px)').matches ? 48 : 90;
  const body = new THREE.CapsuleGeometry(0.16, 0.55, 3, 6);
  const coats = ['#2b2e36', '#6d2438', '#1d3c4a', '#3a332c', '#d8d4ce', '#243028'];
  const groups = coats.map(color => {
    const people = new THREE.InstancedMesh(body, standard(color, { roughness: 0.8 }), count);
    people.instanceMatrix.setUsage(THREE.DynamicDrawUsage); people.frustumCulled = false; scene.add(people); return people;
  });
  const crowd = Array.from({ length: count }, () => ({
    phase: random(), axis: random() > 0.5 ? 'x' : 'z', lane: (random() - 0.5) * 10, speed: 0.55 + random() * 0.4, coat: Math.floor(random() * coats.length),
  }));
  const dummy = new THREE.Object3D();

  stage.animate(time => {
    for (const material of screens) material.uniforms.time.value = time;
    for (const people of groups) people.count = 0;
    crowd.forEach(person => {
      const travel = ((person.phase + time * person.speed * 0.08) % 1) * 16 - 8;
      const x = person.axis === 'x' ? travel : person.lane;
      const z = person.axis === 'z' ? travel : person.lane;
      dummy.position.set(x, 0.55, z + 2);
      dummy.rotation.set(0, person.axis === 'x' ? Math.PI / 2 : 0, 0);
      dummy.scale.setScalar(0.85 + (person.coat % 3) * 0.06);
      dummy.updateMatrix();
      const people = groups[person.coat];
      people.setMatrixAt(people.count, dummy.matrix);
      people.count += 1;
    });
    for (const people of groups) people.instanceMatrix.needsUpdate = true;
  });
  return stage;
}
