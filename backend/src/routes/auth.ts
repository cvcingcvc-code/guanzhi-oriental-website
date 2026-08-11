import type { FastifyPluginAsync } from 'fastify';
import { compare } from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { config } from '../config.js';
import { parse } from '../lib/http.js';

const loginSchema = z.object({ email: z.email().max(254), password: z.string().min(8).max(200) });

const routes: FastifyPluginAsync = async (app) => {
  app.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
    schema: {
      tags: ['认证'], summary: '管理员登录',
      body: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 } } },
    },
  }, async (request, reply) => {
    const input = parse(loginSchema, request.body);
    const [user] = await db.select().from(users).where(sql`lower(${users.email}) = lower(${input.email})`).limit(1);
    if (!user || !user.active || !(await compare(input.password, user.passwordHash))) {
      return reply.code(401).send({ ok: false, error: { code: 'INVALID_CREDENTIALS', message: '邮箱或密码错误' } });
    }
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    const token = app.jwt.sign({ sub: user.id, email: user.email, role: user.role, name: user.displayName }, { expiresIn: config.JWT_EXPIRES_IN });
    return { ok: true, data: { token, expiresIn: config.JWT_EXPIRES_IN, user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role } } };
  });

  app.get('/me', { preHandler: app.authenticate, schema: { tags: ['认证'], summary: '当前登录账号', security: [{ bearerAuth: [] }] } }, async (request) => ({ ok: true, data: request.user }));
};

export default routes;
