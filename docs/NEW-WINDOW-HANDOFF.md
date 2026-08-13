# 观止东方官网｜后端生产准备交接

更新时间：2026-08-13

正式项目目录：`C:\Users\lin\projects\guanzhi-dongfang`

本轮独立后端工作树：`C:\Users\lin\projects\guanzhi-dongfang-backend`

当前后端分支：`codex/backend-production-readiness`

【项目目标】

当前阶段暂停公开官网 UI 继续迭代，优先把后端、真实 PostgreSQL、CMS 交互闭环和生产安全边界做扎实。尚未购买服务器，因此本轮只完成本地可复现的后端与数据库闭环、配置加固、测试和部署前文档，不执行 Staging 或生产部署。

后续前端可以在独立分支替换视觉实现，但必须继续消费现有 API DTO，不得绕过 Homepage Contract、双语草稿/发布语义、权限或媒体安全边界。

【当前技术栈】

- 前端：React 18、TypeScript、Vite 6；公开站和 `/admin/homepage` 共用工程。
- 后端：Node.js 24、TypeScript、Fastify 5、Zod 4。
- 数据库：PostgreSQL 17、Drizzle ORM / Drizzle Kit。
- 认证：JWT + bcrypt；每个受保护请求都会重新读取数据库中的账号 active 状态和当前角色。
- 媒体：Storage Adapter；当前使用本地持久化目录或 Docker volume。
- 基础设施：Docker Compose 编排 PostgreSQL 和 API；前端目前不在 Compose 中。
- API 文档：Swagger UI；开发可开启 `/docs`，生产默认关闭。

【项目结构】

- `src/`：公开站、后台 UI、前端内容 DTO 校验和 fallback。
- `backend/src/app.ts`：Fastify 安全插件、错误处理与路由注册。
- `backend/src/config.ts`：唯一环境变量校验入口和生产 fail-closed 规则。
- `backend/src/db/schema.ts`：Drizzle 数据库 schema。
- `backend/drizzle/0000_whole_jack_flag.sql`：当前唯一正式 migration。
- `backend/src/homepage/`：双语草稿、revision 乐观锁和原子发布。
- `backend/src/media/`：真实 MIME 校验、存储、引用保护和软删除。
- `backend/src/routes/public-media.ts`：只向公开 URL 发送数据库中仍 active 的媒体。
- `backend/src/plugins/auth.ts`：JWT 校验和数据库账号/角色复核。
- `compose.yaml`、`backend/Dockerfile`：本地及服务器容器基础。
- `docs/backend/`：API、配置和部署基线。

【已经完成】

- 建立独立后端工作树，避免混入主工作树中未完成的前端改动。
- 在一次性 PostgreSQL 17 环境执行 migration 和 bootstrap seed；得到 1 个用户、4 个页面、8 个翻译、5 个 settings。
- 真实验证 health、登录、公开内容、CMS 双语草稿保存、草稿不影响公开页、旧 revision 返回 409、ADMIN 发布和发布后读取。
- 真实验证合作咨询输入校验、写入、后台读取和状态从 `NEW` 更新为 `CONTACTED`。
- 真实验证媒体上传、公开读取、删除，以及删除后公开 URL 从 200 变为 404。
- 真实验证容器重启后的 PostgreSQL 持久化。
- 完成 `pg_dump` 与上传 volume 的备份/恢复演练；跨角色恢复使用 `pg_restore --no-owner --exit-on-error`。
- 生产环境拒绝示例密钥、示例数据库密码和通配 CORS。
- API 默认仅绑定宿主机 `127.0.0.1`；可信代理改为显式跳数配置，默认 0。
- Swagger 生产默认不注册；必须显式启用。
- JWT 不再只信任签发时角色；停用账号、删除账号和角色降级会立即作用于已有 token。
- 媒体删除同时移除存储对象，公开媒体请求先检查数据库 active 状态。
- 所有一次性数据库、测试媒体和测试咨询均为本地虚构数据，没有接触生产数据。

【关键架构决策】

- 浏览器只能访问 API，不能直接连接 PostgreSQL，也不能根据 `storageKey` 绕过数据库读取媒体。
- Homepage 仍固定为 `hero/about/capabilities/motifs/jiangnan/partners/contact` 七类 typed blocks，不扩展通用 Page Builder。
- 中英文草稿共享一个 revision，原子保存、原子发布，不允许单语言半套发布。
- `contentStatus=draft|approved` 是甲方文案状态，不等于数据库草稿/发布状态。
- 品牌名、法律主体、旗舰名称和联系邮箱来自 Settings，不复制进 Contact block。
- 生产数据库只运行已提交 migration；禁止生产 `drizzle push` 和 `SEED_CONTENT_MODE=refresh`。
- PostgreSQL 不暴露公网；Nginx/Caddy 终止 HTTPS 后代理到宿主回环地址。
- 本地文件存储适合首期小规模运行；扩容时通过 Storage Adapter 迁移对象存储。

【数据库】

当前表：`users`、`pages`、`page_translations`、`page_revisions`、`media_assets`、`inquiries`、`inquiry_notes`、`site_settings`、`audit_logs`。

本轮未修改 schema，也没有新增 migration。真实数据库验证使用独立、可删除的 Docker Compose project；没有连接或写入任何生产数据库。验证结束后不需要保留本地测试数据。服务器部署前仍需为 Staging 和生产分别创建独立数据库、账号、备份位置与恢复演练记录。

【API】

公共入口：

- `GET /api/v1/health`
- `GET /api/v1/content/pages/home?locale=zh-CN|en`
- `GET /api/v1/content/settings`
- `POST /api/v1/inquiries`
- `GET /uploads/*`，仅 active 媒体可访问

Homepage CMS 核心入口：

- `POST /api/v1/admin/auth/login`
- `GET /api/v1/admin/auth/me`
- `GET /api/v1/admin/homepage`
- `PUT /api/v1/admin/homepage/draft`
- `POST /api/v1/admin/homepage/publish`
- `GET|POST|DELETE /api/v1/admin/media`

通用 pages、inquiries、settings、users 和 audit API 仍保留，详见 `docs/backend/API.md`。

【认证与权限】

- 登录端点按同源限制为 15 分钟最多 10 次。
- 公开咨询按 IP 每小时最多 5 次，并带空 `website` honeypot。
- `ADMIN` 可管理账号、发布首页和读取审计日志；`EDITOR` 可编辑草稿但不能发布。
- 每次受保护请求都校验 JWT，并按 `sub` 重新读取数据库账号；inactive、已删除账号返回 401，角色降级立即生效。
- `TRUST_PROXY_HOPS=0` 为直连开发默认；单层受控 Nginx/Caddy 才设为 1。
- CORS 只接受 `CORS_ORIGINS` 明确列出的源；生产拒绝 `*`。
- JWT secret 至少 32 字符；示例值在 production 会阻止启动。
- 生产默认 `SWAGGER_ENABLED=false`。

【CMS / 内容系统】

Homepage Editor 是固定结构的最小闭环，不是页面搭建器。保存必须携带 `baseRevision`；服务端 revision 已变化时返回 409，客户端不得静默覆盖。发布只允许 ADMIN 指定当前最新 revision，并在一个事务中更新中英文公开投影和审计日志。

本轮通过浏览器实际完成：登录、修改中文 SEO 与 Hero eyebrow、保存 revision 1、确认公开页仍是旧内容、发布后确认公开页更新；随后通过 CMS 恢复正式文案并发布 revision 2。测试标记已从公开内容移除。

【测试状态】

2026-08-13 最终门禁：

- 根目录 `npm run build`：通过。
- 后端 `npm run typecheck`：通过。
- 后端 `npm test`：39/39 通过。
- 后端 `npm run build`：通过。
- `docker compose --env-file .env.docker.example config --quiet`：通过。
- `git diff --check`：通过。
- 真实 PostgreSQL/CMS/Inquiry/Media/重启持久化/备份恢复：通过。

测试与构建应串行运行。本机在 Docker、Vite、前后端测试并发时曾出现 esbuild/Go `VirtualAlloc` 内存分配失败；串行重跑全部通过，因此该现象不是测试断言失败。

【最新 Git Commit】

- 后端实现提交：`1d94091 fix: harden backend runtime boundaries`
- 当前分支：`codex/backend-production-readiness`
- 远端：`origin` → `cvcingcvc-code/guanzhi-oriental-website`
- 本文档会作为紧随其后的独立文档提交；最终 SHA 和 PR 以 GitHub 为准。

【当前 Git Status】

- 独立后端工作树只包含本交接文档的待提交更新；提交并推送后应为 clean。
- 正式项目主工作树 `codex/developer-handoff` 仍有用户/前端未提交改动：`docs/NEW-WINDOW-HANDOFF.md`、`src/App.tsx`、`src/content/public-content.ts`、`src/index.css` 和未跟踪的 `.agents/skills/**`。
- 主工作树改动没有被 reset、clean、stash、覆盖、暂存或混入后端提交。

【已知问题】

- 尚未购买或指定服务器，因而没有 Staging/生产域名、DNS、TLS、监控、告警和部署实测。
- Helmet CSP 仍关闭；需要结合最终前端资源和反向代理配置后制定策略。
- 通用后台 pages/settings/inquiries/media 路由多为“任意已登录角色”可操作，最终运营权限边界仍待甲方确认。
- 媒体删除先软删数据库再删对象；若对象存储删除失败，URL 已被数据库门禁隐藏，但可能留下需运维清理的孤儿文件。
- Inquiry 邮件通知、隐私同意、数据保留与删除策略尚未形成完整生产闭环。
- 本地文件存储没有对象存储级冗余，必须与数据库一起备份和恢复。

【遗留风险】

- 没有真实服务器前，不能证明公网 HTTPS、代理 IP、真实域名 CORS、证书续期、备份异地保存和回滚链路。
- 若在主 dirty working tree 开发后端，会把暂停中的 UI diff 混入后端变更。
- Compose 启动会运行 migration 和 bootstrap seed；首次服务器部署前必须复核正式账号与 seed 的幂等性。
- `sessionStorage` 中的后台 JWT 会受到浏览器端 XSS 风险影响；上线前需完成 CSP/XSS 专项复核。
- Windows 曾发生异常关机，仍需依据系统事件日志区分电源、驱动、蓝屏或资源耗尽，不能仅凭 Node OOM 判断。

【下一阶段任务】

1. 选择服务器与系统，确定域名/DNS、TLS、SSH、部署方式、Staging/生产数据库、备份存储、监控告警和维护窗口。
2. 先建立 Staging，以非示例 secret 配置 API、PostgreSQL、Nginx/Caddy 和防火墙。
3. 在 Staging 重跑 migration、seed、health、auth、CMS revision/publish、媒体、Inquiry、重启持久化和备份恢复。
4. 确认真实域名 CORS 与 `TRUST_PROXY_HOPS`，验证外部不能绕过代理访问 API/PostgreSQL。
5. 完成 CSP、权限矩阵、日志脱敏、隐私/数据保留和通知失败重试方案。
6. Staging 验收通过并得到明确发布授权后，基于固定 commit 部署生产；先备份，再迁移、发布、smoke test，并保留回滚版本。

【禁止修改事项】

- 未经批准不修改 Homepage 七类 typed blocks、Contract、API DTO、数据库 schema、权限模型或甲方正式文案。
- 不创建 News、Projects、Cases、Dashboard、通用 Page Builder、复杂 CMS/DAM/CRM。
- 不连接或写入生产数据库，不运行生产 seed refresh，不提交任何 `.env`、密码、JWT、数据库导出、上传目录或咨询个人数据。
- 不 reset、clean、stash 或覆盖正式项目主工作树中的前端改动。
- 没有服务器范围、固定 commit、备份和用户明确授权时，不执行生产部署。

【推荐下一位 Agent 首先阅读的文件】

1. `docs/NEW-WINDOW-HANDOFF.md`
2. `README.md`
3. `CONTRIBUTING.md`
4. `docs/backend/README.md`
5. `docs/backend/API.md`
6. `docs/backend/CONFIGURATION.md`
7. `docs/content-contract.md`
8. `docs/homepage-cms.md`
9. `docs/frontend-replacement-guide.md`
10. `compose.yaml`、`backend/Dockerfile`、`backend/.env.example`
11. `backend/src/app.ts`、`backend/src/config.ts`、`backend/src/plugins/auth.ts`
12. `backend/src/routes/public-media.ts`、`backend/src/media/`
13. `backend/src/db/schema.ts`、`backend/drizzle/0000_whole_jack_flag.sql`
14. `backend/tests/*.test.ts`

【可直接复制给新的 Codex / ChatGPT 的交接 Prompt】

```text
继续接手“观止东方 / Guanzhi Oriental”官网项目。

正式项目目录：C:\Users\lin\projects\guanzhi-dongfang
后端生产准备分支：codex/backend-production-readiness

开始前完整阅读 docs/NEW-WINDOW-HANDOFF.md、README.md、CONTRIBUTING.md、docs/backend/README.md、docs/backend/API.md、docs/backend/CONFIGURATION.md、docs/content-contract.md、docs/homepage-cms.md、docs/frontend-replacement-guide.md，并以当前源码、git log/status/diff、migration 和测试为最终事实。

当前阶段后端优先，尚未购买服务器。本地后端已经完成真实 PostgreSQL 的 migration/seed、CMS 草稿与原子发布、409 revision 冲突、媒体上传/删除门禁、Inquiry 写读更新、重启持久化和数据库/上传文件备份恢复。最终门禁为：根 build 通过；backend typecheck/build 通过；backend tests 39/39 通过。实现提交为 1d94091。

生产安全加固已包括：production 拒绝示例 secret 和通配 CORS；API 默认绑定 127.0.0.1；TRUST_PROXY_HOPS 默认 0；Swagger 生产默认关闭；每个 JWT 请求重新读取数据库账号 active/当前角色；软删除媒体的公开 URL 返回 404，存储对象同时删除。

主工作树 codex/developer-handoff 仍有用户/前端未提交改动。不要 reset、clean、stash、覆盖或把它们混入后端分支；后端继续使用独立分支/worktree。不要继续改公开 UI，不要更改 Homepage 七类 Contract、DTO、schema、权限模型或甲方文案，不要扩展 News/Projects/Cases/Dashboard/Page Builder/CMS/CRM。

下一步不是生产上线。先取得服务器系统与规格、域名/DNS、TLS、SSH/部署方式、Staging/生产数据库、备份存储、监控告警、维护窗口和发布授权。拿到后先建 Staging，用非示例 secret 配置 PostgreSQL/API/Nginx 或 Caddy，重跑全部真实闭环与备份恢复，完成 CSP、最终权限矩阵和隐私/保留策略复核。Staging 验收通过且用户明确授权后，才部署固定 commit 到生产。

不要输出 secret，不连接或写入生产数据库。每轮报告修改文件、真实执行路径、测试结果、数据库证据、安全发现、部署阻断项和下一步。
```
