/* =============================================================
   观止东方 · API 端点集成测试
   运行: node --test tests/api.test.js
   启动本地 server.js 后测试 POST /api/contact
   ============================================================= */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const path = require('path');

const PORT = 3099;
const BASE = `http://localhost:${PORT}`;

let server;

before(async () => {
  // 使用子进程启动 server.js
  const { fork } = require('child_process');
  server = fork(path.join(__dirname, '..', 'server.js'), [], {
    env: { ...process.env, PORT: String(PORT) },
    silent: true,
  });
  // 等待服务器就绪
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
    server.on('message', () => { clearTimeout(timeout); resolve(); });
    // fork doesn't send messages by default; poll instead
    const poll = setInterval(() => {
      http.get(`${BASE}/`, (res) => {
        clearInterval(poll);
        clearTimeout(timeout);
        resolve();
      }).on('error', () => {});
    }, 200);
  });
});

after(() => {
  if (server) server.kill();
});

function post(data) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(data).toString();
    const req = http.request(`${BASE}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

describe('POST /api/contact', () => {
  it('有效数据应返回 200 + ok:true', async () => {
    const r = await post({ name: '李白', email: 'libai@example.com', org: '测试机构' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.ok, true);
  });

  it('无 name 应返回 422', async () => {
    const r = await post({ email: 'test@test.com' });
    assert.strictEqual(r.status, 422);
    assert.strictEqual(r.body.ok, false);
  });

  it('无 email 应返回 422', async () => {
    const r = await post({ name: '张三' });
    assert.strictEqual(r.status, 422);
    assert.strictEqual(r.body.ok, false);
  });

  it('无效 email 格式应返回 422', async () => {
    const r = await post({ name: '张三', email: 'notanemail' });
    assert.strictEqual(r.status, 422);
    assert.strictEqual(r.body.ok, false);
    assert.ok(r.body.errors.some(e => e.includes('邮箱')));
  });

  it('name 少于 2 字符应返回 422', async () => {
    const r = await post({ name: '李', email: 'li@test.com' });
    assert.strictEqual(r.status, 422);
  });

  it('仅含 org 可选字段应通过', async () => {
    const r = await post({ name: '张三', email: 'a@b.com' });
    assert.strictEqual(r.status, 200);
  });

  it('GET 请求应返回 405', async () => {
    const r = await new Promise((resolve) => {
      http.get(`${BASE}/api/contact`, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
      });
    });
    assert.strictEqual(r.status, 405);
    assert.strictEqual(r.body.ok, false);
  });

  it('空请求体应返回 422', async () => {
    const r = await post({});
    assert.strictEqual(r.status, 422);
    assert.strictEqual(r.body.ok, false);
  });

  it('JSON content-type 同样有效', async () => {
    const r = await new Promise((resolve, reject) => {
      const body = JSON.stringify({ name: '杜甫', email: 'dufu@example.com' });
      const req = http.request(`${BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.ok, true);
  });
});
