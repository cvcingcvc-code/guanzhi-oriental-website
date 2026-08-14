# 全栈开发交接

更新时间：2026-08-14

## 1. 当前状态

- 稳定主线基线：`master@ed253edcf6e39b86f4409c933e2925268a82305a`
- P2 基线：`codex/p2-maintenance@607791da7813013ff9026550ce8152a3321991b3`
- P2 PR：`#6 chore: harden P2 maintenance baseline`，OPEN、Draft、CI 全绿；不得由本交接任务自动合并。
- 本轮联调分支：`codex/fullstack-integration`，基于上述 P2 HEAD 创建。
- 本地已实际跑通 Browser → React/Vite → Fastify → Zod → Drizzle → PostgreSQL → response → UI；这不代表生产环境已经部署。

## 2. 技术栈

Frontend 使用 React 18、React Router 7、Vite 6、TypeScript、Vitest。Backend 使用 Node.js 24、Fastify、Zod、Drizzle ORM、PostgreSQL 17。Docker Compose 提供本地数据库与 API；GitHub Actions 执行 CI 门禁。

## 3. 目录

| 路径 | 用途 |
| --- | --- |
| `src/` | React 公共站点、Admin UI、前端 API/DTO 适配 |
| `backend/src/` | Fastify routes、校验、业务/仓储、Drizzle 数据访问 |
| `backend/drizzle/` | 数据库 migrations |
| `public/` | 随前端发布的静态资源 |
| `docs/` | Contract、CMS、Backend 与协作交接文档 |
| `.github/workflows/` | CI |
| `compose.yaml` | 本地 PostgreSQL、API 与上传卷 |

## 4. 从 clone 到全栈启动

要求：Git、Node.js 24、npm、Docker Engine 与 Docker Compose。

```powershell
git clone https://github.com/cvcingcvc-code/guanzhi-oriental-website.git
cd guanzhi-oriental-website
nvm use
npm ci
Push-Location backend
npm ci
Pop-Location
Copy-Item .env.docker.example .env
```

仅在本机编辑 `.env` 中的占位值，使用开发专用强密码与 Secret，不要提交该文件。然后启动数据库和 API：

```powershell
docker compose up --build -d
docker compose ps
Invoke-RestMethod http://127.0.0.1:8080/api/v1/health
```

API 容器启动命令会依次运行 migration、seed 和 server。也可以在已配置的 Backend 环境中手动执行 `npm run db:migrate`、`npm run db:seed`、`npm run dev`。

另开终端启动前端：

```powershell
npm run dev
```

默认地址：Frontend `http://localhost:3000`，Backend `http://127.0.0.1:8080`，PostgreSQL `127.0.0.1:5432`。Vite 代理 `/api` 到 Backend；若自定义端口，需同步 CORS 与代理配置。

## 5. 请求链路

`React UI → frontend API/service layer → HTTP/Public DTO → Fastify route → Zod validation → repository/service → Drizzle → PostgreSQL → DTO → React state/render`

询盘提交使用 `POST /api/v1/inquiries`；公共首页使用 `GET /api/v1/content/pages/home?locale=zh-CN|en`；公开设置使用 `GET /api/v1/content/settings`。浏览器不得连接 PostgreSQL。

## 6. API / Contract 原则

Public DTO 是 Frontend 与 Backend 的稳定边界。UI 不得导入 `backend/src/*`，不得使用数据库 Schema 作为组件模型，也不得依赖 storage key、HTML、CSS、React component 或 GSAP 等 Backend 内部表示。Contract 变更必须使用独立 PR，说明兼容性并经过 Backend Review；详见 `docs/content-contract.md` 与 `docs/frontend-replacement-guide.md`。

## 7. UI 替换指南

可替换：React component、CSS、layout、responsive、视觉资产和交互呈现。

不可绕过或静默破坏：HTTP API、Public DTO、认证、角色权限、Backend validation、数据库 Schema、CMS draft/publish/revision 语义。需要 Backend 变化时先写清请求/响应和兼容策略，再由 Backend Review。

## 8. CMS

入口为 `/admin/homepage`。`ADMIN` 与 `EDITOR` 均可登录、恢复 session、读取内容、保存双语草稿和使用媒体库；只有 `ADMIN` 可发布。草稿写入 `page_revisions`，不会改变公共读取的 `page_translations`；发布指定 revision 后才原子更新公共内容。保存使用 `baseRevision` 乐观锁，过期编辑器收到 `409`，不得静默覆盖。

JWT 只保存在当前标签页 `sessionStorage`。不要把 token 写入 URL、文档、日志或 Git。

## 9. 数据库与媒体

本地使用 PostgreSQL 17 与 Docker named volume；migration 必须能在空数据库执行。Schema 变更必须带 migration，生产迁移必须先备份并在维护流程中显式执行，不能依赖开发机状态。

媒体经 multipart API 进入 Backend，校验真实 MIME、大小和图像尺寸后由 StorageAdapter 保存并写入 `media_assets`。Public DTO 只暴露解析后的 URL；被内容引用的媒体禁止删除。不要提交本地上传卷或数据库 dump。

## 10. 测试与门禁

```powershell
# Frontend + root contract
npm test
npm run build
npm audit

# Backend
Push-Location backend
npm run typecheck
npm test
npm run build
npm audit --omit=dev
Pop-Location

git diff --check
git status --short
```

涉及真实数据流时，还应在隔离数据库中验证 health、migration、询盘落库、CMS draft/publish/restore、权限、媒体上传/读取/删除与前台渲染。测试数据必须标记 `TEST`/`DEV`/`LOCAL` 并清理。

## 11. GitHub 协作

流程：`master → topic branch → commit → push → Draft PR → CI → Review → Ready → Merge`。一个分支只处理一个主题，使用 Conventional Commits。禁止直接向 `master` 推业务代码、自动合并未经授权的 PR，或 force push 已参与协作的分支。

PR 应列明范围/非范围、API/Contract/Schema 影响、测试命令、浏览器验证和剩余风险。CI 绿不替代 Review；涉及 Backend Contract 的修改必须请求 Backend Review。

## 12. 已知问题

- 当前没有已知 P0/P1 联调问题。
- Drizzle Kit 的开发依赖链仍报告 4 个 moderate；Backend production dependencies audit 为 0。不要运行破坏性的 `npm audit fix --force`，后续等待兼容升级路径。
- 英文正式文案（已确认范围之外）、隐私政策、数据保留规则与生产运维责任仍需业务/法务/运维负责人确认，本阶段不修改。
- 本轮没有真实生产 Deployment/Environment 或生产 URL，因此不能声称 Production Ready 或生产冒烟通过。

## 13. 服务器部署前 checklist

- 域名、DNS 与生产 URL
- 服务器/区域/容量和最小权限访问
- TLS 证书与续期
- Secret/环境变量托管与轮换
- PostgreSQL 实例、网络限制、备份与恢复演练
- 反向代理、容器/进程编排与健康检查
- 上传对象存储或持久卷及备份策略
- 日志、指标、告警、审计与值班责任
- 安全响应头、CORS、代理跳数和速率限制复核
- 生产 migration 计划、回滚方案与部署后 smoke test

## 14. 后续 UI 开发者接手

1. 按第 4 节启动全栈并先检查 health。
2. 阅读 `docs/content-contract.md`、`docs/frontend-replacement-guide.md` 和 `docs/homepage-cms.md`。
3. 保留 `src/content` / `src/admin/api.ts` 等 HTTP 边界；UI 可替换，但不要导入 Backend 源码或数据库模型。
4. 对 success、failure、fallback、语言切换、表单提交和 Router 刷新做回归。
5. 从最新允许的基线创建主题分支并开 Draft PR；查看 Actions CI。若 DTO/API 不足，单独提出 Backend 变更 PR，不在 UI PR 中暗改 Contract。
