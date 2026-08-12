# 观止东方官网｜新窗口与多人开发交接文档

更新时间：2026-08-12
项目目录：`C:\Users\lin\projects\guanzhi-dongfang`

> 本文可直接交给新的 Codex 窗口或外部开发者。开始工作前必须先阅读本文、根目录 `README.md`、`docs/homepage-cms.md`、`docs/content-contract.md` 和 `docs/backend/API.md`，再以磁盘代码、Git 状态、数据库与实际页面为准复核，不要只依赖文字报告。

## 1. 新窗口可直接使用的接手指令

复制下面整段给新窗口：

```text
继续接手「观止东方官网」项目。

项目目录：C:\Users\lin\projects\guanzhi-dongfang
首先完整阅读：
1. docs/NEW-WINDOW-HANDOFF.md
2. README.md
3. docs/homepage-cms.md
4. docs/content-contract.md
5. docs/backend/API.md

不要重新开始，不要撤销现有修改。先检查 git status、git log、git remote、compose 服务、数据库事实、Public API 和实际页面。

当前重点是登录 http://localhost:3000/admin/homepage 验证 Homepage CMS：
- 登录与会话恢复
- 中英文固定七区块
- 保存草稿不会改变公开官网
- revision 冲突保护
- ADMIN 发布后中英文公共 API 同时更新
- Media 空态、上传与选择
- 390px 和桌面页面

如需提交测试数据，先说明会写入哪些内容；只使用可恢复的测试标记，记录修改前值，验证后恢复。不要泄露或输出账号密码、JWT、.env、数据库连接密码。未经明确要求不要部署、推送远程或扩展 News / Projects / Cases / Dashboard / 通用 Page Builder。
```

## 2. 当前完成状态

当前 Homepage CMS Editor 最小闭环已经在工作区实现：

- 后台入口仅为 `/admin/homepage`。
- JWT 只保存在当前标签页 `sessionStorage`；刷新时通过 `/api/v1/admin/auth/me` 重新验证。
- 同一编辑会话管理 `zh-CN` 与 `en` 两份完整首页内容。
- 每种语言固定包含 Hero、About、Capabilities、Motifs、Into Jiangnan、Partners、Contact 七个 Typed Blocks。
- Hero 是首页必显结构；其余六块可以按需显隐。
- 保存草稿只写 `page_revisions`，不影响公共官网读取的 `page_translations`。
- `baseRevision` / `revision` 实现乐观锁，冲突返回 `409`，不会静默覆盖他人内容。
- `ADMIN` 可以保存和发布；`EDITOR` 可以保存、不能发布。
- 发布时双语原子提升，并验证引用媒体仍存在且未软删除。
- 草稿、发布和审计写入处于同一数据库事务。
- 发布与媒体删除使用数据库行锁，避免并发删除造成官网媒体失效。
- 通用 `/admin/pages` 写入、发布、撤回接口不能绕过专用 Homepage API 修改 `home`。
- 媒体库当前允许安全上传和选择，但本地数据库目前没有媒体资产，首页仍使用静态 `fallbackUrl`。

最近完整门禁：Frontend build 通过；Backend typecheck/build 通过；Backend tests 32/32 通过；`git diff --check` 通过。

## 3. 当前 Git 与远程协作

本地 Git 仓库：

```text
C:\Users\lin\projects\guanzhi-dongfang\.git
```

当前分支：`master`
本阶段父基线：`6e4584d0a53ffc5844dfdc7551352596473ee142`
父基线提交：`feat: complete bilingual homepage content pipeline`

GitHub 私有仓库：[cvcingcvc-code/guanzhi-oriental-website](https://github.com/cvcingcvc-code/guanzhi-oriental-website)。本地 `origin` 指向该仓库，实际最新提交以 `git log -1` 为准。

### 推荐的多人协作方式

1. 由仓库所有者在 GitHub 设置中邀请协作者。
2. 首次克隆：

```powershell
git clone https://github.com/cvcingcvc-code/guanzhi-oriental-website.git
cd guanzhi-oriental-website
```

3. 多人开发不要长期直接写 `master`。建议每人使用短分支：

```powershell
git switch master
git pull --ff-only
git switch -c feature/<短任务名>
# 完成后：typecheck、test、build
git push -u origin feature/<短任务名>
```

4. 通过 Pull Request 合并，并在仓库设置中保护 `master`，要求测试通过和至少一人审核。
5. 遵循根目录 [`CONTRIBUTING.md`](../CONTRIBUTING.md)。

禁止把 `.env`、真实账号密码、JWT、数据库备份、上传目录、`node_modules` 或 `dist` 提交到远程。

## 4. 环境要求

- Git
- Node.js：前端至少 18，推荐与后端统一使用 Node.js 22 或 24
- npm
- Docker Desktop（推荐，提供 PostgreSQL 与 Backend API）
- Windows PowerShell

端口：

- Frontend Vite：`3000`
- Backend API：`8080`
- PostgreSQL：仅本机 `127.0.0.1:5432`

## 5. 首次启动：推荐 Docker 后端 + 本机前端

### 5.1 准备本地配置

在项目根目录执行：

```powershell
Copy-Item .env.docker.example .env
```

编辑 `.env`，至少替换：

- `POSTGRES_PASSWORD`
- `JWT_SECRET`（至少 32 字符）
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`（至少 12 字符）
- `IP_HASH_SALT`（至少 16 字符）

`.env` 已被 Git 忽略，不要发送给其他人。每位开发者应创建自己的本地密码。生成随机值可用：

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

### 5.2 启动 PostgreSQL 与 Backend

```powershell
docker compose up --build -d
docker compose ps
docker compose logs -f api
```

看到 API 正常启动后按 `Ctrl+C` 退出日志跟随，不会停止容器。

首次启动会执行 migration 与安全的 bootstrap Seed。Bootstrap 只补缺失数据，不覆盖 CMS 已编辑内容。

验证：

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/health
```

浏览器地址：

- API Health：`http://localhost:8080/api/v1/health`
- Swagger：`http://localhost:8080/docs`

### 5.3 启动 Frontend

打开另一个 PowerShell：

```powershell
Set-Location C:\Users\lin\projects\guanzhi-dongfang
npm install
npm run dev
```

访问：

- 公开官网：`http://localhost:3000/`
- Homepage CMS：`http://localhost:3000/admin/homepage`

Vite 会把 `/api` 代理到 `http://127.0.0.1:8080`，因此前端代码使用相对 API 路径。

### 5.4 停止服务

Frontend 终端按 `Ctrl+C`。后端与数据库：

```powershell
docker compose down
```

不要随意执行 `docker compose down -v`，它会删除数据库和上传文件对应的 Docker volumes。

## 6. 不使用 Docker 的 Backend 启动方式

先准备 PostgreSQL，然后：

```powershell
Set-Location C:\Users\lin\projects\guanzhi-dongfang\backend
Copy-Item .env.example .env
# 编辑 backend/.env，填入自己的本地配置
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

不要在生产环境使用 `SEED_CONTENT_MODE=refresh`。它只用于显式刷新本地开发数据库，并且生产模式会拒绝执行。

## 7. 后台登录与手工验证

后台账号来自你本机 `.env` 中的 `ADMIN_EMAIL` 与 `ADMIN_PASSWORD`。本文和源码包不包含真实密码。若数据库已经初始化过，修改 `.env` 不会自动修改既有账号密码；应使用原账号，或在独立开发库中重新初始化。

### 7.1 只读验证

1. 打开 `http://localhost:3000/`，确认中文首页正常。
2. 切换 EN，再切回中文，确认没有白屏。
3. 打开 `http://localhost:3000/admin/homepage` 并登录。
4. 确认顶部显示 Revision 与 `已发布来源` 或 `草稿来源`。
5. 分别查看中文与 English，每种语言应有七个区块。
6. English About 应为正式四段英文；其余六个英文区块应标记 `draft`。
7. 打开媒体选择器；空媒体库应显示空态，不应白屏。
8. 浏览器刷新，确认通过 `/auth/me` 恢复会话。

### 7.2 安全验证“保存草稿不改官网”

必须在开发数据库操作，不要直接在生产环境测试。

1. 记录中文页面标题原值。
2. 在 CMS 页面标题末尾加入明显测试标记，例如 ` [CMS-TEST]`。
3. 点击“保存草稿”，记录返回的 Revision。
4. 刷新公开官网，确认公开标题仍是原值。
5. 请求公共 API，确认仍是原值：

```powershell
Invoke-RestMethod 'http://localhost:8080/api/v1/content/pages/home?locale=zh-CN'
Invoke-RestMethod 'http://localhost:8080/api/v1/content/pages/home?locale=en'
```

### 7.3 安全验证发布

只有 `ADMIN` 可执行：

1. 草稿保存成功且页面没有未保存修改时，点击“发布到官网”。
2. 同时检查中文和英文公共 API；二者应在一次发布后保持完整。
3. 刷新公开官网验证内容。
4. 立即把测试标题改回之前记录的正式值，再次保存和发布。
5. 最后重新读取中英文公共 API，确认正式内容已恢复。

不要通过数据库直接改 `page_translations` 验证 CMS；这会绕开 Typed Contract、revision、权限和审计。

### 7.4 媒体验证

1. 只上传无隐私、可删除的测试图片。
2. 支持 JPEG、PNG、WebP、AVIF，图片上限 12 MiB；MP4 上限 50 MiB；SVG 禁止。
3. 填写中文 alt；选择资产后草稿只保存 `assetId`，不暴露 `storageKey`。
4. 保存草稿不会修改公开站；发布前服务端会检查资产仍处于 active 状态。
5. 当前没有媒体管理删除 UI。需要测试删除 API 时应由开发者使用 Swagger，并先确认资产没有被正式页面引用。

## 8. 提交数据与多人并发注意事项

- CMS 保存的是完整双语快照，不是单个输入框 patch。
- 一个编辑者保存后 revision 会增加；另一个基于旧 revision 保存会收到 `409`。
- 收到冲突时不要自动覆盖，应保留本地内容、重新读取并人工比较。
- `contentStatus=draft` 表示文案尚待甲方确认，不等于数据库草稿，也不会自动阻止整页发布。
- 英文 About 已正式确认；英文 Hero、Capabilities、Motifs、Jiangnan、Partners、Contact 仍待甲方确认。
- 所在地仍未确认，不要把北京或杭州作为官网正式 location 写入。
- 未发布草稿引用的媒体可被删除，但发布时会返回 `422` 阻止失效引用进入官网。

## 9. 前端还能否优化或更换

可以，而且公开官网和后台编辑器可以分别更换。

完整的架构边界、请求契约、三种替换方案、实施顺序和上线验收见：[前端替换与 API 接入声明](./frontend-replacement-guide.md)。

### 9.1 只改视觉，通常不需要调整 Backend API

以下改动可在保持 API 不变时完成：

- 重做公开官网布局、色彩、字体、动效与响应式。
- 把 `src/App.tsx` 拆分为更清晰的 section 组件。
- 更换 CMS 后台视觉、表单布局和交互方式。
- 增加前端预览、骨架屏、错误提示、键盘操作和可访问性。
- 在 React、Vue 等 SPA 技术之间迁移，只要继续消费相同 DTO。

公开站应继续调用：

- `GET /api/v1/content/pages/home?locale=zh-CN|en`
- `GET /api/v1/content/settings`
- `POST /api/v1/inquiries`

Homepage CMS 应继续调用：

- `POST /api/v1/admin/auth/login`
- `GET /api/v1/admin/auth/me`
- `GET /api/v1/admin/homepage`
- `PUT /api/v1/admin/homepage/draft`
- `POST /api/v1/admin/homepage/publish`
- `GET/POST /api/v1/admin/media`

### 9.2 以下变化需要前后端一起调整

| 变化 | 是否需要 Backend / Contract 调整 |
| --- | --- |
| 只换颜色、字体、布局、动画 | 否 |
| 重排现有七区块的视觉布局，但内容字段不变 | 通常否 |
| 新增一个 CMS 可编辑字段 | 是，更新 Contract、DTO、Seed、API 测试和前端 |
| 新增第八种 Homepage block | 是，完整更新 Contract、Repository、DTO、CMS 与公开站 |
| 改变媒体引用方式 | 是，必须保持安全 resolver 或同步调整后端 |
| 增加 News / Projects / Cases | 是，应单独设计内容模型与 API，不能硬塞进 Homepage |
| 改为 Next.js / SSR | 需要重新设计部署、API 访问、缓存与 SEO，但数据库可以复用 |
| 只替换 CMS 后台框架 | 通常不需要，只要遵守专用 Admin API |

建议不要让新前端直接读取数据库 JSONB，也不要让浏览器拼接 `storageKey`。以 Public DTO / Admin API 作为稳定边界，前端就能大幅重做而不破坏数据层。

## 10. 达到商业交付前的建议路线

### P0：交付前必须完成

- 配置 GitHub 协作者、PR 审查和分支保护。
- 甲方确认 About 之外六个英文首页区块文案。
- 替换真实品牌摄影、正式视频、Logo/Favicon 和微信二维码。
- 确认正式域名、所在地是否展示、联系邮箱与隐私政策。
- 建立生产管理员账号与密码轮换，不使用示例账号。
- HTTPS、CORS、反向代理、数据库和上传文件备份。
- 建立 staging 环境，先在 staging 验证 CMS 发布。
- 对 Inquiry 做邮件通知、反垃圾、隐私同意和数据保留策略。
- 浏览器兼容、移动端、SEO、性能、可访问性与安全验收。
- 发布前做恢复演练：数据库备份、媒体备份、回滚版本。

### P1：提高运营效率

- Homepage revision 历史查看与恢复 UI。
- 媒体 alt 修改、草稿引用状态、删除确认和基础管理界面。
- 可视化 Preview，但不要演变成任意 Page Builder。
- 更完整的 Admin 审计查看、账号管理与操作告警。
- 自动化 E2E：登录、保存草稿、冲突、发布、双语公共 API。

### 暂时不要混入当前闭环

- News、Projects、Cases、完整 DAM、复杂审批、视频转码、AI 图片处理。
- 在没有明确商业需求前，不要为“通用性”重写成通用 Page Builder。

## 11. 开发者提交前门禁

```powershell
# Frontend
Set-Location C:\Users\lin\projects\guanzhi-dongfang
npm run build

# Backend
Set-Location C:\Users\lin\projects\guanzhi-dongfang\backend
npm run typecheck
npm test
npm run build

# Git
Set-Location C:\Users\lin\projects\guanzhi-dongfang
git diff --check
git status --short
```

还应手工验证：公开中英文、CMS 登录、刷新恢复、保存草稿不影响官网、发布双语同步、媒体空态、390px、桌面和合作咨询。

## 12. 核心代码入口

- Public React：`src/App.tsx`
- Public Content parser/fallback：`src/content/public-content.ts`
- Admin 入口：`src/admin/AdminApp.tsx`
- Homepage Editor：`src/admin/HomepageEditor.tsx`
- Admin API client：`src/admin/api.ts`
- Homepage Typed Contract：`backend/src/content/contract.ts`
- Homepage draft/publish repository：`backend/src/homepage/repository.ts`
- Homepage Admin routes：`backend/src/routes/admin-homepage.ts`
- Public DTO：`backend/src/content/public-dto.ts`
- Media service/storage：`backend/src/media/`
- Database Schema：`backend/src/db/schema.ts`
- Seed：`backend/src/scripts/seed.ts`
- API 文档：`docs/backend/API.md`

## 13. 当前已知边界与遗留问题

- 当前只有 Homepage CMS UI；其他既有通用 Admin API 没有对应 Dashboard UI。
- Media modal 的 Escape、焦点陷阱、关闭后焦点恢复仍可完善。
- Locale tabs 可补方向键与更完整 ARIA 关联。
- 当前数据库媒体库为空，公开首页仍依赖静态 fallback 文件。
- 静态中文 fallback 仍是一套迁移期容错副本；正式 CMS 稳定后应逐步缩小。
- 源码压缩包不包含 `.git` 历史、`.env`、密码、JWT、数据库内容、上传文件、依赖和构建产物。

## 14. 外部开发者快速上手顺序

1. 优先从 GitHub 私有仓库 clone；只有无法获得仓库权限时才解压源码包。
2. 阅读本文及第 1 节列出的四份文档。
3. 执行 `git status`；源码 ZIP 不含 `.git`，需要长期协作时不要在 ZIP 中建立另一套历史。
4. 创建自己的 `.env`，不得索要或复制生产密码。
5. `docker compose up --build -d` 启动 Backend 与 PostgreSQL。
6. 根目录 `npm install && npm run dev` 启动 Frontend。
7. 先做只读 API 与页面验证，再登录 CMS。
8. 修改前创建功能分支；修改后运行全部门禁。
9. 提交 PR 时说明 Contract/API 是否变化、是否有 Migration、如何测试和如何回滚。
