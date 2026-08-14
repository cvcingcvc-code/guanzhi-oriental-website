import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-longer-than-32-chars';
process.env.IP_HASH_SALT = 'test-ip-hash-salt-long-enough';
process.env.CORS_ORIGINS = 'https://allowed.example.test';
process.env.SWAGGER_ENABLED = 'false';
process.env.UPLOAD_DIR = './.codex-tmp/test-uploads';

const { installDatabaseUnavailableErrorHandler } = await import('../src/app.js');
const { configureDatabasePoolLogger, pool } = await import('../src/db/client.js');
const { databaseErrorMetadata, isDatabaseUnavailableError } = await import('../src/db/errors.js');

test('pg Pool idle connection error is handled and logged without sensitive details', () => {
  const logs: Array<{ bindings: unknown; message: string }> = [];
  configureDatabasePoolLogger({
    error(bindings, message) {
      logs.push({ bindings, message });
    },
  });

  const idleError = Object.assign(new Error('terminating connection for postgresql://user:secret@db:5432/app'), {
    code: '57P01',
    severity: 'FATAL',
  });

  assert.ok(pool.listenerCount('error') > 0);
  assert.doesNotThrow(() => pool.emit('error', idleError));
  assert.deepEqual(logs, [{
    bindings: { databaseError: { name: 'Error', code: '57P01', severity: 'FATAL' } },
    message: 'PostgreSQL pool reported an idle client error',
  }]);
  assert.equal(JSON.stringify(logs).includes('secret'), false);
});

test('database availability detection follows nested driver causes without treating business errors as outages', () => {
  const unavailable = Object.assign(new Error('query failed'), {
    name: 'DrizzleQueryError',
    cause: Object.assign(new Error('private topology must not be returned'), { code: 'ECONNREFUSED' }),
  });

  assert.equal(isDatabaseUnavailableError(unavailable), true);
  assert.deepEqual(databaseErrorMetadata(unavailable), { name: 'DrizzleQueryError', code: 'ECONNREFUSED' });
  assert.equal(isDatabaseUnavailableError(Object.assign(new Error('duplicate'), { code: '23505' })), false);
});

test('database-dependent request failures return a controlled sanitized 503 response', async () => {
  const { default: Fastify } = await import('fastify');
  const app = Fastify({ logger: false });
  installDatabaseUnavailableErrorHandler(app);
  app.get('/__test/database-unavailable', async () => {
    throw Object.assign(new Error('Failed query: select secret from internal_table'), {
      name: 'DrizzleQueryError',
      cause: Object.assign(new Error('connect ECONNREFUSED db.internal:5432'), { code: 'ECONNREFUSED' }),
    });
  });

  const response = await app.inject('/__test/database-unavailable');
  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.json(), {
    ok: false,
    error: { code: 'SERVICE_UNAVAILABLE', message: '服务暂时不可用' },
  });
  assert.equal(response.body.includes('select secret'), false);
  assert.equal(response.body.includes('db.internal'), false);
  await app.close();
});
