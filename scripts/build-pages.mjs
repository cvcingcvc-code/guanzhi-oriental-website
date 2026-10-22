import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, extname, join } from 'node:path';

/**
 * GitHub Pages 预览构建后处理：
 * 1. 把产物中硬编码的绝对资源路径（/images /videos /fonts /assets /og.jpg）
 *    重写为 Pages 项目页子路径（/guanzi-oriental-website/...）
 *    —— Vite 只处理自身打包的资源引用，JSX/CSS 数据里的公共路径不会改写。
 * 2. index.html 复制为 404.html：GitHub Pages 对未知路径返回 404.html，
 *    借此实现 SPA 深层路由（/about 等）刷新可用。
 * 3. 写入 .nojekyll，跳过 Jekyll 处理。
 *
 * API 调用（/api/v1）不改写：Pages 无后端，前端按设计回退到中文 fallback 内容。
 */

const BASE = '/guanzi-oriental-website/';
const client = resolve(process.cwd(), 'dist', 'client');
const TEXT_EXTS = new Set(['.js', '.css', '.html', '.svg']);
const PREFIXES = ['/images/', '/videos/', '/fonts/', '/assets/', '/og.'];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

function rewrite(text) {
  let out = text;
  for (const prefix of PREFIXES) {
    for (const quote of ['"', "'", '(']) {
      const from = `${quote}${prefix}`;
      const to = `${quote}${BASE}${prefix.slice(1)}`;
      // 已带子路径前缀的（Vite 打包产物）不会匹配此模式，天然防重复
      out = out.split(from).join(to);
    }
  }
  return out;
}

const files = await walk(client);
let rewritten = 0;
for (const file of files) {
  if (!TEXT_EXTS.has(extname(file))) continue;
  const original = await readFile(file, 'utf8');
  const next = rewrite(original);
  if (next !== original) {
    await writeFile(file, next, 'utf8');
    rewritten += 1;
  }
}

await writeFile(resolve(client, '404.html'), await readFile(resolve(client, 'index.html'), 'utf8'), 'utf8');
await writeFile(resolve(client, '.nojekyll'), '', 'utf8');
console.log(`pages postprocess: ${files.length} files scanned, ${rewritten} rewritten, 404.html + .nojekyll written`);
