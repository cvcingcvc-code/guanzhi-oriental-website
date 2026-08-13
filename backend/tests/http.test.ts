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

test('CSV 将用户可控的表格公式转为文本', () => {
  const csv = toCsv([{
    equals: '=HYPERLINK("https://evil.example")',
    plus: '+cmd',
    minus: '-2+3',
    at: '@SUM(1,1)',
    spaced: '  =1+1',
    safe: 'ordinary text',
  }]);
  assert.match(csv, /"'=HYPERLINK\(""https:\/\/evil\.example""\)"/);
  assert.match(csv, /"'\+cmd"/);
  assert.match(csv, /"'-2\+3"/);
  assert.match(csv, /"'@SUM\(1,1\)"/);
  assert.match(csv, /"'  =1\+1"/);
  assert.match(csv, /"ordinary text"/);
});

test('空列表返回可被 Excel 识别的 UTF-8 BOM', () => {
  assert.equal(toCsv([]), '\uFEFF');
});
