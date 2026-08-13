import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';

export type CurrentAuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'EDITOR';
  active: boolean;
};

export type CurrentUserLoader = (id: string) => Promise<CurrentAuthUser | undefined>;

async function loadCurrentUser(id: string) {
  const [user] = await db.select({
    id: users.id,
    email: users.email,
    displayName: users.displayName,
    role: users.role,
    active: users.active,
  }).from(users).where(eq(users.id, id)).limit(1);
  return user;
}

export function createAuthPlugin(findCurrentUser: CurrentUserLoader = loadCurrentUser) {
  const plugin: FastifyPluginAsync = async (app) => {
    async function verifyCurrentUser(request: FastifyRequest) {
      await request.jwtVerify();
      const user = await findCurrentUser(request.user.sub);
      if (!user?.active) throw new Error('inactive user');
      request.user = { sub: user.id, email: user.email, role: user.role, name: user.displayName };
    }

    app.decorate('authenticate', async function authenticate(request, reply) {
      try {
        await verifyCurrentUser(request);
      } catch {
        return reply.code(401).send({ ok: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } });
      }
    });

    app.decorate('requireAdmin', async function requireAdmin(request, reply) {
      try {
        await verifyCurrentUser(request);
        if (request.user.role !== 'ADMIN') {
          return reply.code(403).send({ ok: false, error: { code: 'FORBIDDEN', message: '需要管理员权限' } });
        }
      } catch {
        if (!reply.sent) return reply.code(401).send({ ok: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } });
      }
    });
  };

  return fp(plugin, { name: 'auth' });
}

export default createAuthPlugin();
