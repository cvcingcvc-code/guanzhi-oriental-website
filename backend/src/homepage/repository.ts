import { isDeepStrictEqual } from 'node:util';
import { and, desc, eq, inArray, isNull, max, sql } from 'drizzle-orm';
import { z } from 'zod';
import { homeContentDocumentSchema, localeSchema } from '../content/contract.js';
import { mediaAssetIds } from '../content/public-dto.js';
import { db } from '../db/client.js';
import { auditLogs, mediaAssets, pages, pageRevisions, pageTranslations } from '../db/schema.js';

function normalizeHomeDocument(document: z.infer<typeof homeContentDocumentSchema>): z.infer<typeof homeContentDocumentSchema> {
  const normalized = structuredClone(document);
  normalized.blocks.sort((left, right) => left.order - right.order);
  for (const block of normalized.blocks) {
    if (block.type === 'capabilities' || block.type === 'motifs' || block.type === 'partners') {
      block.items.sort((left, right) => left.order - right.order);
    }
  }
  return normalized;
}

export const homepageTranslationSchema = z.object({
  locale: localeSchema,
  title: z.string().trim().min(1).max(200),
  seoTitle: z.string().trim().max(200).nullable().optional(),
  seoDescription: z.string().trim().max(500).nullable().optional(),
  blocks: homeContentDocumentSchema,
}).strict().transform((translation) => ({
  ...translation,
  seoTitle: translation.seoTitle ?? null,
  seoDescription: translation.seoDescription ?? null,
  blocks: normalizeHomeDocument(translation.blocks),
}));

export const homepageTranslationsSchema = z.array(homepageTranslationSchema).length(2)
  .superRefine((translations, context) => {
    const locales = new Set(translations.map((translation) => translation.locale));
    if (!locales.has('zh-CN') || !locales.has('en') || locales.size !== 2) {
      context.addIssue({ code: 'custom', message: '首页草稿必须同时且仅包含 zh-CN 与 en 两个语言版本' });
    }
  })
  .transform((translations) => [...translations].sort((left, right) => left.locale === right.locale ? 0 : left.locale === 'zh-CN' ? -1 : 1));

export const homepageDraftSnapshotSchema = z.object({
  kind: z.literal('homepage-draft'),
  version: z.literal(1),
  translations: homepageTranslationsSchema,
}).strict();

export type HomepageTranslation = z.infer<typeof homepageTranslationSchema>;
export type HomepageTranslations = z.infer<typeof homepageTranslationsSchema>;

export interface HomepagePageSummary {
  id: string;
  slug: 'home';
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: Date | null;
  updatedAt: Date;
}

export interface HomepageEditorState {
  page: HomepagePageSummary;
  revision: number;
  savedAt: Date;
  source: 'draft' | 'published';
  translations: HomepageTranslations;
}

export interface HomepageActorContext {
  actorId: string;
  ipHash: string;
}

export class HomepageNotFoundError extends Error {}

export class HomepageRevisionNotFoundError extends Error {
  constructor(public readonly revision: number) {
    super(`首页草稿版本 ${revision} 不存在`);
  }
}

export class HomepageRevisionConflictError extends Error {
  constructor(public readonly currentRevision: number) {
    super('首页草稿已被其他编辑更新');
  }
}

export class HomepageInactiveMediaError extends Error {
  constructor(public readonly assetIds: string[]) {
    super('首页草稿引用了不存在或已删除的媒体');
  }
}

export interface HomepageRepository {
  get(): Promise<HomepageEditorState>;
  saveDraft(baseRevision: number, translations: HomepageTranslations, actor: HomepageActorContext): Promise<HomepageEditorState>;
  publish(revision: number, actor: HomepageActorContext): Promise<HomepageEditorState>;
}

function sortTranslations(translations: HomepageTranslations): HomepageTranslations {
  return [...translations].sort((left, right) => left.locale === right.locale ? 0 : left.locale === 'zh-CN' ? -1 : 1);
}

function parseTranslations(input: unknown): HomepageTranslations {
  return sortTranslations(homepageTranslationsSchema.parse(input));
}

export function homepageTranslationsEqual(left: HomepageTranslations, right: HomepageTranslations) {
  return isDeepStrictEqual(parseTranslations(left), parseTranslations(right));
}

export function homepageAssetIds(translations: HomepageTranslations) {
  return [...new Set(translations.flatMap((translation) => mediaAssetIds(translation.blocks)))].sort();
}

export function inactiveHomepageAssetIds(referencedAssetIds: string[], activeAssetIds: string[]) {
  const activeIds = new Set(activeAssetIds);
  return referencedAssetIds.filter((id) => !activeIds.has(id));
}

export function activeHomepageAssetsQuery(executor: Pick<typeof db, 'select'>, assetIds: string[]) {
  return executor.select({ id: mediaAssets.id }).from(mediaAssets).where(and(
    inArray(mediaAssets.id, assetIds),
    isNull(mediaAssets.deletedAt),
  )).for('share');
}

function pageSummary(page: typeof pages.$inferSelect): HomepagePageSummary {
  if (page.slug !== 'home') throw new HomepageNotFoundError('首页不存在');
  return {
    id: page.id,
    slug: 'home',
    status: page.status,
    publishedAt: page.publishedAt,
    updatedAt: page.updatedAt,
  };
}

const homepageDraftCondition = sql`${pageRevisions.snapshot}->>'kind' = 'homepage-draft'`;

async function getPublishedTranslations(executor: Pick<typeof db, 'select'>, pageId: string): Promise<HomepageTranslations> {
  const rows = await executor.select({
    locale: pageTranslations.locale,
    title: pageTranslations.title,
    seoTitle: pageTranslations.seoTitle,
    seoDescription: pageTranslations.seoDescription,
    blocks: pageTranslations.blocks,
  }).from(pageTranslations).where(eq(pageTranslations.pageId, pageId));
  return parseTranslations(rows);
}

async function getLatestDraft(executor: Pick<typeof db, 'select'>, pageId: string) {
  const [revision] = await executor.select({
    revision: pageRevisions.revision,
    snapshot: pageRevisions.snapshot,
    createdAt: pageRevisions.createdAt,
  }).from(pageRevisions)
    .where(and(eq(pageRevisions.pageId, pageId), homepageDraftCondition))
    .orderBy(desc(pageRevisions.revision))
    .limit(1);
  if (!revision) return undefined;
  const snapshot = homepageDraftSnapshotSchema.parse(revision.snapshot);
  return { revision: revision.revision, savedAt: revision.createdAt, translations: sortTranslations(snapshot.translations) };
}

export function createHomepageRepository(database: typeof db = db): HomepageRepository {
  return {
    async get() {
      return database.transaction(async (tx) => {
        const [page] = await tx.select().from(pages).where(eq(pages.slug, 'home')).limit(1).for('share');
        if (!page) throw new HomepageNotFoundError('首页不存在');
        const draft = await getLatestDraft(tx, page.id);
        const publishedTranslations = await getPublishedTranslations(tx, page.id);
        if (draft && !homepageTranslationsEqual(draft.translations, publishedTranslations)) {
          return { page: pageSummary(page), source: 'draft', ...draft };
        }
        return {
          page: pageSummary(page),
          revision: draft?.revision ?? 0,
          savedAt: page.updatedAt,
          source: 'published',
          translations: publishedTranslations,
        };
      });
    },

    async saveDraft(baseRevision, translations, actor) {
      return database.transaction(async (tx) => {
        const [page] = await tx.select().from(pages).where(eq(pages.slug, 'home')).limit(1).for('update');
        if (!page) throw new HomepageNotFoundError('首页不存在');

        const latestDraft = await getLatestDraft(tx, page.id);
        const currentRevision = latestDraft?.revision ?? 0;
        if (baseRevision !== currentRevision) throw new HomepageRevisionConflictError(currentRevision);
        const publishedTranslations = await getPublishedTranslations(tx, page.id);
        const previousSource = latestDraft && !homepageTranslationsEqual(latestDraft.translations, publishedTranslations)
          ? 'draft'
          : 'published';

        const [highest] = await tx.select({ value: max(pageRevisions.revision) })
          .from(pageRevisions)
          .where(eq(pageRevisions.pageId, page.id));
        const nextRevision = (highest?.value ?? 0) + 1;
        const normalizedTranslations = parseTranslations(translations);
        const [created] = await tx.insert(pageRevisions).values({
          pageId: page.id,
          revision: nextRevision,
          snapshot: { kind: 'homepage-draft', version: 1, translations: normalizedTranslations },
          createdBy: actor.actorId,
        }).returning({ createdAt: pageRevisions.createdAt });
        if (!created) throw new Error('首页草稿保存失败');
        const source = homepageTranslationsEqual(normalizedTranslations, publishedTranslations) ? 'published' as const : 'draft' as const;
        const state = {
          page: pageSummary(page),
          revision: nextRevision,
          savedAt: created.createdAt,
          source,
          translations: normalizedTranslations,
        };
        await tx.insert(auditLogs).values({
          actorId: actor.actorId,
          action: 'SAVE_DRAFT',
          entityType: 'homepage',
          entityId: 'home',
          before: { revision: currentRevision, source: previousSource },
          after: { revision: state.revision, source: state.source },
          ipHash: actor.ipHash,
        });
        return state;
      });
    },

    async publish(revision, actor) {
      return database.transaction(async (tx) => {
        const [page] = await tx.select().from(pages).where(eq(pages.slug, 'home')).limit(1).for('update');
        if (!page) throw new HomepageNotFoundError('首页不存在');
        const latestDraft = await getLatestDraft(tx, page.id);
        if (!latestDraft) throw new HomepageRevisionNotFoundError(revision);
        if (revision !== latestDraft.revision) throw new HomepageRevisionConflictError(latestDraft.revision);
        const publishedTranslations = await getPublishedTranslations(tx, page.id);
        const previousSource = homepageTranslationsEqual(latestDraft.translations, publishedTranslations) ? 'published' : 'draft';

        const translations = latestDraft.translations;
        const referencedAssetIds = homepageAssetIds(translations);
        if (referencedAssetIds.length > 0) {
          const activeAssets = await activeHomepageAssetsQuery(tx, referencedAssetIds);
          const inactiveIds = inactiveHomepageAssetIds(referencedAssetIds, activeAssets.map((asset) => asset.id));
          if (inactiveIds.length > 0) throw new HomepageInactiveMediaError(inactiveIds);
        }
        for (const translation of translations) {
          await tx.insert(pageTranslations).values({ ...translation, pageId: page.id }).onConflictDoUpdate({
            target: [pageTranslations.pageId, pageTranslations.locale],
            set: {
              title: translation.title,
              seoTitle: translation.seoTitle,
              seoDescription: translation.seoDescription,
              blocks: translation.blocks,
            },
          });
        }
        const publishedAt = new Date();
        const [publishedPage] = await tx.update(pages).set({
          status: 'PUBLISHED',
          publishedAt,
          updatedBy: actor.actorId,
        }).where(eq(pages.id, page.id)).returning();
        if (!publishedPage) throw new Error('首页发布失败');
        const state = {
          page: pageSummary(publishedPage),
          revision,
          savedAt: publishedAt,
          source: 'published' as const,
          translations,
        };
        await tx.insert(auditLogs).values({
          actorId: actor.actorId,
          action: 'PUBLISH',
          entityType: 'homepage',
          entityId: 'home',
          before: { revision, source: previousSource },
          after: { revision: state.revision, source: state.source },
          ipHash: actor.ipHash,
        });
        return state;
      });
    },
  };
}

export const homepageRepository = createHomepageRepository();
