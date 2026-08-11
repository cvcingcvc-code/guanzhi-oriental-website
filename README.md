# 观止东方 · Guanzhi Dongfang

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
| 部署 | Cloudflare Pages (静态站点) |

### 后端基础框架

后端已按独立服务放在 `backend/`，不影响当前 React 单页前端。技术栈为 Node.js 24、TypeScript、Fastify、PostgreSQL、Drizzle ORM、JWT 和 Docker Compose，覆盖双语 CMS、媒体、合作线索、账号权限和操作日志。

- 架构与项目结构：[`docs/backend/README.md`](docs/backend/README.md)
- API 说明：[`docs/backend/API.md`](docs/backend/API.md)
- 配置与部署：[`docs/backend/CONFIGURATION.md`](docs/backend/CONFIGURATION.md)
- 内容协议与首批接入：[`docs/content-contract.md`](docs/content-contract.md)
- Docker 配置模板：`.env.docker.example`

本地启动后端：

```bash
cp .env.docker.example .env
docker compose up --build -d
```

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
# → http://localhost:3000

# 类型检查
npx tsc --noEmit

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
│   ├── App.tsx             # 当前根组件（7个主区块单页布局）
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

## 当前页面区块（以 `src/App.tsx` 为准）

1. **Hero** — 视频背景 + 品牌宣言
2. **About** — 机构介绍
3. **Solutions** — 四项核心能力
4. **Product Studio** — 文化母题产品卡片
5. **Jiangnan** — 入江南旗舰内容
6. **For Partners** — 合作对象
7. **Contact** — 合作 CTA、联系方式、Footer 与咨询弹窗

`src/components/` 保留旧版 GSAP/Tailwind 设计实现，属于 legacy，不是当前渲染入口。不要依据这些旧组件判断线上内容。

`public/server/index.js` 是旧 API prototype，仅保留历史兼容；正式后端是 `backend/src/server.ts` 下的 Fastify API。

当前 Hero 与公开站点设置已接入数据库内容 API，并保留静态 fallback。合作咨询已接入 `POST /api/v1/inquiries`。

## 待完成

| 优先级 | 任务 |
|--------|------|
| P0 | 真实产品摄影图片（替换 Lab 卡片渐变占位） |
| P0 | 微信二维码（替换 Contact 占位） |
| P1 | 多页面路由（/about, /products, /contact） |
| P1 | 英文版 i18n（/en/） |
| P1 | 逐块接入 typed content API |
| P2 | 测试体系 |
| P2 | 图片优化管线（WebP/AVIF） |

---

© 2026 杭州观止东方文化传播有限公司
