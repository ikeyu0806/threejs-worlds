import { readdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';

export const root = resolve(import.meta.dirname, '..');

export async function discoverWorlds() {
  const entries = await readdir(resolve(root, 'worlds'), { withFileTypes: true });
  const worlds = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const directory = resolve(root, 'worlds', entry.name);
    try { await access(resolve(directory, 'package.json')); }
    catch { continue; }
    worlds.push({ id: entry.name, directory, base: entry.name === 'entrance' ? '/' : `/${entry.name}/` });
  }
  return worlds;
}
