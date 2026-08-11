import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-longer-than-32-chars';
process.env.IP_HASH_SALT = 'test-ip-hash-salt-long-enough';
process.env.PUBLIC_BASE_URL = 'http://localhost:8080';

const { createPublicRoutes } = await import('../src/routes/public.js');

test('合作咨询路由校验输入并写入规范化数据', async () => {
  const created: unknown[] = [];
  const repository = {
    async health() {},
    async createInquiry(input: unknown) {
      created.push(input);
      return { id: '00000000-0000-4000-8000-000000000030', createdAt: new Date('2026-08-11T00:00:00.000Z') };
    },
  };
  const app = Fastify();
  await app.register(createPublicRoutes(repository, async () => undefined), { prefix: '/api/v1' });

  const valid = await app.inject({ method: 'POST', url: '/api/v1/inquiries', payload: { name: '张三', organization: '测试机构', email: 'test@example.com', intent: 'co-production', message: '希望联合开发入江南产品。', website: '' } });
  assert.equal(valid.statusCode, 201);
  assert.equal(valid.json().ok, true);
  assert.equal((created[0] as { organization: string }).organization, '测试机构');
  assert.equal('website' in (created[0] as object), false);

  const invalidEmail = await app.inject({ method: 'POST', url: '/api/v1/inquiries', payload: { name: '张三', organization: '测试机构', email: 'invalid', intent: 'other' } });
  assert.equal(invalidEmail.statusCode, 400);
  assert.equal(created.length, 1);

  const honeypot = await app.inject({ method: 'POST', url: '/api/v1/inquiries', payload: { name: '张三', organization: '测试机构', email: 'test@example.com', intent: 'other', website: 'bot' } });
  assert.equal(honeypot.statusCode, 400);
  assert.equal(created.length, 1);
  await app.close();
});
