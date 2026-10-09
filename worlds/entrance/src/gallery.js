import * as THREE from 'three';
import { createStage, seededRandom } from '../../../shared/stage.js';
import { enhanceStage, loadStageModels, modelCopy } from '../../../shared/detail-assets.js';
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

function portalLayout(count) {
  if (count <= 4) {
    const spacing = count > 2 ? 9 : 11;
    return Array.from({ length: count }, (_, index) => ({ x: (index - (count - 1) / 2) * spacing, z: -1, yaw: 0 }));
  }
  const radius = 18, step = 0.26, arc = step * (count - 1);
  return Array.from({ length: count }, (_, index) => {
    const t = (index / (count - 1) - 0.5) * arc;
    return { x: Math.sin(t) * radius, z: radius * (1 - Math.cos(t)) - 1.2, yaw: -t };
  });
}
const portalPoses = portalLayout(worlds.length);
const portalXs = portalPoses.map(item => item.x);
const crowded = worlds.length > 4;
const halfSpan = Math.max(...portalXs.map(x => Math.abs(x)), 5.5);
const viewAngle = crowded ? 31 : worlds.length > 2 ? 27 : 24;
const galleryDistance = (halfSpan + (crowded ? 2.2 : 4.2)) / Math.tan(THREE.MathUtils.degToRad(viewAngle));

export async function createGallery(container, { onHover, onError }) {
  const portals = [], raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  function intersect(event) {
    const rect = stage.canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, stage.camera);
    return raycaster.intersectObjects(portals, false)[0]?.object.userData.world;
  }
  const stage = createStage(container, {
    background: '#e8e4dc', fog: crowded ? 0.011 : 0.015, position: [0, 5.4, galleryDistance - 1], target: [0, 3.6, -2], fov: crowded ? 62 : worlds.length > 2 ? 54 : 48, mobileFov: 88,
    label: `石造りのギャラリーに浮かぶ球体と${worlds.length}つのゲート。ゲートまたは画面下のリンクからワールドへ移動できます。`,
    exposure: 0.95, bloom: 0.12, bloomThreshold: 2.5, onError,
    onHover: event => { const world = intersect(event); stage.canvas.style.cursor = world ? 'pointer' : 'grab'; onHover(world?.id ?? null); },
    onSelect: event => { const world = intersect(event); if (world) location.assign(world.href); },
  });
  const { scene } = stage;
  const random = seededRandom(1947);
  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
  function mesh(geometry, mat, position, scale = [1, 1, 1], parent = scene) {
    const object = new THREE.Mesh(geometry, mat); object.position.set(...position); object.scale.set(...scale); parent.add(object); return object;
  }
  scene.add(new THREE.HemisphereLight('#fff8e8', '#98978b', 3));
  const sunlight = new THREE.DirectionalLight('#fff2d2', 3.5); sunlight.position.set(-14, 25, 12); scene.add(sunlight);
  const bounce = new THREE.DirectionalLight('#d5e4ed', 1.7); bounce.position.set(12, 6, 8); scene.add(bounce);

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
  const [atrium, frameModel, sculpture] = await loadStageModels(stage, ['limestone_atrium.glb', 'portal_frame.glb', 'orbit_sculpture.glb']);
  scene.add(modelCopy(atrium));

  const portalShader = world => new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, kind: { value: { cyberpunk: 0, aquarium: 1, cosmos: 2, heian: 3, shibuya: 4, akihabara: 5, shinjuku: 6 }[world.id] ?? 1 }, focus: { value: 0 } },
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
        }else if(kind<3.5){
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
        }else if(kind<4.5){
          c=mix(vec3(.16,.1,.14),vec3(.45,.22,.32),uv.y);
          float stripe=step(.55,fract(uv.y*9.));
          if(uv.y<.28) c=mix(vec3(.12,.12,.14),vec3(.85,.86,.88),stripe);
          float screen=step(.42,uv.y)*step(uv.y,.78)*step(abs(uv.x-.32),.18);
          c=mix(c,mix(vec3(.95,.2,.45),vec3(.15,.75,.85),step(.5,fract(uv.y*5.+time*.2))),screen);
          c+=vec3(.9,.35,.55)*exp(-length((uv-vec2(.75,.62))*vec2(5.,3.))*2.);
        }else if(kind<5.5){
          c=mix(vec3(.08,.05,.08),vec3(.22,.08,.1),uv.y);
          float sign=step(.5,fract(uv.x*7.));
          if(sign>.5&&uv.y>.2&&uv.y<.86) c=mix(vec3(.85,.16,.18),vec3(.95,.78,.2),step(.5,fract(uv.y*3.+floor(uv.x*7.))));
          c+=vec3(.2,.55,.95)*step(.35,fract(uv.x*11.))*step(.25,uv.y)*step(uv.y,.45);
        }else{
          c=mix(vec3(.02,.04,.1),vec3(.08,.1,.18),uv.y);
          float tower=step(abs(uv.x-.32),.12)+step(abs(uv.x-.68),.14);
          if(tower>.5&&uv.y>.15){ c=vec3(.04,.06,.1);
            vec2 w=fract(uv*vec2(18.,28.));
            if(w.x>.25&&w.x<.7&&w.y>.2&&w.y<.65) c+=mix(vec3(.95,.78,.42),vec3(.45,.62,.9),step(.7,fract(uv.x*9.+uv.y*4.)));
          }
          c+=vec3(.95,.7,.35)*exp(-length((uv-vec2(.5,.16))*vec2(8.,14.))*2.2);
        }
        c*=1.+focus*.3; gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const portalMaterials = [];
  worlds.forEach((world, index) => {
    const pose = portalPoses[index];
    const group = new THREE.Group(); group.position.set(pose.x, 0.15, pose.z); group.rotation.y = pose.yaw; if (crowded) group.scale.setScalar(0.88); scene.add(group);
    group.add(modelCopy(frameModel));
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
    const lamp = new THREE.PointLight(world.color, 20, 8, 1.6); lamp.position.set(pose.x, 3.3, pose.z + Math.cos(pose.yaw)); scene.add(lamp);
  });

  const centerBase = worlds.length > 2 ? [0, 9.8, -4.4] : [0, 4.2, -0.2];
  const centerpiece = modelCopy(sculpture, centerBase); scene.add(centerpiece);
  const centerBlocked = portalXs.some(x => Math.abs(x) < 3);
  const shadowTextureCanvas = document.createElement('canvas'); shadowTextureCanvas.width = shadowTextureCanvas.height = 128;
  const shadowCtx = shadowTextureCanvas.getContext('2d');
  const gradient = shadowCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(70,62,42,.5)'); gradient.addColorStop(1, 'rgba(70,62,42,0)');
  shadowCtx.fillStyle = gradient; shadowCtx.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowTextureCanvas);
  for (const pose of centerBlocked ? portalPoses : [...portalPoses, { x: 0, z: -0.4 }]) {
    const shadow = mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }), [pose.x, -0.075, pose.z]); shadow.rotation.x = -Math.PI / 2;
  }

  enhanceStage(stage, sunlight, { extent: 32, environment: 0.28 });

  let focused = null;
  stage.animate(time => {
    centerpiece.position.y = centerBase[1] + Math.sin(time * 0.45) * (centerBlocked ? 0.08 : 0.14);
    centerpiece.rotation.y = time * 0.045;
    for (const { shader } of portalMaterials) shader.uniforms.time.value = time;
  });
  stage.focus = id => {
    if (focused === id) return; focused = id;
    for (const { id: portalId, shader } of portalMaterials) shader.uniforms.focus.value = portalId === id ? 1 : 0;
  };
  return stage;
}
