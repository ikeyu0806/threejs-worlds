import * as THREE from 'three';
import { createStage, seededRandom } from '../../../shared/stage.js';
import { enhanceStage, loadStageModels, modelCopy } from '../../../shared/detail-assets.js';
import { crowdFrom, setCrowdPose } from '../../../shared/models.js';

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

  const [qfront, fashion, sky, dog, person, block, signal, bus, plaza] = await loadStageModels(stage, ['qfront.glb', 'fashion_tower.glb', 'sky_tower.glb', 'meet_dog.glb', 'street_person.glb', 'commercial_block.glb', 'signal_mast.glb', 'electric_bus.glb', 'plaza_furniture.glb']);
  for (const [x, z, width, depth, height] of [[-22, 6, 10, 8, 16], [22, -6, 9, 8, 20], [-20, -18, 12, 8, 14], [0, 24, 28, 10, 12]]) {
    const building = modelCopy(block, [x, 0, z], z === 24 ? Math.PI : 0);
    building.scale.set(width / 10, height / 18, depth / 8); scene.add(building);
  }
  scene.add(modelCopy(bus, [18, 0, 1.05], -Math.PI / 2), modelCopy(bus, [-19, 0, .2], Math.PI / 2), modelCopy(plaza, [-9, 0, 11.4], -Math.PI / 2));

  const screens = [];
  function screen(width, height, position, rotationY, tint, surface = null) {
    const material = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, tint: { value: new THREE.Color(tint) }, useModelUV: { value: surface ? 1 : 0 }, bounds: { value: new THREE.Vector4(0, 0, 1, 1) } },
      vertexShader: 'varying vec2 vUv; uniform float useModelUV; uniform vec4 bounds; void main(){vUv=useModelUV>.5?(position.xy-bounds.xy)/bounds.zw:uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
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
    if (surface) {
      surface.geometry.computeBoundingBox();
      const { min, max } = surface.geometry.boundingBox;
      material.uniforms.bounds.value.set(min.x, min.y, max.x - min.x, max.y - min.y);
      surface.material.dispose(); surface.material = material;
    } else {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
      panel.position.set(...position); panel.rotation.y = rotationY; scene.add(panel);
    }
    screens.push(material);
  }

  const lamps = [];
  for (const [x, z] of [[-12.2, -12.2], [12.2, -12.2], [-12.2, 12.2], [12.2, 12.2]]) {
    const mast = modelCopy(signal, [x, 0, z], Math.atan2(-x, -z)); scene.add(mast);
    mast.traverse(object => { if (object.isMesh && /\.Signal(Stop|Go)$/.test(object.material?.name)) lamps.push(object); });
  }

  qfront.scene.position.set(6.5, 0, -18);
  qfront.scene.traverse(object => {
    if (object.isMesh && object.material?.name === 'Qfront.Screen') screen(0, 0, null, 0, '#ff4d88', object);
    else if (object.isMesh && object.material?.emissiveIntensity > 1) object.material.emissiveIntensity = 1.4;
  });
  fashion.scene.position.set(-15, 0, -8);
  fashion.scene.rotation.y = 0.5;
  sky.scene.position.set(18, 0, 8);
  dog.scene.position.set(-6.2, 0, 11.4);
  dog.scene.rotation.y = .35;
  scene.add(qfront.scene, fashion.scene, sky.scene, dog.scene);
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

  enhanceStage(stage, sun, { extent: 38, target: [0, 0, -5], environment: .35 });
  stage.animate(time => {
    for (const material of screens) material.uniforms.time.value = time;
    const cycle = (time % 16);
    const walking = cycle > 6 && cycle < 14;
    for (const lamp of lamps) {
      const lit = lamp.material.name.endsWith('.SignalGo') === walking;
      lamp.material.emissiveIntensity = lit ? 2.0 : 0;
      lamp.material.color.set(lit ? (walking ? '#35e07a' : '#ff4455') : '#182329');
    }
    const alpha = walking ? Math.min(1, (cycle - 6) / 7) : (cycle >= 14 ? 1 : 0);
    const eased = alpha * alpha * (3 - 2 * alpha);
    crowd.forEach((personPath, index) => {
      dummy.position.lerpVectors(personPath.from, personPath.to, eased);
      dummy.position.y = walking ? .02 : 0;
      const direction = personPath.to.clone().sub(personPath.from);
      dummy.rotation.set(0, Math.atan2(direction.x, direction.z), 0);
      dummy.scale.setScalar(0.92 + (personPath.offset % 0.12));
      dummy.updateMatrix();
      coatColor.set(personPath.coat);
      setCrowdPose(parts, index, dummy.matrix, time * 6 + personPath.offset * Math.PI * 2, walking ? .24 : 0);
      for (const part of parts) {
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
