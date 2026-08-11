import type { FastifyPluginAsync } from 'fastify';
import { hash } from 'bcryptjs';
import { desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { audit } from '../lib/audit.js';
import { parse } from '../lib/http.js';

const userSchema = z.object({ email: z.email().max(254), password: z.string().min(12).max(200), displayName: z.string().trim().min(2).max(80), role: z.enum(['ADMIN', 'EDITOR']).default('EDITOR') });

const routes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.requireAdmin);

  app.get('/', { schema: { tags: ['后台-账号'], summary: '管理员账号列表', security: [{ bearerAuth: [] }] } }, async () => ({ ok: true, data: await db.select({ id: users.id, email: users.email, displayName: users.displayName, role: users.role, active: users.active, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)) }));

  app.post('/', { schema: { tags: ['后台-账号'], summary: '创建后台账号', security: [{ bearerAuth: [] }] } }, async (request, reply) => {
    const input = parse(userSchema, request.body);
    const [created] = await db.insert(users).values({ email: input.email.toLowerCase(), passwordHash: await hash(input.password, 12), displayName: input.displayName, role: input.role }).returning({ id: users.id, email: users.email, displayName: users.displayName, role: users.role, active: users.active });
    if (!created) throw new Error('Failed to create user');
    await audit(request, 'CREATE', 'user', created.id, undefined, created);
    return reply.code(201).send({ ok: true, data: created });
  });
};

export default routes;
