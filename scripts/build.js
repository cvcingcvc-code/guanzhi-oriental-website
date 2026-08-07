/* =============================================================
   观止东方 · 构建脚本
   零外部依赖 — 纯 Node.js
   用法: node scripts/build.js
   输出: dist/
   ============================================================= */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// 简单的 CSS 压缩
function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')           // 移除注释
    .replace(/\s+/g, ' ')                        // 合并空白
    .replace(/\s*([{}:;,])\s*/g, '$1')           // 移除选择器/属性周围空白
    .replace(/;\}/g, '}')                        // 移除最后一个分号
    .replace(/\{ /g, '{')                        // 花括号后无空格
    .replace(/ \}/g, '}')                        // 花括号前无空格
    .replace(/\) /g, ')')                        // 减少不必要的空白
    .replace(/ \(/g, '(')
    .trim();
}

// 简单的 JS 压缩
function minifyJS(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, '')           // 移除块注释
    .replace(/\/\/.*/g, '')                      // 移除行注释
    .replace(/^\s+/gm, '')                       // 移除行首空白
    .replace(/\n\s*/g, '\n')                     // 压缩换行
    .replace(/\s*([{}();,:])\s*/g, '$1')         // 特殊字符周围空白
    .replace(/;\}/g, '}')
    .replace(/\{\n/g, '{')
    .replace(/\n\}/g, '}')
    .trim();
}

// HTML 压缩 (保留 pre/code/textarea 内容)
function minifyHTML(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')             // 移除注释 (保留条件注释)
    .replace(/>\s+</g, '><')                     // 标签间空白
    .replace(/\s{2,}/g, ' ')                     // 多个空格
    .replace(/^\s+|\s+$/gm, '')                  // 行首尾空白
    .replace(/\n+/g, '\n')                       // 多个换行
    .trim();
}

function copyDir(src, dest, transform) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) { copyDir(s, d, transform); continue; }
    if (e.name === '.gitkeep') continue;
    let content = fs.readFileSync(s, 'utf8');
    if (transform) content = transform(e.name, content);
    fs.writeFileSync(d, content);
  }
}

// 清空 dist
if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
fs.mkdirSync(DIST, { recursive: true });

console.log('🏯 观止东方 · 构建\n');

// 1. HTML
console.log('📄 index.html');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
fs.writeFileSync(path.join(DIST, 'index.html'), minifyHTML(html));
const origH = Buffer.byteLength(html);
const minH = Buffer.byteLength(minifyHTML(html));
console.log(`   ${(origH/1024).toFixed(1)} KB → ${(minH/1024).toFixed(1)} KB (-${((1-minH/origH)*100).toFixed(0)}%)`);

// 2. CSS
console.log('🎨 css/');
copyDir(path.join(ROOT, 'css'), path.join(DIST, 'css'), (name, content) => {
  const min = minifyCSS(content);
  const pct = ((1 - Buffer.byteLength(min) / Buffer.byteLength(content)) * 100).toFixed(0);
  console.log(`   ${name}: ${(Buffer.byteLength(content)/1024).toFixed(1)} KB → ${(Buffer.byteLength(min)/1024).toFixed(1)} KB (-${pct}%)`);
  return min;
});

// 3. JS
console.log('📜 js/');
copyDir(path.join(ROOT, 'js'), path.join(DIST, 'js'), (name, content) => {
  const min = minifyJS(content);
  const pct = ((1 - Buffer.byteLength(min) / Buffer.byteLength(content)) * 100).toFixed(0);
  console.log(`   ${name}: ${(Buffer.byteLength(content)/1024).toFixed(1)} KB → ${(Buffer.byteLength(min)/1024).toFixed(1)} KB (-${pct}%)`);
  return min;
});

// 4. 静态资源 (不压缩)
console.log('🖼️  assets/ → dist/assets/');
copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));

console.log('🔤 fonts/ → dist/fonts/');
copyDir(path.join(ROOT, 'fonts'), path.join(DIST, 'fonts'));

// 5. SEO 文件
console.log('🤖 robots.txt, sitemap.xml');
for (const f of ['robots.txt', 'sitemap.xml']) {
  const s = path.join(ROOT, f);
  if (fs.existsSync(s)) fs.copyFileSync(s, path.join(DIST, f));
}

// 6. 输出大小统计
function totalSize(dir) {
  let size = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isFile()) size += fs.statSync(path.join(d, e.name)).size;
      else walk(path.join(d, e.name));
    }
  };
  walk(dir);
  return size;
}

const total = totalSize(DIST);
console.log(`\n✅ dist/ 构建完成 — ${(total/1024).toFixed(0)} KB total`);
console.log('   部署到 Cloudflare Pages: 直接上传 dist/ 目录');
