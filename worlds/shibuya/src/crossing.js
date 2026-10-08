import * as THREE from 'three';
import { createStage, seededRandom } from '../../../shared/stage.js';
import { crowdFrom, loadModel } from '../../../shared/models.js';

export const vistas = [
  { id: 'scramble', number: '01', name: 'スクランブル', en: 'CROSSING', position: [0, 8.2, 18], target: [2, 4, -8], note: 'ハチ公口の前で、全員が一度に渡る。' },
  { id: 'screens', number: '02', name: '大型ビジョン', en: 'SCREENS', position: [4, 7.4, 2], target: [6, 12, -16], note: '曲面のビジョンが、交差点の北東を染めている。' },
  { id: 'station', number: '03', name: '駅前', en: 'STATION', position: [-4, 4.2, 16], target: [-7, 1.2, 10], note: '秋田犬のいる広場は、待ち合わせの場所。' },
];

function paintCrossing() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const paint = canvas.getContext('2d');
  paint.fillStyle = '#2a2e33';
  paint.fillRect(0, 0, 1024, 1024);
  paint.fillStyle = '#3e444b';
  paint.fillRect(0, 0, 1024, 150);
  paint.fillRect(0, 874, 1024, 150);
  paint.fillRect(0, 0, 150, 1024);
  paint.fillRect(874, 0, 150, 1024);
  paint.fillStyle = '#eceff2';
  for (let i = 0; i < 18; i++) {
    const offset = 168 + i * 38;
    paint.fillRect(offset, 150, 22, 120);
    paint.fillRect(offset, 754, 22, 120);
    paint.fillRect(150, offset, 120, 22);
    paint.fillRect(754, offset, 120, 22);
  }
  paint.strokeStyle = '#d7a441';
  paint.lineWidth = 8;
  paint.strokeRect(150, 150, 724, 724);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export async function createCrossing(container, onError) {
  const stage = createStage(container, {
    background: '#4a3040', fog: 0.012, position: vistas[0].position, target: vistas[0].target,
    label: '渋谷のスクランブル交差点。曲面ビジョン、円筒の商業ビル、駅前の広場。ドラッグで見回せます。',
    bloom: 0.28, bloomThreshold: 0.82, exposure: 1.02, fov: 52, mobileFov: 74,
    bounds: { minX: -9, maxX: 9, minZ: 0, maxZ: 18 }, onError,
  });
  const { scene } = stage;
  const random = seededRandom(109);
  const standard = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.72, ...extra });
  const concrete = standard('#3a3438');
  const dark = standard('#221c22', { roughness: 0.5, metalness: 0.2 });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function box(material, position, scale, parent = scene) {
    const result = new THREE.Mesh(cube, material);
    result.position.set(...position);
    result.scale.set(...scale);
    parent.add(result);
    return result;
  }

  scene.add(new THREE.HemisphereLight('#ffd2c2', '#2a2030', 1.25));
  const sun = new THREE.DirectionalLight('#ffc2a0', 2.1);
  sun.position.set(-18, 22, 10);
  scene.add(sun);
  scene.add(new THREE.AmbientLight('#ffd0b0', 0.15));

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), standard('#2a2c30', { roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const crossing = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), standard('#34383e', { map: paintCrossing(), roughness: 0.88 }));
  crossing.rotation.x = -Math.PI / 2;
  crossing.position.set(0, 0.02, 0);
  scene.add(crossing);

  function block(x, z, w, d, h, color = '#3c3640') {
    box(standard(color, { roughness: 0.8 }), [x, h / 2, z], [w, h, d]);
    for (let floor = 2; floor < h - 2; floor += 3) {
      box(dark, [x, floor, z + d / 2 + 0.05], [w * 0.82, 0.7, 0.08]);
    }
  }
  block(-22, 6, 10, 8, 16, '#4a3a44');
  block(22, -6, 9, 8, 20, '#3a3340');
  block(-20, -18, 12, 8, 14, '#463848');
  box(concrete, [0, 6, 24], [28, 12, 10]);
  box(dark, [0, 12.2, 22], [22, 0.6, 8]);
  box(standard('#6a5a62'), [8, 1.2, 14], [6, 2.4, 3]);

  const screens = [];
  function screen(width, height, position, rotationY, tint) {
    const material = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, tint: { value: new THREE.Color(tint) } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec2 vUv; uniform float time; uniform vec3 tint;
        void main(){
          float col=floor(vUv.x*6.);
          float row=floor(vUv.y*8.+time*.28);
          float h=fract(sin(col*127.1+row*311.7)*43758.5);
          vec3 c=mix(vec3(.04,.03,.05), mix(tint, vec3(.45,.42,.48), step(.7,h)), step(.22,h));
          c*=.55;
          c*=.8+.2*step(.9,fract(vUv.y*22.-time*1.4));
          gl_FragColor=vec4(c,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    panel.position.set(...position);
    panel.rotation.y = rotationY;
    scene.add(panel);
    screens.push(material);
  }

  const lamps = [];
  for (const [x, z] of [[-12.2, -12.2], [12.2, -12.2], [-12.2, 12.2], [12.2, 12.2]]) {
    box(dark, [x, 2.2, z], [0.16, 4.4, 0.16]);
    const lamp = box(new THREE.MeshBasicMaterial({ color: '#ff4455' }), [x, 4.3, z], [0.28, 0.7, 0.28]);
    lamps.push(lamp);
    scene.add(new THREE.PointLight('#ff6677', 4, 8, 2).translateX(x).translateY(4).translateZ(z));
  }

  const [qfront, fashion, sky, dog, person] = await Promise.all([
    loadModel('qfront.glb'),
    loadModel('fashion_tower.glb'),
    loadModel('sky_tower.glb'),
    loadModel('meet_dog.glb'),
    loadModel('street_person.glb'),
  ]);
  qfront.scene.position.set(6.5, 0, -18);
  qfront.scene.traverse(object => {
    if (object.isMesh && object.material?.emissiveIntensity > 1) object.material.emissiveIntensity = 1.4;
  });
  fashion.scene.position.set(-15, 0, -8);
  fashion.scene.rotation.y = 0.5;
  sky.scene.position.set(18, 0, 8);
  dog.scene.position.set(-6.2, 0, 11.4);
  dog.scene.rotation.y = Math.PI;
  scene.add(qfront.scene, fashion.scene, sky.scene, dog.scene);
  screen(6.4, 4.6, [6.5, 13.2, -14.5], 0, '#ff4d88');
  screen(3.2, 1.8, [2.4, 8.4, -14.6], 0, '#47d0e0');
  screen(3.4, 5.2, [-15, 12, -2.2], Math.PI / 2, '#ffd36a');

  const count = matchMedia('(max-width: 700px)').matches ? 48 : 90;
  const parts = crowdFrom(person.scene, count);
  for (const part of parts) scene.add(part.mesh);
  const coats = ['#2b2e36', '#6d2438', '#1d3c4a', '#c8b8a4', '#243028', '#d8d4ce', '#4a3048', '#1a1c22'];
  const span = 10.5;
  const crowd = Array.from({ length: count }, () => {
    const mode = random();
    const from = new THREE.Vector3();
    const to = new THREE.Vector3();
    if (mode < 0.34) {
      const z = (random() - 0.5) * span * 1.4;
      const direction = random() > 0.5 ? 1 : -1;
      from.set(-direction * span, 0, z);
      to.set(direction * span, 0, z + (random() - 0.5) * 1.6);
    } else if (mode < 0.67) {
      const x = (random() - 0.5) * span * 1.4;
      const direction = random() > 0.5 ? 1 : -1;
      from.set(x, 0, -direction * span);
      to.set(x + (random() - 0.5) * 1.6, 0, direction * span);
    } else {
      const side = random() > 0.5 ? 1 : -1;
      const depth = random() > 0.5 ? 1 : -1;
      from.set(side * span, 0, depth * span);
      to.set(-side * span * (0.7 + random() * 0.3), 0, -depth * span * (0.7 + random() * 0.3));
    }
    return { from, to, offset: random(), coat: coats[Math.floor(random() * coats.length)] };
  });
  const dummy = new THREE.Object3D();
  const coatColor = new THREE.Color();

  stage.animate(time => {
    for (const material of screens) material.uniforms.time.value = time;
    const cycle = (time % 16);
    const walking = cycle > 6 && cycle < 14;
    for (const lamp of lamps) lamp.material.color.set(walking ? '#35e07a' : '#ff4455');
    const alpha = walking ? Math.min(1, (cycle - 6) / 7) : (cycle >= 14 ? 1 : 0);
    const eased = alpha * alpha * (3 - 2 * alpha);
    crowd.forEach((personPath, index) => {
      dummy.position.lerpVectors(personPath.from, personPath.to, eased);
      dummy.position.y = 0;
      const direction = personPath.to.clone().sub(personPath.from);
      dummy.rotation.set(0, Math.atan2(direction.x, direction.z), 0);
      dummy.scale.setScalar(0.92 + (personPath.offset % 0.12));
      dummy.updateMatrix();
      coatColor.set(personPath.coat);
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
