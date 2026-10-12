# 观止东方官网｜后端优先新窗口交接

更新时间：2026-08-13
项目目录：`C:\Users\lin\projects\guanzhi-dongfang`

【项目目标】

当前阶段暂停公开官网前端 UI 继续迭代，改为优先完成后端收口、真实数据库联调、生产化准备和服务器部署方案。前端允许由团队其他成员在独立分支中替换，但必须继续消费既有 API DTO，不能绕过 Homepage Contract、CMS 发布语义、权限或媒体安全边界。

后端阶段的完成定义不是“能够构建”，而是：全部门禁通过；PostgreSQL 真实读写闭环可复现；迁移、seed、权限、CMS 草稿/发布、媒体、咨询线索均通过安全验证；Staging 的 HTTPS、CORS、备份、恢复和回滚完成演练；得到明确服务器信息与发布授权后再部署正式环境。

【当前技术栈】

- 前端：React 18、TypeScript、Vite 6；公开站与 `/admin/homepage` 共用前端工程。
- 后端：Node.js 24、TypeScript、Fastify 5、Zod 4。
- 数据库：PostgreSQL 17、Drizzle ORM/Drizzle Kit。
- 认证：JWT + bcrypt；后台 token 当前存于浏览器 `sessionStorage`。
- 媒体：Storage Adapter；当前实现为本地持久化目录/Docker volume。
- 基础设施：Docker Compose 当前编排 PostgreSQL 与 API；前端不在 Compose 中。
- API 文档：Swagger UI，开发环境路径 `/docs`。

【项目结构】

- `src/App.tsx`：公开站真实 React 渲染入口；当前存在暂停中的 UI 工作树改动。
- `src/content/public-content.ts`：Public DTO 校验、中文 fallback、Settings fallback；当前存在暂停中的文案/素材改动。
- `src/admin/`：Homepage CMS 前端、登录与 API client。
- `backend/src/app.ts`：Fastify 插件与路由注册。
- `backend/src/server.ts`：API 进程入口。
- `backend/src/config.ts`：环境变量唯一校验入口。
- `backend/src/db/schema.ts`：Drizzle schema。
- `backend/src/content/contract.ts`：Homepage 七类 typed blocks 与通用内容 Contract。
- `backend/src/content/public-dto.ts`：数据库内容到公开 DTO 的安全投影。
- `backend/src/homepage/repository.ts`：双语草稿、revision 乐观锁、原子发布。
- `backend/src/media/`：媒体校验、存储和软删除。
- `backend/src/routes/`：公共与后台 API。
- `backend/drizzle/0000_whole_jack_flag.sql`：当前唯一正式 migration。
- `compose.yaml`、`backend/Dockerfile`：本地/服务器容器基础。
- `docs/backend/`：API、配置和部署基线。

【已经完成】

- 公共内容 API 可一次返回指定 locale 的整份 Homepage Content Document。
- Homepage 固定 `hero/about/capabilities/motifs/jiangnan/partners/contact` 七类且每类唯一。
- Public DTO 会校验 Contract、解析媒体、过滤 disabled block/item，并避免暴露本机路径和 `storageKey`。
- Public Settings 使用白名单 DTO，与 Contact block 身份信息分离。
- Homepage CMS 支持双语整页读取、草稿保存、revision 冲突保护和 ADMIN 原子发布。
- 草稿写入 `page_revisions`，不会直接改变公开 `page_translations`。
- 发布校验媒体仍为 active，并使用事务与行锁降低并发发布/删除风险。
- 媒体上传按文件真实内容识别 MIME，拒绝 SVG/伪造类型，具备大小限制和失败清理。
- 合作咨询具备 Zod 校验、honeypot、IP hash、速率限制和后台管理 API。
- ADMIN/EDITOR 基础权限、审计日志、账号管理与后台 JWT 已实现。
- Docker Compose 配置可解析；API 容器启动流程为 migration → bootstrap seed → server。
- 2026-08-13 后端 `typecheck` 与生产 `build` 通过。

【关键架构决策】

- 浏览器只能访问 API，不能直连 PostgreSQL 或拼接媒体 `storageKey`。
- Homepage CMS 不是通用 Page Builder；现阶段不扩展 News、Projects、Cases、Dashboard 或复杂 DAM。
- Homepage 双语草稿作为同一 revision 原子保存、原子发布，不允许单语半套发布。
- `contentStatus=draft|approved` 是甲方文案状态元数据，不等于数据库草稿状态。
- 品牌名、法律主体、旗舰名称和联系邮箱来自 Settings，不复制进 Contact block。
- 公共 API 故障时保留完整中文 fallback；语言切换失败保留当前已加载 Document。
- 生产数据库只应用已提交 migration；禁止生产 `drizzle push` 和 `SEED_CONTENT_MODE=refresh`。
- PostgreSQL 不暴露公网；外部流量由 Nginx/Caddy 终止 HTTPS 后代理 API。
- 当前本地媒体适合首期小规模运行；规模扩大后通过 Storage Adapter 迁移对象存储。

【数据库】

当前 schema 包含：`users`、`pages`、`page_translations`、`page_revisions`、`media_assets`、`inquiries`、`inquiry_notes`、`site_settings`、`audit_logs`。

当前 migration 只有 `backend/drizzle/0000_whole_jack_flag.sql`，本轮未修改 schema、未生成 migration、未写生产数据库。Docker volume 名为 `postgres_data` 和 `backend_uploads`。不要执行 `docker compose down -v`，除非明确要删除可丢弃的本地测试数据。

截至本交接，仓库根目录没有 `.env`，因此没有启动真实 PostgreSQL、没有运行 migration/seed、没有进行数据库持久化端到端验证。下一位 Agent 必须使用独立、可删除的开发库或 Staging 库验证，不能为了通过测试连接生产数据库。

【API】

公共接口：

- `GET /api/v1/health`
- `GET /api/v1/content/pages/home?locale=zh-CN|en`
- `GET /api/v1/content/settings`
- `POST /api/v1/inquiries`

Homepage CMS：

- `POST /api/v1/admin/auth/login`
- `GET /api/v1/admin/auth/me`
- `GET /api/v1/admin/homepage`
- `PUT /api/v1/admin/homepage/draft`
- `POST /api/v1/admin/homepage/publish`
- `GET|POST /api/v1/admin/media`

后端还保留通用 pages、media、inquiries、settings、users 管理 API，详见 `docs/backend/API.md`。前端团队替换 UI 时必须保持相对 `/api/v1` 调用、DTO 校验、locale 原子切换、fallback、Inquiry payload 与 Homepage CMS revision 语义。

【认证与权限】

- 登录端点限速：同源 15 分钟最多 10 次。
- 公共咨询端点限速：同 IP 每小时最多 5 次，并带空 `website` honeypot。
- `ADMIN`：账号管理、首页发布、审计日志；同时可进行一般后台编辑操作。
- `EDITOR`：可读写首页草稿，但不能发布；一般后台路由目前多为“已登录即可”。
- `trustProxy=true`，生产反向代理必须正确覆盖客户端 IP，且代理链需受控。
- CORS 只允许 `CORS_ORIGINS` 中的明确域名，生产禁止 `*`。
- JWT secret 至少 32 字符；示例密码、示例 secret 不得用于 Staging/生产。
- Swagger `/docs` 当前由应用公开注册。生产是否公开必须在安全复核中明确决定，不要默认暴露。
- Helmet 当前关闭 CSP，由于前端与 API 可能分层部署，正式上线前必须明确 CSP 在应用或反向代理哪一层落实。

【CMS / 内容系统】

Homepage Editor 是最小闭环，不是页面搭建器。保存必须携带 `baseRevision`，服务端 revision 变化时返回 `409`，客户端不得静默覆盖。发布必须由 ADMIN 指定当前最新 revision；事务会同时提升中英文投影并写审计日志。

英文 About 已标记 `approved`；英文 Hero、Capabilities、Motifs、Jiangnan、Partners、Contact 仍为 `draft`，不能在交接中写成甲方已批准。当前静态中文 fallback 属迁移期副本，CMS 稳定后再逐步缩小，但在此之前必须与测试期望同步。

【测试状态】

2026-08-13 当前运行结果：

- 根目录 `npm run build`：通过。
- 后端 `npm run typecheck`：通过。
- 后端 `npm run build`：通过。
- 后端 `npm test`：32 项中 31 项通过、1 项失败。
- `docker compose --env-file .env.docker.example config --quiet`：通过。
- `git diff --check`：通过。

唯一失败：`backend/tests/content.test.ts` 的 “initial API failures keep the complete Chinese homepage and official Settings fallbacks”。原因是工作树中的 `src/content/public-content.ts` 已缩短 About fallback 首段，而测试仍断言旧首段。这是当前后端收口的第一个明确修复点：先确定最新甲方中文 fallback，再同步 fixture/断言，不能只为了绿灯随意改文案。

尚未验证：真实 PostgreSQL migration/seed、API health、登录、草稿不影响公开站、revision 冲突、双语发布、重启后持久化、媒体上传/软删除、Inquiry 写入后后台读取、数据库与上传目录备份/恢复、Staging HTTPS/CORS/反向代理。

【最新 Git Commit】

- 分支：`codex/developer-handoff`
- Commit：`b98ba453a3aabbd451d61625e374c6e0ee5a6226`
- Message：`docs: fix handoff formatting`
- 提交时间：2026-08-12 19:11:14 +0800
- 远端：`origin` → GitHub 私有仓库 `cvcingcvc-code/guanzhi-oriental-website`
- 当前分支与 upstream：`0 behind / 0 ahead`

【当前 Git Status】

当前工作树不是干净基线：

- `M src/App.tsx`：包含此前多页面/公开 UI 改造与本轮暂停中的 Header/Hero Batch 1。
- `M src/content/public-content.ts`：包含 fallback 文案与静态优化素材路径调整；触发当前唯一测试失败。
- `M src/index.css`：包含暂停中的 Header/Hero 与设计 token 样式。
- `?? .agents/skills/**`：项目级 Skills，当前未跟踪；不要当作后端业务改动混入提交。

没有 staged 文件，也没有 commit/push/PR。不要 reset、checkout、clean、stash 或覆盖这些文件；它们属于尚待确认归属的前端工作。若后端与前端需要并行，优先让后端开发者从当前已提交 commit 新建独立 worktree/clone 和功能分支；前端负责人单独接管这三份工作树文件并核对 diff。

【已知问题】

- 后端测试有 1 项因前端 fallback 文案漂移失败。
- 既有 `docs/NEW-WINDOW-HANDOFF.md` 曾声称 32/32 通过、分支为 master，已被本文件按真实状态替换。
- 当前没有根 `.env`，真实数据库闭环尚未执行。
- Swagger 与 `/uploads/` 的生产暴露策略还需安全审查。
- CSP 当前关闭；反向代理安全头、请求体限制、日志脱敏和代理信任边界需生产复核。
- 通用 admin pages/settings/inquiries/media 路由多为任意已登录角色可操作；是否符合最终运营权限模型需甲方确认，不要擅自扩大或收紧。
- Inquiry 通知环境变量存在，但邮件通知、隐私同意、数据保留/删除策略尚未形成完整生产闭环。
- 本地 volume 媒体没有对象存储级冗余，必须与数据库备份一起做恢复演练。

【遗留风险】

- 直接在当前 dirty working tree 开发后端会把暂停中的 UI diff 混入后端 PR。
- 未进行真实数据库验证前，repository 单测不能证明迁移、锁、事务和重启持久化在部署环境成立。
- Compose 默认值仅供本地；服务器若漏配 `.env`，会落入示例 secret/密码，属于上线阻断项。
- API 容器启动自动执行 bootstrap seed；首次部署前必须确认 seed 的幂等性和正式内容来源。
- 正式部署仍缺目标服务器规格、操作系统、域名/DNS、TLS、备份位置、告警渠道、维护窗口和回滚责任人。
- 当前 UI 工作未完成；在后端上线前必须决定是只部署 API/Staging，还是等待替代前端一并验收。

【下一阶段任务】

1. 在独立后端分支/worktree 重现唯一测试失败，确认最新甲方 fallback 文案，再同步实现与断言，使 32/32 通过。
2. 使用 `database-verifier` 在可删除的开发 PostgreSQL 上验证 migration → seed → API → repository → DB → API/readback 全链路，包含负向路径和重启持久化。
3. 使用 `security-reviewer` 聚焦 auth、角色边界、CORS、trust proxy、Swagger、uploads、媒体、Inquiry、日志与生产 secrets；先报告再实施最小修复。
4. 完成生产化差距清单：健康检查、graceful shutdown、迁移失败行为、日志、备份、恢复、反向代理、HTTPS、CORS、限速、监控、告警、回滚。
5. 建立 Staging：只使用 Staging 数据库和账号；执行完整 CMS/媒体/Inquiry 手工闭环及备份恢复演练。
6. 获取并记录目标服务器、域名、DNS、TLS、SSH/部署方式、备份存储、维护窗口；不要在文档或日志中写 secret。
7. Staging 验收通过并获得明确发布授权后，部署固定 commit；先备份，再迁移、发布、health/smoke test，保留回滚版本。
8. 前端由其他成员在独立分支替换时，只按 `docs/frontend-replacement-guide.md` 对接既有 DTO；不得改变后端 Contract 来迁就视觉实现。

【禁止修改事项】

- 未经批准不修改 Homepage 七类 typed blocks、Contract、API DTO、数据库 schema、权限模型或生产配置。
- 不创建 News、Projects、Cases、Dashboard、通用 Page Builder、复杂 CMS/DAM/CRM。
- 不直连或写生产数据库，不删除生产数据，不执行生产 seed refresh。
- 不提交 `.env`、密码、JWT、数据库导出、上传目录、日志中的个人咨询数据或其他 secret。
- 不擅自 reset/clean/stash 当前前端工作树，不覆盖其他成员改动。
- 不自动 commit、push、PR 或生产部署；部署必须基于明确服务器范围、固定 commit、备份和用户授权。
- 后端阶段暂停公开 UI 继续修改；需要修复 fallback 测试时，只在确认文案真值后做最小一致性修复。

【推荐下一位 Agent 首先阅读的文件】

1. `docs/NEW-WINDOW-HANDOFF.md`（本文件）
2. `README.md`
3. `CONTRIBUTING.md`
4. `docs/backend/README.md`
5. `docs/backend/API.md`
6. `docs/backend/CONFIGURATION.md`
7. `docs/content-contract.md`
8. `docs/homepage-cms.md`
9. `docs/frontend-replacement-guide.md`
10. `compose.yaml`、`backend/Dockerfile`、`backend/.env.example`
11. `backend/src/app.ts`、`backend/src/config.ts`、`backend/src/db/schema.ts`
12. `backend/src/content/contract.ts`、`backend/src/content/public-dto.ts`
13. `backend/src/homepage/repository.ts`、`backend/src/routes/admin-homepage.ts`
14. `backend/tests/*.test.ts`

【可直接复制给新的 Codex / ChatGPT 的交接 Prompt】

```text
继续接手“观止东方 · Guanzhi Oriental”官网项目。

项目目录：C:\Users\lin\projects\guanzhi-dongfang

当前阶段暂停公开前端 UI，优先完成后端收口、真实 PostgreSQL 全链路验证、生产化准备与服务器部署方案。前端将由其他成员在独立分支替换；你不要继续改 Header/Hero/About 等视觉，也不要覆盖当前工作树中的前端改动。

开始前完整读取：
1. docs/NEW-WINDOW-HANDOFF.md
2. README.md
3. CONTRIBUTING.md
4. docs/backend/README.md
5. docs/backend/API.md
6. docs/backend/CONFIGURATION.md
7. docs/content-contract.md
8. docs/homepage-cms.md
9. docs/frontend-replacement-guide.md
10. compose.yaml、backend/Dockerfile、backend/.env.example

然后以当前源码和 Git 事实复核：git branch、git log -1、git status、git diff、backend 路由、Contract、schema、migration 和 tests。不要只依赖历史文档。

当前已知状态：分支 codex/developer-handoff；最新 commit b98ba453a3aabbd451d61625e374c6e0ee5a6226。工作树中的 src/App.tsx、src/content/public-content.ts、src/index.css 是暂停中的前端改动，.agents/skills 为未跟踪项目 Skills；没有 staged/commit/push。不要 reset、clean、stash 或混入后端 PR。需要并行开发时使用独立 worktree/clone 和后端功能分支。

2026-08-13 实测：根目录 build 通过；backend typecheck/build 通过；backend tests 31/32，通过项覆盖 Contract、DTO、Homepage revision/publish、Inquiry、Media 等。唯一失败是 fallback About 首段在 src/content/public-content.ts 与 backend/tests/content.test.ts 的旧期望不一致。根目录没有 .env，尚未启动真实 PostgreSQL，数据库持久化、migration/seed、CMS、Media、Inquiry、备份恢复都未做真实端到端验证。

必须使用项目级 Skills：
- 先用 feature-planner 为“后端生产化与部署准备”制定仓库感知计划；用户已要求实施，所以计划后可继续。
- 数据库真实闭环使用 database-verifier，只连接可删除的开发/Staging 数据库。
- auth/CORS/uploads/Swagger/Inquiry/生产 secret 等使用 security-reviewer，先报告再修复。
- 完成后使用 implementation-auditor 做门禁与真实路径复核。
- 只有用户明确要求准备提交时才使用 git-commit-guardian。

第一项具体行动：在独立后端分支/worktree 重现唯一失败测试，读取最新甲方资料与当前 fallback，确认哪一份中文 About 是真值；先输出差异和建议，不要为了测试绿灯擅自改文案。确认后做最小一致性修复并跑完整门禁。

随后验证：migration → bootstrap seed → health → auth → CMS 草稿保存不影响公开 API → revision 冲突 → ADMIN 双语发布 → 媒体上传/读取/软删除边界 → Inquiry 写入并从后台读取 → 容器重启后持久化 → pg_dump 与上传 volume 备份/恢复。

部署前必须拿到：目标服务器/系统、域名与 DNS、TLS、部署方式、Staging/生产数据库、备份存储、监控告警、维护窗口、回滚责任人。任何 secret 不得输出或写入仓库。先 Staging，验收通过且用户明确授权后再部署固定 commit；不要自行 commit、push、PR 或生产部署。

保持既有 React/TypeScript/Vite、Homepage 七类 typed blocks、Contract、API、Settings、locale/fallback、Inquiry、schema 和权限边界。不要扩展 News/Projects/Cases/Dashboard/Page Builder/CMS/CRM。

每轮报告：修改文件、真实执行路径、测试结果、数据库证据、安全发现、部署阻断项与下一步。若文档与源码冲突，以当前源码、测试、migration 和可复现实验为准，并更新交接事实。
```
