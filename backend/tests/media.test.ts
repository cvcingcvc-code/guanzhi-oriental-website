import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import type { NewMediaAsset } from '../src/media/service.js';
import type { MediaAsset, MediaRepository } from '../src/media/repository.js';
import type { StorageAdapter } from '../src/media/storage.js';

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-longer-than-32-chars';
process.env.IP_HASH_SALT = 'test-ip-hash-salt-long-enough';
process.env.PUBLIC_BASE_URL = 'http://localhost:8080';

const { HttpError } = await import('../src/lib/http.js');
const { MAX_MEDIA_UPLOAD_BYTES, MEDIA_LIMITS, MediaService } = await import('../src/media/service.js');
const { createAdminMediaRoutes } = await import('../src/routes/admin-media.js');
const { activeMediaForUpdateQuery } = await import('../src/media/repository.js');
const { db } = await import('../src/db/client.js');

const userId = '00000000-0000-4000-8000-000000000010';
const mediaId = '00000000-0000-4000-8000-000000000020';

class MemoryStorage implements StorageAdapter {
  files = new Map<string, Uint8Array>();
  deleted: string[] = [];
  async put(key: string, data: Uint8Array) { this.files.set(key, data); }
  async delete(key: string) { this.files.delete(key); this.deleted.push(key); }
  publicUrl(key: string) { return `https://media.example.test/uploads/${key}`; }
}

class MemoryRepository implements MediaRepository {
  rows: MediaAsset[] = [];
  referenced = false;
  failCreate = false;
  async listActive() { return this.rows.filter((row) => !row.deletedAt); }
  async findActive(id: string) { return this.rows.find((row) => row.id === id && !row.deletedAt); }
  async create(input: NewMediaAsset) {
    if (this.failCreate) throw new Error('database unavailable');
    const now = new Date('2026-08-11T00:00:00.000Z');
    const row: MediaAsset = { id: mediaId, ...input, width: input.width ?? null, height: input.height ?? null, altZh: input.altZh ?? null, altEn: input.altEn ?? null, category: input.category, uploadedBy: input.uploadedBy, deletedAt: null, createdAt: now, updatedAt: now };
    this.rows.push(row);
    return row;
  }
  async isReferenced() { return this.referenced; }
  async softDeleteIfUnreferenced(id: string) {
    const row = this.rows.find((item) => item.id === id && !item.deletedAt);
    if (!row) return { status: 'not-found' as const };
    if (this.referenced) return { status: 'referenced' as const };
    row.deletedAt = new Date();
    return { status: 'deleted' as const, row };
  }
}

async function png() {
  return sharp({ create: { width: 3, height: 2, channels: 3, background: '#b54a3f' } }).png().toBuffer();
}

function setup() {
  const repository = new MemoryRepository();
  const storage = new MemoryStorage();
  return { repository, storage, service: new MediaService(repository, storage) };
}

test('合法 PNG 根据真实内容上传并保存尺寸、安全 key 与 Admin DTO', async () => {
  const { service, repository, storage } = setup();
  const dto = await service.upload({ data: await png(), declaredMimeType: 'image/png', originalName: '../../客户图片.png', uploadedBy: userId, altZh: '测试图片' });
  assert.equal(dto.mimeType, 'image/png');
  assert.equal(dto.width, 3);
  assert.equal(dto.height, 2);
  assert.equal(dto.category, 'image');
  assert.equal(dto.name, '客户图片.png');
  assert.match(dto.url, /^https:\/\/media\.example\.test\/uploads\/\d{4}-\d{2}\/[0-9a-f-]+\.png$/);
  assert.equal(JSON.stringify(dto).includes('storageKey'), false);
  assert.equal(storage.files.size, 1);
  assert.equal(repository.rows[0]?.sizeBytes, (await png()).byteLength);
});

test('Admin multipart 路由返回安全媒体 DTO', async () => {
  const { service } = setup();
  const app = Fastify();
  app.decorate('authenticate', async (request: { user: unknown }) => {
    request.user = { sub: userId, email: 'admin@example.com', role: 'ADMIN', name: 'Admin' };
  });
  await app.register(multipart, { limits: { files: 1, fileSize: 50 * 1024 * 1024, fields: 5 } });
  await app.register(createAdminMediaRoutes(service, async () => undefined), { prefix: '/api/v1/admin/media' });
  const boundary = '----guanzhi-media-test';
  const data = await png();
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="safe.png"\r\nContent-Type: image/png\r\n\r\n`),
    data,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const response = await app.inject({ method: 'POST', url: '/api/v1/admin/media?altZh=%E6%B5%8B%E8%AF%95', headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, payload: body });
  assert.equal(response.statusCode, 201);
  assert.equal(response.json().data.width, 3);
  assert.equal('storageKey' in response.json().data, false);
  await app.close();
});

test('拒绝无真实 MIME、伪造 MIME、不支持类型与 SVG', async () => {
  const { service } = setup();
  const common = { originalName: 'upload.bin', uploadedBy: userId };
  const validPng = await png();
  await assert.rejects(() => service.upload({ ...common, data: Buffer.from('not a file'), declaredMimeType: 'image/png' }), (error: unknown) => error instanceof HttpError && error.statusCode === 415);
  await assert.rejects(() => service.upload({ ...common, data: validPng, declaredMimeType: 'application/pdf' }), (error: unknown) => error instanceof HttpError && /不一致/.test(error.message));
  await assert.rejects(() => service.upload({ ...common, data: Buffer.from([0x1f, 0x8b, 0x08, 0x00]), declaredMimeType: 'application/gzip' }), (error: unknown) => error instanceof HttpError && error.statusCode === 415);
  await assert.rejects(() => service.upload({ ...common, data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), declaredMimeType: 'image/svg+xml' }), (error: unknown) => error instanceof HttpError && /禁止上传 SVG/.test(error.message));
});

test('图片分类限制独立于 multipart 全局限制', async () => {
  assert.deepEqual(MEDIA_LIMITS, { image: 12 * 1024 * 1024, pdf: 20 * 1024 * 1024, video: 50 * 1024 * 1024 });
  assert.equal(MAX_MEDIA_UPLOAD_BYTES, MEDIA_LIMITS.video);
  const { service } = setup();
  const oversized = Buffer.alloc(MEDIA_LIMITS.image + 1);
  oversized.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  await assert.rejects(() => service.upload({ data: oversized, declaredMimeType: 'image/jpeg', originalName: 'large.jpg', uploadedBy: userId }), (error: unknown) => error instanceof HttpError && error.statusCode === 413);
});

test('数据库写入失败会清理已经保存的对象', async () => {
  const { service, repository, storage } = setup();
  repository.failCreate = true;
  const data = await png();
  await assert.rejects(() => service.upload({ data, declaredMimeType: 'image/png', originalName: 'orphan.png', uploadedBy: userId }), /database unavailable/);
  assert.equal(storage.files.size, 0);
  assert.equal(storage.deleted.length, 1);
});

test('未引用媒体可软删除，已引用媒体被阻止', async () => {
  const { service, repository } = setup();
  await service.upload({ data: await png(), declaredMimeType: 'image/png', originalName: 'used.png', uploadedBy: userId });
  repository.referenced = true;
  await assert.rejects(() => service.delete(mediaId), (error: unknown) => error instanceof HttpError && error.statusCode === 409);
  assert.equal(repository.rows[0]?.deletedAt, null);
  repository.referenced = false;
  await service.delete(mediaId);
  assert.ok(repository.rows[0]?.deletedAt);
  assert.deepEqual(await service.list(), []);
});

test('删除决策与软删除由 repository 原子完成，不依赖预先 isReferenced 结果', async () => {
  const { service, repository } = setup();
  await service.upload({ data: await png(), declaredMimeType: 'image/png', originalName: 'race.png', uploadedBy: userId });
  let directReferenceChecks = 0;
  repository.isReferenced = async () => { directReferenceChecks += 1; return false; };
  repository.referenced = true;
  await assert.rejects(() => service.delete(mediaId), (error: unknown) => error instanceof HttpError && error.statusCode === 409);
  assert.equal(directReferenceChecks, 0);
  assert.equal(repository.rows[0]?.deletedAt, null);
});

test('原子媒体删除查询锁定 active asset 行', () => {
  const query = activeMediaForUpdateQuery(db, mediaId).toSQL();
  assert.match(query.sql, /deleted_at.*is null/i);
  assert.match(query.sql, /for update/i);
});

test('storage URL resolver 不泄露本地根路径', async () => {
  const storage = new MemoryStorage();
  assert.equal(storage.publicUrl('2026-08/id.png'), 'https://media.example.test/uploads/2026-08/id.png');
  assert.equal(storage.publicUrl('2026-08/id.png').includes('C:\\'), false);
});
