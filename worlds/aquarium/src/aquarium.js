import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createStage, seededRandom } from '../../../shared/stage.js';
import { loadAquariumModels, creature, instances, addCausticMaterial } from './models.js';

export const exhibits = [
  { id: 'ocean', number: '01', name: '大海の窓', en: 'OPEN OCEAN', position: [0.15, 1.62, 0.45], target: [0.4, 4.15, -18], note: 'ゆるやかに泳ぐエイと、光をほどく魚群。' },
  { id: 'reef', number: '02', name: '珊瑚の庭', en: 'CORAL GARDEN', position: [8.1, 1.58, 0.2], target: [10.4, 1.05, -10.5], note: '珊瑚のあいだに、小さな暮らしが息づく。' },
  { id: 'jelly', number: '03', name: '月の漂流', en: 'MOON JELLIES', position: [-7.1, 1.6, 0.35], target: [-11.4, 4.9, -11], note: '淡い光をまとって、ただ、漂う。' },
];

export async function createAquarium(container, onError) {
  const stage = createStage(container, {
    background: '#041820', fog: .007, position: exhibits[0].position, target: exhibits[0].target,
    label: '大水槽の魚群、マンタ、ウミガメ、ジンベエザメ、クラゲ。ドラッグで見回せます。',
    bloom: .08, bloomThreshold: .92, exposure: .98, fov: 46, mobileFov: 60,
    bounds: { minX: -14, maxX: 14, minZ: -1.5, maxZ: 12 }, onError,
  });
  try {
    const assets = await loadAquariumModels(stage);
    populateAquarium(stage, assets);
    return stage;
  } catch (error) {
    stage.dispose();
    throw error;
  }
}

function populateAquarium(stage, assets) {
  const { scene, renderer } = stage;
  const random = seededRandom(4712), clock = { value: 0 };
  const compact = matchMedia('(max-width: 700px)').matches;
  renderer.shadowMap.enabled = !compact;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const setQuality = stage.quality;
  stage.quality = value => {
    renderer.shadowMap.enabled = value !== 'low' && !compact;
    setQuality(value);
  };
  const dummy = new THREE.Object3D();
  const materials = new Set();
  for (const [name, asset] of Object.entries(assets)) {
    asset.scene.traverse(object => {
      if (!object.isMesh) return;
      object.castShadow = !object.material.transparent;
      object.receiveShadow = true;
      if (name !== 'gallery') materials.add(object.material);
    });
  }
  for (const surface of materials) addCausticMaterial(surface, clock);

  const environment = new RoomEnvironment(), generator = new THREE.PMREMGenerator(renderer);
  const reflections = generator.fromScene(environment, .08);
  scene.environment = reflections.texture; scene.environmentIntensity = .58;
  generator.dispose(); environment.dispose();
  stage.onDispose(() => reflections.dispose());
  scene.add(new THREE.HemisphereLight('#9fd0de', '#102228', .48));
  const sun = new THREE.DirectionalLight('#e7fbff', 2.4);
  sun.position.set(-3, 26, -6); sun.target.position.set(0, 0, -16);
  sun.castShadow = !compact; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: .5, far: 65 });
  sun.shadow.bias = -.0002; sun.shadow.normalBias = .03;
  scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight('#2f86b0', 1.15);
  rim.position.set(10, 8, -28); scene.add(rim);
  const reefLight = new THREE.PointLight('#f0d7b4', 16, 18, 2);
  reefLight.position.set(11, 4.5, -9); scene.add(reefLight);
  const jellyLight = new THREE.PointLight('#b7d4f4', 11, 14, 2);
  jellyLight.position.set(-11, 5.5, -9); scene.add(jellyLight);

  const gallery = assets.gallery.scene.clone(true); scene.add(gallery);
  gallery.traverse(object => {
    if (!object.isMesh || object.material.name !== 'Gallery.Acrylic') return;
    // 厚いアクリルは前面だけを透過させ、室の反射と縁のフレネルでガラスだと読ませる。
    const glass = new THREE.MeshPhysicalMaterial({
      color: '#d5f3f6', roughness: .05, metalness: 0, transmission: .9, thickness: .28,
      ior: 1.49, attenuationColor: new THREE.Color('#8fd0d8'), attenuationDistance: 2.4,
      clearcoat: .2, clearcoatRoughness: .45, envMapIntensity: .18,
      transparent: true, opacity: 1, side: THREE.FrontSide, depthWrite: false,
    });
    object.material = glass;
    object.renderOrder = 2;
    stage.onDispose(() => glass.dispose());
  });
  const seabed = assets.seabed.scene.clone(true);
  seabed.position.set(0, -.16, -20); scene.add(seabed);

  // Only water and optical effects are authored here; physical shapes live in Blender.
  const water = new THREE.ShaderMaterial({
    uniforms: { time: clock },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv; uniform float time;
      void main(){
        vec3 deep=vec3(.008,.042,.08), shallow=vec3(.035,.16,.2);
        float ray=pow(max(0.,sin(vUv.x*41.+vUv.y*3.+sin(time*.17)*.3)),14.);
        float ray2=pow(max(0.,sin(vUv.x*69.-vUv.y*6.-time*.035)),24.);
        vec3 c=mix(deep,shallow,pow(vUv.y,1.6));
        c+=vec3(.08,.2,.22)*(ray*.16+ray2*.08)*pow(vUv.y,1.2);
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(60, 25), water);
  backdrop.position.set(0, 10, -35); scene.add(backdrop);
  const caustics = new THREE.ShaderMaterial({
    uniforms: { time: clock }, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv; uniform float time; void main(){
      vec2 p=vUv*34.;
      float a=sin(p.x+sin(p.y*1.2+time*.25)*1.6+time*.16);
      float b=sin(p.y+sin(p.x*.8-time*.18)*1.8);
      float glow=pow(max(0.,1.-abs(a*.52+b*.48)),12.);
      gl_FragColor=vec4(.43,.85,.83,glow*.14);
    }`,
  });
  const reflection = new THREE.Mesh(new THREE.PlaneGeometry(41, 22), caustics);
  reflection.position.set(0, .028, 6); reflection.rotation.x = -Math.PI / 2; scene.add(reflection);

  const shafts = new THREE.ShaderMaterial({
    uniforms: { time: clock }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv; uniform float time; void main(){
      float width=mix(.25,.48,1.-vUv.y);
      float edge=pow(max(0.,1.-abs(vUv.x-.5)/width),3.);
      float fade=smoothstep(0.,.2,vUv.y)*(1.-smoothstep(.85,1.,vUv.y));
      float drift=.72+.28*sin(time*.22+vUv.y*6.);
      gl_FragColor=vec4(.32,.7,.76,edge*fade*drift*.04);
    }`,
  });
  const shaftGeometry = new THREE.PlaneGeometry(1.6, 11);
  for (let i = 0; i < 9; i++) {
    const shaft = new THREE.Mesh(shaftGeometry, shafts);
    shaft.position.set(-16 + i * 4, 6.4, -10 - (i % 4) * 3.4);
    shaft.rotation.z = -.2 + (i % 4) * .035;
    shaft.rotation.y = .2;
    scene.add(shaft);
  }

  function scatter(name, count, placement) {
    const set = instances(stage, assets[name], count, name);
    for (let i = 0; i < count; i++) {
      placement(i, dummy); set.write(i, dummy, i * .27);
    }
    set.commit(); return set;
  }
  scatter('reef_rock', compact ? 30 : 45, (i, transform) => {
    const size = .45 + random() * 1.6;
    transform.position.set((random() - .5) * 40, -.06, -7.4 - random() * 22);
    transform.scale.set(size * 1.25, size * .55, size);
    transform.rotation.set(0, random() * Math.PI * 2, 0);
  });
  for (const name of ['coral_staghorn', 'coral_fan']) {
    scatter(name, compact ? 10 : 18, (i, transform) => {
      transform.position.set(4.2 + random() * 14, .02, -7.2 - random() * 13);
      transform.scale.setScalar(.6 + random() * 1.25);
      transform.rotation.set(0, random() * Math.PI * 2, 0);
    });
  }
  const plantCount = compact ? 30 : 55;
  const plants = instances(stage, assets.kelp, plantCount, 'kelp');
  const plantData = Array.from({ length: plantCount }, () => ({
    position: [(random() - .5) * 38, .015, -7.2 - random() * 22],
    size: .7 + random() * 1.3, rotation: random() * Math.PI * 2, phase: random() * 4,
  }));
  const schoolSpecifications = [
    { name: 'silver_fish', count: compact ? 70 : 130, size: [1, 1.7], center: -1, radius: [4, 12], height: [2.4, 7.2], depth: [-12, -25] },
    { name: 'silver_fish', count: compact ? 14 : 28, size: [.85, 1.35], center: 1.2, radius: [2.2, 6.5], height: [1.35, 3.6], depth: [-6.6, -10] },
    { name: 'blue_tang', count: compact ? 16 : 30, size: [.9, 1.45], center: 10.2, radius: [1.4, 3.6], height: [1.15, 2.8], depth: [-8.2, -13] },
    { name: 'clownfish', count: compact ? 12 : 22, size: [.85, 1.3], center: 9.6, radius: [.7, 2.4], height: [.7, 2.1], depth: [-7.6, -11.5] },
  ];
  const between = range => range[0] + random() * (range[1] - range[0]);
  const schools = schoolSpecifications.map(specification => ({
    specification, set: instances(stage, assets[specification.name], specification.count, specification.name),
    fish: Array.from({ length: specification.count }, () => ({
      phase: random() * Math.PI * 2, speed: .075 + random() * .04,
      radius: between(specification.radius), height: between(specification.height),
      depth: between(specification.depth), size: between(specification.size), swim: .9 + random() * .7,
    })),
  }));
  const manta = creature(stage, assets.manta, 1.25, 0, .82);
  const mantaTwo = creature(stage, assets.manta, .75, 1.7, .72);
  const turtle = creature(stage, assets.turtle, 1.4, .4, .9);
  const whale = creature(stage, assets.whale_shark, 1.1, .8, .64);
  const jellies = Array.from({ length: compact ? 8 : 12 }, (_, i) => {
    const size = .7 + random() * .8;
    const animal = creature(stage, assets.moon_jelly, size, i * .33, .82);
    const base = [-11 + (random() - .5) * 8, 3.6 + random() * 4.3, -10 - random() * 8];
    animal.root.position.set(...base);
    return { ...animal, base, phase: i * 1.7 };
  });

  const particleCount = compact ? 180 : 420, particles = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) particles.set([(random() - .5) * 42, .4 + random() * 10.2, -6 - random() * 26], i * 3);
  const dustGeometry = new THREE.BufferGeometry(); dustGeometry.setAttribute('position', new THREE.BufferAttribute(particles, 3));
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: '#d5f3f4', size: .035, transparent: true, opacity: .34, depthWrite: false, sizeAttenuation: true }));
  scene.add(dust);

  function update(time, dt) {
    clock.value = time;
    for (const { specification, set, fish } of schools) {
      fish.forEach((animal, i) => {
        const angle = animal.phase + time * animal.speed;
        dummy.position.set(specification.center + Math.cos(angle) * animal.radius, animal.height + Math.sin(angle * 2) * .3, animal.depth + Math.sin(angle) * 2.2);
        // GLB forward is +Z: use the actual path tangent so fish never swim backward.
        dummy.rotation.set(0, Math.atan2(-Math.sin(angle) * animal.radius, Math.cos(angle) * 2.2), Math.cos(angle) * .035);
        dummy.scale.setScalar(animal.size);
        set.write(i, dummy, time * animal.swim + animal.phase);
      });
      set.commit();
    }
    manta.root.position.set(2.2 + Math.sin(time * .1) * 6, 4.6 + Math.sin(time * .24) * .55, -11.5 + Math.cos(time * .1) * 2.4);
    manta.root.rotation.set(.22, -.4 + Math.sin(time * .1) * .8, Math.sin(time * .3) * .06);
    mantaTwo.root.position.set(-3.5 + Math.cos(time * .08) * 5.5, 3.3 + Math.sin(time * .2) * .35, -15);
    mantaTwo.root.rotation.set(.16, .8 + Math.sin(time * .08) * .5, -.08);
    turtle.root.position.set(8.2 + Math.sin(time * .12) * 2.4, 2.4 + Math.cos(time * .25) * .28, -9.5);
    turtle.root.rotation.set(.08, Math.PI / 2 - .65 + Math.sin(time * .12) * .3, .06);
    whale.root.position.set(-6 + Math.sin(time * .06) * 8, 3.6 + Math.sin(time * .18) * .3, -18);
    whale.root.rotation.set(.03, Math.PI / 2 + Math.cos(time * .06) * .35, Math.sin(time * .22) * .035);
    for (const animal of [manta, mantaTwo, turtle, whale, ...jellies]) animal.update(dt);
    for (const { root, base, phase } of jellies) {
      root.position.y = base[1] + Math.sin(time * .35 + phase) * .5;
      root.rotation.z = Math.sin(time * .25 + phase) * .08;
    }
    plantData.forEach((plant, i) => {
      dummy.position.fromArray(plant.position); dummy.scale.setScalar(plant.size);
      dummy.rotation.set(0, plant.rotation, 0);
      plants.write(i, dummy, time * .3 + plant.phase);
    });
    plants.commit();
    dust.position.y = Math.sin(time * .15) * .25;
    if (dt > 0) {
      const breathe = Math.sin(time * .9);
      stage.camera.position.x += Math.sin(time * .33) * .012;
      stage.camera.position.y += breathe * .016;
      stage.camera.rotateX(breathe * .0035);
    }
  }
  // Initialize all instance matrices even when reduced motion stops the stage clock.
  update(0, 0);
  stage.animate(update);
}
