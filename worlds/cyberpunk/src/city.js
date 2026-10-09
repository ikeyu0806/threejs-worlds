import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { crowdFrom, disposeModelTree } from '../../../shared/models.js';
import { enhanceStage, loadStageModels, modelCopy } from '../../../shared/detail-assets.js';

export const DISTRICTS = [
  { id: 'alley', name: '龍門路地', en: 'DRAGON ALLEY', number: '01', position: [0, 2.3, 17], yaw: 0, pitch: 0.09, description: '眠らない屋台。消えないネオン。街の入口は、いつも雨の匂いがする。' },
  { id: 'market', name: '電脳闇市', en: 'BLACK MARKET', number: '02', position: [0.5, 1.75, -27], yaw: -0.12, pitch: 0.12, description: '記憶、義体、偽造ID。ここでは、値段のつかないものはない。' },
  { id: 'bridge', name: '第九連絡橋', en: 'SECTOR 09', number: '03', position: [-0.8, 2.1, -61], yaw: 0.12, pitch: 0.18, description: '企業の光が届く、その少し手前。見上げれば、もうひとつの街。' },
];

// A stable seed keeps the city reproducible across sessions and machines.
function generator(seed) {
  return () => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export async function createCity(container, callbacks = {}) {
  const random = generator(80923);
  const mobile = window.matchMedia('(max-width: 700px)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a151e');
  scene.fog = new THREE.FogExp2('#122833', 0.018);
  const camera = new THREE.PerspectiveCamera(64, 1, 0.1, 220);
  camera.rotation.order = 'YXZ';
  camera.position.fromArray(DISTRICTS[0].position);
  let yaw = 0, pitch = 0.09;
  let mode = 'cinematic', paused = false, rainAmount = 0.7, disposed = false;
  let destination = null;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.setAttribute('aria-label', '雨とネオンに包まれた九龍北区。ドラッグで周囲を見渡せます。');
  renderer.domElement.setAttribute('tabindex', '0');
  container.appendChild(renderer.domElement);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.5, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const hemisphere = new THREE.HemisphereLight('#a5d7e8', '#13202c', 1.35);
  scene.add(hemisphere);
  const moon = new THREE.DirectionalLight('#71b4dc', 1.8);
  moon.position.set(-7, 40, -25);
  scene.add(moon);

  const resources = new Set();
  const own = value => { resources.add(value); return value; };
  const canvasTexture = (w, h, paint) => {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    paint(canvas.getContext('2d'), w, h);
    const texture = own(new THREE.CanvasTexture(canvas));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return texture;
  };
  const concrete = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#7d8281'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 15000; i++) {
      const shade = 40 + random() * 140;
      ctx.fillStyle = `rgba(${shade},${shade},${shade},${random() * 0.18})`;
      ctx.fillRect(random() * w, random() * h, 1 + random() * 3, 1 + random() * 4);
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = 'rgba(20,24,28,0.15)';
      ctx.fillRect(random() * w, random() * h, 1 + random() * 3, 20 + random() * 90);
    }
    ctx.strokeStyle = '#535b5c'; ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  });
  concrete.wrapS = concrete.wrapT = THREE.RepeatWrapping;
  concrete.repeat.set(2, 5);

  const materials = {
    wall: own(new THREE.MeshStandardMaterial({ color: '#323f45', map: concrete, roughness: 0.88, metalness: 0.2 })),
    wall2: own(new THREE.MeshStandardMaterial({ color: '#4a4549', map: concrete, roughness: 0.9 })),
    wall3: own(new THREE.MeshStandardMaterial({ color: '#364f52', map: concrete, roughness: 0.8 })),
    steel: own(new THREE.MeshStandardMaterial({ color: '#26353c', metalness: 0.7, roughness: 0.52 })),
    trim: own(new THREE.MeshStandardMaterial({ color: '#526064', metalness: 0.65, roughness: 0.6 })),
    black: own(new THREE.MeshStandardMaterial({ color: '#0a141b', metalness: 0.25, roughness: 0.7 })),
    glass: own(new THREE.MeshStandardMaterial({ color: '#0c212d', roughness: 0.25, metalness: 0.8 })),
    warmWindow: own(new THREE.MeshStandardMaterial({ color: '#514a36', emissive: '#d9a45e', emissiveIntensity: 0.75, roughness: 0.4 })),
    coolWindow: own(new THREE.MeshStandardMaterial({ color: '#294955', emissive: '#73b4c5', emissiveIntensity: 0.55, roughness: 0.4 })),
    cyan: own(new THREE.MeshBasicMaterial({ color: new THREE.Color('#68ffdf').multiplyScalar(2) })),
    red: own(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff385b').multiplyScalar(2) })),
    amber: own(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb570').multiplyScalar(1.5) })),
    purple: own(new THREE.MeshBasicMaterial({ color: new THREE.Color('#bb6bff').multiplyScalar(2) })),
    awning: own(new THREE.MeshStandardMaterial({ color: '#532b31', roughness: 0.85, side: THREE.DoubleSide })),
  };
  const boxGeometry = own(new THREE.BoxGeometry(1, 1, 1));
  const batches = new Map();
  const matrixObject = new THREE.Object3D();
  function box(material, x, y, z, w, h, d, rotation = 0) {
    const mat = typeof material === 'string' ? materials[material] : material;
    if (!batches.has(mat)) batches.set(mat, []);
    matrixObject.position.set(x, y, z);
    matrixObject.rotation.set(0, rotation, 0);
    matrixObject.scale.set(w, h, d);
    matrixObject.updateMatrix();
    batches.get(mat).push(matrixObject.matrix.clone());
  }
  const addMesh = (geometry, material, x, y, z) => {
    const mesh = new THREE.Mesh(own(geometry), material);
    mesh.position.set(x, y, z); scene.add(mesh); return mesh;
  };
  function cable(points, thickness = 0.028, material = materials.black) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return addMesh(new THREE.TubeGeometry(curve, 16, thickness, 4, false), material, 0, 0, 0);
  }
  function pointLight(color, intensity, x, y, z, distance = 18) {
    const light = new THREE.PointLight(color, intensity, distance, 1.8);
    light.position.set(x, y, z); scene.add(light); return light;
  }

  const flickering = [];
  function sign(text, color, x, y, z, width, height, options = {}) {
    const vertical = options.vertical ?? height > width * 1.8;
    const texture = canvasTexture(vertical ? 256 : 768, vertical ? 1024 : 256, (ctx, w, h) => {
      ctx.fillStyle = options.background || '#091218'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = color; ctx.lineWidth = 4;
      ctx.strokeRect(12, 12, w - 24, h - 24);
      ctx.strokeStyle = `${color}44`; ctx.lineWidth = 1;
      ctx.strokeRect(21, 21, w - 42, h - 42);
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (vertical) {
        const chars = [...text];
        const size = Math.min(w * 0.7, h * 0.76 / chars.length);
        ctx.font = `700 ${size}px "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif`;
        chars.forEach((char, i) => ctx.fillText(char, w / 2, h * 0.11 + (i + 0.5) * h * 0.75 / chars.length));
        ctx.shadowBlur = 0; ctx.font = `500 ${w * 0.067}px monospace`;
        ctx.fillText(options.sub || '24H · OPEN', w / 2, h * 0.945);
      } else {
        ctx.font = `700 ${Math.min(h * 0.45, w * 0.8 / [...text].length)}px "Hiragino Kaku Gothic ProN", sans-serif`;
        ctx.fillText(text, w / 2, h * 0.45);
        ctx.shadowBlur = 0; ctx.font = `500 ${h * 0.09}px monospace`;
        ctx.fillText(options.sub || 'KOWLOON NORTH · SINCE 2049', w / 2, h * 0.8);
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      for (let yy = 0; yy < h; yy += 4) ctx.fillRect(0, yy, w, 1);
    });
    const mat = own(new THREE.MeshBasicMaterial({ map: texture, color: new THREE.Color().setScalar(1.6), side: THREE.DoubleSide }));
    const mesh = addMesh(new THREE.PlaneGeometry(width, height), mat, x, y, z);
    mesh.rotation.y = options.rotation || 0;
    box('black', x, y, z - 0.13, width + 0.14, height + 0.14, 0.26, options.rotation || 0);
    if (options.flicker) flickering.push({ mat, phase: random() * 20 });
    return mesh;
  }

  const facadePoses = [], propPoses = [];
  // Architecture: repeated structure is instanced, while unique signs stay editable.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 15; i++) {
      const z = 19 - i * 8.4;
      const height = 18 + random() * 27;
      const x = side * (10.5 + random() * 0.7);
      const facadeX = side * 6.1;
      random(); // Preserve the street layout seed consumed by the former wall variant.
      facadePoses.push({ position: [x, 0, z], yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2, height });
      if (i < 12) {
        const labels = side < 0 ? ['龍門', '夜市', '義体修理', '金龍飯店', '記憶', '九龍', '不夜城', '電気', '幸福', '茶館', '賭場', '新生'] : ['電脳', 'ホテル', '診療所', '未来', '無線', '新世界', '遊戯', '紅龍', '電子', '光速', '人造', '銀河'];
        const colors = side < 0 ? ['#ff647b', '#ffc588', '#8fffe0'] : ['#75fce3', '#cb9bff', '#ff819b'];
        const tall = 3.8 + random() * 3.5;
        sign(labels[i], colors[i % 3], side * (4.5 + random() * 0.6), 6.5 + random() * 4.5, z - 2.4, 1.1 + random() * 0.35, tall, { flicker: i === 2 || i === 7 });
        box('steel', side * 5.4, 7.5, z - 2.6, 1.5, 0.1, 0.12);
        sign(i % 2 ? 'ラーメン · 麺' : '電子部品', i % 2 ? '#ffc994' : '#91ddfa', facadeX - side * 0.4, 3.9, z, 5.4, 0.83, { rotation: side < 0 ? Math.PI / 2 : -Math.PI / 2, sub: i % 2 ? 'NOODLES / HOT FOOD' : 'TECH / REPAIR / EXCHANGE' });
      }
    }
  }

  // Distant megastructures rise behind the human-scale street.
  for (let i = 0; i < 40; i++) {
    const x = (random() - 0.5) * 160;
    const z = -110 - random() * 65;
    const height = 35 + random() * 80;
    const width = 5 + random() * 12;
    box('wall', x, height / 2, z, width, height, width);
    for (let j = 0; j < height / 3; j++) {
      for (let k = 0; k < Math.floor(width / 1.8); k++) {
        if (random() > 0.64) box(random() > 0.3 ? 'coolWindow' : 'warmWindow', x - width / 2 + 1 + k * 1.8, j * 3 + 2, z + width / 2 + 0.05, 0.6, 1, 0.06);
      }
    }
    if (i % 4 === 0) box('cyan', x + width / 2, height / 2, z + width / 2 + 0.1, 0.045, height * 0.9, 0.045);
    if (i % 6 === 0) box('red', x, height + 1, z, 0.17, 0.3, 0.17);
  }

  // Overhead bridges and an illuminated gate break the long perspective.
  for (const z of [-44, -82]) {
    sign(z === -44 ? '九 龍 北 区' : '新 世 界', '#8afce2', 0, 10.2, z + 1.4, 6.5, 1.4, { sub: z === -44 ? 'SECTOR 09 / NO CORPORATE JURISDICTION' : 'THE FUTURE BELONGS TO YOU' });
    pointLight('#57ddc4', 65, 0, 10, z + 3, 22);
  }

  // Tangled cables sag over the road at several heights.
  for (let i = 0; i < 30; i++) {
    const z = 10 - i * 4.4;
    const y = 8 + random() * 10;
    cable([[-6.6, y, z], [-2, y - 1.3 - random(), z + 1], [2, y - 1.1, z - 1], [6.6, y + random() * 2, z - 1.5]], 0.018 + random() * 0.02);
  }
  for (const side of [-1, 1]) cable([[side * 5.7, 5, 24], [side * 5.2, 4.6, -20], [side * 5.5, 5.6, -60], [side * 5.8, 4.9, -108]], 0.045);

  // Lanterns, dumpsters, bins, traffic bollards and a noodle counter.
  const lanternGeo = own(new THREE.SphereGeometry(0.3, 12, 12));
  const lanternMat = own(new THREE.MeshStandardMaterial({ color: '#be4a36', emissive: '#ff5124', emissiveIntensity: 1.2, roughness: 0.8 }));
  for (let i = 0; i < 24; i++) {
    const side = i % 2 ? -1 : 1, z = 12 - Math.floor(i / 2) * 10;
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.position.set(side * 4.8, 2.85, z); lantern.scale.y = 1.4; scene.add(lantern);
    box('black', side * 4.8, 3.3, z, 0.17, 0.13, 0.17);
    box('black', side * 4.8, 2.42, z, 0.17, 0.12, 0.17);
    if (i % 4 === 0) pointLight('#ff8952', 16, side * 4.4, 2.5, z, 8);
    if (i % 3 === 0) propPoses.push({ position: [side * 5.05, 0, z - 3], yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2 });
  }
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? -1 : 1, z = 9 - i * 8;
    box('steel', side * 4.7, 0.4, z, 0.18, 0.8, 0.18);
    box('amber', side * 4.7, 0.65, z, 0.2, 0.09, 0.2);
  }
  sign('龍門麺屋', '#ffd4a0', -4, 3.9, -3, 2.8, 0.9, { sub: 'HOT NOODLES / 24 HOURS' });
  // Repair terminal with its own luminous display.
  sign('義体認証', '#7bfce3', 4.37, 2.05, -23, 0.95, 0.7, { rotation: -Math.PI / 2, sub: 'IDENTITY / SCAN' });

  // Graffiti and flyers are original canvas textures.
  const graffiti = canvasTexture(512, 256, ctx => {
    ctx.clearRect(0, 0, 512, 256);
    ctx.save(); ctx.translate(256, 128); ctx.rotate(-0.09);
    ctx.font = '900 66px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#cf667b'; ctx.fillText('NO GODS', 0, 0);
    ctx.font = '900 24px monospace'; ctx.fillStyle = '#a2a6a0'; ctx.fillText('企業の未来に、俺たちはいない。', 0, 48); ctx.restore();
  });
  const graffitiMat = own(new THREE.MeshBasicMaterial({ map: graffiti, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
  for (const z of [7, -31, -70]) {
    const mesh = addMesh(new THREE.PlaneGeometry(3.5, 1.75), graffitiMat, 6 - 0.25, 1.9, z);
    mesh.rotation.y = -Math.PI / 2;
  }
  const flyer = canvasTexture(128, 192, (ctx, w, h) => {
    ctx.fillStyle = '#b7b29e'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#252d2a'; ctx.textAlign = 'center'; ctx.font = 'bold 22px sans-serif';
    ctx.fillText('失踪者', w / 2, 32); ctx.fillRect(28, 48, 72, 73);
    ctx.fillStyle = '#8b958f'; ctx.beginPath(); ctx.arc(64, 71, 12, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(42, 89, 44, 30);
    ctx.fillStyle = '#252d2a'; ctx.font = '10px monospace'; ctx.fillText('LAST SEEN · SECTOR 09', 64, 148); ctx.fillText('REWARD: ¥ 80,000', 64, 169);
  });
  const flyerMat = own(new THREE.MeshStandardMaterial({ map: flyer, roughness: 1, side: THREE.DoubleSide }));
  for (let i = 0; i < 16; i++) {
    const mesh = addMesh(new THREE.PlaneGeometry(0.45, 0.65), flyerMat, -5.79, 1.7 + random() * 0.5, 9 - i * 5 + random());
    mesh.rotation.y = Math.PI / 2; mesh.rotation.z = (random() - 0.5) * 0.15;
  }

  // A huge animated hologram glows beyond the second bridge.
  const holoGroup = new THREE.Group(); holoGroup.position.set(2, 22, -106); scene.add(holoGroup);
  const holoMat = own(new THREE.MeshBasicMaterial({ color: '#76eed9', transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(own(new THREE.TorusGeometry(3 + i * 0.4, 0.025, 6, 80)), holoMat);
    ring.rotation.y = i * 0.6; holoGroup.add(ring);
  }
  const core = new THREE.Mesh(own(new THREE.IcosahedronGeometry(2, 1)), own(new THREE.MeshBasicMaterial({ color: '#89fce2', wireframe: true, transparent: true, opacity: 0.25 })));
  holoGroup.add(core);
  sign('新 生', '#c4fff0', 2, 15, -106, 5.5, 1.5, { sub: 'SYNTHETIC LIFE / A BETTER YOU' });
  sign('夢を、アップロード。', '#c2a4ff', 10, 28, -107, 10, 3, { sub: 'MIRAI INDUSTRIES · EST. 2039' });

  // A surveillance drone patrols the street, casting a cyan search beam.
  const drone = new THREE.Group(); scene.add(drone);
  const coneMat = own(new THREE.MeshBasicMaterial({ color: '#6edbd2', transparent: true, opacity: 0.022, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  const beam = new THREE.Mesh(own(new THREE.ConeGeometry(2.3, 6, 24, 1, true)), coneMat);
  beam.position.y = -3.1; drone.add(beam);

  const inhabitants = [];

  // Wet pavement: a planar reflection with animated surface distortion and grain.
  const reflectionShader = {
    ...Reflector.ReflectorShader,
    uniforms: THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms),
    fragmentShader: Reflector.ReflectorShader.fragmentShader
      .replace('uniform vec3 color;', 'uniform vec3 color;\nuniform float uTime;')
      .replace('vec4 base = texture2DProj( tDiffuse, vUv );', `
        vec4 wetUv = vUv;
        wetUv.x += sin(vUv.y * 420.0 + uTime * 1.5) * 0.0007 * vUv.w;
        wetUv.y += sin(vUv.x * 240.0 - uTime) * 0.0004 * vUv.w;
        vec4 base = texture2DProj(tDiffuse, wetUv);
        float grain = fract(sin(dot(vUv.xy, vec2(12.9898, 78.233))) * 43758.5453);
        base.rgb *= 0.58 + grain * 0.24;
      `),
  };
  reflectionShader.uniforms.uTime = { value: 0 };
  const reflector = new Reflector(own(new THREE.PlaneGeometry(12.1, 155)), {
    clipBias: 0.003, textureWidth: mobile ? 512 : 1024, textureHeight: mobile ? 512 : 1024,
    color: 0x536369, shader: reflectionShader,
  });
  reflector.rotation.x = -Math.PI / 2; reflector.position.set(0, -0.025, -48); scene.add(reflector);
  const roadTexture = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#131c22'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 22000; i++) {
      ctx.fillStyle = `rgba(100,116,120,${random() * 0.24})`;
      ctx.fillRect(random() * w, random() * h, 1, 1 + random() * 2);
    }
    ctx.strokeStyle = '#060e13'; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(random() * w, 0); ctx.bezierCurveTo(random() * w, 150, random() * w, 250, random() * w, h); ctx.stroke(); }
  });
  roadTexture.wrapS = roadTexture.wrapT = THREE.RepeatWrapping; roadTexture.repeat.set(4, 40);
  const roadMat = own(new THREE.MeshStandardMaterial({ map: roadTexture, transparent: true, opacity: 0.52, roughness: 0.35, metalness: 0.6 }));
  const road = addMesh(new THREE.PlaneGeometry(12.1, 155), roadMat, 0, 0, -48); road.rotation.x = -Math.PI / 2;
  for (const side of [-1, 1]) box('steel', side * 5.8, 0.025, -48, 0.13, 0.08, 155);
  for (let z = 18; z > -118; z -= 6) box('trim', 0, 0.009, z, 0.09, 0.016, 2.2);
  for (let z = 15; z > -112; z -= 16) {
    box('black', -4.8, 0.015, z, 0.7, 0.025, 1.6);
    for (let i = 0; i < 9; i++) box('trim', -4.8, 0.034, z - 0.65 + i * 0.16, 0.65, 0.012, 0.018);
  }
  // A handful of scattered paper scraps give the street an unmaintained feel.
  for (let i = 0; i < 32; i++) box('trim', (random() - 0.5) * 10, 0.023, 16 - random() * 128, 0.08 + random() * 0.12, 0.008, 0.12 + random() * 0.15, random() * Math.PI);

  // Pool lights are local; distant lighting is represented by emissive surfaces.
  for (let i = 0; i < 8; i++) {
    const z = 6 - i * 15;
    pointLight(i % 2 ? '#b369ff' : '#ff526d', 48, -4.2, 5.2, z, 16);
    pointLight('#61eadb', 52, 4.4, 5.8, z - 5, 16);
  }

  // Flush batched boxes once, reducing thousands of surfaces to a few draw calls.
  for (const [material, matrices] of batches) {
    const mesh = new THREE.InstancedMesh(boxGeometry, material, matrices.length);
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); scene.add(mesh);
  }

  const rainCount = mobile ? 1600 : 3500;
  const rainPositions = new Float32Array(rainCount * 6);
  const rainSpeeds = new Float32Array(rainCount);
  for (let i = 0; i < rainCount; i++) {
    const offset = i * 6;
    rainPositions[offset] = (random() - 0.5) * 35;
    rainPositions[offset + 1] = random() * 28;
    rainPositions[offset + 2] = 27 - random() * 145;
    rainSpeeds[i] = 13 + random() * 14;
    rainPositions[offset + 3] = rainPositions[offset] - 0.025;
    rainPositions[offset + 4] = rainPositions[offset + 1] + 0.25 + random() * 0.25;
    rainPositions[offset + 5] = rainPositions[offset + 2];
  }
  const rainGeo = own(new THREE.BufferGeometry());
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = own(new THREE.LineBasicMaterial({ color: '#9bc8d5', transparent: true, opacity: 0.2, depthWrite: false }));
  const rain = new THREE.LineSegments(rainGeo, rainMat); rain.frustumCulled = false; scene.add(rain);

  // Steam uses a soft original sprite and always faces the viewer.
  const steamTexture = canvasTexture(128, 128, (ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, 'rgba(170,204,212,0.45)'); gradient.addColorStop(0.45, 'rgba(140,180,190,0.14)'); gradient.addColorStop(1, 'rgba(120,150,160,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
  });
  const steamMat = own(new THREE.SpriteMaterial({ map: steamTexture, transparent: true, opacity: 0.25, depthWrite: false }));
  const steam = [];
  for (let i = 0; i < 24; i++) {
    const sprite = new THREE.Sprite(steamMat);
    const z = [4, -23, -51, -78][Math.floor(i / 6)];
    sprite.position.set(i % 2 ? -4.5 : 4.5, 0.5, z);
    sprite.scale.set(2, 2, 1); scene.add(sprite);
    steam.push({ sprite, z, phase: (i % 6) / 6 });
  }

  const keys = new Set();
  let dragging = false, lastX = 0, lastY = 0, touchMove = [0, 0];
  const onKeyDown = e => {
    if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName) || document.querySelector('dialog[open]')) return;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
      keys.add(e.code); e.preventDefault();
    }
  };
  const onKeyUp = e => keys.delete(e.code);
  const clearKeys = () => { keys.clear(); touchMove = [0, 0]; dragging = false; };
  const onPointerDown = e => {
    if (e.button !== 0) return;
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    renderer.domElement.setPointerCapture(e.pointerId);
    renderer.domElement.focus({ preventScroll: true });
  };
  const onPointerMove = e => {
    if (!dragging || paused) return;
    yaw -= (e.clientX - lastX) * 0.003;
    pitch = THREE.MathUtils.clamp(pitch - (e.clientY - lastY) * 0.0025, -0.8, 0.85);
    lastX = e.clientX; lastY = e.clientY;
    destination = null;
  };
  const onPointerUp = () => { dragging = false; };
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp); window.addEventListener('blur', clearKeys);
  document.addEventListener('visibilitychange', clearKeys);

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
    renderer.setSize(w, h); composer.setSize(w, h);
  }
  let frame = 0, resizeObserver = null;
  function disposeCity() {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(frame); resizeObserver?.disconnect(); clearKeys();
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    renderer.domElement.removeEventListener('pointermove', onPointerMove);
    renderer.domElement.removeEventListener('pointerup', onPointerUp);
    renderer.domElement.removeEventListener('pointercancel', onPointerUp);
    window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', clearKeys);
    document.removeEventListener('visibilitychange', clearKeys);
    reflector.dispose(); composer.passes.forEach(pass => pass.dispose?.()); composer.dispose();
    disposeModelTree(scene, resources); renderer.dispose(); renderer.domElement.remove();
  }
  const lightingStage = { scene, renderer, dispose: disposeCity, quality() {}, onDispose: callback => own({ dispose: callback }) };
  const [facadeModel, bridgeModel, terminalModel, droneModel, propsModel, facadeDistant, stall, rainPerson] = await loadStageModels(lightingStage, ['alley_facade.glb', 'pedestrian_bridge.glb', 'vending_terminal.glb', 'service_drone.glb', 'alley_props.glb', 'alley_facade_distant.glb', 'noodle_stall.glb', 'rain_person.glb']);
  const facadeLevels = [crowdFrom(facadeModel.scene, facadePoses.length), crowdFrom(facadeDistant.scene, facadePoses.length)];
  const facadePose = new THREE.Object3D();
  let lastFacadeZ = Infinity;
  function updateFacades() {
    if (Math.abs(camera.position.z - lastFacadeZ) < 2) return;
    lastFacadeZ = camera.position.z;
    const counts = [0, 0];
    for (const pose of facadePoses) {
      const level = Math.abs(pose.position[2] - camera.position.z) < (mobile ? 20 : 32) ? 0 : 1;
      facadePose.position.set(...pose.position); facadePose.rotation.set(0, pose.yaw, 0); facadePose.scale.set(1, pose.height / 24, 1); facadePose.updateMatrix();
      for (const part of facadeLevels[level]) part.mesh.setMatrixAt(counts[level], facadePose.matrix);
      counts[level]++;
    }
    facadeLevels.forEach((parts, level) => { for (const part of parts) { part.mesh.count = counts[level]; part.mesh.instanceMatrix.needsUpdate = true; } });
  }
  facadeLevels.forEach((parts, level) => parts.forEach((part, index) => { part.mesh.name = `Facade.LOD${level}.${index}`; scene.add(part.mesh); }));
  updateFacades();
  for (const z of [-44, -82]) scene.add(modelCopy(bridgeModel, [0, 12.2, z]));
  for (const pose of propPoses) scene.add(modelCopy(propsModel, pose.position, pose.yaw, .75));
  scene.add(modelCopy(terminalModel, [5.05, 0, -23], -Math.PI / 2));
  drone.add(modelCopy(droneModel));
  stall.scene.position.set(-4.2, 0, -3); stall.scene.rotation.y = Math.PI / 2; scene.add(stall.scene);
  enhanceStage(lightingStage, moon, { extent: 65, target: [0, 0, -40], environment: .3 });
  for (let i = 0; i < 10; i++) {
    const person = rainPerson.scene.clone(true);
    person.position.set((random() - 0.5) * 5.2, 0, 8 - random() * 90);
    person.rotation.y = random() * Math.PI * 2;
    scene.add(person);
    inhabitants.push({ person, z: person.position.z, phase: random() * 10 });
  }

  resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container); resize();
  let last = performance.now(), elapsed = 0, statusTimer = 0;
  const cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  function animate(now) {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (document.hidden) return;
    if (!paused || destination) {
      if (!paused) elapsed += dt;
      if (destination) {
        const speed = reducedMotion ? 1 : 1 - Math.exp(-dt * 3);
        camera.position.lerp(destination.position, speed);
        yaw = THREE.MathUtils.lerp(yaw, destination.yaw, speed);
        pitch = THREE.MathUtils.lerp(pitch, destination.pitch, speed);
        if (camera.position.distanceTo(destination.position) < 0.02) destination = null;
      } else if (mode === 'walk') {
        const forward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) + touchMove[1];
        const strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0) + touchMove[0];
        const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 7 : 3.3) * dt / Math.max(1, Math.hypot(forward, strafe));
        camera.position.x += (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * speed;
        camera.position.z += (-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * speed;
        camera.position.x = THREE.MathUtils.clamp(camera.position.x, -3, 3);
        camera.position.z = THREE.MathUtils.clamp(camera.position.z, -100, 20);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.75 + (reducedMotion ? 0 : Math.sin(elapsed * 9) * 0.025 * Math.min(1, Math.abs(forward) + Math.abs(strafe))), 0.15);
        if (keys.has('ArrowLeft')) yaw += dt * 1.1;
        if (keys.has('ArrowRight')) yaw -= dt * 1.1;
      }
      cameraEuler.set(-pitch, yaw + (mode === 'cinematic' && !dragging && !reducedMotion && !destination ? Math.sin(elapsed * 0.11) * 0.016 : 0), 0);
      camera.quaternion.setFromEuler(cameraEuler);
      if (!paused && !reducedMotion) {
        drone.position.set(Math.sin(elapsed * 0.23) * 2.2, 7.5 + Math.sin(elapsed * 0.6) * 0.35, -20 + Math.sin(elapsed * 0.12) * 20);
        drone.rotation.y = Math.sin(elapsed * 0.2) * 0.3;
        holoGroup.rotation.y = elapsed * 0.18; core.rotation.z = elapsed * 0.1;
        for (const { mat, phase } of flickering) mat.color.setScalar(Math.sin(elapsed * 9 + phase) > 0.98 ? 0.25 : 1.6);
        for (const { person, z, phase } of inhabitants) { person.position.z = z + Math.sin(elapsed * 0.06 + phase) * 3; person.position.y = Math.abs(Math.sin(elapsed * 2 + phase)) * 0.015; }
        for (const { sprite, z, phase } of steam) {
          const progress = (elapsed * 0.12 + phase) % 1;
          sprite.position.y = 0.4 + progress * 3.5; sprite.position.z = z + Math.sin(progress * 3 + phase) * 0.5;
          sprite.scale.setScalar(1 + progress * 3);
        }
        if (rainAmount > 0) {
          for (let i = 0; i < rainCount; i++) {
            const o = i * 6, fall = rainSpeeds[i] * dt;
            rainPositions[o + 1] -= fall; rainPositions[o + 4] -= fall;
            if (rainPositions[o + 1] < 0) { rainPositions[o + 1] += 28; rainPositions[o + 4] += 28; }
          }
          rainGeo.attributes.position.needsUpdate = true;
        }
        reflector.material.uniforms.uTime.value = elapsed;
      }
    }
    updateFacades(); composer.render(dt);
    statusTimer += dt;
    if (statusTimer > 0.25) { callbacks.onPosition?.({ x: camera.position.x, z: camera.position.z, yaw }); statusTimer = 0; }
  }
  drone.position.set(0, 7.5, -20);
  frame = requestAnimationFrame(animate);
  callbacks.onReady?.();
  return {
    scene, camera, renderer, canvas: renderer.domElement,
    setMode(value) { mode = value; clearKeys(); },
    setPaused(value) { paused = value; clearKeys(); },
    setTouchMove(x, y) { touchMove = [x, y]; },
    travel(id) {
      const district = DISTRICTS.find(d => d.id === id);
      if (!district) return;
      clearKeys(); destination = { position: new THREE.Vector3(...district.position), yaw: district.yaw, pitch: district.pitch };
    },
    settings({ rain: value, bloom: bloomValue, fog, quality }) {
      rainAmount = value; rain.visible = value > 0; rainMat.opacity = value * 0.3;
      rainGeo.setDrawRange(0, Math.floor(rainCount * value) * 2);
      bloom.strength = bloomValue; scene.fog.density = fog;
      lightingStage.quality(quality);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'high' ? (mobile ? 1.25 : 1.5) : 1)); resize();
      reflector.visible = quality === 'high'; roadMat.opacity = quality === 'high' ? 0.52 : 1;
    },
    capture() {
      updateFacades(); composer.render();
      return new Promise(resolve => renderer.domElement.toBlob(resolve, 'image/png'));
    },
    dispose: disposeCity,
  };
}
