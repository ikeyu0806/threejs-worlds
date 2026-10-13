// Integrate only the submerged sightline, keeping the viewing room free of fog.
export function waterMaterial(material, time, swimming = false) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.waterTime = time;
    shader.vertexShader = `uniform float waterTime; varying vec3 vWaterWorld;\n${shader.vertexShader}`;
    if (swimming) {
      // All anatomical parts share baked local coordinates. Lateral movement and
      // the normal's rotation grow toward the tail, leaving the head almost still.
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <beginnormal_vertex>",
          `
        #include <beginnormal_vertex>
        float amountN = clamp((position.x+2.4)/6.6,0.,1.);
        float phaseN = waterTime*1.28-position.x*.78;
        float slope = .62*(2.*amountN/6.6*sin(phaseN)-amountN*amountN*.78*cos(phaseN));
        float angleN = atan(slope);
        objectNormal.xz = mat2(cos(angleN),sin(angleN),-sin(angleN),cos(angleN))*objectNormal.xz;
      `,
        )
        .replace(
          "#include <begin_vertex>",
          `
        #include <begin_vertex>
        float amount = clamp((position.x+2.4)/6.6,0.,1.);
        transformed.z += sin(waterTime*1.28-position.x*.78)*amount*amount*.62;
      `,
        );
    }
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      `
      #include <project_vertex>
      vec4 waterPosition = vec4(transformed,1.);
      #ifdef USE_INSTANCING
        waterPosition = instanceMatrix * waterPosition;
      #endif
      vWaterWorld = (modelMatrix*waterPosition).xyz;
    `,
    );
    shader.fragmentShader = `uniform float waterTime; varying vec3 vWaterWorld;\n${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `
      float submergedDistance = length(vWaterWorld-cameraPosition);
      float entry = clamp(cameraPosition.z / max(.001, cameraPosition.z-vWaterWorld.z),0.,1.);
      submergedDistance *= 1.-entry;
      vec3 transmittance = exp(-vec3(.095,.028,.019)*submergedDistance);
      outgoingLight = outgoingLight*transmittance + vec3(.009,.105,.16)*(1.-transmittance);
      vec2 c = vWaterWorld.xz*.95;
      float a = sin(c.x+sin(c.y*1.31+waterTime*.19)*1.7+waterTime*.12);
      float b = sin(c.y+sin(c.x*.93-waterTime*.15)*1.9);
      float caustic = pow(max(0.,1.-abs(a*.5+b*.5)),18.);
      outgoingLight += diffuseColor.rgb*caustic*.15*max(0.,normal.y);
      #include <opaque_fragment>
    `,
    );
  };
  material.customProgramCacheKey = () =>
    swimming ? "kuroshio-swim-2" : "kuroshio-water-2";
}
