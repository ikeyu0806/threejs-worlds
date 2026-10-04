import * as THREE from 'three';
import { createStage, seededRandom } from '../../../shared/stage.js';
import { worlds } from '../../../shared/worlds.js';

function arch(radius, height, bottom = 0, hole = false) {
  const shape = hole ? new THREE.Path() : new THREE.Shape();
  if (hole) {
    shape.moveTo(-radius, bottom); shape.lineTo(-radius, height - radius);
    shape.absarc(0, height - radius, radius, Math.PI, 0, true);
    shape.lineTo(radius, bottom); shape.lineTo(-radius, bottom);
  } else {
    shape.moveTo(-radius, bottom); shape.lineTo(radius, bottom); shape.lineTo(radius, height - radius);
    shape.absarc(0, height - radius, radius, 0, Math.PI, false); shape.lineTo(-radius, bottom);
  }
  return shape;
}

const portalSpacing = worlds.length > 2 ? 9 : 11;
const portalXs = worlds.map((_, index) => (index - (worlds.length - 1) / 2) * portalSpacing);
const galleryDistance = (Math.abs(portalXs.at(-1) ?? 5.5) + 4.2) / Math.tan(THREE.MathUtils.degToRad(worlds.length > 2 ? 27 : 24));

export function createGallery(container, { onHover, onError }) {
  const portals = [], raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  function intersect(event) {
    const rect = stage.canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, stage.camera);
    return raycaster.intersectObjects(portals, false)[0]?.object.userData.world;
  }
  const stage = createStage(container, {
    background: '#e8e4dc', fog: 0.015, position: [0, 5.4, galleryDistance - 1], target: [0, 3.6, -2], fov: worlds.length > 2 ? 54 : 48, mobileFov: 88,
    label: `石造りのギャラリーに浮かぶ球体と${worlds.length}つのゲート。ゲートまたは画面下のリンクからワールドへ移動できます。`,
    exposure: 0.95, bloom: 0.12, bloomThreshold: 2.5, onError,
    onHover: event => { const world = intersect(event); stage.canvas.style.cursor = world ? 'pointer' : 'grab'; onHover(world?.id ?? null); },
    onSelect: event => { const world = intersect(event); if (world) location.assign(world.href); },
  });
  const { scene } = stage;
  const random = seededRandom(1947);
  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
  const limestone = material('#ddd6c7');
  const ivory = material('#e7e0d2', { roughness: 0.4 });
  const metal = material('#a8936b', { metalness: 0.7, roughness: 0.3 });
  const warm = new THREE.MeshBasicMaterial({ color: '#fbe8c4' });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function mesh(geometry, mat, position, scale = [1, 1, 1], parent = scene) {
    const object = new THREE.Mesh(geometry, mat); object.position.set(...position); object.scale.set(...scale); parent.add(object); return object;
  }
  function box(mat, position, scale, parent) { return mesh(cube, mat, position, scale, parent); }
  scene.add(new THREE.HemisphereLight('#fff8e8', '#98978b', 3));
  const sunlight = new THREE.DirectionalLight('#fff2d2', 3.5); sunlight.position.set(-14, 25, 12); scene.add(sunlight);
  stage.renderer.shadowMap.enabled = true;
  stage.renderer.shadowMap.type = THREE.PCFShadowMap;
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunlight.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 75 });
  sunlight.shadow.normalBias = 0.04;
  const bounce = new THREE.DirectionalLight('#d5e4ed', 1.7); bounce.position.set(12, 6, 8); scene.add(bounce);

  const outerColumn = (portalXs.at(-1) ?? 5.5) + 7.5;
  const hall = Math.max(31, outerColumn + 8);
  const columnXs = [-outerColumn, outerColumn];
  for (let i = 0; i < portalXs.length - 1; i++) {
    const mid = (portalXs[i] + portalXs[i + 1]) / 2;
    if (Math.abs(mid) > 2.8) columnXs.push(mid);
  }
  if (outerColumn + 7 < hall - 2) columnXs.push(-(outerColumn + 7), outerColumn + 7);
  const centerBlocked = portalXs.some(x => Math.abs(x) < 3);

  // A textured stone floor, open colonnade and sunken display plinths.
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#d4cfc2'; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 22000; i++) {
    ctx.fillStyle = `rgba(${random() > 0.5 ? '80,76,61' : '255,255,240'},${random() * 0.11})`;
    ctx.fillRect(random() * 512, random() * 512, 1 + random() * 2, 1 + random() * 2);
  }
  ctx.strokeStyle = '#b0aa98'; ctx.lineWidth = 1; ctx.strokeRect(0, 0, 512, 512);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(18, 18);
  const floor = mesh(new THREE.PlaneGeometry(110, 110), material('#ded8cb', { map: texture, metalness: 0.14, roughness: 0.32 }), [0, -0.1, 0]);
  floor.rotation.x = -Math.PI / 2;
  box(limestone, [0, 7.5, -10], [hall * 2, 15, 1]);
  for (const x of columnXs) {
    box(ivory, [x, 6, -4], [0.9, 12, 10]);
    box(limestone, [x, 0.3, -4], [1.4, 0.6, 11]);
    box(limestone, [x, 11.8, -4], [1.7, 0.5, 11]);
  }
  for (const x of portalXs) {
    const shape = arch(3.15, 10.2); shape.holes.push(arch(2.55, 9.6, 0, true));
    mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.65, bevelEnabled: false, curveSegments: 36 }), ivory, [x, 0, -7]);
    mesh(new THREE.ShapeGeometry(arch(2.55, 9.6)), material('#c4c0b4'), [x, 0, -7.03]);
  }
  box(ivory, [0, 12.7, -3], [hall * 2 - 10, 0.7, 17]);
  const lightCount = Math.max(5, worlds.length + 2);
  for (let i = 0; i < lightCount; i++) {
    const x = (i - (lightCount - 1) / 2) * ((hall * 2 - 16) / lightCount);
    box(warm, [x, 12.3, -1], [0.045, 0.03, 14]);
  }
  for (const x of [-8.8, 8.8]) {
    box(metal, [x, -0.065, 5], [0.026, 0.015, 28]);
    box(limestone, [x, 0.25, -2.5], [0.6, 0.5, 0.6]);
  }

  const portalShader = world => new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, kind: { value: { cyberpunk: 0, aquarium: 1, cosmos: 2, heian: 3 }[world.id] ?? 1 }, focus: { value: 0 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vPosition; void main(){vUv=uv; vPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv; varying vec3 vPosition; uniform float time; uniform float kind; uniform float focus;
      float hash(float p){return fract(sin(p*127.1)*43758.5453);}
      void main(){
        vec2 uv=vec2((vPosition.x+1.55)/3.1,vPosition.y/6.2);
        vec3 c;
        if(kind<.5){
          c=mix(vec3(.018,.033,.07),vec3(.16,.075,.13),uv.y);
          float column=floor(uv.x*12.), height=.2+hash(column)*.5;
          if(uv.y<height){ c=vec3(.028,.049,.069);
            vec2 w=fract(uv*vec2(42.,33.));
            if(w.x>.42&&w.x<.67&&w.y>.3&&w.y<.6) c+=mix(vec3(.16,.49,.46),vec3(.57,.16,.29),hash(column))*hash(floor(uv.y*33.)+column);
          }
          float street=exp(-abs(uv.x-.5)*11.)*(1.-smoothstep(.0,.3,uv.y));
          c+=street*vec3(.35,.22,.4);
          c+=vec3(.07,.38,.35)*exp(-length((uv-vec2(.2,.5))*vec2(5.,2.))*3.);
          c+=vec3(.42,.1,.22)*exp(-length((uv-vec2(.8,.3))*vec2(6.,3.))*3.);
          float rain=step(.984,fract(uv.x*71.+floor(uv.y*22.+time*.9)*.04));
          c+=rain*.035;
        }else if(kind<1.5){
          c=mix(vec3(.012,.09,.13),vec3(.12,.42,.43),uv.y);
          float beam=pow(max(0.,sin(uv.x*31.+uv.y*4.+time*.07)),18.);
          c+=vec3(.1,.27,.26)*beam*uv.y;
          for(int i=0;i<12;i++){
            float fi=float(i); vec2 p=vec2(fract(hash(fi+1.)+time*.006),.15+hash(fi+12.)*.6);
            vec2 d=(uv-p)*vec2(1.,2.5);
            if(length(d)<.017) c+=vec3(.13,.3,.31);
          }
          c*=smoothstep(.0,.15,uv.y)*.7+.3;
        }else if(kind<2.5){
          c=mix(vec3(.012,.018,.05),vec3(.08,.07,.14),uv.y);
          float stars=step(.986,fract(sin(dot(floor(uv*vec2(86.,54.)),vec2(127.1,311.7)))*43758.5453));
          c+=stars*vec3(.78,.84,1.);
          vec2 pc=uv-vec2(.45,.48);
          float body=smoothstep(.19,.16,length(pc*vec2(1.,1.15)));
          vec3 ice=mix(vec3(.25,.34,.48),vec3(.8,.76,.66),smoothstep(-.15,.45,pc.y));
          c=mix(c,ice,body);
          float ring=smoothstep(.018,.0,abs(length(pc*vec2(.9,2.5))-.24));
          c+=ring*vec3(.75,.68,.5)*(1.-body);
          c+=vec3(.32,.24,.52)*exp(-length((uv-vec2(.78,.66))*vec2(3.,2.2))*2.);
        }else{
          c=mix(vec3(.55,.45,.38),vec3(.93,.88,.8),smoothstep(.15,.85,uv.y));
          float gate=step(.18,uv.y)*step(uv.y,.72)*step(abs(uv.x-.5),.2);
          float roof=step(.6,uv.y)*step(uv.y,.8)*step(abs(uv.x-.5),.3);
          float door=step(.22,uv.y)*step(uv.y,.58)*step(abs(uv.x-.5),.055);
          c=mix(c,vec3(.62,.24,.18),clamp(gate+roof,0.,1.));
          c=mix(c,vec3(.28,.22,.2),door);
          float moon=smoothstep(.055,.04,length(uv-vec2(.78,.78)));
          c=mix(c,vec3(.97,.94,.88),moon);
          c+=vec3(.55,.32,.12)*exp(-length((uv-vec2(.22,.28))*vec2(8.,10.))*3.);
          c+=vec3(.55,.32,.12)*exp(-length((uv-vec2(.8,.24))*vec2(8.,10.))*3.);
          c=mix(c,vec3(.78,.74,.68),smoothstep(.22,0.,uv.y)*.45);
        }
        c*=1.+focus*.3; gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const portalMaterials = [];
  worlds.forEach((world, index) => {
    const x = portalXs[index];
    const group = new THREE.Group(); group.position.set(x, 0.15, -1); scene.add(group);
    mesh(new THREE.CylinderGeometry(2.55, 2.65, 0.18, 64), limestone, [0, 0.01, 0], [1, 1, 1], group);
    mesh(new THREE.CylinderGeometry(2.35, 2.45, 0.17, 64), ivory, [0, 0.15, 0], [1, 1, 1], group);
    const frame = arch(1.92, 7.05); frame.holes.push(arch(1.56, 6.65, 0.34, true));
    mesh(new THREE.ExtrudeGeometry(frame, { depth: 0.48, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.055, bevelSegments: 2, curveSegments: 36 }), ivory, [0, 0.3, -0.3], [1, 1, 1], group);
    const rim = arch(1.59, 6.68, 0.3); rim.holes.push(arch(1.55, 6.63, 0.34, true));
    mesh(new THREE.ShapeGeometry(rim), new THREE.MeshBasicMaterial({ color: world.color }), [0, 0.3, 0.23], [1, 1, 1], group);
    const shader = portalShader(world); portalMaterials.push({ id: world.id, shader });
    const portal = mesh(new THREE.ShapeGeometry(arch(1.55, 6.63, 0.34)), shader, [0, 0.3, 0.19], [1, 1, 1], group);
    portal.userData.world = world; portals.push(portal);
    const plateCanvas = document.createElement('canvas'); plateCanvas.width = 768; plateCanvas.height = 112;
    const paint = plateCanvas.getContext('2d'); paint.fillStyle = '#ede8dc'; paint.fillRect(0, 0, 768, 112);
    paint.fillStyle = '#49483d'; paint.font = '30px sans-serif'; paint.textAlign = 'center'; paint.fillText(`${world.number}  —  ${world.title}`, 384, 67);
    const plateTexture = new THREE.CanvasTexture(plateCanvas); plateTexture.colorSpace = THREE.SRGBColorSpace;
    mesh(new THREE.PlaneGeometry(3.1, 0.45), new THREE.MeshBasicMaterial({ map: plateTexture }), [0, 0.8, 0.26], [1, 1, 1], group);
    const lamp = new THREE.PointLight(world.color, 20, 8, 1.6); lamp.position.set(x, 3.3, 1); scene.add(lamp);
  });

  const centerBase = centerBlocked ? [0, 10.6, -5.2] : [0, 4.2, -0.2];
  const centerpiece = new THREE.Group(); centerpiece.position.set(...centerBase); scene.add(centerpiece);
  mesh(new THREE.SphereGeometry(0.95, 48, 32), material('#acb5a7', { metalness: 0.63, roughness: 0.22 }), [0, 0, 0], [1, 1, 1], centerpiece);
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ring = mesh(new THREE.TorusGeometry(1.5 + i * 0.15, 0.017, 6, 100), metal, [0, 0, 0], [1, 1, 1], centerpiece);
    ring.rotation.set(0.7 + i * 0.5, i * 1.1, i * 0.4); rings.push(ring);
  }
  if (!centerBlocked) {
    mesh(new THREE.CylinderGeometry(1.9, 2.2, 0.17, 64), limestone, [0, 0, 0]);
    mesh(new THREE.CylinderGeometry(1.5, 1.65, 0.22, 64), ivory, [0, 0.2, 0]);
    mesh(new THREE.CylinderGeometry(0.6, 0.85, 1.7, 48), ivory, [0, 1.15, 0]);
  }
  const shadowTextureCanvas = document.createElement('canvas'); shadowTextureCanvas.width = shadowTextureCanvas.height = 128;
  const shadowCtx = shadowTextureCanvas.getContext('2d');
  const gradient = shadowCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(70,62,42,.5)'); gradient.addColorStop(1, 'rgba(70,62,42,0)');
  shadowCtx.fillStyle = gradient; shadowCtx.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowTextureCanvas);
  for (const x of centerBlocked ? portalXs : [...portalXs, 0]) {
    const shadow = mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }), [x, -0.075, -0.4]); shadow.rotation.x = -Math.PI / 2;
  }

  scene.traverse(object => {
    if (object.isMesh && object.material.isMeshStandardMaterial && !object.material.transparent) {
      object.castShadow = true; object.receiveShadow = true;
    }
  });

  let focused = null;
  stage.animate(time => {
    centerpiece.position.y = centerBase[1] + Math.sin(time * 0.45) * (centerBlocked ? 0.08 : 0.14);
    rings.forEach((ring, index) => { ring.rotation.y = time * (0.035 + index * 0.02) + index * 1.1; });
    for (const { shader } of portalMaterials) shader.uniforms.time.value = time;
  });
  stage.focus = id => {
    if (focused === id) return; focused = id;
    for (const { id: portalId, shader } of portalMaterials) shader.uniforms.focus.value = portalId === id ? 1 : 0;
  };
  return stage;
}
