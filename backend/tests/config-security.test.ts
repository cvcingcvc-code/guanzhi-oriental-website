import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-longer-than-32-chars';
process.env.IP_HASH_SALT = 'test-ip-hash-salt-long-enough';

const { parseConfig } = await import('../src/config.js');

const safeProductionEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://app:strong-password@localhost:5432/app',
  JWT_SECRET: 'production-test-jwt-secret-with-strong-length',
  IP_HASH_SALT: 'production-test-ip-hash-salt',
  CORS_ORIGINS: 'https://www.example.test',
};

test('生产默认关闭 Swagger 且默认不信任代理', () => {
  const config = parseConfig(safeProductionEnv);
  assert.equal(config.swaggerEnabled, false);
  assert.equal(config.TRUST_PROXY_HOPS, 0);
});

test('生产拒绝示例 secret 与通配 CORS', () => {
  for (const overrides of [
    { JWT_SECRET: 'replace-with-at-least-32-random-characters' },
    { IP_HASH_SALT: 'change-this-ip-hash-salt' },
    { DATABASE_URL: 'postgresql://app:change-me@localhost:5432/app' },
    { CORS_ORIGINS: '*' },
  ]) {
    assert.throws(() => parseConfig({ ...safeProductionEnv, ...overrides }), /production secrets must not use local\/example values/);
  }
});

test('生产只在显式配置时启用 Swagger 和可信代理跳数', () => {
  const config = parseConfig({ ...safeProductionEnv, SWAGGER_ENABLED: 'true', TRUST_PROXY_HOPS: '1' });
  assert.equal(config.swaggerEnabled, true);
  assert.equal(config.TRUST_PROXY_HOPS, 1);
});
