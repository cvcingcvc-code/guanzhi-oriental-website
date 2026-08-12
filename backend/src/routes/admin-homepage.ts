import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { HttpError, ipHash, parse } from '../lib/http.js';
import {
  HomepageNotFoundError,
  HomepageInactiveMediaError,
  HomepageRevisionConflictError,
  HomepageRevisionNotFoundError,
  homepageRepository,
  homepageTranslationsSchema,
  type HomepageRepository,
} from '../homepage/repository.js';

const draftWriteSchema = z.object({
  baseRevision: z.number().int().min(0),
  translations: homepageTranslationsSchema,
}).strict();

const publishSchema = z.object({ revision: z.number().int().positive() }).strict();

function translateRepositoryError(error: unknown): never {
  if (error instanceof HomepageNotFoundError) throw new HttpError(404, '首页不存在');
  if (error instanceof HomepageRevisionNotFoundError) throw new HttpError(404, error.message, { revision: error.revision });
  if (error instanceof HomepageInactiveMediaError) throw new HttpError(422, error.message, { assetIds: error.assetIds });
  if (error instanceof HomepageRevisionConflictError) {
    throw new HttpError(409, error.message, { currentRevision: error.currentRevision });
  }
  throw error;
}

export function createAdminHomepageRoutes(repository: HomepageRepository): FastifyPluginAsync {
  return async (app) => {
    app.get('/', {
      preHandler: app.authenticate,
      schema: { tags: ['后台-首页'], summary: '读取首页最新草稿或已发布内容', security: [{ bearerAuth: [] }] },
    }, async () => {
      try {
        return { ok: true, data: await repository.get() };
      } catch (error) {
        return translateRepositoryError(error);
      }
    });

    app.put('/draft', {
      preHandler: app.authenticate,
      schema: { tags: ['后台-首页'], summary: '保存双语首页草稿', security: [{ bearerAuth: [] }] },
    }, async (request) => {
      const input = parse(draftWriteSchema, request.body);
      try {
        const state = await repository.saveDraft(input.baseRevision, input.translations, {
          actorId: request.user.sub,
          ipHash: ipHash(request),
        });
        return { ok: true, data: state };
      } catch (error) {
        return translateRepositoryError(error);
      }
    });

    app.post('/publish', {
      preHandler: app.requireAdmin,
      schema: { tags: ['后台-首页'], summary: '发布指定首页草稿版本', security: [{ bearerAuth: [] }] },
    }, async (request) => {
      const input = parse(publishSchema, request.body);
      try {
        const state = await repository.publish(input.revision, {
          actorId: request.user.sub,
          ipHash: ipHash(request),
        });
        return { ok: true, data: state };
      } catch (error) {
        return translateRepositoryError(error);
      }
    });
  };
}

export default createAdminHomepageRoutes(homepageRepository);
