import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { root } from "./worlds.mjs";
import {
  species,
  communityPose,
} from "../worlds/aquarium/src/community-paths.js";

const directory = resolve(root, "worlds/aquarium/public/models");

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

test("seven newly built species preserve finite geometry, PBR and verified exports", async () => {
  const manifest = JSON.parse(
    await readFile(resolve(directory, "community-manifest.json"), "utf8"),
  );
  assert.equal(manifest.original, true);
  assert.deepEqual(
    Object.keys(manifest.models).sort(),
    species.map((animal) => `${animal.id}.glb`).sort(),
  );
  let totalBytes = 0;
  for (const [file, specification] of Object.entries(manifest.models)) {
    const buffer = await readFile(resolve(directory, file));
    totalBytes += buffer.length;
    assert.equal(
      createHash("sha256").update(buffer).digest("hex"),
      specification.sha256,
      file,
    );
    assert.equal(buffer.length, specification.bytes);
    assert.equal(buffer.toString("ascii", 0, 4), "glTF");
    assert.equal(buffer.readUInt32LE(8), buffer.length);
    const jsonLength = buffer.readUInt32LE(12);
    const gltf = JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength));
    const binary = buffer.subarray(28 + jsonLength);
    assert.ok(
      gltf.nodes.some((node) => node.extras?.asset_id === "kuroshio_community"),
    );
    assert.equal(gltf.meshes.length, 1);
    assert.equal(gltf.materials.length, 1);
    assert.ok(gltf.materials[0].normalTexture);
    assert.ok(
      gltf.images.every(
        (image) => image.bufferView !== undefined && !image.uri,
      ),
    );
    assert.ok(gltf.buffers.every((reference) => !reference.uri));
    let triangles = 0;
    for (const mesh of gltf.meshes)
      for (const primitive of mesh.primitives) {
        assert.ok(primitive.attributes.COLOR_0 !== undefined);
        assert.ok(primitive.attributes.TEXCOORD_0 !== undefined);
        triangles += gltf.accessors[primitive.indices].count / 3;
        for (const kind of ["POSITION", "NORMAL"]) {
          const attribute = gltf.accessors[primitive.attributes[kind]];
          const view = gltf.bufferViews[attribute.bufferView];
          assert.equal(attribute.componentType, 5126);
          const stride = view.byteStride ?? 12,
            offset = (view.byteOffset ?? 0) + (attribute.byteOffset ?? 0);
          for (let i = 0; i < attribute.count; i++) {
            const vector = [0, 1, 2].map((axis) =>
              binary.readFloatLE(offset + i * stride + axis * 4),
            );
            assert.ok(vector.every(Number.isFinite), `${file}: ${kind}`);
            if (kind === "NORMAL")
              assert.ok(Math.abs(Math.hypot(...vector) - 1) < 0.01);
          }
        }
      }
    assert.equal(triangles, specification.triangles);
    assert.ok(triangles < 50000);
    assert.ok(buffer.length < 3 * 1024 * 1024);
  }
  assert.ok(totalBytes < 7 * 1024 * 1024, "community download budget");
});

test("community stays submerged, swims forward and keeps every species in light mode", () => {
  for (const animal of species) {
    assert.ok(animal.low > 0 && animal.low <= animal.count);
    for (let index = 0; index < animal.count; index++)
      for (let time = 0; time <= 600; time += 2) {
        const pose = communityPose(animal.id, index, time),
          next = communityPose(animal.id, index, time + 0.01);
        assert.ok(Object.values(pose).every(Number.isFinite));
        assert.ok(pose.y > 0.8 && pose.y < 8.5, animal.id);
        assert.ok(pose.z < -3 && pose.z > -26, animal.id);
        assert.ok(Math.abs(pose.x) < 15, animal.id);
        const dx = next.x - pose.x,
          dz = next.z - pose.z;
        assert.ok(
          dx * Math.sin(pose.yaw) + dz * Math.cos(pose.yaw) > 0,
          "facing the direction of travel",
        );
      }
  }
  for (const animal of species.filter(
    (animal) => animal.kind === "fish" && animal.id !== "remora",
  )) {
    for (let time = 0; time < 180; time += 15) {
      const poses = Array.from({ length: animal.count }, (_, index) =>
        communityPose(animal.id, index, time),
      );
      for (let i = 0; i < poses.length; i++)
        for (let j = 0; j < i; j++) {
          const a = poses[i],
            b = poses[j];
          assert.ok(
            Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) > animal.size * 0.5,
            `${animal.id}: fish crowding`,
          );
        }
    }
  }
});
