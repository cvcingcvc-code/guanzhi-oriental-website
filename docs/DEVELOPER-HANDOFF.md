# 观止东方官网：从加入项目到最终交付

本文是新协作者的单一入口。目标是让第一次接触项目的前端、后端、测试或 AI 助手，在不依赖口头说明的情况下完成：加入 GitHub、启动完整开发环境、替换前端、联调、提交 Pull Request、部署、验收和最终交付。

## 1. 先理解系统边界

当前系统不是“一个 Docker 网站”，而是三层：

```text
浏览器
  │
  ├─ 公共官网 / 管理后台（当前为 React + Vite，可整体替换）
  │                         │ 使用 /api/v1 相对路径
  │                         ▼
  └────────────────────── Backend API（Fastify，稳定边界）
                              │
                              ├─ PostgreSQL：内容、草稿、用户、咨询、审计
                              └─ Upload volume：后台上传的媒体
```

- Docker Compose 当前只启动 `db` 和 `api`。
- 前端在本机用 Vite 启动，获得热更新；Vite 把 `/api` 转发到 `http://127.0.0.1:8080`。
- `src/` 是现有前端实现，不是不可替换的产品边界。
- `backend/`、数据库和 `/api/v1` 是现阶段应优先保持稳定的服务边界。
- 新前端可以继续使用 React，也可以改为 Vue、Next.js 或其他框架，但必须继续遵守 API DTO、鉴权、草稿/发布和媒体安全规则。
- 禁止让新前端直接读取数据库、直接拼接媒体 `storageKey`，或把后台 JWT 放入 URL/长期 `localStorage`。

## 2. GitHub 加入与权限

仓库：`cvcingcvc-code/guanzhi-oriental-website`（私有）  
默认分支：`master`

仓库管理员执行：

1. GitHub → Repository → Settings → Collaborators → Add people。
2. 普通开发者授予 Write；只参与评审的人授予 Triage/Read；不要普遍授予 Admin。
3. 为 `master` 配置保护：禁止直接推送、要求 Pull Request、要求 CI 通过、至少一名审核人。
4. 每名成员自行接受邀请并配置 GitHub 2FA。

成员首次克隆：

```powershell
git clone https://github.com/cvcingcvc-code/guanzhi-oriental-website.git
Set-Location guanzhi-oriental-website
git status
git remote -v
```

日常协作：

```powershell
git switch master
git pull --ff-only
git switch -c feature/<short-topic>

# 完成代码与验证后
git add <明确的文件>
git commit -m "feat: describe the change"
git push -u origin feature/<short-topic>
```

随后在 GitHub 创建 Pull Request。不要长期共用一个分支，不要直接向 `master` 推送，不要提交 `.env`、密码、令牌、数据库备份、上传目录、`node_modules` 或 `dist`。

## 3. 第一次完整启动（推荐）

### 3.1 安装要求

- Git
- Node.js 24（CI 和后端当前采用 Node 24）
- npm
- Docker Desktop
- Windows PowerShell；macOS/Linux 可使用对应 Shell 命令

端口：前端 `3000`，API `8080`，PostgreSQL 仅本机 `127.0.0.1:5432`。

### 3.2 创建本地配置

```powershell
Copy-Item .env.docker.example .env
```

编辑根目录 `.env`，至少替换：

- `POSTGRES_PASSWORD`
- `JWT_SECRET`：至少 32 字符
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`：至少 12 字符
- `IP_HASH_SALT`：至少 16 字符

可用以下命令生成随机值：

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

每位开发者维护自己的 `.env`，不得通过聊天或 Git 传播真实密钥。

### 3.3 启动数据库和 API

```powershell
docker compose up --build -d
docker compose ps
docker compose logs -f api
```

API 容器启动时会自动执行 migration、bootstrap seed，再启动服务。看到服务正常后用 `Ctrl+C` 退出日志跟随；容器仍会运行。

验证：

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/health
```

可访问：

- API 健康检查：`http://localhost:8080/api/v1/health`
- Swagger：`http://localhost:8080/docs`

### 3.4 启动当前前端

新开一个终端：

```powershell
npm ci
npm run dev
```

访问：

- 公共官网：`http://localhost:3000/`
- 首页 CMS：`http://localhost:3000/admin/homepage`

后台登录使用自己 `.env` 中的 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD`。数据库初始化后再修改 `.env` 不会自动修改既有账号。

### 3.5 每日停止与重启

前端终端使用 `Ctrl+C`。后端和数据库：

```powershell
docker compose down
```

数据保存在 Docker volumes 中。不要随意运行 `docker compose down -v`；`-v` 会删除本地数据库和上传文件，只有明确要重置本地数据时才能使用。

第二天恢复：

```powershell
docker compose up -d
npm run dev
```

## 4. 如果前端要完全重做

推荐采用“并行替换”，不要直接在 `master` 上清空 `src/`。

### 4.1 先冻结接口基线

新前端必须至少支持以下公共接口：

```text
GET  /api/v1/content/pages/home?locale=zh-CN|en
GET  /api/v1/content/settings
POST /api/v1/inquiries
```

如果保留或重做 CMS，还需要：

```text
POST /api/v1/admin/auth/login
GET  /api/v1/admin/auth/me
GET  /api/v1/admin/homepage
PUT  /api/v1/admin/homepage/draft
POST /api/v1/admin/homepage/publish
GET  /api/v1/admin/media
POST /api/v1/admin/media
```

详细请求与响应见 `docs/backend/API.md`、`docs/content-contract.md` 和 `docs/frontend-replacement-guide.md`。

### 4.2 替换策略

1. 建立 `feature/frontend-rebuild` 或按页面拆分的短分支。
2. 保留旧前端可运行，先做新应用壳、API client、类型和错误处理。
3. 先接首页 `zh-CN`，再接 `en`；API 失败时不能白屏。
4. 接入 settings，不要把品牌法定主体和邮箱重复硬编码到页面区块。
5. 接入咨询表单，覆盖校验、提交中、成功、400/422、429、500 和网络失败。
6. 如重做 CMS，必须保留 `sessionStorage` 会话、`/auth/me` 恢复、revision 冲突、ADMIN/EDITOR 权限和双语原子发布。
7. 完成 7 个页面结构：`/`、`/about`、`/solutions`、`/jiangnan`、`/cooperation`、`/contact`、`/legal`，再确定英文 URL（建议 `/en/...`）。
8. 新旧前端对照验收后，通过 PR 替换入口；不要让两套正式文案长期并存。

仅修改布局、颜色、动画通常不需要改后端。新增 CMS 字段、首页第八类区块、新闻/案例、媒体模型或 SSR 数据路径时，必须先更新 Contract、DTO、后端测试、seed 和文档。

## 5. 本地联调的完整检查顺序

每次功能开发至少检查：

1. `docker compose ps` 中 `db` 与 `api` healthy。
2. `/api/v1/health` 返回成功。
3. 中文首页加载，刷新不白屏。
4. 英文切换成功，再切回中文。
5. `/admin/homepage` 能登录，刷新后会话恢复。
6. 保存草稿后公共首页不变。
7. ADMIN 发布后中英文公共 API 同时更新。
8. 两个编辑会话产生 revision 冲突时返回 409，不静默覆盖。
9. 媒体上传、选择、alt 和失效引用保护正常。
10. 咨询表单成功写库；校验、限流、邮件通知和网络失败提示符合预期。
11. 390px 手机宽度无横向溢出，键盘可操作，图片有 alt。

不要在生产数据库中使用测试标记验证发布。如果必须写入开发数据，先记录原值，完成后恢复。

## 6. 提交前质量门禁

```powershell
# 根目录
npm ci
npm run build

# 后端
Set-Location backend
npm ci
npm run typecheck
npm test
npm run build
Set-Location ..

git diff --check
git status --short
```

PR 描述必须写明：

- 目标和非范围
- API、Contract、Schema 是否变化
- 中文、英文、桌面、移动端验证结果
- 测试命令及结果
- 风险、回滚方式、需要谁确认

## 7. 从开发到最终交付的流程

### 阶段 A：协作准备

- 邀请 GitHub 成员，设置最小权限和 `master` 保护。
- 把任务拆为页面内容、前端重做、后端生产化、QA/交接四条工作流。
- 每项任务明确负责人、PR、验收证据和截止条件。

### 阶段 B：功能收口

- 完成中英文 14 个页面 URL。
- 确认英文终稿、法律文本、正式邮箱、所在地和品牌资料。
- 替换真实摄影、视频、Logo/Favicon、微信二维码并记录授权。
- 打通咨询写库、邮件到达、反垃圾和失败告警。

### 阶段 C：Staging

- 建立独立 staging 环境、数据库、媒体存储和管理员账号。
- 配置 HTTPS、CORS、环境变量、备份与日志。
- 在 staging 验证 CMS 草稿/发布、咨询全链路和版本回滚。
- 任何生产密钥只放在托管平台 Secret 中，不写入仓库。

### 阶段 D：集中验收

- Chrome、Safari、Edge；1920/1440/1366 桌面；iPhone/Android。
- 中文/英文逐页、导航、直达刷新、404、SEO、社交分享。
- Lighthouse 性能达到合同约定的 80 以上。
- 可访问性、依赖漏洞、权限、上传安全、日志脱敏和隐私流程。
- 数据库与媒体备份、恢复演练、部署版本回滚演练。

### 阶段 E：生产发布

- 甲方控制域名、Cloudflare、GitHub、数据库/存储和邮件账户 Owner 权限。
- 先备份，再发布已验收的固定 commit；记录版本和变更说明。
- 验证域名、SSL、首页、14 个 URL、表单、通知、CMS 和监控。
- 保留上一稳定版本和明确回滚步骤。

### 阶段 F：资产交接与签收

- 源代码、完整 Git 历史、README、部署和回滚说明。
- 环境变量名称清单（不含明文密钥）、数据库 Schema/migrations、数据导出。
- 媒体原件、处理后资源、设计源文件和第三方许可证清单。
- 不少于 2 小时后台/发布培训，操作手册或录屏。
- 质保联系人、响应渠道、问题模板、账号和权限签收。
- 按合同附件二逐项附证据；未完成项写负责人和整改期限。

## 8. 可以直接交给 GPT/Codex 的接手提示词

```text
你正在接手私有仓库 cvcingcvc-code/guanzhi-oriental-website。

先完整阅读：
1. docs/DEVELOPER-HANDOFF.md
2. CONTRIBUTING.md
3. docs/frontend-replacement-guide.md
4. docs/content-contract.md
5. docs/backend/API.md
6. docs/homepage-cms.md

先检查 git status、当前分支、最近提交、compose.yaml、package.json、backend/package.json 和 CI；不要撤销或覆盖已有修改。

架构边界：Docker Compose 当前运行 PostgreSQL + Fastify API；前端用本机 Vite 运行。现有前端可以完全替换，但新前端必须消费 /api/v1 DTO，不得直连数据库，不得暴露 storageKey，并保留咨询、双语、CMS revision、权限和媒体安全语义。

本次任务：<在这里写一个具体任务>。
完成后必须运行相关 build/typecheck/test，报告修改文件、验证结果、未解决风险和下一步。不要自行部署、发布 CMS 内容、写生产数据或扩大到未要求的功能。
```

## 9. 遇到问题先看哪里

- 启动与整体交接：本文、`docs/NEW-WINDOW-HANDOFF.md`
- 前端完全替换：`docs/frontend-replacement-guide.md`
- API：`docs/backend/API.md`
- 后端配置：`docs/backend/CONFIGURATION.md`
- 首页数据结构：`docs/content-contract.md`
- CMS 草稿/发布：`docs/homepage-cms.md`
- 多人协作：`CONTRIBUTING.md`

如果文字与实际代码冲突，以当前 `master`、数据库 migration、API 测试和可复现运行结果为准，并在 PR 中修正文档。
