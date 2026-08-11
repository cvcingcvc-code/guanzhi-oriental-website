import { hash } from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { db, closeDatabase } from '../db/client.js';
import { pages, pageTranslations, siteSettings, users } from '../db/schema.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 12) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) are required for seed');

try {
  let [admin] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
  if (!admin) {
    [admin] = await db.insert(users).values({ email, passwordHash: await hash(password, 12), displayName: '网站管理员', role: 'ADMIN' }).returning();
    console.log(`Created admin: ${email}`);
  }
  if (!admin) throw new Error('Unable to create admin');

  const content = [
    {
      slug: 'home',
      zh: { title: '观止东方', seoTitle: '观止东方｜东方文化深度体验产品研发与供应', seoDescription: '把东方文化，转化为可以进入的旅行体验。', blocks: [{ type: 'hero', heading: '把东方文化，转化为可以进入的旅行体验。', subheading: '为旅行社、酒店、会员机构与目的地提供文化深度体验产品研发、内容授权、联合出品与交付支持。' }] },
      en: { title: 'Guanzhi Oriental', seoTitle: 'Guanzhi Oriental | Cultural Experience Design', seoDescription: 'Turning Chinese culture into travel experiences people can enter, understand and remember.', blocks: [{ type: 'hero', heading: 'Turning Chinese culture into travel experiences people can enter, understand and remember.' }] },
    },
    {
      slug: 'about',
      zh: { title: '关于观止东方', blocks: [{ type: 'prose', paragraphs: ['北京见山观止文化有限公司是一家以中国文化为核心的内容与体验设计公司。我们以“观止东方”为对外品牌，面向全球旅行及文化合作伙伴，开展文化主题与叙事研发、体验产品设计、在地资源整合、产品标准化交付与联合出品。', '“入江南”是观止东方的首个旗舰样板。'] }] },
      en: { title: 'About Guanzhi Oriental', blocks: [{ type: 'prose', paragraphs: ['Beijing Jianshan Guanzhi Culture Co., Ltd. is a content and experience design company rooted in Chinese culture.', 'Into Jiangnan is Guanzhi Oriental’s first flagship initiative.'] }] },
    },
    {
      slug: 'brand-story',
      zh: { title: '在抵达之前，先学会看见', blocks: [{ type: 'prose', paragraphs: ['这是一个不断加快抵达的时代。', '观止东方不把文化当作行程中的装饰，也不把目的地简化为景点、酒店与交通的拼接。'] }] },
      en: { title: 'Before Arrival, Learn to See', blocks: [{ type: 'prose', paragraphs: ['We live in an age of ever-accelerating arrival.', 'Guanzhi Oriental does not treat culture as decoration within an itinerary.'] }] },
    },
    {
      slug: 'into-jiangnan',
      zh: { title: '入江南', blocks: [{ type: 'lead', text: '不是一条景点线路，而是一套进入中国审美与生活方式的文化体验产品。' }] },
      en: { title: 'Into Jiangnan', blocks: [{ type: 'lead', text: 'A pathway into Chinese aesthetics and ways of life, rather than a checklist of attractions.' }] },
    },
  ];

  for (const item of content) {
    let [page] = await db.select().from(pages).where(eq(pages.slug, item.slug)).limit(1);
    if (!page) [page] = await db.insert(pages).values({ slug: item.slug, status: 'PUBLISHED', publishedAt: new Date(), createdBy: admin.id, updatedBy: admin.id }).returning();
    if (!page) continue;
    for (const [locale, translation] of [['zh-CN', item.zh], ['en', item.en]] as const) {
      await db.insert(pageTranslations).values({ pageId: page.id, locale, title: translation.title, seoTitle: 'seoTitle' in translation ? translation.seoTitle : undefined, seoDescription: 'seoDescription' in translation ? translation.seoDescription : undefined, blocks: translation.blocks }).onConflictDoNothing();
    }
  }

  const settings = {
    'company.legalName': { zh: '北京见山观止文化有限公司', en: 'Beijing Jianshan Guanzhi Culture Co., Ltd.' },
    'brand.name': { zh: '观止东方', en: 'Guanzhi Oriental' },
    'contact.email': 'hello@guanzhidongfang.com',
    'site.locales': ['zh-CN', 'en'],
  };
  for (const [key, value] of Object.entries(settings)) await db.insert(siteSettings).values({ key, value, updatedBy: admin.id }).onConflictDoNothing();
  console.log('Seed data is ready.');
} finally {
  await closeDatabase();
}
