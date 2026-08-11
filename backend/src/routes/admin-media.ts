import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { audit } from '../lib/audit.js';
import { HttpError, parse } from '../lib/http.js';
import { mediaService } from '../media/index.js';
import { MAX_MEDIA_UPLOAD_BYTES, type MediaService } from '../media/service.js';

type AuditWriter = (request: FastifyRequest, action: string, entityType: string, entityId?: string, before?: unknown, after?: unknown) => Promise<void>;

const querySchema = z.object({
  altZh: z.string().trim().max(300).optional(),
  altEn: z.string().trim().max(300).optional(),
});

export function createAdminMediaRoutes(service: MediaService, writeAudit: AuditWriter = audit): FastifyPluginAsync {
  return async (app) => {
    app.addHook('preHandler', app.authenticate);

    app.get('/', { schema: { tags: ['后台-媒体'], summary: '媒体资产列表', security: [{ bearerAuth: [] }] } }, async () => ({ ok: true, data: await service.list() }));

    app.post('/', { schema: { tags: ['后台-媒体'], summary: '上传图片、视频或 PDF', security: [{ bearerAuth: [] }], consumes: ['multipart/form-data'] } }, async (request, reply) => {
      const query = parse(querySchema, request.query);
      const file = await request.file({ limits: { files: 1, fileSize: MAX_MEDIA_UPLOAD_BYTES } });
      if (!file) throw new HttpError(422, '请选择文件');
      const data = await file.toBuffer();
      if (file.file.truncated) throw new HttpError(413, '文件超过 50 MiB 全局上传限制');
      const created = await service.upload({
        data,
        declaredMimeType: file.mimetype,
        originalName: file.filename,
        altZh: query.altZh,
        altEn: query.altEn,
        uploadedBy: request.user.sub,
      });
      await writeAudit(request, 'UPLOAD', 'media', created.id, undefined, created);
      return reply.code(201).send({ ok: true, data: created });
    });

    app.delete('/:id', { schema: { tags: ['后台-媒体'], summary: '软删除未被引用的媒体资产', security: [{ bearerAuth: [] }] } }, async (request) => {
      const id = parse(z.uuid(), (request.params as { id: string }).id);
      const before = await service.delete(id);
      await writeAudit(request, 'SOFT_DELETE', 'media', id, before);
      return { ok: true };
    });
  };
}

export default createAdminMediaRoutes(mediaService);
