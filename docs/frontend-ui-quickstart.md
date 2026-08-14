# 观止东方官网｜前端 UI 开发快速交接

> 给第一次接手项目的前端开发者：先读这份，约 10 分钟。当前基线为 Node.js 24、React 18、Vite 6。

## 你负责什么

你的主要任务是**重新设计和实现官网 UI**。当前 UI 不是必须保留的最终设计，可以大胆调整：

- React Components、页面布局和视觉结构
- CSS、字体、颜色、间距和图片
- Header、Hero、Footer
- 响应式、移动端和适度动效

优先修改公开官网；保证内容仍来自现有 CMS/API，功能仍然可用。

## 最重要的红线

> **UI 可以换，但不要擅自修改 API Contract、Backend、PostgreSQL、Database Schema、Migration、Auth、ADMIN / EDITOR 权限，以及 CMS draft / publish 逻辑。**

禁止：

```text
Frontend → 直接访问 PostgreSQL
Frontend → import backend/src/*
```

必须保持：

```text
UI
↓
Frontend API Layer
↓
HTTP API / Public DTO
↓
Backend
↓
PostgreSQL
```

如果新 UI 确实需要新数据，先告诉项目负责人，不要自行修改 Backend API。

## 当前后端状态

Homepage Content、Contact、CMS、Auth、ADMIN / EDITOR、Media、PostgreSQL、503 错误处理、数据库中断恢复、Tests 和 CI 均已实现并验证。

本轮默认把 Backend/API 当成稳定接口使用，**不重新开发后端**。

## 最简启动流程（PowerShell）

先安装 Node.js 24、npm、Git 和 Docker Desktop，并确认 Docker 已启动。

```powershell
# 1. Clone
git clone https://github.com/cvcingcvc-code/guanzhi-oriental-website.git
cd guanzhi-oriental-website

# 2. 根项目和 Backend 分别安装锁定依赖
npm ci
cd backend
npm ci
cd ..

# 3. 创建本地配置；不要提交 .env
Copy-Item .env.docker.example .env

# 4. 启动 PostgreSQL
docker compose up -d db

# 5. 构建并启动 Backend（会自动 migration 和 seed）
docker compose up --build -d api

# 6. 启动 Frontend
npm run dev
```

浏览器与检查地址：

| 用途 | 地址 |
|---|---|
| Frontend | `http://localhost:3000` |
| Backend health | `http://127.0.0.1:8080/api/v1/health` |
| Homepage CMS | `http://localhost:3000/admin/homepage` |

前端请求继续使用 `/api/...`；Vite 会把它代理到 Backend。不要在组件里写死服务器 IP。

## 当前页面

| 页面 | 路径 |
|---|---|
| 首页 | `/` |
| 关于观止 | `/about` |
| 产品与能力 | `/capabilities` |
| 入江南 | `/into-jiangnan` |
| 合作伙伴 | `/partners` |
| 联系我们 | `/contact` |
| Homepage CMS | `/admin/homepage` |

优先修改前六个公开页面。`/admin/homepage` 已有完整 CMS 功能，除非明确要求，只调整外观，不改保存、发布、权限和版本冲突逻辑。

## UI 开发牢记 5 条

1. CMS/API 数据不要重新写死进 JSX。
2. 不要修改现有 API 路径、请求字段或返回结构。
3. 不要直接修改 Backend、数据库 Schema 或 Migration。
4. Contact、中文/英文切换、图片、Loading 和错误 fallback 必须继续工作；503 不是登录失败。
5. 新 UI 完成后必须跑测试，并实际检查桌面端和手机端。

## 提交前 Checklist

- [ ] 所有公开页面和刷新都能正常打开
- [ ] 375/390px 手机端无横向滚动，菜单和按钮可用
- [ ] 中文/英文切换正常
- [ ] Contact 正常提交、错误时不白屏、不会重复提交
- [ ] 图片不破，Console 没有新的 error
- [ ] Frontend tests：`npm test`
- [ ] Contract tests：`node --test tests/*.test.js`
- [ ] Frontend build：`npm run build`
- [ ] Diff 检查：`git diff --check`

## GitHub 怎么提交

```text
master → 自己的 feature branch → commit → push → Draft PR → CI → Review
```

**不要直接 push master。** 开始开发：

```powershell
git switch master
git pull --ff-only
git switch -c feature/homepage-redesign
```

完成一个阶段后，先确认没有 `.env`、密码、`node_modules`、`dist`、临时截图或上传文件，再提交：

```powershell
git status --short
git add .
git commit -m "feat: redesign homepage UI"
git push -u origin feature/homepage-redesign
```

然后在 GitHub 创建 **Draft PR**，等待 CI 和负责人 Review，不要自行合并。

## 如果现有 API 不够用

不要自己修改 API Contract。把下面信息交给负责人决定：

```text
页面：
需要什么数据：
当前 API 缺什么：
为什么前端无法自行适配：
```

## 每阶段交付信息

```text
Branch：
Commit：
PR：
修改页面：
主要 UI 改动：
是否修改 API：NO / YES
是否修改 Backend：NO / YES
Frontend tests：
Build：
Known Issues：
```

正常 UI PR 应为：`是否修改 API：NO`、`是否修改 Backend：NO`。

如需了解 API、CMS、错误处理和完整协作规范，请阅读详细版 [Frontend Replacement Guide](./frontend-replacement-guide.md) 和 [Full-stack Development Handoff](./fullstack-development-handoff.md)。
