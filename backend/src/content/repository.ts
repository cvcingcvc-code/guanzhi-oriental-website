import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { mediaAssets, pages, pageTranslations, siteSettings } from '../db/schema.js';
import type { ContentLocale } from './contract.js';
import type { ContentPageRow, MediaAssetRow } from './public-dto.js';

export interface PublicContentRepository {
  findPublishedPage(slug: string, locale: ContentLocale): Promise<ContentPageRow | undefined>;
  findMediaAssets(ids: string[]): Promise<MediaAssetRow[]>;
  listSettings(): Promise<Array<{ key: string; value: unknown }>>;
}

export const publicContentRepository: PublicContentRepository = {
  async findPublishedPage(slug, locale) {
    const [row] = await db.select({
      id: pages.id,
      slug: pages.slug,
      locale: pageTranslations.locale,
      publishedAt: pages.publishedAt,
      title: pageTranslations.title,
      seoTitle: pageTranslations.seoTitle,
      seoDescription: pageTranslations.seoDescription,
      blocks: pageTranslations.blocks,
    }).from(pages)
      .innerJoin(pageTranslations, and(eq(pageTranslations.pageId, pages.id), eq(pageTranslations.locale, locale)))
      .where(and(eq(pages.slug, slug), eq(pages.status, 'PUBLISHED')))
      .limit(1);
    return row as ContentPageRow | undefined;
  },

  async findMediaAssets(ids) {
    if (ids.length === 0) return [];
    return db.select({
      id: mediaAssets.id,
      storageKey: mediaAssets.storageKey,
      mimeType: mediaAssets.mimeType,
      width: mediaAssets.width,
      height: mediaAssets.height,
      altZh: mediaAssets.altZh,
      altEn: mediaAssets.altEn,
    }).from(mediaAssets).where(and(inArray(mediaAssets.id, ids), isNull(mediaAssets.deletedAt)));
  },

  async listSettings() {
    return db.select({ key: siteSettings.key, value: siteSettings.value }).from(siteSettings);
  },
};
