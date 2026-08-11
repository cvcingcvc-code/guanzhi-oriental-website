import type { FastifyPluginAsync } from 'fastify';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { inquiries, inquiryNotes } from '../db/schema.js';
import { audit } from '../lib/audit.js';
import { HttpError, parse, toCsv } from '../lib/http.js';

const idSchema = z.uuid();
const statusSchema = z.enum(['NEW', 'CONTACTED', 'NEGOTIATING', 'WON', 'CLOSED']);
const querySchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20), status: statusSchema.optional(), q: z.string().trim().max(100).optional() });

function filters(query: z.infer<typeof querySchema>) {
  const values = [];
  if (query.status) values.push(eq(inquiries.status, query.status));
  if (query.q) values.push(or(ilike(inquiries.name, `%${query.q}%`), ilike(inquiries.organization, `%${query.q}%`), ilike(inquiries.email, `%${query.q}%`))!);
  return values.length ? and(...values) : undefined;
}

const routes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', { schema: { tags: ['后台-线索'], summary: '合作线索列表', security: [{ bearerAuth: [] }] } }, async (request) => {
    const query = parse(querySchema, request.query);
    const where = filters(query);
    const rows = await db.select().from(inquiries).where(where).orderBy(desc(inquiries.createdAt)).limit(query.pageSize).offset((query.page - 1) * query.pageSize);
    const [total] = await db.select({ value: count() }).from(inquiries).where(where);
    return { ok: true, data: rows, meta: { page: query.page, pageSize: query.pageSize, total: total?.value ?? 0 } };
  });

  app.get('/export.csv', { schema: { tags: ['后台-线索'], summary: '导出合作线索 CSV', security: [{ bearerAuth: [] }] } }, async (_request, reply) => {
    const rows = await db.select().from(inquiries).orderBy(desc(inquiries.createdAt));
    const csv = toCsv(rows.map((row) => ({ 编号: row.id, 状态: row.status, 姓名: row.name, 机构: row.organization, 职位: row.jobTitle, 邮箱: row.email, 联系方式: row.contact, 合作意向: row.intent, 留言: row.message, 来源: row.sourceUrl, 提交时间: row.createdAt.toISOString() })));
    return reply.header('content-type', 'text/csv; charset=utf-8').header('content-disposition', `attachment; filename="inquiries-${new Date().toISOString().slice(0, 10)}.csv"`).send(csv);
  });

  app.get('/:id', { schema: { tags: ['后台-线索'], summary: '合作线索详情', security: [{ bearerAuth: [] }] } }, async (request) => {
    const id = parse(idSchema, (request.params as { id: string }).id);
    const [item] = await db.select().from(inquiries).where(eq(inquiries.id, id)).limit(1);
    if (!item) throw new HttpError(404, '线索不存在');
    const notes = await db.select().from(inquiryNotes).where(eq(inquiryNotes.inquiryId, id)).orderBy(desc(inquiryNotes.createdAt));
    return { ok: true, data: { ...item, notes } };
  });

  app.patch('/:id/status', { schema: { tags: ['后台-线索'], summary: '更新线索状态', security: [{ bearerAuth: [] }] } }, async (request) => {
    const id = parse(idSchema, (request.params as { id: string }).id);
    const { status } = parse(z.object({ status: statusSchema }), request.body);
    const [before] = await db.select().from(inquiries).where(eq(inquiries.id, id)).limit(1);
    if (!before) throw new HttpError(404, '线索不存在');
    const [after] = await db.update(inquiries).set({ status }).where(eq(inquiries.id, id)).returning();
    await audit(request, 'STATUS_CHANGE', 'inquiry', id, { status: before.status }, { status });
    return { ok: true, data: after };
  });

  app.post('/:id/notes', { schema: { tags: ['后台-线索'], summary: '添加内部跟进记录', security: [{ bearerAuth: [] }] } }, async (request, reply) => {
    const id = parse(idSchema, (request.params as { id: string }).id);
    const { body } = parse(z.object({ body: z.string().trim().min(1).max(5000) }), request.body);
    const [created] = await db.insert(inquiryNotes).values({ inquiryId: id, body, authorId: request.user.sub }).returning();
    if (!created) throw new Error('Failed to create note');
    await audit(request, 'ADD_NOTE', 'inquiry', id, undefined, { noteId: created.id });
    return reply.code(201).send({ ok: true, data: created });
  });

  app.get('/stats/summary', { schema: { tags: ['后台-线索'], summary: '线索概览统计', security: [{ bearerAuth: [] }] } }, async () => {
    const rows = await db.select({ status: inquiries.status, value: count() }).from(inquiries).groupBy(inquiries.status);
    const [month] = await db.select({ value: count() }).from(inquiries).where(sql`${inquiries.createdAt} >= date_trunc('month', now())`);
    return { ok: true, data: { byStatus: Object.fromEntries(rows.map((row) => [row.status, row.value])), thisMonth: month?.value ?? 0 } };
  });
};

export default routes;
