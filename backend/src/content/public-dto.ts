import { z } from 'zod';
import {
  aboutBlockSchema,
  capabilitiesBlockSchema,
  contactBlockSchema,
  contentDocumentSchema,
  heroBlockSchema,
  jiangnanBlockSchema,
  leadBlockSchema,
  localeSchema,
  localizedTextSchema,
  motifsBlockSchema,
  partnersBlockSchema,
  proseBlockSchema,
  type ContentDocument,
  type ContentLocale,
} from './contract.js';

export type PublicMediaReference = {
  assetId?: string;
  url: string;
  alt: string;
  mimeType?: string;
  width?: number;
  height?: number;
  poster?: PublicMediaReference;
};

export const publicMediaReferenceSchema: z.ZodType<PublicMediaReference> = z.object({
  assetId: z.uuid().optional(),
  url: z.string().min(1),
  alt: z.string().max(500),
  mimeType: z.string().max(100).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  poster: z.lazy((): z.ZodType<PublicMediaReference> => publicMediaReferenceSchema).optional(),
}).strict();

const publicHeroBlockSchema = heroBlockSchema.omit({ media: true }).extend({ media: publicMediaReferenceSchema }).strict();
const publicMotifsBlockSchema = motifsBlockSchema.extend({
  items: z.array(motifsBlockSchema.shape.items.element.omit({ media: true }).extend({ media: publicMediaReferenceSchema }).strict()),
}).strict();
const publicJiangnanBlockSchema = jiangnanBlockSchema.omit({ media: true }).extend({ media: publicMediaReferenceSchema }).strict();
const publicPartnersBlockSchema = partnersBlockSchema.extend({
  items: z.array(partnersBlockSchema.shape.items.element.omit({ media: true }).extend({ media: publicMediaReferenceSchema }).strict()),
}).strict();

export const publicContentBlockSchema = z.discriminatedUnion('type', [
  publicHeroBlockSchema,
  aboutBlockSchema,
  capabilitiesBlockSchema,
  publicMotifsBlockSchema,
  publicJiangnanBlockSchema,
  publicPartnersBlockSchema,
  contactBlockSchema,
  proseBlockSchema,
  leadBlockSchema,
]);

export const publicContentPageSchema = z.object({
  version: contentDocumentSchema.shape.version,
  id: z.uuid(),
  slug: z.string().min(1).max(120),
  locale: localeSchema,
  publishedAt: z.string().datetime().nullable(),
  title: z.string().min(1).max(200),
  seo: z.object({ title: z.string().max(200).nullable(), description: z.string().max(500).nullable() }).strict(),
  blocks: z.array(publicContentBlockSchema),
}).strict();
export type PublicContentPage = z.infer<typeof publicContentPageSchema>;

export type ContentPageRow = {
  id: string;
  slug: string;
  locale: ContentLocale;
  publishedAt: Date | null;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  blocks: unknown;
};

export type MediaAssetRow = {
  id: string;
  storageKey: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  altZh: string | null;
  altEn: string | null;
};

function collectAssetIds(value: unknown, result = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((item) => collectAssetIds(item, result));
    return result;
  }
  if (!value || typeof value !== 'object') return result;
  const record = value as Record<string, unknown>;
  if (typeof record.assetId === 'string') result.add(record.assetId);
  Object.values(record).forEach((item) => collectAssetIds(item, result));
  return result;
}

export function mediaAssetIds(document: ContentDocument) {
  return [...collectAssetIds(document.blocks)];
}

function resolveMedia(value: unknown, assets: Map<string, MediaAssetRow>, locale: ContentLocale, publicMediaUrl: (storageKey: string) => string): unknown {
  if (Array.isArray(value)) return value.map((item) => resolveMedia(item, assets, locale, publicMediaUrl));
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  const altResult = localizedTextSchema.safeParse(record.alt);
  const isMedia = altResult.success && (typeof record.assetId === 'string' || typeof record.fallbackUrl === 'string');
  if (isMedia) {
    const asset = typeof record.assetId === 'string' ? assets.get(record.assetId) : undefined;
    const fallbackUrl = typeof record.fallbackUrl === 'string' ? record.fallbackUrl : undefined;
    if (!asset && !fallbackUrl) throw new Error(`媒体资产不存在: ${String(record.assetId)}`);
    const alt = asset
      ? (locale === 'en' ? asset.altEn || asset.altZh : asset.altZh || asset.altEn) || altResult.data[locale] || altResult.data['zh-CN']
      : altResult.data[locale] || altResult.data['zh-CN'];
    const resolved: Record<string, unknown> = {
      ...(asset ? { assetId: asset.id } : {}),
      url: asset ? publicMediaUrl(asset.storageKey) : fallbackUrl,
      alt,
      mimeType: asset?.mimeType ?? record.mimeType,
      width: asset?.width ?? record.width,
      height: asset?.height ?? record.height,
    };
    if (record.poster) resolved.poster = resolveMedia(record.poster, assets, locale, publicMediaUrl);
    return Object.fromEntries(Object.entries(resolved).filter(([, item]) => item !== undefined && item !== null));
  }
  return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, resolveMedia(item, assets, locale, publicMediaUrl)]));
}

export function buildPublicContentPage(
  row: ContentPageRow,
  document: ContentDocument,
  assets: MediaAssetRow[],
  publicMediaUrl: (storageKey: string) => string,
): PublicContentPage {
  const visibleBlocks = document.blocks
    .filter((block) => block.enabled)
    .sort((left, right) => left.order - right.order)
    .map((block) => {
      if (block.type === 'capabilities' || block.type === 'motifs' || block.type === 'partners') {
        return { ...block, items: block.items.filter((item) => item.enabled).sort((left, right) => left.order - right.order) };
      }
      return block;
    });
  const resolvedBlocks = resolveMedia(visibleBlocks, new Map(assets.map((asset) => [asset.id, asset])), row.locale, publicMediaUrl);
  return publicContentPageSchema.parse({
    version: document.version,
    id: row.id,
    slug: row.slug,
    locale: row.locale,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    title: row.title,
    seo: { title: row.seoTitle, description: row.seoDescription },
    blocks: resolvedBlocks,
  });
}

const compatibleLocalizedTextSchema = z.union([
  localizedTextSchema,
  z.object({ zh: z.string().trim().min(1).max(500), en: z.string().trim().min(1).max(500).optional() }).strict()
    .transform((value) => ({ 'zh-CN': value.zh, ...(value.en ? { en: value.en } : {}) })),
]);

export const publicSettingsSchema = z.object({
  version: z.literal(1),
  locales: z.array(localeSchema).min(1),
  brand: z.object({ name: localizedTextSchema.optional() }).strict(),
  company: z.object({ legalName: localizedTextSchema.optional(), location: localizedTextSchema.optional() }).strict(),
  flagship: z.object({ name: localizedTextSchema.optional() }).strict(),
  contact: z.object({ email: z.email().max(254).optional() }).strict(),
}).strict();
export type PublicSettings = z.infer<typeof publicSettingsSchema>;

export function buildPublicSettings(rows: Array<{ key: string; value: unknown }>): PublicSettings {
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const localesRaw = z.array(z.string()).safeParse(values.get('site.locales'));
  const locales = localesRaw.success
    ? [...new Set(localesRaw.data.map((locale) => locale === 'zh' ? 'zh-CN' : locale).filter((locale): locale is ContentLocale => localeSchema.safeParse(locale).success))]
    : ['zh-CN', 'en'] satisfies ContentLocale[];
  const localized = (key: string) => {
    const result = compatibleLocalizedTextSchema.safeParse(values.get(key));
    return result.success ? result.data : undefined;
  };
  const emailResult = z.email().max(254).safeParse(values.get('contact.email'));
  return publicSettingsSchema.parse({
    version: 1,
    locales: locales.length ? locales : ['zh-CN', 'en'],
    brand: { name: localized('brand.name') },
    company: { legalName: localized('company.legalName'), location: localized('company.location') },
    flagship: { name: localized('flagship.name') },
    contact: { email: emailResult.success ? emailResult.data : undefined },
  });
}
