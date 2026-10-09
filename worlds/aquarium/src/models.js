import * as THREE from 'three';
import { loadModel } from '../../../shared/models.js';

export const aquariumModelFiles = [
  'manta', 'turtle', 'whale_shark', 'silver_fish', 'blue_tang', 'clownfish',
  'moon_jelly', 'coral_staghorn', 'coral_fan', 'reef_rock', 'kelp', 'gallery', 'seabed',
];

export async function loadAquariumModels(stage) {
  // Keep prototypes in the scene's resource ownership, including partial failures.
  const library = new THREE.Group();
  library.name = 'Aquarium model library'; library.visible = false;
  stage.scene.add(library);
  const results = await Promise.allSettled(aquariumModelFiles.map(async name => {
    const gltf = await loadModel(`${name}.glb`);
    library.add(gltf.scene);
    return [name, gltf];
  }));
  const failed = results.findIndex(result => result.status === 'rejected');
  if (failed !== -1) throw new Error(`水族館のモデルを読み込めませんでした: ${aquariumModelFiles[failed]}`, { cause: results[failed].reason });
  return Object.fromEntries(results.map(result => result.value));
}

export function creature(stage, gltf, scale = 1, offset = 0, speed = 1) {
  const root = gltf.scene.clone(true);
  root.scale.setScalar(scale); stage.scene.add(root);
  const mixer = new THREE.AnimationMixer(root);
  const clip = gltf.animations.find(animation => animation.name === 'swim');
  if (!clip) throw new Error(`Missing swim animation: ${root.name}`);
  mixer.clipAction(clip).play(); mixer.setTime(offset);
  stage.onDispose(() => { mixer.stopAllAction(); mixer.uncacheRoot(root); });
  return { root, update: dt => mixer.update(dt * speed) };
}

export function instances(stage, gltf, count, label) {
  const parts = [];
  const matrix = new THREE.Matrix4();
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(source => {
    if (!source.isMesh) return;
    const mesh = new THREE.InstancedMesh(source.geometry, source.material, count);
    mesh.name = `${label}: ${source.name}`;
    mesh.castShadow = source.castShadow; mesh.receiveShadow = source.receiveShadow;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Moving schools can leave the initial bounding sphere; the tank bounds their travel.
    mesh.frustumCulled = false;
    const track = gltf.animations[0]?.tracks.find(track => track.name === `${source.name}.morphTargetInfluences`);
    const interpolant = track?.createInterpolant();
    parts.push({ mesh, source, bind: source.matrixWorld.clone(), interpolant });
    stage.scene.add(mesh);
    stage.onDispose(() => mesh.dispose());
  });
  return {
    write(index, transform, seconds = 0) {
      transform.updateMatrix();
      for (const { mesh, source, bind, interpolant } of parts) {
        matrix.multiplyMatrices(transform.matrix, bind); mesh.setMatrixAt(index, matrix);
        if (interpolant) {
          const duration = gltf.animations[0].duration;
          const weights = interpolant.evaluate(((seconds % duration) + duration) % duration);
          source.morphTargetInfluences.splice(0, weights.length, ...weights);
          mesh.setMorphAt(index, source);
        }
      }
    },
    commit() {
      for (const { mesh } of parts) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.morphTexture) mesh.morphTexture.needsUpdate = true;
      }
    },
  };
}

export function addCausticMaterial(surface, time) {
  surface.onBeforeCompile = shader => {
    shader.uniforms.pelagicTime = time;
    shader.vertexShader = `varying vec3 vPelagicWorld;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
      #include <project_vertex>
      vec4 pelagicWorld = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        pelagicWorld = instanceMatrix * pelagicWorld;
      #endif
      vPelagicWorld = (modelMatrix * pelagicWorld).xyz;
    `);
    shader.fragmentShader = `uniform float pelagicTime; varying vec3 vPelagicWorld;\n${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      vec2 p = vPelagicWorld.xz * 1.7;
      float a = sin(p.x + sin(p.y * 1.17 + pelagicTime * .32) * 1.6 + pelagicTime * .19);
      float b = sin(p.y + sin(p.x * .83 - pelagicTime * .21) * 1.8);
      float caustic = pow(max(0., 1. - abs(a * .52 + b * .48)), 15.);
      float waterDepth = clamp((12. - vPelagicWorld.y) / 14., 0., 1.);
      outgoingLight *= mix(vec3(.93, 1., 1.02), vec3(.64, .87, 1.), waterDepth * .42);
      outgoingLight += diffuseColor.rgb * vec3(.25, .48, .45) * caustic * .55;
      #include <opaque_fragment>
    `);
  };
  surface.customProgramCacheKey = () => 'pelagic-caustics-v1';
}
