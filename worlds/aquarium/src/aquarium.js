import * as THREE from 'three';
import { createStage, seededRandom } from '../../../shared/stage.js';

export const exhibits = [
  { id: 'ocean', number: '01', name: '大海の窓', en: 'OPEN OCEAN', position: [0, 3.7, 15], target: [0, 5, -15], note: 'ゆるやかに泳ぐエイと、光をほどく魚群。' },
  { id: 'reef', number: '02', name: '珊瑚の庭', en: 'CORAL GARDEN', position: [11, 3.1, 5.5], target: [10, 2.7, -12], note: '珊瑚のあいだに、小さな暮らしが息づく。' },
  { id: 'jelly', number: '03', name: '月の漂流', en: 'MOON JELLIES', position: [-11, 3.9, 5.5], target: [-12, 5.3, -12], note: '淡い光をまとって、ただ、漂う。' },
];

export function createAquarium(container, onError) {
  const stage = createStage(container, {
    background: '#031923', fog: 0.011, position: exhibits[0].position, target: exhibits[0].target,
    label: '大水槽の魚群、エイ、ウミガメ、クラゲ。ドラッグで見回せます。',
    bloom: 0.38, exposure: 1.25, fov: 57,
    bounds: { minX: -15, maxX: 15, minZ: 3, maxZ: 18 }, onError,
  });
  const { scene } = stage;
  const random = seededRandom(4712);
  const standard = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.65, ...extra });
  const stone = standard('#15252b', { roughness: 0.48, metalness: 0.2 });
  const dark = standard('#0b1920', { roughness: 0.3, metalness: 0.45 });
  const sand = standard('#a6b2a4');
  const rock = standard('#576f71', { flatShading: true });
  const glow = new THREE.MeshBasicMaterial({ color: '#b6ece7' });
  const amber = new THREE.MeshBasicMaterial({ color: '#d6b788' });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const sphere = new THREE.SphereGeometry(1, 18, 12);
  function mesh(geometry, material, position, scale = [1, 1, 1], parent = scene) {
    const result = new THREE.Mesh(geometry, material);
    result.position.set(...position); result.scale.set(...scale); parent.add(result); return result;
  }
  function box(material, position, scale, parent) { return mesh(cube, material, position, scale, parent); }
  scene.add(new THREE.HemisphereLight('#c2faff', '#244147', 2.2));
  const sunlight = new THREE.DirectionalLight('#9bdfec', 3.4);
  sunlight.position.set(-5, 24, -14); scene.add(sunlight);
  const fill = new THREE.PointLight('#4ebddd', 85, 50, 1.5);
  fill.position.set(0, 9, -9); scene.add(fill);
  const reefLight = new THREE.PointLight('#ffd3a0', 35, 22, 1.5);
  reefLight.position.set(12, 7, -10); scene.add(reefLight);

  // The viewing gallery remains outside the tank, with bounded walking space.
  box(stone, [0, -0.3, 8], [46, 0.6, 30]);
  box(dark, [0, 0.35, -5.5], [43, 0.7, 1]);
  box(dark, [0, 11.7, -5.5], [44, 0.65, 1.4]);
  for (const x of [-20.7, -6.8, 6.8, 20.7]) {
    box(dark, [x, 6, -5.4], [0.18, 11.1, 0.5]);
    box(glow, [x + 0.095, 6, -5.1], [0.018, 10.7, 0.035]);
  }
  for (const x of [-22, 22]) {
    box(stone, [x, 7, 2], [2.5, 14, 25]);
    box(amber, [x * 0.92, 0.07, 6], [0.045, 0.035, 23]);
  }
  for (const z of [0, 5, 10, 15]) {
    box(dark, [0, 13, z], [45, 0.45, 0.35]);
    box(amber, [0, 12.76, z], [17, 0.015, 0.05]);
    box(dark, [0, 0.015, z], [42, 0.018, 0.027]);
  }
  // Stone benches and recessed lights in the quiet gallery.
  for (const x of [-13, 13]) {
    box(stone, [x, 0.65, 12], [4.5, 0.25, 1.3]);
    for (const offset of [-1.5, 1.5]) box(dark, [x + offset, 0.3, 12], [0.25, 0.6, 1]);
  }
  box(sand, [0, -0.18, -20], [45, 0.3, 30]);

  const water = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv; uniform float time;
      void main(){
        vec3 deep=vec3(.013,.09,.16), shallow=vec3(.09,.39,.46);
        float ray=pow(max(0.,sin(vUv.x*41.+vUv.y*3.+sin(time*.17)*.3)),14.);
        float ray2=pow(max(0.,sin(vUv.x*69.-vUv.y*6.-time*.035)),24.);
        vec3 c=mix(deep,shallow,pow(vUv.y,1.9));
        c+=vec3(.15,.38,.4)*(ray*.21+ray2*.1)*pow(vUv.y,1.2);
        c+=vec3(.045,.13,.16)*exp(-length((vUv-vec2(.47,.72))*vec2(2.,1.))*3.);
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  mesh(new THREE.PlaneGeometry(60, 25), water, [0, 10, -35]);
  const caustics = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } }, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv; uniform float time; void main(){
      vec2 p=vUv*34.;
      float a=sin(p.x+sin(p.y*1.2+time*.25)*1.6+time*.16);
      float b=sin(p.y+sin(p.x*.8-time*.18)*1.8);
      float glow=pow(1.-abs(a*.52+b*.48),12.);
      gl_FragColor=vec4(.43,.85,.83,glow*.23);
    }`,
  });
  const litFloor = mesh(new THREE.PlaneGeometry(44, 35), caustics, [0, 0.015, -20]);
  litFloor.rotation.x = -Math.PI / 2;
  const reflection = mesh(new THREE.PlaneGeometry(41, 22), caustics, [0, 0.035, 6]);
  reflection.rotation.x = -Math.PI / 2;
  const glass = new THREE.MeshBasicMaterial({ color: '#77d9df', transparent: true, opacity: 0.025, depthWrite: false, side: THREE.DoubleSide });
  mesh(new THREE.PlaneGeometry(42, 11), glass, [0, 6, -5.6]);

  const rockGeometry = new THREE.DodecahedronGeometry(1, 1);
  for (let i = 0; i < 45; i++) {
    const x = (random() - 0.5) * 40, z = -9 - random() * 22;
    const size = 0.5 + random() * 1.8;
    const rockMesh = mesh(rockGeometry, rock, [x, size * 0.3, z], [size * 1.4, size * 0.55, size]);
    rockMesh.rotation.set(random(), random() * 6, random());
  }
  const kelpMaterial = standard('#277d72', { side: THREE.DoubleSide });
  const kelpGeometry = new THREE.PlaneGeometry(0.22, 3, 1, 10);
  const kelpPosition = kelpGeometry.attributes.position;
  for (let i = 0; i < kelpPosition.count; i++) kelpPosition.setZ(i, Math.sin(kelpPosition.getY(i) * 2.5) * 0.22);
  kelpGeometry.computeVertexNormals();
  const plants = [];
  for (let i = 0; i < 55; i++) {
    const height = 0.6 + random() * 1.4;
    const plant = mesh(kelpGeometry, kelpMaterial, [(random() - 0.5) * 38, height * 1.5, -9 - random() * 23], [1, height, 1]);
    plant.rotation.y = random() * 6; plants.push(plant);
  }
  const coralMaterials = ['#bc8b78', '#d8b19b', '#b2a375', '#89779b'].map(color => standard(color));
  const branchGeometry = new THREE.CylinderGeometry(0.075, 0.13, 1, 7);
  function branch(from, to, material) {
    const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to), delta = end.sub(start);
    const result = mesh(branchGeometry, material, start.addScaledVector(delta, 0.5).toArray(), [1, delta.length(), 1]);
    result.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  }
  for (let i = 0; i < 14; i++) {
    const x = 5 + random() * 14, z = -9 - random() * 13, height = 0.8 + random() * 1.8;
    const material = coralMaterials[i % coralMaterials.length];
    branch([x, 0, z], [x, height, z], material);
    for (let j = 0; j < 5; j++) {
      const angle = j / 5 * Math.PI * 2, y = height * (0.35 + random() * 0.45);
      const tip = [x + Math.cos(angle) * 0.75, y + 0.7, z + Math.sin(angle) * 0.75];
      branch([x, y, z], tip, material);
      branch(tip, [tip[0] + Math.cos(angle) * 0.2, tip[1] + 0.45, tip[2]], material);
    }
  }

  // Small fish are instanced so a whole school takes only two draw calls.
  const count = matchMedia('(max-width: 700px)').matches ? 90 : 170;
  const bodyGeometry = new THREE.SphereGeometry(1, 12, 8);
  bodyGeometry.scale(0.65, 0.22, 0.13);
  const tailGeometry = new THREE.BufferGeometry();
  tailGeometry.setAttribute('position', new THREE.Float32BufferAttribute([-0.46, 0, 0, -0.95, 0.32, 0, -0.95, -0.32, 0], 3));
  tailGeometry.computeVertexNormals();
  const fishMaterial = standard('#b9dce0', { metalness: 0.65, roughness: 0.28, emissive: '#2c747f', emissiveIntensity: 0.18, side: THREE.DoubleSide });
  const bodies = new THREE.InstancedMesh(bodyGeometry, fishMaterial, count);
  const tails = new THREE.InstancedMesh(tailGeometry, fishMaterial, count);
  bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage); tails.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bodies.frustumCulled = tails.frustumCulled = false;
  scene.add(bodies, tails);
  const fishData = Array.from({ length: count }, (_, i) => ({
    phase: random() * Math.PI * 2, speed: 0.07 + random() * 0.035, radius: 5 + random() * 10,
    height: 3.1 + random() * 6, depth: -15 - random() * 12, size: 0.25 + random() * 0.42, group: i % 3,
  }));
  const dummy = new THREE.Object3D();

  // Manta silhouette: curved diamond wings, long tail and a pale underside.
  const mantaShape = new THREE.Shape();
  mantaShape.moveTo(0, -1.6);
  mantaShape.bezierCurveTo(-0.9, -1.2, -2.8, -0.7, -3.6, 0.75);
  mantaShape.bezierCurveTo(-2.1, 0.48, -1.3, 1.1, -0.65, 1.25);
  mantaShape.quadraticCurveTo(0, 1.65, 0.65, 1.25);
  mantaShape.bezierCurveTo(1.3, 1.1, 2.1, 0.48, 3.6, 0.75);
  mantaShape.bezierCurveTo(2.8, -0.7, 0.9, -1.2, 0, -1.6);
  const mantaGeometry = new THREE.ExtrudeGeometry(mantaShape, { depth: 0.16, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.09, bevelThickness: 0.06, curveSegments: 14 });
  mantaGeometry.rotateX(Math.PI / 2);
  const mantaPositions = mantaGeometry.attributes.position;
  const mantaBase = mantaPositions.array.slice();
  const manta = new THREE.Group(); scene.add(manta);
  const mantaTop = standard('#4f7d87', { roughness: 0.4, metalness: 0.2 });
  mesh(mantaGeometry, mantaTop, [0, 0, 0], [1, 1, 1], manta);
  mesh(sphere, standard('#d3d8cb'), [0, -0.15, 0], [0.75, 0.14, 1.1], manta);
  const tailCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 1.1), new THREE.Vector3(0, -0.05, 2.2), new THREE.Vector3(0.2, 0.12, 4.4)]);
  mesh(new THREE.TubeGeometry(tailCurve, 18, 0.035, 5, false), mantaTop, [0, 0, 0], [1, 1, 1], manta);
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: '#061a23' });
  for (const x of [-0.5, 0.5]) mesh(sphere, eyeMaterial, [x, 0.05, -1], [0.09, 0.08, 0.1], manta);
  manta.scale.setScalar(1.25);

  const turtle = new THREE.Group(); scene.add(turtle);
  const shell = standard('#688a79', { flatShading: true, roughness: 0.55 });
  const skin = standard('#adb495');
  mesh(new THREE.IcosahedronGeometry(1, 2), shell, [0, 0.05, 0], [0.8, 0.5, 1.2], turtle);
  mesh(sphere, skin, [0, -0.21, 0], [0.74, 0.13, 1.1], turtle);
  mesh(sphere, skin, [0, 0, -1.35], [0.3, 0.26, 0.5], turtle);
  for (const x of [-0.23, 0.23]) mesh(sphere, eyeMaterial, [x, 0.1, -1.56], [0.065, 0.065, 0.065], turtle);
  const flippers = [];
  for (const x of [-1, 1]) for (const z of [-0.7, 0.7]) {
    const pivot = new THREE.Group(); pivot.position.set(x * 0.55, -0.13, z); turtle.add(pivot);
    const flipper = mesh(sphere, skin, [x * 0.58, 0, z < 0 ? -0.35 : 0.25], [0.82, 0.07, z < 0 ? 0.32 : 0.22], pivot);
    flipper.rotation.y = x * (z < 0 ? 0.4 : -0.4); flippers.push({ pivot, x });
  }
  turtle.scale.setScalar(1.15);

  const jellyMaterial = new THREE.MeshPhysicalMaterial({ color: '#c6d7ee', transparent: true, opacity: 0.45, roughness: 0.15, metalness: 0, side: THREE.DoubleSide, depthWrite: false, emissive: '#427a98', emissiveIntensity: 0.4 });
  const thread = new THREE.MeshBasicMaterial({ color: '#94cbd8', transparent: true, opacity: 0.45, depthWrite: false });
  const bellGeometry = new THREE.SphereGeometry(0.55, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.57);
  const jellies = [];
  for (let i = 0; i < 12; i++) {
    const group = new THREE.Group(); scene.add(group);
    mesh(bellGeometry, jellyMaterial, [0, 0, 0], [1, 0.7, 1], group);
    const ring = mesh(new THREE.TorusGeometry(0.43, 0.025, 6, 28), thread, [0, 0.03, 0], [1, 1, 1], group);
    ring.rotation.x = Math.PI / 2;
    for (let j = 0; j < 6; j++) {
      const angle = j / 6 * Math.PI * 2;
      const points = Array.from({ length: 7 }, (_, k) => new THREE.Vector3(Math.cos(angle) * (0.27 + k * 0.035) + Math.sin(k * 1.1 + j) * 0.07, -k * 0.24, Math.sin(angle) * (0.27 + k * 0.035)));
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 20, 0.012, 4, false), thread, [0, 0, 0], [1, 1, 1], group);
    }
    const base = [-11 + (random() - 0.5) * 8, 3.6 + random() * 4.3, -10 - random() * 8];
    const size = 0.65 + random() * 0.8;
    group.position.set(...base); group.scale.setScalar(size); jellies.push({ group, base, size, phase: i * 1.7 });
  }

  const particleCount = 260, particles = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) particles.set([(random() - 0.5) * 40, random() * 11, -7 - random() * 27], i * 3);
  const dustGeometry = new THREE.BufferGeometry(); dustGeometry.setAttribute('position', new THREE.BufferAttribute(particles, 3));
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: '#a8d9df', size: 0.025, transparent: true, opacity: 0.45, depthWrite: false }));
  scene.add(dust);

  stage.animate(time => {
    water.uniforms.time.value = caustics.uniforms.time.value = time;
    fishData.forEach((fish, i) => {
      const angle = fish.phase + time * fish.speed;
      const center = fish.group === 0 ? -3 : fish.group === 1 ? 6 : -9;
      dummy.position.set(center + Math.cos(angle) * fish.radius, fish.height + Math.sin(angle * 2) * 0.45, fish.depth + Math.sin(angle) * 2.2);
      dummy.rotation.set(0, Math.atan2(-Math.cos(angle) * 2.2, -Math.sin(angle) * fish.radius), Math.cos(angle) * 0.04);
      dummy.scale.setScalar(fish.size); dummy.updateMatrix(); bodies.setMatrixAt(i, dummy.matrix);
      dummy.rotation.y += Math.sin(time * 6 + fish.phase) * 0.16; dummy.updateMatrix(); tails.setMatrixAt(i, dummy.matrix);
    });
    bodies.instanceMatrix.needsUpdate = tails.instanceMatrix.needsUpdate = true;
    manta.position.set(Math.sin(time * 0.1) * 5, 6.3 + Math.sin(time * 0.24) * 0.6, -16 + Math.cos(time * 0.1) * 2);
    manta.rotation.set(0.48 + Math.sin(time * 0.24) * 0.08, -0.4 + Math.sin(time * 0.1) * 0.8, Math.sin(time * 0.3) * 0.1);
    for (let i = 0; i < mantaPositions.count; i++) {
      const x = mantaBase[i * 3];
      mantaPositions.setY(i, mantaBase[i * 3 + 1] + Math.sin(time * 1.7 - Math.abs(x) * 0.45) * Math.pow(Math.abs(x) / 3.6, 1.4) * 0.65);
    }
    mantaPositions.needsUpdate = true; mantaGeometry.computeVertexNormals();
    turtle.position.set(9 + Math.sin(time * 0.12) * 3, 4.3 + Math.cos(time * 0.25) * 0.35, -14);
    turtle.rotation.set(0.1, -0.65 + Math.sin(time * 0.12) * 0.3, 0.1);
    for (const { pivot, x } of flippers) pivot.rotation.z = Math.sin(time * 1.6) * x * 0.22;
    for (const { group, base, size, phase } of jellies) {
      group.position.y = base[1] + Math.sin(time * 0.35 + phase) * 0.5;
      group.rotation.z = Math.sin(time * 0.25 + phase) * 0.12;
      group.scale.set(size, size * (1 + Math.sin(time * 1.4 + phase) * 0.055), size);
    }
    plants.forEach((plant, i) => { plant.rotation.z = Math.sin(time * 0.6 + i * 0.4) * 0.09; });
    dust.position.y = Math.sin(time * 0.15) * 0.3;
  });
  return stage;
}
