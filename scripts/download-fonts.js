/* =============================================================
   观止东方 · 字体下载脚本
   从 fonts.gstatic.com 直接下载 woff2 文件用于自托管
   ============================================================= */
const fs = require('fs');
const path = require('path');
const https = require('https');

const FONTS_DIR = path.join(__dirname, '..', 'fonts');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (e) => { file.close(); try { fs.unlinkSync(dest); } catch(_) {} reject(e); });
  });
}

async function downloadFont(id, weights, styles, label) {
  console.log(`\n📥 ${label} (${id})`);
  const data = await fetchJson(`https://gwfh.mranftl.com/api/fonts/${id}`);
  console.log(`   版本: ${data.version}`);

  const variants = data.variants.filter(v => {
    const w = parseInt(v.fontWeight);
    return weights.includes(w) && styles.includes(v.fontStyle) && v.woff2;
  });

  for (const v of variants) {
    const wName = { 400: 'regular', 500: '500', 600: '600', 700: '700' }[parseInt(v.fontWeight)] || v.fontWeight;
    const sSuffix = v.fontStyle === 'italic' ? '-italic' : '';
    const filename = `${id}-${wName}${sSuffix}.woff2`;
    const filepath = path.join(FONTS_DIR, filename);

    if (fs.existsSync(filepath)) {
      const kb = (fs.statSync(filepath).size / 1024).toFixed(1);
      console.log(`  ⏭ ${filename} (${kb} KB — 已存在)`);
      continue;
    }

    process.stdout.write(`  ⬇ ${filename} ...`);
    try {
      await download(v.woff2, filepath);
      const kb = (fs.statSync(filepath).size / 1024).toFixed(1);
      console.log(` ✅ ${kb} KB`);
    } catch (err) {
      console.error(` ❌ ${err.message}`);
    }
  }
}

async function main() {
  if (!fs.existsSync(FONTS_DIR)) fs.mkdirSync(FONTS_DIR, { recursive: true });

  console.log('🏯 观止东方 · 字体下载');
  console.log(`   目标: ${FONTS_DIR}\n`);

  try {
    // Source Serif 4 — 英文衬线 (~200KB total)
    await downloadFont('source-serif-4', [400, 500, 600], ['normal', 'italic'], 'Source Serif 4 (英文衬线)');

    // Noto Serif SC — 中文宋体 (~10MB total for 2 weights)
    await downloadFont('noto-serif-sc', [400, 700], ['normal'], 'Noto Serif SC (中文宋体)');

    console.log('\n✅ 下载完成！现在可移除 Google Fonts CDN 依赖。');
  } catch (err) {
    console.error('\n❌ 错误:', err.message);
    console.log('\n💡 手动下载: https://gwfh.mranftl.com/fonts');
  }
}

main();
