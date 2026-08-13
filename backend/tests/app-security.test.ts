import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-longer-than-32-chars';
process.env.IP_HASH_SALT = 'test-ip-hash-salt-long-enough';
process.env.CORS_ORIGINS = 'https://allowed.example.test';
process.env.SWAGGER_ENABLED = 'false';
process.env.UPLOAD_DIR = './.codex-tmp/test-uploads';

const { buildApp } = await import('../src/app.js');

test('不在白名单的 Origin 返回 403，生产式配置不注册 Swagger', async () => {
  const app = await buildApp();
  const rejected = await app.inject({ method: 'OPTIONS', url: '/api/v1/health', headers: { origin: 'https://evil.example.test', 'access-control-request-method': 'GET' } });
  assert.equal(rejected.statusCode, 403);
  assert.equal(rejected.json().message, '请求来源不在 CORS 白名单中');
  assert.equal((await app.inject('/docs')).statusCode, 404);
  await app.close();
});
