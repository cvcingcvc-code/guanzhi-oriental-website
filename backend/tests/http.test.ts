import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-longer-than-32-chars';
process.env.IP_HASH_SALT = 'test-ip-hash-salt-long-enough';

const { toCsv } = await import('../src/lib/http.js');

test('CSV 带 UTF-8 BOM 并正确转义引号', () => {
  const csv = toCsv([{ name: '观止东方', note: '他说“你好”，并写下 "hello"' }]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /观止东方/);
  assert.match(csv, /""hello""/);
});

test('空列表返回可被 Excel 识别的 UTF-8 BOM', () => {
  assert.equal(toCsv([]), '\uFEFF');
});
