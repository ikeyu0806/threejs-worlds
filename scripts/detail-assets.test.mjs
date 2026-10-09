import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { root } from './worlds.mjs';

const worldNames = ['entrance', 'heian', 'cosmos'];
test('detailed world models preserve validated Blender exports and embedded PBR', async () => {
  for (const world of worldNames) {
    const directory = resolve(root, 'worlds', world, 'public/models');
    const manifest = JSON.parse(await readFile(resolve(directory, 'detail-manifest.json'), 'utf8'));
    assert.equal(manifest.world, world); assert.equal(manifest.up, '+Y'); assert.equal(manifest.forward, '+Z');
    assert.match(manifest.source_commit, /^[0-9a-f]{40}$/);
    assert.ok(manifest.assets.length >= 3);
    assert.equal(new Set(manifest.assets.map(asset => asset.file)).size, manifest.assets.length);
    for (const asset of manifest.assets) {
      const label = `${world}/${asset.file}`;
      const buffer = await readFile(resolve(directory, asset.file));
      assert.equal(createHash('sha256').update(buffer).digest('hex'), asset.sha256, label);
      assert.equal(buffer.length, asset.bytes, label);
      assert.equal(buffer.toString('ascii', 0, 4), 'glTF', label);
      assert.equal(buffer.readUInt32LE(4), 2); assert.equal(buffer.readUInt32LE(8), buffer.length);
      const gltf = JSON.parse(buffer.toString('utf8', 20, 20 + buffer.readUInt32LE(12)));
      assert.ok(gltf.nodes.some(node => node.extras?.asset_id === 'worlds_detail_kit' && node.extras.world === world), label);
      assert.ok(gltf.buffers.every(reference => !reference.uri), label);
      assert.ok(gltf.images.length >= 1 && gltf.images.length <= 3, label);
      assert.ok(gltf.images.every(reference => reference.bufferView !== undefined && !reference.uri), label);
      assert.ok(gltf.materials.some(surface => surface.normalTexture), label);
      assert.equal(gltf.materials.length, asset.materials); assert.ok(asset.materials <= 8);
      assert.equal(gltf.images.length, asset.embedded_images);
      assert.equal((gltf.animations ?? []).length, 0, label);
      let triangles = 0;
      for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
        assert.equal(primitive.mode ?? 4, 4, label);
        for (const attribute of ['POSITION', 'NORMAL', 'TEXCOORD_0']) assert.notEqual(primitive.attributes[attribute], undefined, `${label} ${attribute}`);
        triangles += gltf.accessors[primitive.indices].count / 3;
      }
      assert.equal(triangles, asset.triangles, label); assert.ok(triangles <= 80000, label);
    }
  }
});
