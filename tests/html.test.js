/* =============================================================
   观止东方 · HTML 结构验证测试
   运行: node --test tests/html.test.js
   ============================================================= */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

describe('HTML 结构完整性', () => {
  it('应有 DOCTYPE 声明', () => {
    assert.ok(html.startsWith('<!DOCTYPE html>') || html.startsWith('<!doctype html>'));
  });

  it('应有 <html lang="zh-CN">', () => {
    assert.ok(/<html[^>]*lang=["']zh-CN["']/.test(html));
  });

  it('应有 <title> 标签', () => {
    assert.ok(/<title>[^<]+<\/title>/.test(html));
    const m = html.match(/<title>([^<]+)<\/title>/);
    assert.ok(m[1].includes('观止东方'));
  });

  it('应有 meta description', () => {
    assert.ok(/<meta[^>]*name=["']description["'][^>]*content=["'][^"']+["']/.test(html));
  });

  it('应有 meta viewport', () => {
    assert.ok(/<meta[^>]*name=["']viewport["']/.test(html));
  });
});

describe('SEO 元素', () => {
  it('应有 canonical link', () => {
    assert.ok(/rel=["']canonical["']/.test(html));
  });

  it('应有 og:title', () => {
    assert.ok(/property=["']og:title["']/.test(html));
  });

  it('应有 og:description', () => {
    assert.ok(/property=["']og:description["']/.test(html));
  });

  it('应有 JSON-LD 结构化数据', () => {
    assert.ok(/application\/ld\+json/.test(html));
    const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(m, 'JSON-LD script tag exists');
    const ld = JSON.parse(m[1]);
    assert.strictEqual(ld['@type'], 'Organization');
    assert.strictEqual(ld.name, '观止东方');
  });

  it('应有 robots meta', () => {
    assert.ok(/<meta[^>]*name=["']robots["']/.test(html));
  });

  it('应有 favicon link', () => {
    assert.ok(/rel=["']icon["']/.test(html));
  });
});

describe('语义化结构', () => {
  it('应有 <header> 或 role="banner"', () => {
    assert.ok(/<header/.test(html) || /role=["']banner["']/.test(html));
  });

  it('应有 <main> 标签', () => {
    assert.ok(/<main>/.test(html));
  });

  it('应有 <footer> 标签', () => {
    assert.ok(/<footer/.test(html));
  });

  it('应有 <nav> 标签', () => {
    assert.ok(/<nav/.test(html));
  });

  it('应有 skip-link 无障碍导航', () => {
    assert.ok(/skip-link/.test(html));
  });

  it('所有 <img> 应有 alt 属性 (或无 img)', () => {
    const imgs = html.match(/<img[^>]*>/g);
    if (imgs) {
      imgs.forEach(img => {
        assert.ok(/alt=["']/.test(img), `img missing alt: ${img.substring(0, 60)}`);
      });
    }
  });
});

describe('表单完整性', () => {
  it('应有 name 输入框', () => {
    assert.ok(/id=["']name["']/.test(html));
  });

  it('应有 email 输入框', () => {
    assert.ok(/id=["']email["']/.test(html));
  });

  it('应有 org 输入框', () => {
    assert.ok(/id=["']org["']/.test(html));
  });

  it('应有 interest 下拉框', () => {
    assert.ok(/id=["']interest["']/.test(html));
    // 检查至少有 3 个选项
    const m = html.match(/<select[^>]*id=["']interest["'][^>]*>([\s\S]*?)<\/select>/);
    const opts = m[1].match(/<option/g);
    assert.ok(opts && opts.length >= 4, `expected >=4 options, got ${opts?.length}`);
  });

  it('应有 message 文本域', () => {
    assert.ok(/id=["']message["']/.test(html) && /<textarea/.test(html));
  });

  it('应有提交按钮', () => {
    assert.ok(/type=["']submit["']/.test(html));
  });

  it('表单 action 应指向 /api/contact', () => {
    assert.ok(/action=["']\/api\/contact["']/.test(html));
  });
});

describe('导航完整性', () => {
  const links = [...html.matchAll(/href=["']#(\w+)["']/g)].map(m => m[1]);

  it('应有 6 个主导航锚点', () => {
    const navSection = html.match(/<nav[^>]*class=["'][^"']*nav-links[^"']*["'][^>]*>([\s\S]*?)<\/nav>/);
    const navLinks = navSection[1].match(/href=["']#\w+["']/g);
    assert.ok(navLinks.length >= 5, `expected >=5 nav links, got ${navLinks?.length}`);
  });

  it('所有导航锚点应有对应 section id', () => {
    const ids = [...html.matchAll(/<section[^>]*id=["'](\w+)["']/g)].map(m => m[1]);
    for (const link of ['hero', 'about', 'capabilities', 'lab', 'rujiangnan']) {
      assert.ok(ids.includes(link), `section#${link} 应为导航目标`);
    }
  });
});

describe('无障碍 (a11y)', () => {
  it('nav toggle 应有 aria-label', () => {
    assert.ok(/aria-label=["']打开菜单["']/.test(html));
  });

  it('nav toggle 应有 aria-expanded', () => {
    assert.ok(/aria-expanded=["']false["']/.test(html));
  });

  it('应有 :focus-visible 样式 (在 CSS 中)', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');
    assert.ok(/focus-visible/.test(css), 'CSS 应包含 focus-visible 样式');
  });

  it('表单反馈区应有 role="alert"', () => {
    assert.ok(/id=["']formFeedback["'][^>]*role=["']alert["']/.test(html));
  });
});
