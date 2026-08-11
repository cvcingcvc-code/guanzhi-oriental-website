import type { FastifyPluginAsync } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { auditLogs, siteSettings } from '../db/schema.js';
import { audit } from '../lib/audit.js';
import { parse } from '../lib/http.js';

const settingSchema = z.object({ value: z.unknown(), description: z.string().trim().max(300).optional() });
const keySchema = z.string().regex(/^[a-z][a-z0-9_.-]{1,119}$/);

const routes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', { schema: { tags: ['后台-设置'], summary: '全部站点设置', security: [{ bearerAuth: [] }] } }, async () => ({ ok: true, data: await db.select().from(siteSettings) }));

  app.put('/:key', { schema: { tags: ['后台-设置'], summary: '写入站点设置', security: [{ bearerAuth: [] }] } }, async (request) => {
    const key = parse(keySchema, (request.params as { key: string }).key);
    const input = parse(settingSchema, request.body);
    const [before] = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
    const [after] = await db.insert(siteSettings).values({ key, ...input, updatedBy: request.user.sub }).onConflictDoUpdate({ target: siteSettings.key, set: { ...input, updatedBy: request.user.sub } }).returning();
    await audit(request, before ? 'UPDATE' : 'CREATE', 'setting', key, before, after);
    return { ok: true, data: after };
  });

  app.get('/audit-logs', { preHandler: app.requireAdmin, schema: { tags: ['后台-设置'], summary: '操作日志', security: [{ bearerAuth: [] }] } }, async () => ({ ok: true, data: await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(500) }));
};

export default routes;
