export type ContentLocale = 'zh-CN' | 'en';

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

export type HeroBlock = {
  type: 'hero';
  enabled: boolean;
  order: number;
  eyebrow: string;
  headingLines: string[];
  emphasisLine?: number;
  description: string;
  primaryCta: ContentCta;
  secondaryCta?: ContentCta;
  media: PublicMediaReference;
  meta?: { brandCode: string; locationAndYear: string };
};

export type PublicSiteSettings = {
  version: 1;
  locales: ContentLocale[];
  brand: { name?: { 'zh-CN': string; en?: string } };
  company: {
    legalName?: { 'zh-CN': string; en?: string };
    location?: { 'zh-CN': string; en?: string };
  };
  contact: { email?: string };
};

export const FALLBACK_HERO: HeroBlock = {
  type: 'hero',
  enabled: true,
  order: 10,
  eyebrow: '东方文化深度体验产品研发与供应机构',
  headingLines: ['把东方文化，', '转化为可以进入的', '旅行体验。'],
  emphasisLine: 2,
  description: 'Turning Chinese culture into travel experiences people can enter, understand and remember.',
  primaryCta: { label: '了解核心能力', action: 'scroll', target: 'solutions' },
  secondaryCta: { label: '发起合作咨询', action: 'inquiry', target: 'inquiry' },
  media: {
    url: '/videos/hero-loop.mp4',
    alt: '东方文化旅行体验影像',
    mimeType: 'video/mp4',
    poster: {
      url: '/images/Gemini_Generated_Image_stds6ostds6ostds (1).png',
      alt: '江南园林与文化体验场景',
      mimeType: 'image/png',
    },
  },
  meta: { brandCode: 'GZ · DF', locationAndYear: 'HANGZHOU / 2026' },
};

export const FALLBACK_SETTINGS: PublicSiteSettings = {
  version: 1,
  locales: ['zh-CN', 'en'],
  brand: {},
  company: {},
  contact: { email: 'hello@guanzhidongfang.com' },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isCta(value: unknown): value is ContentCta {
  if (!isRecord(value)) return false;
  return typeof value.label === 'string'
    && typeof value.target === 'string'
    && ['scroll', 'inquiry', 'link'].includes(String(value.action));
}

function isMedia(value: unknown): value is PublicMediaReference {
  return isRecord(value) && typeof value.url === 'string' && typeof value.alt === 'string';
}

export function isHeroBlock(value: unknown): value is HeroBlock {
  if (!isRecord(value)) return false;
  return value.type === 'hero'
    && value.enabled === true
    && typeof value.order === 'number'
    && typeof value.eyebrow === 'string'
    && Array.isArray(value.headingLines)
    && value.headingLines.length > 0
    && value.headingLines.every((line) => typeof line === 'string')
    && typeof value.description === 'string'
    && isCta(value.primaryCta)
    && (value.secondaryCta === undefined || isCta(value.secondaryCta))
    && isMedia(value.media);
}

export function isPublicSiteSettings(value: unknown): value is PublicSiteSettings {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.locales)) return false;
  if (!value.locales.every((locale) => locale === 'zh-CN' || locale === 'en')) return false;
  return isRecord(value.brand) && isRecord(value.company) && isRecord(value.contact)
    && (value.contact.email === undefined || typeof value.contact.email === 'string');
}

async function getJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal, headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Content API returned ${response.status}`);
  return response.json();
}

export async function loadHero(signal: AbortSignal): Promise<HeroBlock> {
  const response = await getJson('/api/v1/content/pages/home?locale=zh-CN', signal);
  if (!isRecord(response) || response.ok !== true || !isRecord(response.data) || !Array.isArray(response.data.blocks)) {
    throw new Error('Invalid homepage content response');
  }
  const hero = response.data.blocks.find((block) => isRecord(block) && block.type === 'hero');
  if (!isHeroBlock(hero)) throw new Error('Homepage response has no valid enabled Hero block');
  return hero;
}

export async function loadSiteSettings(signal: AbortSignal): Promise<PublicSiteSettings> {
  const response = await getJson('/api/v1/content/settings', signal);
  if (!isRecord(response) || response.ok !== true || !isPublicSiteSettings(response.data)) {
    throw new Error('Invalid public settings response');
  }
  return response.data;
}

export async function loadHeroOrFallback(signal: AbortSignal): Promise<HeroBlock> {
  try {
    return await loadHero(signal);
  } catch {
    return FALLBACK_HERO;
  }
}

export async function loadSiteSettingsOrFallback(signal: AbortSignal): Promise<PublicSiteSettings> {
  try {
    return await loadSiteSettings(signal);
  } catch {
    return FALLBACK_SETTINGS;
  }
}
