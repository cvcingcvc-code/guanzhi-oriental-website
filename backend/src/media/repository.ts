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
  findActiveByStorageKey(storageKey: string): Promise<MediaAsset | undefined>;
  create(input: NewMediaAsset): Promise<MediaAsset>;
  isReferenced(id: string): Promise<boolean>;
  softDeleteIfUnreferenced(id: string): Promise<
    { status: 'deleted'; row: MediaAsset } | { status: 'not-found' } | { status: 'referenced' }
  >;
}

export function activeMediaForUpdateQuery(executor: Pick<typeof db, 'select'>, id: string) {
  return executor.select().from(mediaAssets)
    .where(and(eq(mediaAssets.id, id), isNull(mediaAssets.deletedAt)))
    .limit(1)
    .for('update');
}

export const mediaRepository: MediaRepository = {
  listActive() {
    return db.select().from(mediaAssets).where(isNull(mediaAssets.deletedAt)).orderBy(desc(mediaAssets.createdAt));
  },
  async findActive(id) {
    const [row] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, id), isNull(mediaAssets.deletedAt))).limit(1);
    return row;
  },
  async findActiveByStorageKey(storageKey) {
    const [row] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.storageKey, storageKey), isNull(mediaAssets.deletedAt))).limit(1);
    return row;
  },
  async create(input) {
    const [row] = await db.insert(mediaAssets).values(input).returning();
    if (!row) throw new Error('Failed to save media');
    return row;
  },
  async isReferenced(id) {
    const rows = await db.select({ blocks: pageTranslations.blocks }).from(pageTranslations);
    return rows.some((row) => containsAssetId(row.blocks, id));
  },
  async softDeleteIfUnreferenced(id) {
    return db.transaction(async (tx) => {
      const [row] = await activeMediaForUpdateQuery(tx, id);
      if (!row) return { status: 'not-found' };
      const rows = await tx.select({ blocks: pageTranslations.blocks }).from(pageTranslations);
      if (rows.some((translation) => containsAssetId(translation.blocks, id))) return { status: 'referenced' };
      await tx.update(mediaAssets).set({ deletedAt: new Date() }).where(and(eq(mediaAssets.id, id), isNull(mediaAssets.deletedAt)));
      return { status: 'deleted', row };
    });
  },
};
