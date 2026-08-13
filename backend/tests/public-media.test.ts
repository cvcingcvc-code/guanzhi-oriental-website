import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import Fastify from 'fastify';

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-longer-than-32-chars';
process.env.IP_HASH_SALT = 'test-ip-hash-salt-long-enough';

const { createPublicMediaRoutes } = await import('../src/routes/public-media.js');
const { HttpError } = await import('../src/lib/http.js');

test('公开媒体只发送数据库中仍 active 的对象', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'guanzhi-public-media-'));
  const storageKey = '2026-08/active.png';
  await mkdir(path.join(root, '2026-08'));
  await writeFile(path.join(root, storageKey), Buffer.from('active-media'));
  let active = true;
  const repository = {
    async findActiveByStorageKey(key: string) {
      return active && key === storageKey ? { mimeType: 'image/png' } : undefined;
    },
  };
  const app = Fastify();
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof HttpError) return reply.code(error.statusCode).send({ ok: false });
    return reply.send(error);
  });
  await app.register(createPublicMediaRoutes(repository as never, root));

  const visible = await app.inject(`/uploads/${storageKey}`);
  assert.equal(visible.statusCode, 200);
  assert.equal(visible.body, 'active-media');
  assert.equal(visible.headers['content-type'], 'image/png');

  active = false;
  assert.equal((await app.inject(`/uploads/${storageKey}`)).statusCode, 404);
  assert.equal((await app.inject('/uploads/%2e%2e/secret.txt')).statusCode, 404);
  await app.close();
  await rm(root, { recursive: true, force: true });
});
