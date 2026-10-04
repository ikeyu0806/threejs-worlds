import * as THREE from 'three';
import { createStage, seededRandom } from '../../../shared/stage.js';

export const vistas = [
  { id: 'deck', number: '01', name: '観測甲板', en: 'OBSERVATION', position: [0, 4.5, 20], target: [-1, 8, -40], note: '甲板の縁から、環のある星を眺める。' },
  { id: 'rings', number: '02', name: '環の光', en: 'RINGLIGHT', position: [10, 6.2, 14], target: [-6, 7, -46], note: '薄い環が、星の光をすくっている。' },
  { id: 'nebula', number: '03', name: '星雲の縁', en: 'NEBULA', position: [-10, 7.4, 16], target: [12, 12, -36], note: '色をほどいた雲が、ゆっくり流れる。' },
];

export function createCosmos(container, onError) {
  const stage = createStage(container, {
    background: '#070814', fog: 0.0065, position: vistas[0].position, target: vistas[0].target,
    label: '環のある惑星と星雲、観測甲板。ドラッグで見回せます。',
    bloom: 0.48, bloomThreshold: 0.72, exposure: 1.12, fov: 52, mobileFov: 76,
    bounds: { minX: -11, maxX: 11, minZ: 6, maxZ: 23 }, onError,
  });
  const { scene } = stage;
  const random = seededRandom(8024);
  const standard = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
  const hull = standard('#232838', { metalness: 0.72, roughness: 0.32 });
  const trim = standard('#8d93a8', { metalness: 0.8, roughness: 0.28 });
  const lamp = new THREE.MeshBasicMaterial({ color: '#f0d2a8' });
  const screen = new THREE.MeshBasicMaterial({ color: '#6f7eae' });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function mesh(geometry, material, position, scale = [1, 1, 1], parent = scene) {
    const result = new THREE.Mesh(geometry, material);
    result.position.set(...position); result.scale.set(...scale); parent.add(result); return result;
  }
  function box(material, position, scale, parent) { return mesh(cube, material, position, scale, parent); }

  scene.add(new THREE.HemisphereLight('#24304f', '#07060d', 0.85));
  const sun = new THREE.DirectionalLight('#fff1d4', 2.6);
  sun.position.set(70, 36, -10); scene.add(sun);
  const deckFill = new THREE.PointLight('#ffd7ae', 28, 26, 1.6);
  deckFill.position.set(0, 3.2, 13); scene.add(deckFill);
  mesh(new THREE.SphereGeometry(2.4, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff6e4' }), [78, 40, -18]);
  mesh(new THREE.SphereGeometry(6, 24, 16), new THREE.MeshBasicMaterial({ color: '#ffd7a4', transparent: true, opacity: 0.16, depthWrite: false }), [78, 40, -18]);

  const deckCenter = new THREE.Vector3(0, 0, 13);
  const plate = document.createElement('canvas'); plate.width = plate.height = 512;
  const paint = plate.getContext('2d');
  paint.fillStyle = '#1a1e2c'; paint.fillRect(0, 0, 512, 512);
  paint.strokeStyle = 'rgba(176,186,214,.35)'; paint.lineWidth = 2;
  for (let i = 0; i <= 8; i++) {
    paint.beginPath(); paint.moveTo(i * 64, 0); paint.lineTo(i * 64, 512); paint.stroke();
    paint.beginPath(); paint.moveTo(0, i * 64); paint.lineTo(512, i * 64); paint.stroke();
  }
  paint.strokeStyle = 'rgba(214,196,160,.45)'; paint.strokeRect(18, 18, 476, 476);
  const deckMap = new THREE.CanvasTexture(plate); deckMap.colorSpace = THREE.SRGBColorSpace;
  deckMap.wrapS = deckMap.wrapT = THREE.RepeatWrapping; deckMap.repeat.set(6, 6);
  const deck = mesh(new THREE.CircleGeometry(16.4, 80), standard('#242a3c', { map: deckMap, metalness: 0.55, roughness: 0.42 }), [deckCenter.x, 0.04, deckCenter.z]);
  deck.rotation.x = -Math.PI / 2;
  mesh(new THREE.CylinderGeometry(16.4, 15.6, 0.7, 80), hull, [0, -0.32, deckCenter.z]);
  const rail = mesh(new THREE.TorusGeometry(15.5, 0.055, 8, 90), trim, [0, 1.15, deckCenter.z]);
  rail.rotation.x = Math.PI / 2;
  const glowRing = mesh(new THREE.TorusGeometry(15.5, 0.018, 6, 90), lamp, [0, 0.08, deckCenter.z]);
  glowRing.rotation.x = Math.PI / 2;
  for (let i = 0; i < 28; i++) {
    const angle = i / 28 * Math.PI * 2;
    const x = Math.cos(angle) * 15.5, z = deckCenter.z + Math.sin(angle) * 15.5;
    box(trim, [x, 0.58, z], [0.07, 1.15, 0.07]);
    if (i % 7 === 0 && Math.abs(Math.sin(angle)) < 0.82) {
      const plinth = new THREE.Group();
      plinth.position.set(Math.cos(angle) * 11.2, 0, deckCenter.z + Math.sin(angle) * 11.2);
      plinth.lookAt(Math.cos(angle) * 24, 1.1, deckCenter.z + Math.sin(angle) * 24);
      scene.add(plinth);
      box(hull, [0, 0.7, 0], [0.7, 1.4, 0.35], plinth);
      box(screen, [0, 1.15, 0.2], [0.36, 0.22, 0.02], plinth);
    }
  }
  mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.08, 48), standard('#121624', { metalness: 0.85, roughness: 0.16, emissive: '#1c2b55', emissiveIntensity: 0.55 }), [0, 0.08, deckCenter.z]);
  box(hull, [0, 0.55, 6.2], [3.2, 0.12, 0.8]);
  for (const x of [-1.2, 1.2]) box(trim, [x, 0.28, 6.2], [0.08, 0.5, 0.7]);

  const chart = document.createElement('canvas'); chart.width = 256; chart.height = 160;
  const chartPaint = chart.getContext('2d');
  chartPaint.fillStyle = '#10182a'; chartPaint.fillRect(0, 0, 256, 160);
  chartPaint.strokeStyle = '#c5d2ff'; chartPaint.lineWidth = 2;
  chartPaint.beginPath(); chartPaint.arc(128, 84, 46, 0, Math.PI * 2); chartPaint.stroke();
  chartPaint.beginPath(); chartPaint.arc(128, 84, 16, 0, Math.PI * 2); chartPaint.stroke();
  chartPaint.fillStyle = '#f2e2c4'; chartPaint.beginPath(); chartPaint.arc(166, 64, 4, 0, Math.PI * 2); chartPaint.fill();
  const chartMap = new THREE.CanvasTexture(chart); chartMap.colorSpace = THREE.SRGBColorSpace;
  box(hull, [-4.2, 0.85, 16.5], [1.8, 0.9, 0.7]);
  mesh(new THREE.PlaneGeometry(1.15, 0.62), new THREE.MeshBasicMaterial({ map: chartMap }), [-4.2, 1.05, 16.88]);

  const planet = new THREE.Group(); planet.position.set(-1, 9.5, -52); scene.add(planet);
  const planetMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: 'varying vec3 vPos; varying vec3 vNormal; void main(){vPos=position; vNormal=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 vPos; varying vec3 vNormal; uniform float time;
      void main(){
        vec3 p=normalize(vPos);
        float lon=atan(p.z,p.x)+time*.045;
        float band=sin(p.y*24.+sin(lon*3.+p.y*6.)+sin(time*.05));
        float fine=sin(p.y*70.+lon*8.)*.35;
        vec2 storm=vec2(lon-1.2,p.y-.12); storm.x=atan(sin(storm.x),cos(storm.x));
        float eye=smoothstep(.55,.0,length(storm*vec2(1.15,2.4)));
        vec3 ice=vec3(.45,.58,.72), cream=vec3(.86,.8,.68), rust=vec3(.62,.45,.4);
        vec3 c=mix(ice,cream,clamp(band*.5+.5+fine*.15,0.,1.));
        c=mix(c,rust,eye*.72);
        float light=clamp(dot(normalize(vNormal),normalize(vec3(.72,.48,.28))),0.,1.);
        c*=.16+light;
        c+=vec3(.35,.42,.55)*pow(light,3.)*.25;
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  mesh(new THREE.SphereGeometry(13, 72, 48), planetMaterial, [0, 0, 0], [1, 1, 1], planet);
  const atmosphere = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide,
    vertexShader: 'varying vec3 vNormal; varying vec3 vWorld; void main(){vec4 world=modelMatrix*vec4(position,1.); vWorld=world.xyz; vNormal=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*world;}',
    fragmentShader: `varying vec3 vNormal; varying vec3 vWorld; void main(){
      float fres=pow(1.-abs(dot(normalize(cameraPosition-vWorld),normalize(vNormal))),2.4);
      gl_FragColor=vec4(vec3(.58,.72,.95),fres*.7);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  mesh(new THREE.SphereGeometry(14.3, 48, 32), atmosphere, [0, 0, 0], [1, 1, 1], planet);
  const rings = new THREE.Mesh(new THREE.RingGeometry(17.5, 28, 96, 6), new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } }, transparent: true, side: THREE.DoubleSide, depthWrite: false,
    vertexShader: 'varying vec2 vPos; void main(){vPos=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vPos; uniform float time; void main(){
      float r=length(vPos);
      float bands=smoothstep(.45,.0,abs(fract(r*.55+sin(time*.02))-.5));
      float gap=smoothstep(.35,.0,abs(r-22.4));
      float alpha=(.22+bands*.62)*(1.-gap*.85);
      alpha*=smoothstep(17.5,18.4,r)*smoothstep(28.,26.2,r);
      vec3 c=mix(vec3(.62,.58,.5),vec3(.93,.86,.74),bands);
      gl_FragColor=vec4(c,alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  }));
  rings.rotation.x = Math.PI / 2 - 0.38; rings.rotation.y = 0.25; planet.add(rings);
  const moonPivot = new THREE.Group(); planet.add(moonPivot);
  mesh(new THREE.SphereGeometry(2.15, 32, 24), standard('#c8c4b8', { roughness: 0.92 }), [36, 4.5, 0], [1, 1, 1], moonPivot);

  const nebula = new THREE.Mesh(new THREE.PlaneGeometry(86, 46), new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } }, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv; uniform float time; void main(){
      vec2 p=vUv-vec2(.55,.48);
      float n=sin(p.x*7.+time*.04)*sin(p.y*5.-time*.03);
      float veil=smoothstep(.48,.02,length(p*vec2(1.25,.95)));
      float edge=smoothstep(0.,.24,vUv.x)*smoothstep(1.,.76,vUv.x)*smoothstep(0.,.3,vUv.y)*smoothstep(1.,.7,vUv.y);
      vec3 c=mix(vec3(.28,.18,.48),vec3(.86,.42,.36),smoothstep(0.,1.,vUv.x));
      c=mix(c,vec3(.28,.48,.72),smoothstep(.2,.9,vUv.y));
      gl_FragColor=vec4(c,veil*edge*(.5+n*.08));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  }));
  nebula.position.set(24, 15, -74); nebula.scale.set(1.35, 1.15, 1); scene.add(nebula);

  const starCount = matchMedia('(max-width: 700px)').matches ? 650 : 1300;
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  const phases = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    const radius = 70 + random() * 40;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    positions.set([Math.sin(phi) * Math.cos(theta) * radius, Math.cos(phi) * radius * 0.72 + 8, Math.sin(phi) * Math.sin(theta) * radius - 10], i * 3);
    sizes[i] = random() > 0.96 ? 3.4 : 1.1 + random() * 1.3;
    phases[i] = random() * Math.PI * 2;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  starGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  const starMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aSize; attribute float aPhase; varying float vPhase;
      void main(){vPhase=aPhase; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=clamp(aSize*(150./max(1.,-mv.z)),1.,8.); gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying float vPhase; uniform float time; void main(){
      vec2 p=gl_PointCoord-.5; float d=dot(p,p); if(d>.25) discard;
      float tw=.62+.38*sin(time*1.3+vPhase);
      gl_FragColor=vec4(vec3(.92,.94,1.)*tw, smoothstep(.25,.02,d));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  scene.add(new THREE.Points(starGeometry, starMaterial));

  const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
  const rockMaterial = standard('#6d675e', { flatShading: true, roughness: 0.84 });
  const belt = new THREE.Group(); belt.position.copy(planet.position); scene.add(belt);
  for (let i = 0; i < 42; i++) {
    const angle = random() * Math.PI * 2;
    const distance = 20 + random() * 12;
    const rock = mesh(rockGeometry, rockMaterial, [Math.cos(angle) * distance, (random() - 0.5) * 1.6, Math.sin(angle) * distance], [0.18 + random() * 0.38, 0.14 + random() * 0.22, 0.16 + random() * 0.3], belt);
    rock.rotation.set(random() * 3, random() * 3, random() * 3);
  }

  const probe = new THREE.Group(); scene.add(probe);
  box(hull, [0, 0, 0], [1.5, 0.32, 0.62], probe);
  box(screen, [0, 0.02, 0.34], [0.46, 0.22, 0.04], probe);
  box(new THREE.MeshBasicMaterial({ color: '#8ea2e8' }), [-1.7, 0, 0], [1.7, 0.035, 0.48], probe);
  box(new THREE.MeshBasicMaterial({ color: '#8ea2e8' }), [1.7, 0, 0], [1.7, 0.035, 0.48], probe);
  const dish = mesh(new THREE.ConeGeometry(0.28, 0.4, 12), trim, [0, 0, -0.48], [1, 1, 1], probe);
  dish.rotation.x = Math.PI / 2;
  const probeLight = new THREE.PointLight('#9eb4ff', 6, 8, 2);
  probeLight.position.set(0, 0, 0.4); probe.add(probeLight);
  probe.scale.setScalar(0.85);

  const moteCount = 160;
  const motes = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) motes.set([(random() - 0.5) * 28, random() * 8, deckCenter.z + (random() - 0.5) * 24], i * 3);
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(motes, 3));
  const dust = new THREE.Points(moteGeometry, new THREE.PointsMaterial({ color: '#d5def8', size: 0.035, transparent: true, opacity: 0.45, depthWrite: false }));
  scene.add(dust);

  stage.animate(time => {
    planetMaterial.uniforms.time.value = rings.material.uniforms.time.value = nebula.material.uniforms.time.value = starMaterial.uniforms.time.value = time;
    moonPivot.rotation.y = time * 0.08;
    belt.rotation.y = time * 0.015;
    belt.rotation.z = 0.22;
    probe.position.set(Math.cos(time * 0.16) * 6.5, 8.1 + Math.sin(time * 0.42) * 0.35, deckCenter.z + Math.sin(time * 0.16) * 4.2);
    probe.rotation.y = -time * 0.16;
    dust.position.y = Math.sin(time * 0.2) * 0.25;
  });
  return stage;
}
