/* Legacy static-HTML assertions migrated to the current Vite/React shell. */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const html = await readFile(resolve('index.html'), 'utf8');
const app = await readFile(resolve('src/App.tsx'), 'utf8');
const main = await readFile(resolve('src/main.tsx'), 'utf8');

describe('Vite document shell', () => {
  it('contains language, viewport, title and description metadata', () => {
    assert.match(html, /<html[^>]*lang="zh-CN"/); assert.match(html, /name="viewport"/); assert.match(html, /<title>[^<]*观止东方/); assert.match(html, /name="description"/);
  });
  it('mounts the React application', () => assert.match(html, /id="root"/));
});

describe('React semantic shell', () => {
  it('contains header, nav, main content, footer and skip link', () => {
    for (const token of ['<header', '<nav', 'id="main-content"', '<footer', 'skip-link']) assert.match(app, new RegExp(token));
  });
  it('keeps the CMS entry outside the public router', () => { assert.match(main, /isHomepageAdmin/); assert.match(main, /<BrowserRouter>/); });
  it('exposes the six public routes', () => {
    for (const path of ['/', '/about', '/capabilities', '/into-jiangnan', '/partners', '/contact']) assert.match(app, new RegExp(`path="${path.replace('/', '\\/')}"`));
  });
});
