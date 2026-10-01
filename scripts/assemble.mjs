import { access, cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { discoverWorlds, root } from './worlds.mjs';

const worlds = await discoverWorlds();
// Validate every build before replacing the assembled site.
for (const world of worlds) await access(resolve(world.directory, 'dist/index.html'));
const output = resolve(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const world of worlds) {
  await cp(resolve(world.directory, 'dist'), world.base === '/' ? output : resolve(output, world.id), { recursive: true });
}
console.log(`Assembled ${worlds.length} worlds in dist/`);
