import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { mediaAssets, pageTranslations } from '../db/schema.js';
import type { NewMediaAsset } from './service.js';

export type MediaAsset = typeof mediaAssets.$inferSelect;

function containsAssetId(value: unknown, assetId: string): boolean {
  if (Array.isArray(value)) return value.some((item) => containsAssetId(item, assetId));
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record.assetId === assetId || Object.values(record).some((item) => containsAssetId(item, assetId));
}

export interface MediaRepository {
  listActive(): Promise<MediaAsset[]>;
  findActive(id: string): Promise<MediaAsset | undefined>;
  create(input: NewMediaAsset): Promise<MediaAsset>;
  softDelete(id: string): Promise<void>;
  isReferenced(id: string): Promise<boolean>;
}

export const mediaRepository: MediaRepository = {
  listActive() {
    return db.select().from(mediaAssets).where(isNull(mediaAssets.deletedAt)).orderBy(desc(mediaAssets.createdAt));
  },
  async findActive(id) {
    const [row] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, id), isNull(mediaAssets.deletedAt))).limit(1);
    return row;
  },
  async create(input) {
    const [row] = await db.insert(mediaAssets).values(input).returning();
    if (!row) throw new Error('Failed to save media');
    return row;
  },
  async softDelete(id) {
    await db.update(mediaAssets).set({ deletedAt: new Date() }).where(eq(mediaAssets.id, id));
  },
  async isReferenced(id) {
    const rows = await db.select({ blocks: pageTranslations.blocks }).from(pageTranslations);
    return rows.some((row) => containsAssetId(row.blocks, id));
  },
};
