import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import type { CurrentAuthUser } from '../src/plugins/auth.js';

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-longer-than-32-chars';
process.env.IP_HASH_SALT = 'test-ip-hash-salt-long-enough';

const { createAuthPlugin } = await import('../src/plugins/auth.js');
const { installDatabaseUnavailableErrorHandler } = await import('../src/app.js');

const id = '00000000-0000-4000-8000-000000000040';

async function setup(initial: CurrentAuthUser | undefined) {
  let current = initial;
  const app = Fastify();
  await app.register(jwt, { secret: process.env.JWT_SECRET! });
  await app.register(createAuthPlugin(async () => current));
  app.get('/protected', { preHandler: app.authenticate }, async (request) => ({ user: request.user }));
  app.get('/admin', { preHandler: app.requireAdmin }, async () => ({ ok: true }));
  await app.ready();
  const token = app.jwt.sign({ sub: id, email: 'old@example.test', role: 'ADMIN', name: 'Old Name' });
  return { app, token, setCurrent(value: CurrentAuthUser | undefined) { current = value; } };
}

test('认证每次使用数据库中的当前账号状态、资料与角色', async () => {
  const admin: CurrentAuthUser = { id, email: 'current@example.test', displayName: 'Current Name', role: 'ADMIN', active: true };
  const { app, token, setCurrent } = await setup(admin);
  const headers = { authorization: `Bearer ${token}` };

  const active = await app.inject({ url: '/protected', headers });
  assert.equal(active.statusCode, 200);
  assert.deepEqual(active.json().user, { sub: id, email: admin.email, role: 'ADMIN', name: admin.displayName });
  assert.equal((await app.inject({ url: '/admin', headers })).statusCode, 200);

  setCurrent({ ...admin, role: 'EDITOR' });
  assert.equal((await app.inject({ url: '/admin', headers })).statusCode, 403);

  setCurrent({ ...admin, active: false });
  assert.equal((await app.inject({ url: '/protected', headers })).statusCode, 401);

  setCurrent(undefined);
  assert.equal((await app.inject({ url: '/protected', headers })).statusCode, 401);
  await app.close();
});

test('无效或缺失 JWT 被统一拒绝', async () => {
  const { app } = await setup({ id, email: 'admin@example.test', displayName: 'Admin', role: 'ADMIN', active: true });
  assert.equal((await app.inject('/protected')).statusCode, 401);
  assert.equal((await app.inject({ url: '/protected', headers: { authorization: 'Bearer invalid' } })).statusCode, 401);
  await app.close();
});

test('数据库不可用不会被认证 hook 伪装成 401', async () => {
  const app = Fastify();
  installDatabaseUnavailableErrorHandler(app);
  await app.register(jwt, { secret: process.env.JWT_SECRET! });
  await app.register(createAuthPlugin(async () => {
    throw Object.assign(new Error('connection failed'), { code: 'ECONNREFUSED' });
  }));
  app.get('/protected', { preHandler: app.authenticate }, async () => ({ ok: true }));
  const token = app.jwt.sign({ sub: id, email: 'admin@example.test', role: 'ADMIN', name: 'Admin' });

  const response = await app.inject({ url: '/protected', headers: { authorization: `Bearer ${token}` } });
  assert.equal(response.statusCode, 503);
  assert.equal(response.json().error.code, 'SERVICE_UNAVAILABLE');
  await app.close();
});
