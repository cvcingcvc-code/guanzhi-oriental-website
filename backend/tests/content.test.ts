import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-longer-than-32-chars';
process.env.IP_HASH_SALT = 'test-ip-hash-salt-long-enough';
process.env.PUBLIC_BASE_URL = 'http://localhost:8080';

const { homeContentDocumentSchema, parseContentDocument } = await import('../src/content/contract.js');
const { buildPublicContentPage, buildPublicSettings } = await import('../src/content/public-dto.js');
const { createContentRoutes } = await import('../src/routes/content.js');
const { FALLBACK_HERO, loadHeroOrFallback, loadSiteSettingsOrFallback } = await import('../../src/content/public-content.ts');

const media = {
  fallbackUrl: '/images/example.png',
  alt: { 'zh-CN': '示例图片', en: 'Example image' },
  mimeType: 'image/png',
};

const validHome = {
  version: 1,
  blocks: [
    {
      type: 'hero', enabled: true, order: 10, eyebrow: '定位', headingLines: ['第一行', '第二行'], emphasisLine: 1,
      description: 'Description', primaryCta: { label: '了解更多', action: 'scroll', target: 'solutions' }, media,
    },
    { type: 'about', enabled: true, order: 20, lead: '定位', headingLines: ['标题'], paragraphs: ['正文'] },
    {
      type: 'capabilities', enabled: true, order: 30, headingLines: ['能力'], intro: '介绍',
      items: [{ id: 'capability', enabled: true, order: 10, number: '01', title: '研发', description: '说明' }],
    },
    {
      type: 'motifs', enabled: true, order: 40, headingLines: ['母题'], intro: '介绍',
      items: [{ id: 'garden', enabled: true, order: 10, title: '园林', titleEn: 'GARDEN', description: '说明', status: '研发中', media }],
    },
    { type: 'jiangnan', enabled: true, order: 50, headingLines: ['入江南'], description: '说明', media },
    {
      type: 'partners', enabled: true, order: 60, heading: '合作对象',
      items: [{ id: 'partner', enabled: true, order: 10, title: '合作伙伴', media }],
    },
    {
      type: 'contact', enabled: true, order: 70, kicker: '合作', headingLines: ['联系'],
      cta: { label: '咨询', action: 'inquiry', target: 'inquiry' }, location: '杭州 · 中国', email: 'hello@example.com',
      organizationDisplayName: '观止东方', copyrightYear: 2026,
    },
  ],
} as const;

const pageRow = {
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'home',
  locale: 'zh-CN' as const,
  publishedAt: new Date('2026-08-11T00:00:00.000Z'),
  title: '观止东方',
  seoTitle: '观止东方',
  seoDescription: '网站说明',
  blocks: validHome,
};

test('首页 Content Contract 接受完整 typed blocks', () => {
  const parsed = homeContentDocumentSchema.parse(validHome);
  assert.deepEqual(parsed.blocks.map((block: { type: string }) => block.type), ['hero', 'about', 'capabilities', 'motifs', 'jiangnan', 'partners', 'contact']);
});

test('首页 Content Contract 拒绝错误 block 和缺失 block', () => {
  assert.throws(() => parseContentDocument('home', { version: 1, blocks: [{ type: 'hero', enabled: true }] }));
  assert.throws(() => parseContentDocument('home', { ...validHome, blocks: [...validHome.blocks, { type: 'raw-html', enabled: true, order: 99, html: '<script />' }] }));
  const unsafeHome = structuredClone(validHome) as { blocks: Array<Record<string, unknown>> };
  const hero = unsafeHome.blocks[0] as Record<string, unknown>;
  hero.primaryCta = { label: '危险链接', action: 'link', target: 'javascript:alert(1)' };
  assert.throws(() => homeContentDocumentSchema.parse(unsafeHome));
});

test('Public DTO 解析媒体引用且不暴露 fallbackUrl', () => {
  const document = homeContentDocumentSchema.parse(validHome);
  const dto = buildPublicContentPage(pageRow, document, [], (key) => `/uploads/${key}`);
  const hero = dto.blocks.find((block) => block.type === 'hero');
  assert.ok(hero && hero.type === 'hero');
  assert.equal(hero.media.url, '/images/example.png');
  assert.equal('fallbackUrl' in hero.media, false);
});

test('Public Settings 仅输出白名单并兼容旧 zh locale', () => {
  const settings = buildPublicSettings([
    { key: 'brand.name', value: { zh: '观止东方', en: 'Guanzhi Dongfang' } },
    { key: 'contact.email', value: 'hello@example.com' },
    { key: 'site.locales', value: ['zh', 'en'] },
    { key: 'admin.internalSecret', value: 'must-not-leak' },
  ]);
  assert.deepEqual(settings.locales, ['zh-CN', 'en']);
  assert.equal(settings.brand.name?.['zh-CN'], '观止东方');
  assert.equal(JSON.stringify(settings).includes('must-not-leak'), false);
});

test('Public Content API 返回 Hero、处理错误 locale、不存在 slug 和错误 block', async () => {
  const repository = {
    async findPublishedPage(slug: string) {
      if (slug === 'missing') return undefined;
      if (slug === 'broken') return { ...pageRow, slug: 'broken', blocks: { version: 1, blocks: [{ type: 'raw-html' }] } };
      return pageRow;
    },
    async findMediaAssets() { return []; },
    async listSettings() { return [{ key: 'contact.email', value: 'hello@example.com' }, { key: 'site.locales', value: ['zh-CN', 'en'] }, { key: 'private.key', value: 'hidden' }]; },
  };
  const app = Fastify();
  await app.register(createContentRoutes(repository), { prefix: '/api/v1' });

  const page = await app.inject('/api/v1/content/pages/home?locale=zh-CN');
  assert.equal(page.statusCode, 200);
  assert.equal(page.json().data.blocks[0].type, 'hero');

  const settings = await app.inject('/api/v1/content/settings');
  assert.equal(settings.statusCode, 200);
  assert.equal(settings.json().data.contact.email, 'hello@example.com');
  assert.equal(JSON.stringify(settings.json()).includes('private.key'), false);

  assert.equal((await app.inject('/api/v1/content/pages/home?locale=zh')).statusCode, 400);
  assert.equal((await app.inject('/api/v1/content/pages/missing?locale=zh-CN')).statusCode, 404);
  assert.equal((await app.inject('/api/v1/content/pages/broken?locale=zh-CN')).statusCode, 500);
  await app.close();
});

test('前端 API 或数据库链路异常时返回静态 Hero 与 Settings fallback', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: false }), { status: 503 });
  try {
    const controller = new AbortController();
    assert.deepEqual(await loadHeroOrFallback(controller.signal), FALLBACK_HERO);
    const settings = await loadSiteSettingsOrFallback(controller.signal);
    assert.equal(settings.contact.email, 'hello@guanzhidongfang.com');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
