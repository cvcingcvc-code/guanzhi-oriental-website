import { mkdir, readdir, rename } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve(process.cwd(), 'dist');
const client = resolve(dist, 'client');

await mkdir(client, { recursive: true });

for (const entry of await readdir(dist, { withFileTypes: true })) {
  if (entry.name === 'client' || entry.name === 'server' || entry.name === '.openai') continue;
  await rename(resolve(dist, entry.name), resolve(client, entry.name));
}
