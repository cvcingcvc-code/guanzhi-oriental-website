import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const source = process.argv[2];
if (!source) throw new Error('Pass the source HTML path');

const html = await readFile(source, 'utf8');
const style = html.match(/<style>([\s\S]*?)<\/style>/)?.[1]?.replace(/^@import\s+"[^"]+";/, '');
if (!style) throw new Error('Source HTML has no style block');
await writeFile(path.resolve('src/index.css'), style);
const output = path.resolve('public/images/client-design');
await mkdir(output, { recursive: true });

for (let index = 0; index < 8; index += 1) {
  const start = html.indexOf(`<section id="chapter-${index + 1}"`);
  const end = index === 7 ? html.indexOf('<div class="contact-sheet', start) : html.indexOf(`<section id="chapter-${index + 2}"`, start);
  if (start < 0 || end < 0) throw new Error(`Could not find chapter ${index + 1}`);
  const match = html.slice(start, end).match(/data:image\/(webp|png|jpeg);base64,([^)'"\s]+)/);
  if (!match) throw new Error(`Chapter ${index + 1} has no embedded image`);
  const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
  await writeFile(path.join(output, `chapter-${index + 1}.${extension}`), Buffer.from(match[2], 'base64'));
}

console.log('Extracted the design stylesheet and 8 chapter backgrounds.');
