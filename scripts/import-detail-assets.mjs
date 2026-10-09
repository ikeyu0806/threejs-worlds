import { readdir, readFile, copyFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const [world, sourceRoot = '/Users/ikegayayuuki/workspace/blender-works'] = process.argv.slice(2);
const allowed = ['entrance', 'heian', 'cosmos', 'cyberpunk', 'shibuya', 'akihabara', 'shinjuku'];
if (!allowed.includes(world)) throw new Error('Choose one detailed world');
const output = join(sourceRoot, 'output/worlds_detail_kit');
const destination = resolve(`worlds/${world}/public/models`);
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8' }).trim();
const files = (await readdir(join(output, 'exports', world))).filter(file => file.endsWith('.glb')).sort();
await mkdir(destination, { recursive: true });
const assets = [];
for (const file of files) {
  const payload = await readFile(join(output, 'exports', world, file));
  const report = JSON.parse(await readFile(join(output, 'reports', world, file.replace('.glb', '.json')), 'utf8'));
  if (report.status !== 'passed') throw new Error(`Unvalidated model: ${file}`);
  await copyFile(join(output, 'exports', world, file), join(destination, file));
  assets.push({ file, sha256: createHash('sha256').update(payload).digest('hex'), ...report.round_trip.export });
}
await writeFile(join(destination, 'detail-manifest.json'), `${JSON.stringify({ asset_id: 'worlds_detail_kit', world, source_repository: 'ikeyu0806/blender-works', source_commit: sourceCommit, blender_version: '5.2.2 LTS', units: 'meters', up: '+Y', forward: '+Z', assets }, null, 2)}\n`);
console.log(`${world}: ${assets.length} validated assets, ${assets.reduce((sum, asset) => sum + asset.bytes, 0)} bytes`);
