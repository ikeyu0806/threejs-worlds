import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { root } from "./worlds.mjs";
import { aquariumModelFiles } from "../worlds/aquarium-legacy/src/models.js";

const directory = resolve(root, "worlds/aquarium-legacy/public/models");

test("new whale shark has embedded textures, smooth finite geometry and a mobile-sized download", async () => {
  const current = resolve(root, "worlds/aquarium/public/models");
  const manifest = JSON.parse(
    await readFile(resolve(current, "manifest.json"), "utf8"),
  );
  const buffer = await readFile(resolve(current, manifest.file));
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  assert.equal(
    createHash("sha256").update(buffer).digest("hex"),
    manifest.sha256,
  );
  assert.ok(
    buffer.length < 6 * 1024 * 1024,
    "keep the initial model download under 6 MiB",
  );
  const jsonLength = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength));
  const binary = buffer.subarray(28 + jsonLength);
  assert.equal(
    gltf.materials.length,
    6,
    "skin, fins, underside, mouth, lip and cornea",
  );
  assert.ok(gltf.images.length >= 3);
  assert.ok(
    gltf.images.every((image) => image.bufferView !== undefined && !image.uri),
  );
  assert.ok(
    gltf.materials.filter((material) => material.normalTexture).length >= 2,
  );
  assert.ok(gltf.buffers.every((reference) => !reference.uri));
  let triangles = 0;
  const lower = [Infinity, Infinity, Infinity],
    upper = [-Infinity, -Infinity, -Infinity];
  for (const mesh of gltf.meshes)
    for (const primitive of mesh.primitives) {
      triangles += gltf.accessors[primitive.indices].count / 3;
      assert.ok(primitive.attributes.TEXCOORD_0 !== undefined);
      for (const kind of ["POSITION", "NORMAL"]) {
        const attribute = gltf.accessors[primitive.attributes[kind]];
        assert.equal(attribute.componentType, 5126);
        const view = gltf.bufferViews[attribute.bufferView];
        const stride = view.byteStride ?? 12,
          offset = (view.byteOffset ?? 0) + (attribute.byteOffset ?? 0);
        for (let i = 0; i < attribute.count; i++) {
          const values = [0, 1, 2].map((axis) =>
            binary.readFloatLE(offset + i * stride + axis * 4),
          );
          assert.ok(
            values.every(Number.isFinite),
            `${kind} must not contain NaN`,
          );
          if (kind === "NORMAL")
            assert.ok(
              Math.abs(Math.hypot(...values) - 1) < 0.01,
              "unit shading normals",
            );
          else
            values.forEach((value, axis) => {
              lower[axis] = Math.min(lower[axis], value);
              upper[axis] = Math.max(upper[axis], value);
            });
        }
      }
    }
  assert.equal(triangles, manifest.triangles);
  assert.ok(
    triangles > 100000 && triangles < 180000,
    "smooth hero model within the geometry budget",
  );
  assert.ok(Math.abs(upper[0] - lower[0] - manifest.length_m) < 0.1);
  assert.ok(
    upper[1] > 1.7 && lower[1] < -1.2,
    "vertical asymmetric caudal lobes",
  );
  assert.ok(upper[2] > 2.7 && lower[2] < -2.7, "paired broad pectoral fins");
});

test("archived aquarium models preserve their Blender export, embedded PBR and swim contracts", async () => {
  const manifest = JSON.parse(
    await readFile(resolve(directory, "manifest.json"), "utf8"),
  );
  assert.deepEqual(
    Object.keys(manifest.models).sort(),
    aquariumModelFiles.map((name) => `${name}.glb`).sort(),
  );
  assert.equal(manifest.forward, "+Z");
  assert.equal(manifest.up, "+Y");
  assert.match(manifest.source_commit, /^[0-9a-f]{40}$/);
  for (const [file, specification] of Object.entries(manifest.models)) {
    const buffer = await readFile(resolve(directory, file));
    assert.equal(
      createHash("sha256").update(buffer).digest("hex"),
      specification.sha256,
      `${file} export changed`,
    );
    assert.equal(buffer.length, specification.bytes, file);
    assert.equal(buffer.toString("ascii", 0, 4), "glTF", file);
    assert.equal(buffer.readUInt32LE(4), 2, file);
    assert.equal(buffer.readUInt32LE(8), buffer.length, file);
    const jsonLength = buffer.readUInt32LE(12);
    const gltf = JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength));
    const binary = buffer.subarray(20 + jsonLength + 8);
    assert.ok(
      gltf.nodes.some((node) => node.extras?.asset_id === "pelagic_aquarium"),
      file,
    );
    assert.ok(gltf.materials.length <= 5, file);
    assert.ok(
      gltf.buffers.every((reference) => !reference.uri),
      file,
    );
    assert.ok(
      (gltf.images ?? []).every(
        (reference) => reference.bufferView !== undefined && !reference.uri,
      ),
      file,
    );
    if (file !== "moon_jelly.glb")
      assert.ok(
        gltf.materials.some((surface) => surface.normalTexture),
        `${file} missing PBR normal texture`,
      );
    let triangles = 0;
    for (const surface of gltf.meshes)
      for (const primitive of surface.primitives) {
        assert.equal(primitive.mode ?? 4, 4, file);
        assert.ok(
          primitive.attributes.NORMAL !== undefined &&
            primitive.attributes.COLOR_0 !== undefined,
          file,
        );
        triangles += gltf.accessors[primitive.indices].count / 3;
        if (specification.animated)
          assert.ok(primitive.targets?.length, `${file} missing morph targets`);
      }
    assert.equal(triangles, specification.triangles, file);
    assert.ok(triangles <= specification.maximum_triangles, file);
    assert.equal(
      (gltf.animations ?? []).length,
      specification.animated ? 1 : 0,
      file,
    );
    if (!specification.animated) continue;
    const clip = gltf.animations[0];
    assert.equal(clip.name, "swim", file);
    const floats = (index) => {
      const accessor = gltf.accessors[index],
        view = gltf.bufferViews[accessor.bufferView];
      assert.equal(accessor.type, "SCALAR", file);
      assert.equal(accessor.componentType, 5126, file);
      const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
      return Array.from({ length: accessor.count }, (_, i) =>
        binary.readFloatLE(offset + i * 4),
      );
    };
    for (const channel of clip.channels) {
      assert.equal(
        channel.target.path,
        "weights",
        `${file} must not contain root motion`,
      );
      const sampler = clip.samplers[channel.sampler],
        times = floats(sampler.input),
        weights = floats(sampler.output);
      assert.ok(
        Math.abs(times.at(-1) - times[0] - 4) < 1e-5,
        `${file} swim duration`,
      );
      assert.ok(
        Math.abs(weights[0] - weights.at(-1)) < 1e-5,
        `${file} loop seam`,
      );
      assert.ok(
        weights.every(Number.isFinite) &&
          Math.max(...weights) - Math.min(...weights) > 1.8,
        `${file} morph must move`,
      );
    }
  }
});
