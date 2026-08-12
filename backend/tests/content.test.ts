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
const {
  FALLBACK_HOME_ZH,
  FALLBACK_SETTINGS,
  isPublicSiteSettings,
  loadHomeContent,
  loadHomeContentOrFallback,
  loadSiteSettingsOrFallback,
  parseHomeContent,
  switchHomeLocale,
} = await import('../../src/content/public-content.ts');

const pageId = '00000000-0000-4000-8000-000000000001';
const assetId = '00000000-0000-4000-8000-000000000010';
const missingAssetId = '00000000-0000-4000-8000-000000000099';

const officialAboutZh = [
  '北京见山观止文化有限公司是一家以中国文化为核心的内容与体验设计公司。我们以“观止东方”为对外品牌，面向全球旅行及文化合作伙伴，开展文化主题与叙事研发、体验产品设计、在地资源整合、产品标准化交付与联合出品。',
  '我们关注的不只是一次行程的安排，而是如何让人真正进入中国文化与真实生活：在山水、城市、技艺、饮食与日常之中，获得有节奏、有留白、可感知的深度体验。我们将文化内容转化为能够被理解、被交付、被持续迭代的体验产品，并通过实际运营不断验证其品质与可行性。',
  '“入江南”是观止东方的首个旗舰样板。它以江南为起点，不将目的地简化为景点集合，而是通过文化叙事、在地资源与沉浸式体验，让旅行者更深入地理解东方生活方式。',
  '我们期待与重视文化深度、审美表达和长期品质的旅行机构、目的地伙伴、酒店及会员社群合作，共同创造面向全球市场的中国文化体验产品。',
];

const officialAboutEn = [
  'Beijing Jianshan Guanzhi Culture Co., Ltd. is a content and experience design company rooted in Chinese culture. Operating under the brand name Guanzhi Oriental, we work with travel and cultural partners worldwide on cultural theme and narrative development, experience design, local resource curation, standardised product delivery and co-creation.',
  'Our work goes beyond itinerary planning. We explore how people can meaningfully encounter Chinese culture and living traditions through landscapes, cities, craftsmanship, cuisine and everyday life. We transform cultural content into experience products that can be understood, delivered, refined and sustained over time, with real-world operation serving as an ongoing test of quality.',
  'Into Jiangnan is Guanzhi Oriental’s first flagship initiative. Beginning in Jiangnan, it approaches the destination not as a collection of attractions, but as an entry into an Eastern way of life through narrative, local knowledge and immersive experience.',
  'We welcome collaboration with travel professionals, destination partners, hotels and member communities that value cultural depth, thoughtful aesthetics and long-term quality.',
];

function media(fallbackUrl = '/images/example.png') {
  return {
    fallbackUrl,
    alt: { 'zh-CN': '示例图片', en: 'Example image' },
    mimeType: 'image/png',
  };
}

const homeZh = {
  version: 1,
  blocks: [
    {
      type: 'hero', enabled: true, order: 10, contentStatus: 'approved', eyebrow: '品牌定位',
      headingLines: ['把东方文化', '转化为旅行体验'], emphasisLine: 1,
      description: 'Turning Chinese culture into meaningful travel experiences.',
      primaryCta: { label: '了解能力', action: 'scroll', target: 'solutions' },
      secondaryCta: { label: '合作咨询', action: 'inquiry', target: 'inquiry' },
      media: { ...media('/videos/hero-loop.mp4'), mimeType: 'video/mp4', poster: media('/images/poster.png') },
    },
    {
      type: 'about', enabled: true, order: 20, contentStatus: 'approved', lead: '观止东方 Guanzhi Oriental',
      headingLines: ['以中国文化为核心的', '内容与体验设计公司'], paragraphs: officialAboutZh,
    },
    {
      type: 'capabilities', enabled: true, order: 30, contentStatus: 'approved', headingLines: ['从文化母题', '到可交付产品'], intro: '研究不是终点。',
      items: [
        { id: 'second', enabled: true, order: 20, number: '02', title: '标准体验模块', description: '形成可复用模块。' },
        { id: 'first', enabled: true, order: 10, number: '01', title: '文化产品研发', description: '形成完整产品。' },
      ],
    },
    {
      type: 'motifs', enabled: true, order: 40, contentStatus: 'approved', headingLines: ['文化体验母题'], intro: '研发与联合开发中。',
      items: [
        { id: 'garden', enabled: true, order: 10, title: '园林', titleEn: 'GARDEN', description: '走进一首诗', status: '合作开发中', media: media() },
        { id: 'hidden-motif', enabled: true, order: 20, title: '隐藏母题', titleEn: 'HIDDEN', description: '用于过滤测试', status: '草稿', media: media('/images/hidden.png') },
      ],
    },
    {
      type: 'jiangnan', enabled: true, order: 50, contentStatus: 'approved', headingLines: ['进入中国审美与生活方式'],
      description: '从园林、藏书、昆曲、饮食与日常生活进入江南。',
      cta: { label: '共同研发入江南', action: 'scroll', target: 'contact' }, media: media('/images/jiangnan.png'),
    },
    {
      type: 'partners', enabled: true, order: 60, contentStatus: 'approved', heading: '为合作伙伴服务',
      items: [
        { id: 'travel', enabled: true, order: 10, title: '旅行机构', description: '共同开发', media: media('/images/partner.png') },
        { id: 'hidden-partner', enabled: true, order: 20, title: '隐藏伙伴', media: media('/images/hidden-partner.png') },
      ],
    },
    {
      type: 'contact', enabled: true, order: 70, contentStatus: 'approved', kicker: '联合出品 · 内容授权',
      headingLines: ['让文化真正被进入'], description: '欢迎共同创造文化体验产品。',
      cta: { label: '谈谈您的项目', action: 'inquiry', target: 'inquiry' },
      location: '不应公开的旧所在地', locationEn: 'Deprecated location', email: 'legacy@example.com',
      organizationDisplayName: '不应重复的旧主体', copyrightYear: 2024,
    },
  ],
};

function makeHome(locale: 'zh-CN' | 'en') {
  const document = structuredClone(homeZh);
  if (locale === 'en') {
    for (const block of document.blocks) block.contentStatus = block.type === 'about' ? 'approved' : 'draft';
    const hero = document.blocks.find((block) => block.type === 'hero');
    if (hero?.type === 'hero') hero.headingLines = ['Turning Chinese culture', 'into travel experiences'];
    const about = document.blocks.find((block) => block.type === 'about');
    if (about?.type === 'about') {
      about.lead = 'Guanzhi Oriental';
      about.paragraphs = officialAboutEn;
    }
  }
  return document;
}

function pageRow(locale: 'zh-CN' | 'en', blocks: unknown = makeHome(locale)) {
  return {
    id: pageId,
    slug: 'home',
    locale,
    publishedAt: new Date('2026-08-12T00:00:00.000Z'),
    title: locale === 'en' ? 'Guanzhi Oriental' : '观止东方',
    seoTitle: locale === 'en' ? 'Guanzhi Oriental | Cultural Experience Design' : '观止东方｜文化体验设计',
    seoDescription: locale === 'en' ? 'Cultural experience design.' : '中国文化体验设计。',
    blocks,
  };
}

function publicPage(locale: 'zh-CN' | 'en') {
  const document = homeContentDocumentSchema.parse(makeHome(locale));
  return buildPublicContentPage(pageRow(locale, document), document, [], (key: string) => `/uploads/${key}`);
}

test('homepage contract accepts exactly one of every typed block', () => {
  const parsed = homeContentDocumentSchema.parse(homeZh);
  assert.deepEqual(parsed.blocks.map((block: { type: string }) => block.type), [
    'hero', 'about', 'capabilities', 'motifs', 'jiangnan', 'partners', 'contact',
  ]);
  assert.ok(parsed.blocks.every((block: { contentStatus: string }) => block.contentStatus === 'approved'));
});

test('homepage contract rejects missing, duplicate, extra valid, raw HTML and unsafe CTA blocks', () => {
  assert.throws(() => parseContentDocument('home', { ...homeZh, blocks: homeZh.blocks.slice(0, 6) }));
  assert.throws(() => parseContentDocument('home', { ...homeZh, blocks: [...homeZh.blocks.slice(0, 6), homeZh.blocks[0]] }));
  assert.throws(() => parseContentDocument('home', {
    ...homeZh,
    blocks: [...homeZh.blocks, { type: 'prose', enabled: true, order: 80, contentStatus: 'approved', paragraphs: ['extra'] }],
  }));
  assert.throws(() => parseContentDocument('home', { version: 1, blocks: [{ type: 'raw-html', enabled: true, order: 10, html: '<script />' }] }));

  const unsafe = structuredClone(homeZh);
  const hero = unsafe.blocks.find((block) => block.type === 'hero');
  if (hero?.type === 'hero') hero.primaryCta = { label: '危险链接', action: 'link', target: 'javascript:alert(1)' };
  assert.throws(() => homeContentDocumentSchema.parse(unsafe));

  const reordered = structuredClone(homeZh);
  const about = reordered.blocks.find((block) => block.type === 'about');
  const capabilities = reordered.blocks.find((block) => block.type === 'capabilities');
  if (about) about.order = 30;
  if (capabilities) capabilities.order = 20;
  assert.throws(() => homeContentDocumentSchema.parse(reordered), /视觉区块顺序/);

  const allDisabled = structuredClone(homeZh);
  for (const block of allDisabled.blocks) block.enabled = false;
  assert.throws(() => homeContentDocumentSchema.parse(allDisabled), /至少启用一个/);

  const hiddenHero = structuredClone(homeZh);
  const requiredHero = hiddenHero.blocks.find((block) => block.type === 'hero');
  if (!requiredHero) throw new Error('hero fixture missing');
  requiredHero.enabled = false;
  assert.throws(() => homeContentDocumentSchema.parse(hiddenHero), /Hero 必须启用/);
});

test('Public DTO sorts blocks and items, filters disabled content, and strips Contact identity fields', () => {
  const input = structuredClone(homeZh);
  input.blocks.reverse();
  const capabilities = input.blocks.find((block) => block.type === 'capabilities');
  if (capabilities?.type === 'capabilities') capabilities.items[1]!.enabled = false;
  const motifs = input.blocks.find((block) => block.type === 'motifs');
  if (motifs?.type === 'motifs') motifs.items[1]!.enabled = false;
  const partners = input.blocks.find((block) => block.type === 'partners');
  if (partners?.type === 'partners') partners.items[1]!.enabled = false;

  const document = homeContentDocumentSchema.parse(input);
  const dto = buildPublicContentPage(pageRow('zh-CN', document), document, [], (key: string) => `/uploads/${key}`);
  assert.deepEqual(dto.blocks.map((block) => block.type), ['hero', 'about', 'capabilities', 'motifs', 'jiangnan', 'partners', 'contact']);

  const capabilityDto = dto.blocks.find((block) => block.type === 'capabilities');
  const motifsDto = dto.blocks.find((block) => block.type === 'motifs');
  const partnersDto = dto.blocks.find((block) => block.type === 'partners');
  const contactDto = dto.blocks.find((block) => block.type === 'contact');
  assert.deepEqual(capabilityDto?.items.map((item) => item.id), ['second']);
  assert.deepEqual(motifsDto?.items.map((item) => item.id), ['garden']);
  assert.deepEqual(partnersDto?.items.map((item) => item.id), ['travel']);
  assert.ok(contactDto);
  for (const privateKey of ['location', 'locationEn', 'email', 'organizationDisplayName', 'copyrightYear']) {
    assert.equal(privateKey in contactDto, false);
  }

  const blockFiltered = structuredClone(homeZh);
  const contact = blockFiltered.blocks.find((block) => block.type === 'contact');
  if (contact) contact.enabled = false;
  const filteredDocument = homeContentDocumentSchema.parse(blockFiltered);
  const filteredDto = buildPublicContentPage(pageRow('zh-CN', filteredDocument), filteredDocument, [], (key: string) => `/uploads/${key}`);
  assert.equal(filteredDto.blocks.some((block) => block.type === 'contact'), false);
  const parsedFiltered = parseHomeContent(filteredDto, 'zh-CN');
  assert.equal(parsedFiltered.blocks.length, 6);
  assert.equal(parsedFiltered.contact, undefined);
  assert.throws(() => parseHomeContent({ ...filteredDto, blocks: [] }, 'zh-CN'), /Invalid homepage blocks/);
});

test('MediaReference uses an active asset before fallback and exposes only resolved public metadata', () => {
  const input = structuredClone(homeZh);
  const motifs = input.blocks.find((block) => block.type === 'motifs');
  if (motifs?.type === 'motifs') {
    motifs.items[0]!.media = {
      assetId,
      fallbackUrl: '/images/old-fallback.png',
      alt: { 'zh-CN': '内容中文替代文本', en: 'Content English alt' },
      mimeType: 'image/png',
      width: 10,
      height: 20,
    };
  }
  const document = homeContentDocumentSchema.parse(input);
  const dto = buildPublicContentPage(pageRow('en', document), document, [{
    id: assetId,
    storageKey: '2026-08/safe-key.webp',
    mimeType: 'image/webp',
    width: 1600,
    height: 900,
    altZh: '数据库中文替代文本',
    altEn: 'Database English alt',
  }], (key: string) => `https://media.example.test/${key}`);
  const motifsDto = dto.blocks.find((block) => block.type === 'motifs');
  const resolved = motifsDto?.items[0]?.media;
  assert.deepEqual(resolved, {
    assetId,
    url: 'https://media.example.test/2026-08/safe-key.webp',
    alt: 'Database English alt',
    mimeType: 'image/webp',
    width: 1600,
    height: 900,
  });
  assert.equal(JSON.stringify(dto).includes('storageKey'), false);
  assert.equal(JSON.stringify(dto).includes('old-fallback'), false);
});

test('missing/deleted assets use fallback, while invalid IDs and missing fallback are rejected', () => {
  const withFallback = structuredClone(homeZh);
  const hero = withFallback.blocks.find((block) => block.type === 'hero');
  if (hero?.type === 'hero') hero.media = { ...hero.media, assetId: missingAssetId };
  const document = homeContentDocumentSchema.parse(withFallback);
  const dto = buildPublicContentPage(pageRow('zh-CN', document), document, [], (key: string) => `/uploads/${key}`);
  const heroDto = dto.blocks.find((block) => block.type === 'hero');
  assert.equal(heroDto?.media.url, '/videos/hero-loop.mp4');
  assert.equal(heroDto?.media.assetId, undefined);

  const noFallback = structuredClone(homeZh);
  const noFallbackHero = noFallback.blocks.find((block) => block.type === 'hero');
  if (noFallbackHero?.type === 'hero') noFallbackHero.media = { assetId: missingAssetId, alt: { 'zh-CN': '缺失资产' } };
  const missingDocument = homeContentDocumentSchema.parse(noFallback);
  assert.throws(() => buildPublicContentPage(pageRow('zh-CN', missingDocument), missingDocument, [], (key: string) => `/uploads/${key}`), /媒体资产不存在/);

  const invalid = structuredClone(homeZh);
  const invalidHero = invalid.blocks.find((block) => block.type === 'hero');
  if (invalidHero?.type === 'hero') invalidHero.media = { ...invalidHero.media, assetId: 'not-a-uuid' };
  assert.throws(() => homeContentDocumentSchema.parse(invalid));
});

test('Public Settings returns only approved keys, normalizes legacy zh, and leaves location unset', () => {
  const settings = buildPublicSettings([
    { key: 'brand.name', value: { zh: '观止东方', en: 'Guanzhi Oriental' } },
    { key: 'company.legalName', value: { 'zh-CN': '北京见山观止文化有限公司', en: 'Beijing Jianshan Guanzhi Culture Co., Ltd.' } },
    { key: 'flagship.name', value: { 'zh-CN': '入江南', en: 'Into Jiangnan' } },
    { key: 'contact.email', value: 'hello@guanzhidongfang.com' },
    { key: 'site.locales', value: ['zh', 'en'] },
    { key: 'admin.internalSecret', value: 'must-not-leak' },
  ]);
  assert.deepEqual(settings.locales, ['zh-CN', 'en']);
  assert.equal(settings.brand.name?.['zh-CN'], '观止东方');
  assert.equal(settings.company.legalName?.en, 'Beijing Jianshan Guanzhi Culture Co., Ltd.');
  assert.equal(settings.flagship.name?.en, 'Into Jiangnan');
  assert.equal(settings.company.location, undefined);
  assert.equal(JSON.stringify(settings).includes('must-not-leak'), false);
  assert.equal(isPublicSiteSettings({ ...settings, flagship: { name: { 'zh-CN': '入江南', en: 42 } } }), false);
});

test('frontend rejects malformed nested About, Hero, Media and Settings values before render', () => {
  const malformedStatement = structuredClone(publicPage('zh-CN')) as Record<string, unknown> & { blocks: Array<Record<string, unknown>> };
  const about = malformedStatement.blocks.find((block) => block.type === 'about');
  if (about) about.statement = { value: '入江南' };
  assert.throws(() => parseHomeContent(malformedStatement, 'zh-CN'), /Invalid homepage blocks/);

  const malformedHero = structuredClone(publicPage('zh-CN')) as Record<string, unknown> & { blocks: Array<Record<string, unknown>> };
  const hero = malformedHero.blocks.find((block) => block.type === 'hero');
  if (hero) hero.meta = { brandCode: 42, locationAndYear: '2026' };
  assert.throws(() => parseHomeContent(malformedHero, 'zh-CN'), /Invalid homepage blocks/);

  const malformedMedia = structuredClone(publicPage('zh-CN')) as Record<string, unknown> & { blocks: Array<Record<string, unknown>> };
  const motifs = malformedMedia.blocks.find((block) => block.type === 'motifs');
  if (motifs && Array.isArray(motifs.items)) (motifs.items[0] as Record<string, unknown>).media = { url: '/image.png', alt: 'Alt', width: 'wide' };
  assert.throws(() => parseHomeContent(malformedMedia, 'zh-CN'), /Invalid homepage blocks/);
});

test('zh-CN and en homepage APIs return all seven blocks, formal About, and explicit English status', async () => {
  const repository = {
    async findPublishedPage(slug: string, locale: 'zh-CN' | 'en') {
      if (slug === 'missing') return undefined;
      if (slug === 'broken') return { ...pageRow(locale), slug, blocks: { version: 1, blocks: [{ type: 'raw-html' }] } };
      return pageRow(locale);
    },
    async findMediaAssets() { return []; },
    async listSettings() {
      return [
        { key: 'brand.name', value: { 'zh-CN': '观止东方', en: 'Guanzhi Oriental' } },
        { key: 'company.legalName', value: { 'zh-CN': '北京见山观止文化有限公司', en: 'Beijing Jianshan Guanzhi Culture Co., Ltd.' } },
        { key: 'contact.email', value: 'hello@guanzhidongfang.com' },
        { key: 'site.locales', value: ['zh-CN', 'en'] },
        { key: 'private.key', value: 'hidden' },
      ];
    },
  };
  const app = Fastify();
  await app.register(createContentRoutes(repository, (key: string) => `/uploads/${key}`), { prefix: '/api/v1' });

  for (const locale of ['zh-CN', 'en'] as const) {
    const response = await app.inject(`/api/v1/content/pages/home?locale=${locale}`);
    assert.equal(response.statusCode, 200);
    const data = response.json().data;
    assert.equal(data.locale, locale);
    assert.deepEqual(data.blocks.map((block: { type: string }) => block.type), ['hero', 'about', 'capabilities', 'motifs', 'jiangnan', 'partners', 'contact']);
    const about = data.blocks.find((block: { type: string }) => block.type === 'about');
    assert.deepEqual(about.paragraphs, locale === 'en' ? officialAboutEn : officialAboutZh);
    const contact = data.blocks.find((block: { type: string }) => block.type === 'contact');
    assert.equal('email' in contact, false);
    assert.equal('organizationDisplayName' in contact, false);
    if (locale === 'en') {
      assert.equal(about.contentStatus, 'approved');
      assert.deepEqual(
        data.blocks.filter((block: { type: string }) => block.type !== 'about').map((block: { contentStatus: string }) => block.contentStatus),
        ['draft', 'draft', 'draft', 'draft', 'draft', 'draft'],
      );
    }
  }

  const settings = await app.inject('/api/v1/content/settings');
  assert.equal(settings.statusCode, 200);
  assert.equal(settings.json().data.contact.email, 'hello@guanzhidongfang.com');
  assert.equal(JSON.stringify(settings.json()).includes('private.key'), false);
  assert.equal(JSON.stringify(settings.json()).includes('location'), false);
  assert.equal((await app.inject('/api/v1/content/pages/home?locale=zh')).statusCode, 400);
  assert.equal((await app.inject('/api/v1/content/pages/missing?locale=zh-CN')).statusCode, 404);
  assert.equal((await app.inject('/api/v1/content/pages/broken?locale=zh-CN')).statusCode, 500);
  await app.close();
});

test('frontend loads exact locale and switches zh-CN -> en -> zh-CN atomically', async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    const locale = new URL(url, 'http://local.test').searchParams.get('locale') as 'zh-CN' | 'en';
    return new Response(JSON.stringify({ ok: true, data: publicPage(locale) }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const controller = new AbortController();
    const zh = await loadHomeContent('zh-CN', controller.signal);
    const toEn = await switchHomeLocale(zh, 'en', controller.signal);
    assert.equal(toEn.failed, false);
    assert.equal(toEn.content.locale, 'en');
    assert.deepEqual(toEn.content.about.paragraphs, officialAboutEn);
    const toZh = await switchHomeLocale(toEn.content, 'zh-CN', controller.signal);
    assert.equal(toZh.failed, false);
    assert.equal(toZh.content.locale, 'zh-CN');
    assert.deepEqual(calls, [
      '/api/v1/content/pages/home?locale=zh-CN',
      '/api/v1/content/pages/home?locale=en',
      '/api/v1/content/pages/home?locale=zh-CN',
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('frontend rejects locale mismatch and retains the same document when switching fails', async () => {
  const current = parseHomeContent(publicPage('zh-CN'), 'zh-CN');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, data: publicPage('zh-CN') }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
  try {
    await assert.rejects(() => loadHomeContent('en', new AbortController().signal), /locale mismatch/);
  } finally {
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: false }), { status: 503 });
  }
  try {
    const result = await switchHomeLocale(current, 'en', new AbortController().signal);
    assert.equal(result.failed, true);
    assert.strictEqual(result.content, current);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('initial API failures keep the complete Chinese homepage and official Settings fallbacks', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: false }), { status: 503 });
  try {
    const controller = new AbortController();
    const home = await loadHomeContentOrFallback(controller.signal);
    assert.strictEqual(home, FALLBACK_HOME_ZH);
    assert.deepEqual(home.blocks.map((block) => block.type), ['hero', 'about', 'capabilities', 'motifs', 'jiangnan', 'partners', 'contact']);
    assert.deepEqual(home.about.paragraphs, officialAboutZh);
    const settings = await loadSiteSettingsOrFallback(controller.signal);
    assert.strictEqual(settings, FALLBACK_SETTINGS);
    assert.equal(settings.brand.name?.en, 'Guanzhi Oriental');
    assert.equal(settings.company.location, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
