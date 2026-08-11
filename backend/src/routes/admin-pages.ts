import type { FastifyPluginAsync } from 'fastify';
import { and, desc, eq, max } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { pages, pageRevisions, pageTranslations } from '../db/schema.js';
import { audit } from '../lib/audit.js';
import { HttpError, parse } from '../lib/http.js';
import { contentDocumentSchema, homeContentDocumentSchema } from '../content/contract.js';

const translationSchema = z.object({
  locale: z.enum(['zh-CN', 'en']),
  title: z.string().trim().min(1).max(200),
  seoTitle: z.string().trim().max(200).nullable().optional(),
  seoDescription: z.string().trim().max(500).nullable().optional(),
  blocks: contentDocumentSchema,
});
const pageWriteSchema = z.object({ slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120), translations: z.array(translationSchema).min(1).max(2) })
  .superRefine((input, context) => {
    if (input.slug !== 'home') return;
    input.translations.forEach((translation, index) => {
      const result = homeContentDocumentSchema.safeParse(translation.blocks);
      if (!result.success) {
        context.addIssue({ code: 'custom', path: ['translations', index, 'blocks'], message: 'home 页面必须包含完整首页 Typed Blocks' });
      }
    });
  });
const idSchema = z.uuid();

async function getPage(id: string) {
  const [page] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
  if (!page) throw new HttpError(404, '页面不存在');
  const translations = await db.select().from(pageTranslations).where(eq(pageTranslations.pageId, id));
  return { ...page, translations };
}

type RevisionDb = Pick<typeof db, 'select' | 'insert'>;

async function saveRevision(tx: RevisionDb, pageId: string, actorId: string) {
  const [current] = await tx.select({ value: max(pageRevisions.revision) }).from(pageRevisions).where(eq(pageRevisions.pageId, pageId));
  const [page] = await tx.select().from(pages).where(eq(pages.id, pageId)).limit(1);
  const translations = await tx.select().from(pageTranslations).where(eq(pageTranslations.pageId, pageId));
  await tx.insert(pageRevisions).values({ pageId, revision: (current?.value ?? 0) + 1, snapshot: { ...page, translations }, createdBy: actorId });
}

const routes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', { schema: { tags: ['后台-页面'], summary: '页面列表', security: [{ bearerAuth: [] }] } }, async () => ({ ok: true, data: await db.select().from(pages).orderBy(desc(pages.updatedAt)) }));

  app.get('/:id', { schema: { tags: ['后台-页面'], summary: '页面详情', security: [{ bearerAuth: [] }] } }, async (request) => {
    const id = parse(idSchema, (request.params as { id: string }).id);
    return { ok: true, data: await getPage(id) };
  });

  app.post('/', { schema: { tags: ['后台-页面'], summary: '新建双语页面', security: [{ bearerAuth: [] }] } }, async (request, reply) => {
    const input = parse(pageWriteSchema, request.body);
    const created = await db.transaction(async (tx) => {
      const [page] = await tx.insert(pages).values({ slug: input.slug, createdBy: request.user.sub, updatedBy: request.user.sub }).returning();
      if (!page) throw new Error('Failed to create page');
      await tx.insert(pageTranslations).values(input.translations.map((item) => ({ ...item, pageId: page.id })));
      await saveRevision(tx, page.id, request.user.sub);
      return page;
    });
    await audit(request, 'CREATE', 'page', created.id, undefined, input);
    return reply.code(201).send({ ok: true, data: await getPage(created.id) });
  });

  app.put('/:id', { schema: { tags: ['后台-页面'], summary: '更新页面并保留版本', security: [{ bearerAuth: [] }] } }, async (request) => {
    const id = parse(idSchema, (request.params as { id: string }).id);
    const input = parse(pageWriteSchema, request.body);
    const before = await getPage(id);
    await db.transaction(async (tx) => {
      await tx.update(pages).set({ slug: input.slug, updatedBy: request.user.sub }).where(eq(pages.id, id));
      for (const translation of input.translations) {
        await tx.insert(pageTranslations).values({ ...translation, pageId: id }).onConflictDoUpdate({
          target: [pageTranslations.pageId, pageTranslations.locale],
          set: { title: translation.title, seoTitle: translation.seoTitle, seoDescription: translation.seoDescription, blocks: translation.blocks },
        });
      }
      await saveRevision(tx, id, request.user.sub);
    });
    const after = await getPage(id);
    await audit(request, 'UPDATE', 'page', id, before, after);
    return { ok: true, data: after };
  });

  app.post('/:id/publish', { schema: { tags: ['后台-页面'], summary: '发布页面', security: [{ bearerAuth: [] }] } }, async (request) => {
    const id = parse(idSchema, (request.params as { id: string }).id);
    const before = await getPage(id);
    const locales = new Set(before.translations.map((item) => item.locale));
    if (!locales.has('zh-CN') || !locales.has('en')) throw new HttpError(422, '发布前必须同时提供中文和英文内容');
    await db.update(pages).set({ status: 'PUBLISHED', publishedAt: new Date(), updatedBy: request.user.sub }).where(eq(pages.id, id));
    const after = await getPage(id);
    await audit(request, 'PUBLISH', 'page', id, before, after);
    return { ok: true, data: after };
  });

  app.post('/:id/unpublish', { schema: { tags: ['后台-页面'], summary: '撤回为草稿', security: [{ bearerAuth: [] }] } }, async (request) => {
    const id = parse(idSchema, (request.params as { id: string }).id);
    await db.update(pages).set({ status: 'DRAFT', updatedBy: request.user.sub }).where(eq(pages.id, id));
    await audit(request, 'UNPUBLISH', 'page', id);
    return { ok: true, data: await getPage(id) };
  });

  app.get('/:id/revisions', { schema: { tags: ['后台-页面'], summary: '页面版本历史', security: [{ bearerAuth: [] }] } }, async (request) => {
    const id = parse(idSchema, (request.params as { id: string }).id);
    return { ok: true, data: await db.select().from(pageRevisions).where(eq(pageRevisions.pageId, id)).orderBy(desc(pageRevisions.revision)) };
  });
};

export default routes;
