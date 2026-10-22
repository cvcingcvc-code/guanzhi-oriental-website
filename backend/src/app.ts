import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config.js';
import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import contentRoutes from './routes/content.js';
import adminPagesRoutes from './routes/admin-pages.js';
import adminMediaRoutes from './routes/admin-media.js';
import adminInquiriesRoutes from './routes/admin-inquiries.js';
import adminSettingsRoutes from './routes/admin-settings.js';
import adminUsersRoutes from './routes/admin-users.js';
import adminHomepageRoutes from './routes/admin-homepage.js';
import publicMediaRoutes from './routes/public-media.js';
import { HttpError } from './lib/http.js';
import { MAX_MEDIA_UPLOAD_BYTES } from './media/service.js';
import { configureDatabasePoolLogger } from './db/client.js';
import { databaseErrorMetadata, isDatabaseUnavailableError } from './db/errors.js';

export function installDatabaseUnavailableErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    if (!isDatabaseUnavailableError(error)) throw error;
    request.log.error({ databaseError: databaseErrorMetadata(error) }, 'database request unavailable');
    return reply.code(503).send({ ok: false, error: { code: 'SERVICE_UNAVAILABLE', message: '服务暂时不可用' } });
  });
}

export async function buildApp() {
  const hops = config.TRUST_PROXY_HOPS;
  // Fastify v5 的 trustProxy 不再接受数字跳数：hops>0 时用函数按跳数信任
  const app = Fastify({
    logger: config.LOG_LEVEL === 'silent' ? false : { level: config.LOG_LEVEL },
    trustProxy: hops > 0 ? (address: string, hop: number) => hop < hops : false,
    bodyLimit: 1024 * 1024,
  });
  configureDatabasePoolLogger(app.log);

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      callback(new HttpError(403, '请求来源不在 CORS 白名单中'), false);
    },
  });
  await app.register(rateLimit, { global: false });
  await app.register(jwt, { secret: config.JWT_SECRET });
  await app.register(multipart, { limits: { files: 1, fileSize: MAX_MEDIA_UPLOAD_BYTES, fields: 5 } });
  if (config.swaggerEnabled) {
    await app.register(swagger, {
      openapi: {
        info: { title: '观止东方官网 API', description: '轻量 CMS、双语内容、媒体与合作线索接口', version: '1.0.0' },
        servers: [{ url: config.PUBLIC_BASE_URL }],
        components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
      },
    });
    await app.register(swaggerUi, { routePrefix: '/docs' });
  }
  await app.register(authPlugin);

  await app.register(async (api) => {
    installDatabaseUnavailableErrorHandler(api);

    await api.register(publicMediaRoutes);
    await api.register(publicRoutes, { prefix: '/api/v1' });
    await api.register(contentRoutes, { prefix: '/api/v1' });
    await api.register(authRoutes, { prefix: '/api/v1/admin/auth' });
    await api.register(adminHomepageRoutes, { prefix: '/api/v1/admin/homepage' });
    await api.register(adminPagesRoutes, { prefix: '/api/v1/admin/pages' });
    await api.register(adminMediaRoutes, { prefix: '/api/v1/admin/media' });
    await api.register(adminInquiriesRoutes, { prefix: '/api/v1/admin/inquiries' });
    await api.register(adminSettingsRoutes, { prefix: '/api/v1/admin/settings' });
    await api.register(adminUsersRoutes, { prefix: '/api/v1/admin/users' });
  });

  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: '接口不存在' } }));
  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'request failed');
    if (error instanceof HttpError) return reply.code(error.statusCode).send({ ok: false, error: { code: 'REQUEST_ERROR', message: error.message, details: error.details } });
    const candidate = error as { statusCode?: number; code?: string; message?: string };
    const statusCode = typeof candidate.statusCode === 'number' && candidate.statusCode < 500 ? candidate.statusCode : 500;
    if (candidate.code === '23505') return reply.code(409).send({ ok: false, error: { code: 'CONFLICT', message: '数据已存在' } });
    return reply.code(statusCode).send({ ok: false, error: { code: statusCode === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR', message: statusCode === 500 ? '服务器内部错误' : (candidate.message ?? '请求失败') } });
  });

  return app;
}
