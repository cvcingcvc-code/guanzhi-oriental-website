import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import type { FastifyPluginAsync } from 'fastify';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { mediaAssets } from '../db/schema.js';
import { audit } from '../lib/audit.js';
import { HttpError, parse } from '../lib/http.js';

const allowedTypes: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif', 'image/svg+xml': '.svg', 'video/mp4': '.mp4', 'application/pdf': '.pdf',
};

const routes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', { schema: { tags: ['后台-媒体'], summary: '媒体资产列表', security: [{ bearerAuth: [] }] } }, async () => {
    const rows = await db.select().from(mediaAssets).where(isNull(mediaAssets.deletedAt)).orderBy(desc(mediaAssets.createdAt));
    return { ok: true, data: rows.map((row) => ({ ...row, url: `${config.PUBLIC_BASE_URL}/uploads/${row.storageKey}` })) };
  });

  app.post('/', { schema: { tags: ['后台-媒体'], summary: '上传图片、视频或 PDF', security: [{ bearerAuth: [] }], consumes: ['multipart/form-data'] } }, async (request, reply) => {
    const query = parse(z.object({ altZh: z.string().max(300).optional(), altEn: z.string().max(300).optional(), category: z.string().max(80).optional() }), request.query);
    const file = await request.file();
    if (!file) throw new HttpError(422, '请选择文件');
    const extension = allowedTypes[file.mimetype];
    if (!extension) throw new HttpError(415, '不支持的文件类型');
    await mkdir(config.UPLOAD_DIR, { recursive: true });
    const storageKey = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}${extension}`;
    const absolutePath = path.resolve(config.UPLOAD_DIR, storageKey);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await pipeline(file.file, createWriteStream(absolutePath, { flags: 'wx' }));
    if (file.file.truncated) {
      await unlink(absolutePath).catch(() => undefined);
      throw new HttpError(413, '文件超过大小限制');
    }
    const [created] = await db.insert(mediaAssets).values({ storageKey: storageKey.replaceAll('\\', '/'), originalName: file.filename.slice(0, 255), mimeType: file.mimetype, sizeBytes: file.file.bytesRead, altZh: query.altZh, altEn: query.altEn, category: query.category, uploadedBy: request.user.sub }).returning();
    if (!created) throw new Error('Failed to save media');
    await audit(request, 'UPLOAD', 'media', created.id, undefined, created);
    return reply.code(201).send({ ok: true, data: { ...created, url: `${config.PUBLIC_BASE_URL}/uploads/${created.storageKey}` } });
  });

  app.delete('/:id', { schema: { tags: ['后台-媒体'], summary: '软删除媒体资产', security: [{ bearerAuth: [] }] } }, async (request) => {
    const id = parse(z.uuid(), (request.params as { id: string }).id);
    const [before] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, id), isNull(mediaAssets.deletedAt))).limit(1);
    if (!before) throw new HttpError(404, '媒体不存在');
    await db.update(mediaAssets).set({ deletedAt: new Date() }).where(eq(mediaAssets.id, id));
    await audit(request, 'SOFT_DELETE', 'media', id, before);
    return { ok: true };
  });
};

export default routes;
