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
const { FALLBACK_ABOUT, FALLBACK_HERO, loadHeroOrFallback, loadHomeContentOrFallback, loadSiteSettingsOrFallback } = await import('../../src/content/public-content.ts');

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
      cta: { label: '咨询', action: 'inquiry', target: 'inquiry' }, email: 'hello@example.com',
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

test('Public DTO 拒绝非法 assetId，且已删除/缺失的无 fallback 资产不会进入响应', () => {
  const invalid = structuredClone(validHome) as { blocks: Array<Record<string, unknown>> };
  (invalid.blocks[0]?.media as Record<string, unknown>).assetId = 'not-a-uuid';
  assert.throws(() => homeContentDocumentSchema.parse(invalid));

  const missing = structuredClone(validHome) as { blocks: Array<Record<string, unknown>> };
  missing.blocks[0]!.media = { assetId: '00000000-0000-4000-8000-000000000099', alt: { 'zh-CN': '已删除资产' } };
  const document = homeContentDocumentSchema.parse(missing);
  assert.throws(() => buildPublicContentPage(pageRow, document, [], (key) => `/uploads/${key}`), /媒体资产不存在/);
});

test('Public Settings 仅输出白名单并兼容旧 zh locale', () => {
  const settings = buildPublicSettings([
    { key: 'brand.name', value: { zh: '观止东方', en: 'Guanzhi Oriental' } },
    { key: 'flagship.name', value: { 'zh-CN': '入江南', en: 'Into Jiangnan' } },
    { key: 'contact.email', value: 'hello@example.com' },
    { key: 'site.locales', value: ['zh', 'en'] },
    { key: 'admin.internalSecret', value: 'must-not-leak' },
  ]);
  assert.deepEqual(settings.locales, ['zh-CN', 'en']);
  assert.equal(settings.brand.name?.['zh-CN'], '观止东方');
  assert.equal(settings.flagship.name?.en, 'Into Jiangnan');
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
    assert.deepEqual(await loadHomeContentOrFallback(controller.signal), { hero: FALLBACK_HERO, about: FALLBACK_ABOUT });
    const settings = await loadSiteSettingsOrFallback(controller.signal);
    assert.equal(settings.contact.email, 'hello@guanzhidongfang.com');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('About zh-CN/en API 保留正式四段文案且前端可从同一次首页请求读取 About', async () => {
  const zhParagraphs = [
    '北京见山观止文化有限公司是一家以中国文化为核心的内容与体验设计公司。我们以“观止东方”为对外品牌，面向全球旅行及文化合作伙伴，开展文化主题与叙事研发、体验产品设计、在地资源整合、产品标准化交付与联合出品。',
    '我们关注的不只是一次行程的安排，而是如何让人真正进入中国文化与真实生活：在山水、城市、技艺、饮食与日常之中，获得有节奏、有留白、可感知的深度体验。我们将文化内容转化为能够被理解、被交付、被持续迭代的体验产品，并通过实际运营不断验证其品质与可行性。',
    '“入江南”是观止东方的首个旗舰样板。它以江南为起点，不将目的地简化为景点集合，而是通过文化叙事、在地资源与沉浸式体验，让旅行者更深入地理解东方生活方式。',
    '我们期待与重视文化深度、审美表达和长期品质的旅行机构、目的地伙伴、酒店及会员社群合作，共同创造面向全球市场的中国文化体验产品。',
  ];
  const enParagraphs = [
    'Beijing Jianshan Guanzhi Culture Co., Ltd. is a content and experience design company rooted in Chinese culture. Operating under the brand name Guanzhi Oriental, we work with travel and cultural partners worldwide on cultural theme and narrative development, experience design, local resource curation, standardised product delivery and co-creation.',
    'Our work goes beyond itinerary planning. We explore how people can meaningfully encounter Chinese culture and living traditions through landscapes, cities, craftsmanship, cuisine and everyday life. We transform cultural content into experience products that can be understood, delivered, refined and sustained over time, with real-world operation serving as an ongoing test of quality.',
    'Into Jiangnan is Guanzhi Oriental’s first flagship initiative. Beginning in Jiangnan, it approaches the destination not as a collection of attractions, but as an entry into an Eastern way of life through narrative, local knowledge and immersive experience.',
    'We welcome collaboration with travel professionals, destination partners, hotels and member communities that value cultural depth, thoughtful aesthetics and long-term quality.',
  ];
  const makeHome = (locale: 'zh-CN' | 'en', paragraphs: string[]) => ({
    ...pageRow,
    locale,
    blocks: { ...validHome, blocks: validHome.blocks.map((block) => block.type === 'about' ? { ...block, paragraphs } : block) },
  });
  const repository = {
    async findPublishedPage(_slug: string, locale: 'zh-CN' | 'en') { return makeHome(locale, locale === 'en' ? enParagraphs : zhParagraphs); },
    async findMediaAssets() { return []; },
    async listSettings() { return []; },
  };
  const app = Fastify();
  await app.register(createContentRoutes(repository), { prefix: '/api/v1' });
  const zh = (await app.inject('/api/v1/content/pages/home?locale=zh-CN')).json().data.blocks.find((block: { type: string }) => block.type === 'about');
  const en = (await app.inject('/api/v1/content/pages/home?locale=en')).json().data.blocks.find((block: { type: string }) => block.type === 'about');
  assert.deepEqual(zh.paragraphs, zhParagraphs);
  assert.deepEqual(en.paragraphs, enParagraphs);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, data: { blocks: makeHome('zh-CN', zhParagraphs).blocks.blocks } }), { status: 200, headers: { 'content-type': 'application/json' } });
  try {
    const home = await loadHomeContentOrFallback(new AbortController().signal);
    assert.deepEqual(home.about.paragraphs, zhParagraphs);
  } finally {
    globalThis.fetch = originalFetch;
    await app.close();
  }
});
