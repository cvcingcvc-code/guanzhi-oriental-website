# 观止东方 · Guanzhi Oriental

**东方文化深度体验产品研发与供应机构**

把东方文化，转化为可以进入的旅行体验。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 6 |
| 样式 | Tailwind CSS 3 + CSS Custom Properties |
| 动效 | GSAP 3 (ScrollTrigger) |
| 字体 | Google Fonts: Noto Serif SC + Cormorant Garamond |
| 部署 | 尚未确认生产平台；本地与 CI 使用 Docker Compose 验证 PostgreSQL + API |

### 后端基础框架

后端已按独立服务放在 `backend/`，与 React 多路由 SPA 共同组成当前应用。技术栈为 Node.js 24、TypeScript、Fastify、PostgreSQL、Drizzle ORM、JWT 和 Docker Compose，覆盖双语 CMS、媒体、合作线索、账号权限和操作日志。

- 架构与项目结构：[`docs/backend/README.md`](docs/backend/README.md)
- API 说明：[`docs/backend/API.md`](docs/backend/API.md)
- 配置与部署：[`docs/backend/CONFIGURATION.md`](docs/backend/CONFIGURATION.md)
- 内容协议与首批接入：[`docs/content-contract.md`](docs/content-contract.md)
- Homepage CMS Editor：[`docs/homepage-cms.md`](docs/homepage-cms.md)
- 新窗口与多人开发交接：[`docs/NEW-WINDOW-HANDOFF.md`](docs/NEW-WINDOW-HANDOFF.md)
- 新成员从 GitHub 加入、完整启动、前端替换到最终交付：[`docs/DEVELOPER-HANDOFF.md`](docs/DEVELOPER-HANDOFF.md)
- 前端替换与 API 接入声明：[`docs/frontend-replacement-guide.md`](docs/frontend-replacement-guide.md)
- 多人 Git 协作约定：[`CONTRIBUTING.md`](CONTRIBUTING.md)
- Docker 配置模板：`.env.docker.example`

本地启动后端：

```bash
cp .env.docker.example .env
docker compose up --build -d
```

## 本地开发

```bash
# 安装锁文件依赖（需要 Node.js 24）
npm ci

# 启动开发服务器
npm run dev
# → http://localhost:3000

# 前端测试
npm test

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

## 项目结构

```
├── index.html              # Vite 入口 HTML
├── public/
│   ├── images/             # 静态图片资源
│   │   ├── hero-poster.svg
│   │   └── Gemini_*.png    # AI 生成的文化场景图（8张）
│   └── videos/
│       └── hero-loop.mp4   # Hero 背景视频
├── src/
│   ├── main.tsx            # React 入口
│   ├── App.tsx             # 公共多路由网站与共享导航外壳
│   ├── public/             # 页面模型、CTA dispatcher、咨询 Dialog 与测试
│   ├── index.css           # 全局设计系统 + Tailwind
│   └── components/
│       └── *.tsx             # Legacy：历史页面组件，当前 App.tsx 未导入
├── scripts/
│   └── download-fonts.js   # 字体下载脚本
├── assets/
│   └── favicon.svg         # 网站图标
├── tailwind.config.js      # Tailwind 配置（设计Token）
├── tsconfig.json           # TypeScript 配置
└── vite.config.ts          # Vite 配置
```

## 设计系统

基于"编辑式美学"理念，安静、克制、有文献感。

| Token | 值 | 用途 |
|-------|-----|------|
| `--paper` | `#F7F5F0` | 底色（宣纸米白） |
| `--ink` | `#2A2A28` | 主文字色（墨色） |
| `--cinnabar` | `#B54A3F` | 强调色（朱砂） |
| `--celadon` | `#A4B5A4` | 辅助色（青瓷） |
| `--border` | `#C5C0B6` | 线条色 |

字体栈：`Noto Serif SC`（中文衬线）+ `Cormorant Garamond`（英文斜体）+ 系统无衬线（UI）

## 当前公共网站

公共端使用 React Router 提供六个独立 URL：

- `/`：Hero 与已启用 CMS 内容的摘要入口
- `/about`：About
- `/capabilities`：Capabilities + Motifs
- `/into-jiangnan`：Jiangnan
- `/partners`：Partners
- `/contact`：Contact 与合作咨询入口

路由和导航由 Public API 已过滤的 blocks 统一派生。CMS 禁用 block 后，对应内容和导航入口一起消失；`scroll` CTA 的历史 target 会兼容映射到相应路由，`inquiry` 打开咨询 Dialog，`link` 仅执行 Contract 已允许的 HTTPS 或 mailto 地址。`/admin/homepage` 继续由独立入口加载，不经过公共 Router。

## Homepage CMS 区块

1. **Hero** — 视频背景 + 品牌宣言
2. **About** — 机构介绍
3. **Solutions** — 四项核心能力
4. **Product Studio** — 文化母题产品卡片
5. **Jiangnan** — 入江南旗舰内容
6. **For Partners** — 合作对象
7. **Contact** — 合作 CTA、联系方式、Footer 与咨询弹窗

页面布局、响应式和交互由 `src/App.tsx` 与 `src/public/` 控制；以下七个区块的展示内容来自同一个经过校验的 Homepage Content Document：

- `hero`
- `about`
- `capabilities`
- `motifs`
- `jiangnan`
- `partners`
- `contact`

`src/components/` 保留旧版 GSAP/Tailwind 设计实现，属于 legacy，不是当前渲染入口。不要依据这些旧组件判断线上内容。

`public/server/index.js` 是旧 API prototype，仅保留历史兼容；正式后端是 `backend/src/server.ts` 下的 Fastify API。

首页 `zh-CN` 与 `en` 均通过一次 `GET /api/v1/content/pages/home?locale=...` 请求读取整份首页内容，不为每个区块单独请求。数据库 Document 固定包含七种唯一 block；Public DTO 会过滤 `enabled=false` 的 block/item，React 对可见子集条件渲染。语言切换成功后原子替换整个响应；失败时保留当前可用内容，不清空页面。

品牌名、法定主体、旗舰名称和联系邮箱不属于 Contact block，统一由 `GET /api/v1/content/settings` 提供。合作咨询已接入 `POST /api/v1/inquiries`。

英文 About 是甲方确认的正式文案，其 `contentStatus` 为 `approved`；英文 Hero、Capabilities、Motifs、Jiangnan、Partners、Contact 为待甲方确认的首期 draft，其 `contentStatus` 为 `draft`。状态保留在内容元数据和交接记录中，不作为官网访客提示；正式稿可逐块替换且无需改代码。

本阶段沿用现有 PostgreSQL JSONB Content Document，没有修改数据库 Schema，也没有新增 Migration。

## Homepage CMS Editor

后台本阶段只提供 Homepage Editor 最小闭环，不是 Dashboard 或通用 Page Builder。管理员与编辑员登录后可在 `/admin/homepage` 读取完整中英文首页、编辑固定七个 Typed Blocks、从媒体库选择或上传文件，并以一份双语草稿原子保存。只有 `ADMIN` 可以发布；发布前的保存不会改变公共官网正在读取的 `page_translations`。

后台前端把 JWT 保存在当前浏览器标签页的 `sessionStorage`，启动时通过 `/api/v1/admin/auth/me` 恢复会话；退出或收到 `401` 后清除会话。它不会把 token 写入 URL、Content Document 或长期 `localStorage`。

草稿保存使用 revision optimistic lock：页面加载所得 `revision` 必须作为 `baseRevision` 回传。其他会话先保存后，旧编辑器会收到 `409`，必须重新读取并人工处理冲突，不能静默覆盖新内容。发布同样要求提交当前 `revision`。

详细边界、接口、草稿/发布模型和最终 QA 清单见 [`docs/homepage-cms.md`](docs/homepage-cms.md)。本阶段明确不建设 News、Projects、Cases、Dashboard、通用 Page Builder、复杂审批流或媒体 DAM。

### Fallback 策略

迁移期间保留完整中文首页静态 fallback 和公开 Settings fallback，保证初次请求或 API 故障时仍有可用页面；语言切换失败则保留切换前的完整 Document。正式 CMS 编辑、发布和可用性监控稳定后，应逐步移除代码中与 CMS 重复的七块正式正文，只长期保留最小品牌/联系信息、通用故障提示和“保留当前已加载内容”的容错逻辑，避免维护两套独立官网文案。

## 待完成

| 优先级 | 任务 |
|--------|------|
| P0 | 真实产品摄影图片（替换 Lab 卡片渐变占位） |
| P0 | 微信二维码（替换 Contact 占位） |
| P1 | 甲方确认 About 之外六个英文首页 block 的 draft 文案 |
| P1 | 甲方验收 Homepage CMS Editor，并确认后续生产认证与监控策略 |
| P2 | 图片优化管线（WebP/AVIF） |

---

观止东方 Guanzhi Oriental｜运营主体：北京见山观止文化有限公司
