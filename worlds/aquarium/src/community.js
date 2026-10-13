import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { waterMaterial } from "./water.js";
import { species, communityPose, swimPhase } from "./community-paths.js";

function swimmingMaterial(material, clock, specification) {
  waterMaterial(material, clock);
  const waterCompile = material.onBeforeCompile;
  const ray = specification.kind === "ray";
  material.onBeforeCompile = (shader) => {
    waterCompile(shader);
    shader.uniforms.animalSize = { value: specification.size };
    shader.vertexShader = `attribute float swimPhase; uniform float animalSize;\n${shader.vertexShader}`;
    // Derivatives rotate shading normals with the deformation. Every anatomical
    // part uses the same local coordinates, so attachments stay together.
    const definitions = ray
      ? `
      float span = abs(position.x)/(animalSize*.5);
      float phase = waterTime*${specification.id === "bentfin_devil_ray" ? "1.95" : "1.25"}+swimPhase-span*1.7+position.z/animalSize;
      float wave = sin(phase)*pow(span,1.6)*animalSize*.13;
      float slope = sign(position.x)*.26*(1.6*pow(span,.6)*sin(phase)-1.7*pow(span,1.6)*cos(phase));
      float alongSlope = cos(phase)*pow(span,1.6)*.13;
    `
      : `
      float tail = clamp(.5-position.z/animalSize,0.,1.);
      float phase = waterTime*${specification.id === "remora" ? "5.0" : "7.5"}+swimPhase-position.z/animalSize*6.;
      float wave = sin(phase)*tail*tail*animalSize*.065;
      float slope = .065*(-2.*tail*sin(phase)-6.*tail*tail*cos(phase));
    `;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>\n${definitions}\n${ray ? "objectNormal.x -= slope*objectNormal.y; objectNormal.z -= alongSlope*objectNormal.y;" : "objectNormal.z -= slope*objectNormal.x;"}\nobjectNormal=normalize(objectNormal);`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>\ntransformed.${ray ? "y" : "x"} += wave;`,
      );
  };
  material.customProgramCacheKey = () =>
    `kuroshio-community-1-${specification.id}`;
}

export async function createCommunity(scene, clock, progress) {
  const loader = new GLTFLoader(),
    batches = [];
  // Sequential ownership: each successful model is added to the scene before
  // the next request. The scene's failure cleanup owns all loaded resources.
  for (const specification of species) {
    const { scene: source } = await loader.loadAsync(
      `${import.meta.env.BASE_URL}models/${specification.id}.glb`,
    );
    source.updateMatrixWorld(true);
    source.traverse((part) => {
      if (!part.isMesh) return;
      const geometry = part.geometry;
      geometry.applyMatrix4(part.matrixWorld);
      geometry.setAttribute(
        "swimPhase",
        new THREE.InstancedBufferAttribute(
          Float32Array.from({ length: specification.count }, (_, index) =>
            swimPhase(index),
          ),
          1,
        ),
      );
      const material = part.material;
      material.envMapIntensity = 0.55;
      swimmingMaterial(material, clock, specification);
      const mesh = new THREE.InstancedMesh(
        geometry,
        material,
        specification.count,
      );
      mesh.name = `Community.${specification.id}`;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);
      batches.push({ mesh, specification });
    });
    progress?.(batches.length / species.length);
  }
  const dummy = new THREE.Object3D(),
    pose = {};
  return {
    update(time) {
      for (const { mesh, specification } of batches) {
        for (let index = 0; index < mesh.count; index++) {
          communityPose(specification.id, index, time, pose);
          dummy.position.set(pose.x, pose.y, pose.z);
          dummy.rotation.set(pose.pitch, pose.yaw, pose.roll, "YXZ");
          dummy.scale.setScalar(pose.scale);
          dummy.updateMatrix();
          mesh.setMatrixAt(index, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      }
    },
    quality(value) {
      for (const { mesh, specification } of batches)
        mesh.count = value === "low" ? specification.low : specification.count;
    },
  };
}
