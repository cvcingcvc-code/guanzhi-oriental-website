import { hash } from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { db, closeDatabase } from '../db/client.js';
import { pages, pageTranslations, siteSettings, users } from '../db/schema.js';
import { contentDocumentSchema, homeContentDocumentSchema, type ContentDocument, type MediaReference } from '../content/contract.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const seedMode = process.env.SEED_CONTENT_MODE === 'refresh' ? 'refresh' : 'bootstrap';

if (!email || !password || password.length < 12) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) are required for seed');
if (process.env.NODE_ENV === 'production' && seedMode === 'refresh') {
  throw new Error('SEED_CONTENT_MODE=refresh is forbidden in production; use a reviewed data migration instead');
}

const media = (fallbackUrl: string, altZh: string, options: { altEn?: string; mimeType?: string; poster?: MediaReference } = {}): MediaReference => ({
  fallbackUrl,
  alt: { 'zh-CN': altZh, ...(options.altEn ? { en: options.altEn } : {}) },
  ...(options.mimeType ? { mimeType: options.mimeType } : {}),
  ...(options.poster ? { poster: options.poster } : {}),
});

const homeZh = homeContentDocumentSchema.parse({
  version: 1,
  blocks: [
    {
      type: 'hero', enabled: true, order: 10, contentStatus: 'approved',
      eyebrow: '东方文化深度体验产品研发与供应机构',
      headingLines: ['把东方文化，', '转化为可以进入的', '旅行体验。'], emphasisLine: 2,
      description: 'Turning Chinese culture into travel experiences people can enter, understand and remember.',
      primaryCta: { label: '了解核心能力', action: 'scroll', target: 'solutions' },
      secondaryCta: { label: '发起合作咨询', action: 'inquiry', target: 'inquiry' },
      media: media('/videos/hero-loop.mp4', '东方文化旅行体验影像', {
        altEn: 'A film about immersive Chinese cultural travel experiences',
        mimeType: 'video/mp4',
        poster: media('/images/Gemini_Generated_Image_stds6ostds6ostds (1).png', '江南园林与文化体验场景', { altEn: 'A Jiangnan garden cultural experience scene', mimeType: 'image/png' }),
      }),
      meta: { brandCode: 'Guanzhi Oriental', locationAndYear: '2026' },
    },
    {
      type: 'about', enabled: true, order: 20, contentStatus: 'approved',
      lead: '观止东方 Guanzhi Oriental',
      headingLines: ['以中国文化为核心的', '内容与体验设计公司'],
      paragraphs: [
        '北京见山观止文化有限公司是一家以中国文化为核心的内容与体验设计公司。我们以“观止东方”为对外品牌，面向全球旅行及文化合作伙伴，开展文化主题与叙事研发、体验产品设计、在地资源整合、产品标准化交付与联合出品。',
        '我们关注的不只是一次行程的安排，而是如何让人真正进入中国文化与真实生活：在山水、城市、技艺、饮食与日常之中，获得有节奏、有留白、可感知的深度体验。我们将文化内容转化为能够被理解、被交付、被持续迭代的体验产品，并通过实际运营不断验证其品质与可行性。',
        '“入江南”是观止东方的首个旗舰样板。它以江南为起点，不将目的地简化为景点集合，而是通过文化叙事、在地资源与沉浸式体验，让旅行者更深入地理解东方生活方式。',
        '我们期待与重视文化深度、审美表达和长期品质的旅行机构、目的地伙伴、酒店及会员社群合作，共同创造面向全球市场的中国文化体验产品。',
      ],
      statement: { value: '入江南', text: 'Into Jiangnan\n首个旗舰样板' },
    },
    {
      type: 'capabilities', enabled: true, order: 30, contentStatus: 'approved',
      headingLines: ['从文化母题', '到可交付产品'],
      intro: '研究不是终点。我们把内容、流程、人员与标准组织成可复用的产品系统。',
      items: [
        { id: 'cultural-product-rd', enabled: true, order: 10, number: '01', title: '文化产品研发', description: '从文化母题、叙事系统到体验流程，形成可被理解、参与与记住的完整产品。' },
        { id: 'standard-experience-modules', enabled: true, order: 20, number: '02', title: '标准体验模块', description: '提供 90 分钟、半日、一日与多日主题模块，适配不同渠道、场景与客群。' },
        { id: 'international-cultural-translation', enabled: true, order: 30, number: '03', title: '国际化文化转译', description: '以多语言内容、认知入口与讲解体系，降低跨文化理解门槛。' },
        { id: 'delivery-and-training', enabled: true, order: 40, number: '04', title: '交付与培训', description: '通过产品手册、人员培训、交付 SOP 与质量评估，让体验稳定落地。' },
      ],
    },
    {
      type: 'motifs', enabled: true, order: 40, contentStatus: 'approved',
      headingLines: ['正在生长的', '文化体验母题'],
      intro: '不虚构成熟案例。以下方向正在研究、验证与联合开发中。',
      items: [
        { id: 'garden', enabled: true, order: 10, title: '园林', titleEn: 'GARDEN', description: '如何走进一首中国式的诗', status: '合作开发中', media: media('/images/Gemini_Generated_Image_stds6ostds6ostds (1).png', '园林文化体验研发方向', { altEn: 'Garden cultural experience research', mimeType: 'image/png' }) },
        { id: 'library', enabled: true, order: 20, title: '藏书楼', titleEn: 'LIBRARY', description: '文人如何保存知识与精神世界', status: '重点研发方向', media: media('/images/Gemini_Generated_Image_stds6ostds6ostds (4).png', '藏书楼文化体验研发方向', { altEn: 'Library cultural experience research', mimeType: 'image/png' }) },
        { id: 'tea-and-silk', enabled: true, order: 30, title: '茶与丝绸', titleEn: 'TEA & SILK', description: '江南日常生活中的时间和手艺', status: '合作开发中', media: media('/images/Gemini_Generated_Image_stds6ostds6ostds (5).png', '茶与丝绸文化体验研发方向', { altEn: 'Tea and silk cultural experience research', mimeType: 'image/png' }) },
        { id: 'kunqu', enabled: true, order: 40, title: '昆曲', titleEn: 'KUNQU', description: '如何听懂中国古典戏剧的一段声音', status: '重点研发方向', media: media('/images/Gemini_Generated_Image_stds6ostds6ostds (6).png', '昆曲文化体验研发方向', { altEn: 'Kunqu cultural experience research', mimeType: 'image/png' }) },
      ],
    },
    {
      type: 'jiangnan', enabled: true, order: 50, contentStatus: 'approved',
      headingLines: ['不是一条景点线路，', '而是一套进入中国审美', '与生活方式的文化体验。'],
      description: '从园林、藏书、昆曲、饮食与日常生活进入江南。为海外游客与国内高知客群建立一条理解中国文化的安静入口。',
      cta: { label: '共同研发「入江南」', action: 'scroll', target: 'contact' },
      media: media('/images/Gemini_Generated_Image_stds6ostds6ostds (7).png', '雾色江南水乡与舟船', { altEn: 'A misty Jiangnan water town and boat', mimeType: 'image/png' }),
    },
    {
      type: 'partners', enabled: true, order: 60, contentStatus: 'approved',
      heading: '为需要文化深度与稳定交付的机构服务',
      items: [
        { id: 'inbound-dmc', enabled: true, order: 10, title: '入境旅行社及 DMC', media: media('/images/partners/partner-01.png', '旅行策划团队围绕地图共同研究江南文化路线', { altEn: 'Travel planners studying a Jiangnan cultural route around a map', mimeType: 'image/png' }) },
        { id: 'bespoke-travel', enabled: true, order: 20, title: '高端定制机构', media: media('/images/partners/partner-02.png', '文化主理人在江南园林中准备高端定制体验', { altEn: 'A cultural host preparing a bespoke experience in a Jiangnan garden', mimeType: 'image/png' }) },
        { id: 'hospitality', enabled: true, order: 30, title: '酒店和度假品牌', media: media('/images/partners/partner-03.png', '酒店庭院中的东方文化欢迎体验场景', { altEn: 'A Chinese cultural welcome experience in a hotel courtyard', mimeType: 'image/png' }) },
        { id: 'membership', enabled: true, order: 40, title: '银行、企业及会员机构', media: media('/images/partners/partner-04.png', '会员客户参加小型东方文化艺术沙龙', { altEn: 'Members attending an intimate Chinese culture and arts salon', mimeType: 'image/png' }) },
        { id: 'destination', enabled: true, order: 50, title: '目的地与文旅机构', media: media('/images/partners/partner-05.png', '文旅团队围绕建筑模型规划目的地文化产品', { altEn: 'A destination team planning a cultural product around an architectural model', mimeType: 'image/png' }) },
        { id: 'overseas-education', enabled: true, order: 60, title: '海外旅行社及文化教育机构', media: media('/images/partners/partner-06.png', '国际访客在中式藏书空间参加文化工作坊', { altEn: 'International visitors joining a cultural workshop in a Chinese library setting', mimeType: 'image/png' }) },
      ],
    },
    {
      type: 'contact', enabled: true, order: 70, contentStatus: 'approved',
      kicker: '委托研发 · 联合出品 · 内容授权 · 白标产品 · 培训与交付',
      headingLines: ['让文化不止被看见，', '而是真正被进入。'],
      cta: { label: '谈谈您的项目', action: 'inquiry', target: 'inquiry' },
    },
  ],
});

// About 段落为甲方正式英文稿；其余英文首页内容为可替换的 draft，等待甲方确认。
const officialAboutEn = [
  'Beijing Jianshan Guanzhi Culture Co., Ltd. is a content and experience design company rooted in Chinese culture. Operating under the brand name Guanzhi Oriental, we work with travel and cultural partners worldwide on cultural theme and narrative development, experience design, local resource curation, standardised product delivery and co-creation.',
  'Our work goes beyond itinerary planning. We explore how people can meaningfully encounter Chinese culture and living traditions through landscapes, cities, craftsmanship, cuisine and everyday life. We transform cultural content into experience products that can be understood, delivered, refined and sustained over time, with real-world operation serving as an ongoing test of quality.',
  'Into Jiangnan is Guanzhi Oriental’s first flagship initiative. Beginning in Jiangnan, it approaches the destination not as a collection of attractions, but as an entry into an Eastern way of life through narrative, local knowledge and immersive experience.',
  'We welcome collaboration with travel professionals, destination partners, hotels and member communities that value cultural depth, thoughtful aesthetics and long-term quality.',
];

const homeEn = homeContentDocumentSchema.parse({
  ...homeZh,
  blocks: homeZh.blocks.map((block) => {
    if (block.type === 'hero') return {
      ...block,
      contentStatus: 'draft' as const,
      eyebrow: 'CULTURAL EXPERIENCE PRODUCT RESEARCH & DELIVERY',
      headingLines: ['Turning Chinese culture into', 'travel experiences people can enter,', 'understand and remember.'],
      description: 'Turning Chinese culture into travel experiences people can enter, understand and remember.',
      primaryCta: { label: 'Explore our capabilities', action: 'scroll', target: 'solutions' },
      secondaryCta: { label: 'Start a partnership', action: 'inquiry', target: 'inquiry' },
    };
    if (block.type === 'about') return {
      ...block,
      contentStatus: 'approved' as const,
      lead: 'Guanzhi Oriental',
      headingLines: ['A content and experience design company', 'rooted in Chinese culture'],
      paragraphs: officialAboutEn,
      statement: { value: 'Into Jiangnan', text: 'First flagship initiative' },
    };
    if (block.type === 'capabilities') return {
      ...block,
      contentStatus: 'draft' as const,
      headingLines: ['From cultural themes', 'to deliverable products'],
      intro: 'Research is not the endpoint. We organize content, processes, people and standards into reusable product systems.',
      items: [
        { id: 'cultural-product-rd', enabled: true, order: 10, number: '01', title: 'Cultural Product Development', description: 'From cultural themes and narrative systems to experience flows, we develop complete products that people can understand, participate in and remember.' },
        { id: 'standard-experience-modules', enabled: true, order: 20, number: '02', title: 'Standard Experience Modules', description: 'We provide 90-minute, half-day, full-day and multi-day thematic modules for different channels, settings and audiences.' },
        { id: 'international-cultural-translation', enabled: true, order: 30, number: '03', title: 'Cross-cultural Interpretation', description: 'Multilingual content, clear points of entry and interpretation systems reduce barriers to cross-cultural understanding.' },
        { id: 'delivery-and-training', enabled: true, order: 40, number: '04', title: 'Delivery and Training', description: 'Product manuals, team training, delivery SOPs and quality assessment help each experience land consistently.' },
      ],
    };
    if (block.type === 'motifs') return {
      ...block,
      contentStatus: 'draft' as const,
      headingLines: ['Cultural experience themes', 'taking shape'],
      intro: 'These are directions under research, validation and co-development—not completed case studies.',
      items: [
        { ...block.items[0]!, title: 'Garden', description: 'How to step into a Chinese poem', status: 'Open for co-development' },
        { ...block.items[1]!, title: 'Library', description: 'How Chinese scholars preserved knowledge and the world of the mind', status: 'Priority research direction' },
        { ...block.items[2]!, title: 'Tea and Silk', description: 'Time and craftsmanship in everyday Jiangnan life', status: 'Open for co-development' },
        { ...block.items[3]!, title: 'Kunqu', description: 'How to listen to a passage of classical Chinese theatre', status: 'Priority research direction' },
      ],
    };
    if (block.type === 'jiangnan') return {
      ...block,
      contentStatus: 'draft' as const,
      headingLines: ['Not a checklist of attractions,', 'but a cultural experience that opens', 'into Chinese aesthetics and ways of life.'],
      description: 'Enter Jiangnan through gardens, libraries, Kunqu, cuisine and everyday life—a quiet pathway into Chinese culture for international visitors and culturally curious travellers.',
      cta: { label: 'Co-develop Into Jiangnan', action: 'scroll' as const, target: 'contact' },
    };
    if (block.type === 'partners') return {
      ...block,
      contentStatus: 'draft' as const,
      heading: 'For organizations that value cultural depth and reliable delivery',
      items: [
        { ...block.items[0]!, title: 'Inbound Travel Agencies and DMCs' },
        { ...block.items[1]!, title: 'Bespoke Travel Specialists' },
        { ...block.items[2]!, title: 'Hotels and Resort Brands' },
        { ...block.items[3]!, title: 'Banks, Companies and Member Communities' },
        { ...block.items[4]!, title: 'Destinations and Cultural Tourism Organizations' },
        { ...block.items[5]!, title: 'Overseas Travel and Cultural Education Partners' },
      ],
    };
    if (block.type === 'contact') return {
      ...block,
      contentStatus: 'draft' as const,
      kicker: 'COMMISSIONED R&D · CO-PRODUCTION · CONTENT LICENSING · WHITE LABEL · TRAINING & DELIVERY',
      headingLines: ['Let culture be more than seen.', 'Let it be entered.'],
      cta: { label: 'Discuss your project', action: 'inquiry' as const, target: 'inquiry' },
    };
    throw new Error(`Missing explicit English homepage mapping for block: ${block.type}`);
  }),
});

const prose = (paragraphs: string[]): ContentDocument => contentDocumentSchema.parse({
  version: 1,
  blocks: [{ type: 'prose', enabled: true, order: 10, contentStatus: 'approved', paragraphs }],
});
const lead = (text: string): ContentDocument => contentDocumentSchema.parse({
  version: 1,
  blocks: [{ type: 'lead', enabled: true, order: 10, contentStatus: 'approved', text }],
});

const content = [
  {
    slug: 'home',
    zh: { title: '观止东方', seoTitle: '观止东方｜东方文化深度体验产品研发与供应', seoDescription: '把东方文化，转化为可以进入的旅行体验。', blocks: homeZh },
    en: { title: 'Guanzhi Oriental', seoTitle: 'Guanzhi Oriental | Cultural Experience Design', seoDescription: 'Turning Chinese culture into travel experiences people can enter, understand and remember.', blocks: homeEn },
  },
  {
    slug: 'about',
    zh: { title: '关于观止东方', blocks: prose(homeZh.blocks.find((block) => block.type === 'about')!.paragraphs) },
    en: { title: 'About Guanzhi Oriental', blocks: prose(officialAboutEn) },
  },
  {
    slug: 'brand-story',
    zh: { title: '在抵达之前，先学会看见', blocks: prose(['这是一个不断加快抵达的时代。', '观止东方不把文化当作行程中的装饰，也不把目的地简化为景点、酒店与交通的拼接。']) },
    en: { title: 'Before Arrival, Learn to See', blocks: prose(['We live in an age of ever-accelerating arrival.', 'Guanzhi Oriental does not treat culture as decoration within an itinerary.']) },
  },
  {
    slug: 'into-jiangnan',
    zh: { title: '入江南', blocks: lead('不是一条景点线路，而是一套进入中国审美与生活方式的文化体验。') },
    en: { title: 'Into Jiangnan', blocks: lead('A pathway into Chinese aesthetics and ways of life, rather than a checklist of attractions.') },
  },
] as const;

try {
  let [admin] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
  if (!admin) {
    [admin] = await db.insert(users).values({ email, passwordHash: await hash(password, 12), displayName: '网站管理员', role: 'ADMIN' }).returning();
    console.log(`Created admin: ${email}`);
  }
  if (!admin) throw new Error('Unable to create admin');

  for (const item of content) {
    let [page] = await db.select().from(pages).where(eq(pages.slug, item.slug)).limit(1);
    if (!page) {
      [page] = await db.insert(pages).values({ slug: item.slug, status: 'PUBLISHED', publishedAt: new Date(), createdBy: admin.id, updatedBy: admin.id }).returning();
    } else if (seedMode === 'refresh') {
      [page] = await db.update(pages).set({ status: 'PUBLISHED', publishedAt: page.publishedAt ?? new Date(), updatedBy: admin.id }).where(eq(pages.id, page.id)).returning();
    }
    if (!page) continue;
    for (const [locale, translation] of [['zh-CN', item.zh], ['en', item.en]] as const) {
      const values = {
        pageId: page.id,
        locale,
        title: translation.title,
        seoTitle: 'seoTitle' in translation ? translation.seoTitle : undefined,
        seoDescription: 'seoDescription' in translation ? translation.seoDescription : undefined,
        blocks: translation.blocks,
      };
      const query = db.insert(pageTranslations).values(values);
      if (seedMode === 'refresh') {
        await query.onConflictDoUpdate({
          target: [pageTranslations.pageId, pageTranslations.locale],
          set: { title: values.title, seoTitle: values.seoTitle, seoDescription: values.seoDescription, blocks: values.blocks },
        });
      } else {
        await query.onConflictDoNothing();
      }
    }
  }

  const settings = {
    'brand.name': { 'zh-CN': '观止东方', en: 'Guanzhi Oriental' },
    'company.legalName': { 'zh-CN': '北京见山观止文化有限公司', en: 'Beijing Jianshan Guanzhi Culture Co., Ltd.' },
    'flagship.name': { 'zh-CN': '入江南', en: 'Into Jiangnan' },
    'contact.email': 'hello@guanzhidongfang.com',
    'site.locales': ['zh-CN', 'en'],
  };
  for (const [key, value] of Object.entries(settings)) {
    const query = db.insert(siteSettings).values({ key, value, updatedBy: admin.id });
    if (seedMode === 'refresh') {
      await query.onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedBy: admin.id } });
    } else {
      await query.onConflictDoNothing();
    }
  }
  console.log(`Seed data is ready (${seedMode} mode).`);
} finally {
  await closeDatabase();
}
