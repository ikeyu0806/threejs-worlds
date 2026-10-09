import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root } from './worlds.mjs';

const routes = [
  { path: '/', title: 'ORBIT', directory: 'entrance' },
  { path: '/aquarium/', title: 'PELAGIC', directory: 'aquarium' },
  { path: '/cyberpunk/', title: 'AFTERLIGHT', directory: 'cyberpunk' },
  { path: '/cosmos/', title: 'APHELION', directory: 'cosmos' },
  { path: '/heian/', title: 'HEIAN', directory: 'heian' },
  { path: '/shibuya/', title: 'SCRAMBLE', directory: 'shibuya' },
  { path: '/akihabara/', title: 'AKIBA', directory: 'akihabara' },
  { path: '/shinjuku/', title: 'SHINJUKU', directory: 'shinjuku' },
];

async function start(script) {
  const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
  const port = socket.address().port; await new Promise(accept => socket.close(accept));
  const env = { ...process.env, FORCE_COLOR: '0' };
  delete env.NO_COLOR;
  const child = spawn(process.execPath, [resolve(root, 'scripts', script), '--port', String(port)], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    env,
  });
  let output = '';
  try {
    await new Promise((accept, reject) => {
      const timer = setTimeout(() => reject(new Error(`Server did not start: ${output}`)), 15000);
      function finish(error) { clearTimeout(timer); error ? reject(error) : accept(); }
      function ready() { if (output.replace(/\u001b\[[0-9;]*m/g, '').includes(`:${port}/`)) finish(); }
      child.once('error', finish);
      child.once('exit', code => finish(new Error(`Server exited (${code}): ${output}`)));
      child.stdout.on('data', chunk => { output += chunk; ready(); });
      child.stderr.on('data', chunk => { output += chunk; ready(); });
    });
  } catch (error) { child.kill('SIGTERM'); throw error; }
  return {
    url: `http://127.0.0.1:${port}`,
    async close() {
      const ended = once(child, 'exit'); child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
      await ended; clearTimeout(timer);
    },
  };
}

async function request(url) { return fetch(url, { signal: AbortSignal.timeout(10000) }); }

async function verifyAquariumModels(serverUrl) {
  const modelDirectory = resolve(root, 'worlds/aquarium/public/models');
  const manifest = JSON.parse(await readFile(resolve(modelDirectory, 'manifest.json'), 'utf8'));
  for (const file of Object.keys(manifest.models)) {
    const response = await request(`${serverUrl}/aquarium/models/${file}`);
    assert.equal(response.status, 200, file);
    assert.doesNotMatch(response.headers.get('content-type'), /html/, file);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(resolve(modelDirectory, file)), file);
  }
}

async function verifyDetailedModels(serverUrl) {
  for (const world of ['entrance', 'heian']) {
    const modelDirectory = resolve(root, 'worlds', world, 'public/models');
    const manifest = JSON.parse(await readFile(resolve(modelDirectory, 'detail-manifest.json'), 'utf8'));
    const prefix = world === 'entrance' ? '' : `/${world}`;
    for (const { file } of manifest.assets) {
      const response = await request(`${serverUrl}${prefix}/models/${file}`);
      assert.equal(response.status, 200, `${world}/${file}`);
      assert.doesNotMatch(response.headers.get('content-type'), /html/);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(resolve(modelDirectory, file)), `${world}/${file}`);
    }
  }
}

test('development routes serve the correct world, modules and public assets', async context => {
  const server = await start('dev.mjs'); context.after(() => server.close());
  for (const route of routes) {
    const response = await request(server.url + route.path);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, new RegExp(`<title>${route.title}`));
    {
      const favicon = /<link rel="icon"[^>]+href="([^"]+)"/.exec(html)?.[1];
      assert.ok(favicon);
      assert.equal((await request(new URL(favicon, server.url + route.path))).status, 200);
    }
    const source = /<script type="module" src="([^"\s]*src\/main\.jsx)"/.exec(html)?.[1];
    assert.ok(source, `Missing module for ${route.directory}`);
    const module = await request(new URL(source, server.url + route.path));
    assert.equal(module.status, 200);
    assert.match(module.headers.get('content-type'), /javascript/);
    assert.match(await module.text(), /createRoot/);
    const icon = await request(server.url + route.path + 'favicon.svg');
    assert.equal(icon.status, 200);
    assert.equal(await icon.text(), await readFile(resolve(root, 'worlds', route.directory, 'public/favicon.svg'), 'utf8'));
  }
  assert.equal((await request(server.url + '/unknown-world/')).status, 404);
  assert.equal((await request(server.url + '/aquarium/unknown-file.js')).status, 404);
  await verifyAquariumModels(server.url);
  await verifyDetailedModels(server.url);
});

test('assembled production site serves every entry and its own bundled assets', async context => {
  const server = await start('preview.mjs'); context.after(() => server.close());
  for (const route of routes) {
    const response = await request(server.url + route.path);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.equal(html, await readFile(resolve(root, 'worlds', route.directory, 'dist/index.html'), 'utf8'));
    assert.match(html, new RegExp(`<title>${route.title}`));
    const assets = [...html.matchAll(/(?:src|href)="([^"\s]+\.(?:js|css|svg))"/g)].map(match => match[1]);
    assert.ok(assets.length >= 3);
    for (const path of assets) {
      const asset = await request(new URL(path, server.url + route.path));
      assert.equal(asset.status, 200, path);
      assert.doesNotMatch(asset.headers.get('content-type'), /html/, path);
      if (path.endsWith('.js')) assert.match(asset.headers.get('content-type'), /javascript/, path);
    }
  }
  assert.equal((await request(server.url + '/unknown-world/')).status, 404);
  await verifyAquariumModels(server.url);
  await verifyDetailedModels(server.url);
});
