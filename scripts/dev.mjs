import { createServer as createHttpServer } from 'node:http';
import { parseArgs } from 'node:util';
import { createServer } from 'vite';
import { resolve } from 'node:path';
import { discoverWorlds } from './worlds.mjs';

const { values } = parseArgs({ options: {
  port: { type: 'string', default: '5173' },
  host: { type: 'string', default: '127.0.0.1' },
  strictPort: { type: 'boolean' },
} });
const port = Number(values.port);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('有効なポートを指定してください。');

const worlds = await discoverWorlds();
const servers = new Map();
const httpServer = createHttpServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const world = worlds.find(item => item.base !== '/' && (pathname === item.base.slice(0, -1) || pathname.startsWith(item.base)))
    ?? worlds.find(item => item.base === '/');
  if (!world) {
    if (pathname === '/' && worlds[0]) { res.writeHead(302, { Location: worlds[0].base }); res.end(); return; }
    res.writeHead(404); res.end('World not found'); return;
  }
  servers.get(world.id).middlewares(req, res, () => { res.writeHead(404); res.end('Not found'); });
});

async function close() {
  await Promise.all([...servers.values()].map(server => server.close()));
  httpServer.close();
}

try {
  for (const world of worlds) {
    servers.set(world.id, await createServer({
      root: world.directory,
      configFile: resolve(world.directory, 'vite.config.js'),
      base: world.base,
      appType: 'mpa',
      server: { middlewareMode: true, ws: { server: httpServer, path: `__hmr-${world.id}` } },
    }));
  }
  await new Promise((accept, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, values.host, accept);
  });
  console.log(`\nThree.js Worlds: http://${values.host}:${port}/`);
  for (const world of worlds) console.log(`  ${world.id}: http://${values.host}:${port}${world.base}`);
} catch (error) { await close(); throw error; }
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await close(); process.exit(0); });
