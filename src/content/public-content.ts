export type ContentLocale = 'zh-CN' | 'en';
export type ContentStatus = 'approved' | 'draft';

export type PublicMediaReference = {
  assetId?: string;
  url: string;
  alt: string;
  mimeType?: string;
  width?: number;
  height?: number;
  poster?: PublicMediaReference;
};

export type ContentCta = {
  label: string;
  action: 'scroll' | 'inquiry' | 'link';
  target: string;
};

type BlockBase = { enabled: true; order: number; contentStatus: ContentStatus };
type ItemBase = { id: string; enabled: true; order: number };

export type HeroBlock = BlockBase & {
  type: 'hero';
  eyebrow: string;
  headingLines: string[];
  emphasisLine?: number;
  description: string;
  primaryCta: ContentCta;
  secondaryCta?: ContentCta;
  media: PublicMediaReference;
  meta?: { brandCode: string; locationAndYear: string };
};

export type AboutBlock = BlockBase & {
  type: 'about';
  lead: string;
  headingLines: string[];
  paragraphs: string[];
  statement?: { value: string; text: string };
};

export type CapabilitiesBlock = BlockBase & {
  type: 'capabilities';
  headingLines: string[];
  intro: string;
  items: Array<ItemBase & { number: string; title: string; description: string }>;
};

export type MotifsBlock = BlockBase & {
  type: 'motifs';
  headingLines: string[];
  intro: string;
  items: Array<ItemBase & { title: string; titleEn: string; description: string; status: string; media: PublicMediaReference }>;
};

export type JiangnanBlock = BlockBase & {
  type: 'jiangnan';
  headingLines: string[];
  description: string;
  cta?: ContentCta;
  media: PublicMediaReference;
};

export type PartnersBlock = BlockBase & {
  type: 'partners';
  heading: string;
  items: Array<ItemBase & { title: string; description?: string; media: PublicMediaReference }>;
};

export type ContactBlock = BlockBase & {
  type: 'contact';
  kicker: string;
  headingLines: string[];
  description?: string;
  cta: ContentCta;
};

export type HomeBlock = HeroBlock | AboutBlock | CapabilitiesBlock | MotifsBlock | JiangnanBlock | PartnersBlock | ContactBlock;

export type HomeContent = {
  version: 1;
  locale: ContentLocale;
  title: string;
  seo: { title: string | null; description: string | null };
  blocks: HomeBlock[];
  hero?: HeroBlock;
  about?: AboutBlock;
  capabilities?: CapabilitiesBlock;
  motifs?: MotifsBlock;
  jiangnan?: JiangnanBlock;
  partners?: PartnersBlock;
  contact?: ContactBlock;
};

export type PublicSiteSettings = {
  version: 1;
  locales: ContentLocale[];
  brand: { name?: { 'zh-CN': string; en?: string } };
  company: {
    legalName?: { 'zh-CN': string; en?: string };
    location?: { 'zh-CN': string; en?: string };
  };
  flagship: { name?: { 'zh-CN': string; en?: string } };
  contact: { email?: string };
};

const fallbackMedia = (url: string, alt: string, mimeType = 'image/png'): PublicMediaReference => ({ url, alt, mimeType });

export const FALLBACK_HOME_ZH: HomeContent = (() => {
  const blocks: HomeBlock[] = [
    {
      type: 'hero', enabled: true, order: 10, contentStatus: 'approved',
      eyebrow: '东方文化深度体验产品研发与供应机构',
      headingLines: ['把东方文化，', '转化为可以进入的', '旅行体验。'], emphasisLine: 2,
      description: 'Turning Chinese culture into travel experiences people can enter, understand and remember.',
      primaryCta: { label: '了解核心能力', action: 'scroll', target: 'solutions' },
      secondaryCta: { label: '发起合作咨询', action: 'inquiry', target: 'inquiry' },
      media: { ...fallbackMedia('/videos/hero-loop.mp4', '东方文化旅行体验影像', 'video/mp4'), poster: fallbackMedia('/images/optimized/hero.webp', '江南园林与文化体验场景', 'image/webp') },
      meta: { brandCode: 'Guanzhi Oriental', locationAndYear: '2026' },
    },
    {
      type: 'about', enabled: true, order: 20, contentStatus: 'approved', lead: '观止东方 Guanzhi Oriental',
      headingLines: ['东方文化体验产品的', '研发与供应机构'],
      paragraphs: [
        '北京见山观止文化有限公司以“观止东方”为对外品牌，面向全球旅行及文化合作伙伴，开展文化主题与叙事研发、体验产品设计、在地资源整合、产品标准化交付与联合出品。',
        '我们关注的不只是一次行程的安排，而是如何让人真正进入中国文化与真实生活：在山水、城市、技艺、饮食与日常之中，获得有节奏、有留白、可感知的深度体验。我们将文化内容转化为能够被理解、被交付、被持续迭代的体验产品，并通过实际运营不断验证其品质与可行性。',
        '“入江南”是观止东方的首个旗舰样板。它以江南为起点，不将目的地简化为景点集合，而是通过文化叙事、在地资源与沉浸式体验，让旅行者更深入地理解东方生活方式。',
        '我们期待与重视文化深度、审美表达和长期品质的旅行机构、目的地伙伴、酒店及会员社群合作，共同创造面向全球市场的中国文化体验产品。',
      ],
      statement: { value: '入江南', text: 'Into Jiangnan\n首个旗舰样板' },
    },
    {
      type: 'capabilities', enabled: true, order: 30, contentStatus: 'approved', headingLines: ['从文化母题', '到可交付产品'],
      intro: '研究不是终点。我们把内容、流程、人员与标准组织成可复用的产品系统。',
      items: [
        { id: 'cultural-product-rd', enabled: true, order: 10, number: '01', title: '文化产品研发', description: '从文化母题、叙事系统到体验流程，形成可被理解、参与与记住的完整产品。' },
        { id: 'standard-experience-modules', enabled: true, order: 20, number: '02', title: '标准体验模块', description: '提供 90 分钟、半日、一日与多日主题模块，适配不同渠道、场景与客群。' },
        { id: 'international-cultural-translation', enabled: true, order: 30, number: '03', title: '国际化文化转译', description: '以多语言内容、认知入口与讲解体系，降低跨文化理解门槛。' },
        { id: 'delivery-and-training', enabled: true, order: 40, number: '04', title: '交付与培训', description: '通过产品手册、人员培训、交付 SOP 与质量评估，让体验稳定落地。' },
      ],
    },
    {
      type: 'motifs', enabled: true, order: 40, contentStatus: 'approved', headingLines: ['正在生长的', '文化体验母题'],
      intro: '不虚构成熟案例。以下方向正在研究、验证与联合开发中。',
      items: [
        { id: 'garden', enabled: true, order: 10, title: '园林', titleEn: 'GARDEN', description: '如何走进一首中国式的诗', status: '合作开发中', media: fallbackMedia('/images/optimized/hero.webp', '园林文化体验研发方向', 'image/webp') },
        { id: 'library', enabled: true, order: 20, title: '藏书楼', titleEn: 'LIBRARY', description: '文人如何保存知识与精神世界', status: '重点研发方向', media: fallbackMedia('/images/optimized/motif-library.webp', '藏书楼文化体验研发方向', 'image/webp') },
        { id: 'tea-and-silk', enabled: true, order: 30, title: '茶与丝绸', titleEn: 'TEA & SILK', description: '江南日常生活中的时间和手艺', status: '合作开发中', media: fallbackMedia('/images/optimized/motif-tea-silk.webp', '茶与丝绸文化体验研发方向', 'image/webp') },
        { id: 'kunqu', enabled: true, order: 40, title: '昆曲', titleEn: 'KUNQU', description: '如何听懂中国古典戏剧的一段声音', status: '重点研发方向', media: fallbackMedia('/images/optimized/motif-kunqu.webp', '昆曲文化体验研发方向', 'image/webp') },
      ],
    },
    {
      type: 'jiangnan', enabled: true, order: 50, contentStatus: 'approved',
      headingLines: ['不是一条景点线路，', '而是一套进入中国审美', '与生活方式的文化体验。'],
      description: '从园林、藏书、昆曲、饮食与日常生活进入江南。为海外游客与国内高知客群建立一条理解中国文化的安静入口。',
      cta: { label: '共同研发「入江南」', action: 'scroll', target: 'contact' },
      media: fallbackMedia('/images/optimized/jiangnan.webp', '雾色江南水乡与舟船', 'image/webp'),
    },
    {
      type: 'partners', enabled: true, order: 60, contentStatus: 'approved', heading: '为需要文化深度与稳定交付的机构服务',
      items: [
        { id: 'inbound-dmc', enabled: true, order: 10, title: '入境旅行社及 DMC', media: fallbackMedia('/images/optimized/partner-01.webp', '旅行策划团队围绕地图共同研究江南文化路线', 'image/webp') },
        { id: 'bespoke-travel', enabled: true, order: 20, title: '高端定制机构', media: fallbackMedia('/images/optimized/partner-02.webp', '文化主理人在江南园林中准备高端定制体验', 'image/webp') },
        { id: 'hospitality', enabled: true, order: 30, title: '酒店和度假品牌', media: fallbackMedia('/images/optimized/partner-03.webp', '酒店庭院中的东方文化欢迎体验场景', 'image/webp') },
        { id: 'membership', enabled: true, order: 40, title: '银行、企业及会员机构', media: fallbackMedia('/images/optimized/partner-04.webp', '会员客户参加小型东方文化艺术沙龙', 'image/webp') },
        { id: 'destination', enabled: true, order: 50, title: '目的地与文旅机构', media: fallbackMedia('/images/optimized/partner-05.webp', '文旅团队围绕建筑模型规划目的地文化产品', 'image/webp') },
        { id: 'overseas-education', enabled: true, order: 60, title: '海外旅行社及文化教育机构', media: fallbackMedia('/images/optimized/partner-06.webp', '国际访客在中式藏书空间参加文化工作坊', 'image/webp') },
      ],
    },
    {
      type: 'contact', enabled: true, order: 70, contentStatus: 'approved',
      kicker: '委托研发 · 联合出品 · 内容授权 · 白标产品 · 培训与交付',
      headingLines: ['让文化不止被看见，', '而是真正被进入。'],
      cta: { label: '预约合作洽谈', action: 'inquiry', target: 'inquiry' },
    },
  ];
  const byType = Object.fromEntries(blocks.map((block) => [block.type, block])) as Record<HomeBlock['type'], HomeBlock>;
  return {
    version: 1, locale: 'zh-CN', title: '观止东方', seo: { title: '观止东方｜东方文化深度体验产品研发与供应', description: '把东方文化，转化为可以进入的旅行体验。' }, blocks,
    hero: byType.hero as HeroBlock,
    about: byType.about as AboutBlock,
    capabilities: byType.capabilities as CapabilitiesBlock,
    motifs: byType.motifs as MotifsBlock,
    jiangnan: byType.jiangnan as JiangnanBlock,
    partners: byType.partners as PartnersBlock,
    contact: byType.contact as ContactBlock,
  };
})();

export const FALLBACK_HERO = FALLBACK_HOME_ZH.hero!;
export const FALLBACK_ABOUT = FALLBACK_HOME_ZH.about!;

export const FALLBACK_SETTINGS: PublicSiteSettings = {
  version: 1,
  locales: ['zh-CN', 'en'],
  brand: { name: { 'zh-CN': '观止东方', en: 'Guanzhi Oriental' } },
  company: { legalName: { 'zh-CN': '北京见山观止文化有限公司', en: 'Beijing Jianshan Guanzhi Culture Co., Ltd.' } },
  flagship: { name: { 'zh-CN': '入江南', en: 'Into Jiangnan' } },
  contact: { email: 'hello@guanzhidongfang.com' },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string');
}

function isLocalizedText(value: unknown): value is { 'zh-CN': string; en?: string } {
  return isRecord(value)
    && typeof value['zh-CN'] === 'string'
    && value['zh-CN'].length > 0
    && (value.en === undefined || (typeof value.en === 'string' && value.en.length > 0));
}

function isBase(value: Record<string, unknown>) {
  return value.enabled === true
    && Number.isInteger(value.order)
    && Number(value.order) >= 0
    && (value.contentStatus === 'approved' || value.contentStatus === 'draft');
}

function isCta(value: unknown): value is ContentCta {
  if (!isRecord(value) || typeof value.label !== 'string' || typeof value.target !== 'string' || !['scroll', 'inquiry', 'link'].includes(String(value.action))) return false;
  return value.action === 'link'
    ? /^https:\/\//i.test(value.target) || /^mailto:/i.test(value.target)
    : /^[a-z][a-z0-9-]*$/.test(value.target);
}

function isMedia(value: unknown): value is PublicMediaReference {
  return isRecord(value)
    && typeof value.url === 'string'
    && /^(https?:\/\/|\/(?!\/))/.test(value.url)
    && typeof value.alt === 'string'
    && (value.assetId === undefined || typeof value.assetId === 'string')
    && (value.mimeType === undefined || typeof value.mimeType === 'string')
    && (value.width === undefined || (Number.isInteger(value.width) && Number(value.width) > 0))
    && (value.height === undefined || (Number.isInteger(value.height) && Number(value.height) > 0))
    && (value.poster === undefined || isMedia(value.poster));
}

function isItems(value: unknown, validate: (item: Record<string, unknown>) => boolean) {
  return Array.isArray(value) && value.every((item) => isRecord(item)
    && item.enabled === true
    && typeof item.id === 'string'
    && item.id.length > 0
    && Number.isInteger(item.order)
    && Number(item.order) >= 0
    && validate(item));
}

function isHomeBlock(value: unknown): value is HomeBlock {
  if (!isRecord(value) || !isBase(value)) return false;
  switch (value.type) {
    case 'hero':
      return typeof value.eyebrow === 'string'
        && isStrings(value.headingLines)
        && (value.emphasisLine === undefined || (Number.isInteger(value.emphasisLine) && Number(value.emphasisLine) >= 0 && Number(value.emphasisLine) < value.headingLines.length))
        && typeof value.description === 'string'
        && isCta(value.primaryCta)
        && (value.secondaryCta === undefined || isCta(value.secondaryCta))
        && isMedia(value.media)
        && (value.meta === undefined || (isRecord(value.meta) && typeof value.meta.brandCode === 'string' && typeof value.meta.locationAndYear === 'string'));
    case 'about':
      return typeof value.lead === 'string'
        && isStrings(value.headingLines)
        && isStrings(value.paragraphs)
        && (value.statement === undefined || (isRecord(value.statement) && typeof value.statement.value === 'string' && typeof value.statement.text === 'string'));
    case 'capabilities':
      return isStrings(value.headingLines) && typeof value.intro === 'string' && isItems(value.items, (item) => typeof item.number === 'string' && typeof item.title === 'string' && typeof item.description === 'string');
    case 'motifs':
      return isStrings(value.headingLines) && typeof value.intro === 'string' && isItems(value.items, (item) => typeof item.title === 'string' && typeof item.titleEn === 'string' && typeof item.description === 'string' && typeof item.status === 'string' && isMedia(item.media));
    case 'jiangnan':
      return isStrings(value.headingLines) && typeof value.description === 'string' && (value.cta === undefined || isCta(value.cta)) && isMedia(value.media);
    case 'partners':
      return typeof value.heading === 'string' && isItems(value.items, (item) => typeof item.title === 'string' && (item.description === undefined || typeof item.description === 'string') && isMedia(item.media));
    case 'contact':
      return typeof value.kicker === 'string' && isStrings(value.headingLines) && (value.description === undefined || typeof value.description === 'string') && isCta(value.cta);
    default:
      return false;
  }
}

export function parseHomeContent(value: unknown, requestedLocale?: ContentLocale): HomeContent {
  if (!isRecord(value) || value.version !== 1 || (value.locale !== 'zh-CN' && value.locale !== 'en') || typeof value.title !== 'string' || !value.title) throw new Error('Invalid homepage response metadata');
  if (requestedLocale && value.locale !== requestedLocale) throw new Error('Homepage locale mismatch');
  if (!isRecord(value.seo)
    || (value.seo.title !== null && typeof value.seo.title !== 'string')
    || (value.seo.description !== null && typeof value.seo.description !== 'string')
    || !Array.isArray(value.blocks)
    || value.blocks.length < 1
    || value.blocks.length > 7
    || !value.blocks.every(isHomeBlock)) throw new Error('Invalid homepage blocks');
  const blocks = [...value.blocks].sort((left, right) => left.order - right.order);
  const expected = ['hero', 'about', 'capabilities', 'motifs', 'jiangnan', 'partners', 'contact'];
  const indexes = blocks.map((block) => expected.indexOf(block.type));
  if (indexes.some((index, position) => index < 0 || (position > 0 && index <= indexes[position - 1]!))) throw new Error('Homepage block order or uniqueness is invalid');
  const byType = Object.fromEntries(blocks.map((block) => [block.type, block])) as Partial<Record<HomeBlock['type'], HomeBlock>>;
  return {
    version: 1,
    locale: value.locale,
    title: value.title as string,
    seo: { title: typeof value.seo.title === 'string' ? value.seo.title : null, description: typeof value.seo.description === 'string' ? value.seo.description : null },
    blocks,
    hero: byType.hero as HeroBlock | undefined,
    about: byType.about as AboutBlock | undefined,
    capabilities: byType.capabilities as CapabilitiesBlock | undefined,
    motifs: byType.motifs as MotifsBlock | undefined,
    jiangnan: byType.jiangnan as JiangnanBlock | undefined,
    partners: byType.partners as PartnersBlock | undefined,
    contact: byType.contact as ContactBlock | undefined,
  };
}

export function isPublicSiteSettings(value: unknown): value is PublicSiteSettings {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.locales)) return false;
  if (!value.locales.every((locale) => locale === 'zh-CN' || locale === 'en')) return false;
  if (!isRecord(value.brand) || !isRecord(value.company) || !isRecord(value.flagship) || !isRecord(value.contact)) return false;
  return (value.brand.name === undefined || isLocalizedText(value.brand.name))
    && (value.company.legalName === undefined || isLocalizedText(value.company.legalName))
    && (value.company.location === undefined || isLocalizedText(value.company.location))
    && (value.flagship.name === undefined || isLocalizedText(value.flagship.name))
    && (value.contact.email === undefined || typeof value.contact.email === 'string');
}

async function getJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal, headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Content API returned ${response.status}`);
  return response.json();
}

export async function loadHomeContent(locale: ContentLocale, signal: AbortSignal): Promise<HomeContent> {
  const response = await getJson(`/api/v1/content/pages/home?locale=${encodeURIComponent(locale)}`, signal);
  if (!isRecord(response) || response.ok !== true) throw new Error('Invalid homepage content envelope');
  return parseHomeContent(response.data, locale);
}

export async function switchHomeLocale(current: HomeContent, target: ContentLocale, signal: AbortSignal) {
  try {
    return { content: await loadHomeContent(target, signal), failed: false as const };
  } catch {
    return { content: current, failed: true as const };
  }
}

export async function loadHero(signal: AbortSignal): Promise<HeroBlock> {
  const hero = (await loadHomeContent('zh-CN', signal)).hero;
  if (!hero) throw new Error('Homepage hero is disabled or missing');
  return hero;
}

export async function loadHeroOrFallback(signal: AbortSignal): Promise<HeroBlock> {
  try { return await loadHero(signal); } catch { return FALLBACK_HERO; }
}

export async function loadHomeContentOrFallback(signal: AbortSignal): Promise<HomeContent> {
  try { return await loadHomeContent('zh-CN', signal); } catch { return FALLBACK_HOME_ZH; }
}

export async function loadSiteSettings(signal: AbortSignal): Promise<PublicSiteSettings> {
  const response = await getJson('/api/v1/content/settings', signal);
  if (!isRecord(response) || response.ok !== true || !isPublicSiteSettings(response.data)) throw new Error('Invalid public settings response');
  return response.data;
}

export async function loadSiteSettingsOrFallback(signal: AbortSignal): Promise<PublicSiteSettings> {
  try { return await loadSiteSettings(signal); } catch { return FALLBACK_SETTINGS; }
}
