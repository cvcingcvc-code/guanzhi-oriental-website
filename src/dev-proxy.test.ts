import { describe, expect, it } from 'vitest';
import viteConfigSource from '../vite.config.ts?raw';

// 回归测试：确保 Vite 开发服务器同时代理 /api 与 /uploads。
//
// 背景：CMS 上传的媒体由 Fastify 以 /uploads/* 提供（无 /api 前缀）。
// 只代理 /api 时，Vite 会把 /uploads/<key> 当作 SPA 路由返回 index.html（200 text/html），
// 本地开发模式下后台上传的图片在前台渲染为破图（naturalWidth = 0）。
// 生产由 deploy/Caddyfile 反代 /uploads/*，不受此影响。
function proxyBlock() {
  const match = viteConfigSource.match(/proxy:\s*\{([\s\S]*?)\n {4}\},/);
  return match?.[1] ?? '';
}

describe('Vite 开发服务器代理', () => {
  const block = proxyBlock();

  it('保留 /api 代理到 Fastify', () => {
    expect(block).toMatch(/'\/api':\s*\{[\s\S]*?target:\s*'http:\/\/127\.0\.0\.1:8080'/);
  });

  it('把 /uploads 代理到 Fastify，避免返回 SPA index.html', () => {
    expect(block).toMatch(/'\/uploads':\s*\{[\s\S]*?target:\s*'http:\/\/127\.0\.0\.1:8080'/);
  });
});
