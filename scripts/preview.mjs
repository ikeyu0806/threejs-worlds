import { parseArgs } from 'node:util';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { preview } from 'vite';
import { root } from './worlds.mjs';

const { values } = parseArgs({ options: {
  port: { type: 'string', default: '4173' },
  host: { type: 'string', default: '127.0.0.1' },
  strictPort: { type: 'boolean', default: true },
} });
await access(resolve(root, 'dist'));
const server = await preview({
  configFile: false, root, appType: 'mpa',
  build: { outDir: 'dist' },
  preview: { port: Number(values.port), host: values.host, strictPort: values.strictPort },
});
server.printUrls();
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.httpServer.close(() => process.exit(0)));
