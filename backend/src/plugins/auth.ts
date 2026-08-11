import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorate('authenticate', async function authenticate(request, reply) {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ ok: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } });
    }
  });

  app.decorate('requireAdmin', async function requireAdmin(request, reply) {
    try {
      await request.jwtVerify();
      if (request.user.role !== 'ADMIN') {
        return reply.code(403).send({ ok: false, error: { code: 'FORBIDDEN', message: '需要管理员权限' } });
      }
    } catch {
      if (!reply.sent) return reply.code(401).send({ ok: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } });
    }
  });
};

export default fp(authPlugin, { name: 'auth' });
