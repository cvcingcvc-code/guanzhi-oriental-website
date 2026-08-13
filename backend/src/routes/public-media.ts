import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyPluginAsync } from 'fastify';
import fastifyStatic from '@fastify/static';
import { HttpError } from '../lib/http.js';
import { mediaRepository, type MediaRepository } from '../media/repository.js';
import { mediaStorage } from '../media/index.js';
import { normalizedStorageKey } from '../media/storage.js';

export function createPublicMediaRoutes(repository: Pick<MediaRepository, 'findActiveByStorageKey'>, localRoot: string): FastifyPluginAsync {
  return async (app) => {
    const root = path.resolve(localRoot);
    await mkdir(root, { recursive: true });
    await app.register(fastifyStatic, { root, serve: false });
    app.get('/uploads/*', async (request, reply) => {
      const rawKey = (request.params as { '*': string })['*'];
      let storageKey: string;
      try {
        storageKey = normalizedStorageKey(decodeURIComponent(rawKey));
      } catch {
        throw new HttpError(404, '媒体不存在');
      }
      const asset = await repository.findActiveByStorageKey(storageKey);
      if (!asset) throw new HttpError(404, '媒体不存在');
      return reply.type(asset.mimeType).sendFile(storageKey);
    });
  };
}

export default mediaStorage.localRoot
  ? createPublicMediaRoutes(mediaRepository, mediaStorage.localRoot)
  : async () => undefined;
