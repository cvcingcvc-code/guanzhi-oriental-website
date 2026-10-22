# 观止东方 · Guanzhi Oriental

**东方文化深度体验产品研发与供应机构** — 品牌官网 + 双语 CMS

把东方文化，转化为可以进入的旅行体验。

[![CI](https://github.com/cvcingcvc-code/guanzhi-oriental-website/actions/workflows/ci.yml/badge.svg)](https://github.com/cvcingcvc-code/guanzhi-oriental-website/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 这是什么

一个可以直接落地的**完整网站**：React 多路由官网 + Fastify 后端 + PostgreSQL 数据库 + Docker 一键部署。

- **公共官网**：六个路由（首页/关于/能力/入江南/伙伴/联系），内容全部来自 CMS，支持中英双语
- **后台 CMS**：`/admin/homepage` 管理首页七个区块，媒体库上传，草稿/发布双阶段，版本乐观锁
- **合作线索**：公开询盘表单入库 + 后台管理 + CSV 导出 + 邮件通知
- **生产部署**：一台服务器 + Docker，一条命令上线（自动 TLS、自动建表、自动种子数据）

## 快速开始

### 方式一：服务器一键部署（推荐，只需 Docker）

详见 [`docs/DEPLOY.md`](docs/DEPLOY.md)，核心三步：

```bash
git clone https://github.com/cvcingcvc-code/guanzhi-oriental-website.git
cd guanzhi-oriental-website
cp .env.production.example .env   # 填入域名、数据库密码、JWT_SECRET、管理员账号
docker compose -f compose.prod.yaml up --build -d
```

完成后 `https://你的域名` 即可访问（TLS 自动签发），`/api/v1/health` 返回 ok 表示后端就绪。
前端在容器内构建，**服务器不需要 Node**。首次启动自动执行数据库 migration 与 seed（创建管理员和首页内容）。

### 方式二：本地开发全栈联调

要求 Node.js 24、npm、Docker Engine 与 Docker Compose。

```bash
npm ci
cd backend && npm ci && cd ..
cp .env.docker.example .env
docker compose up --build -d        # 启动 PostgreSQL + Fastify
npm run dev                          # 前端 http://localhost:3000
```

- 前端：`http://localhost:3000`（Vite 将 `/api` 代理到 Fastify）
- 后端：`http://127.0.0.1:8080`，健康检查 `GET /api/v1/health`
- PostgreSQL：仅容器网络内可达

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建 | Vite 6 |
| 样式 | Tailwind CSS 3 + CSS Custom Properties |
| 动效 | GSAP 3 (ScrollTrigger) |
| 后端 | Node.js 24 + Fastify 5 + Zod |
| 数据库 | PostgreSQL 17 + Drizzle ORM |
| 认证 | JWT（每请求从 DB 重载用户）+ bcrypt |
| 部署 | Docker Compose + Caddy（自动 TLS） |
| CI | GitHub Actions（类型检查 + 测试 + 构建 + 依赖审计门禁 + 部署冒烟） |

## 项目结构

```
├── index.html                 # Vite 入口 HTML（字体预载 + OG meta）
├── public/                    # 静态资源（构建时原样拷贝）
│   ├── images/                # 图片（optimized webp + client-design 章节图）
│   ├── videos/                # Hero 背景视频（hero-loop.mp4）
│   └── fonts/                 # 自托管中英文字体（woff2）
├── src/
│   ├── main.tsx               # React 入口
│   ├── App.tsx                # 公共多路由网站与共享导航外壳
│   ├── admin/                 # CMS 后台前端（/admin/homepage）
│   ├── content/               # 前端内容层：API 客户端、fallback、DTO 解析（16 测试）
│   ├── public/                # 页面模型、CTA dispatcher、咨询 Dialog 与测试
│   ├── i18n/                  # 多语言 UI 文案
│   └── index.css              # 全局设计系统 + Tailwind
├── backend/
│   ├── src/
│   │   ├── app.ts             # Fastify 组装（helmet/CORS/限流/JWT/静态媒体）
│   │   ├── routes/            # 公共内容、admin 页面/媒体/线索/设置/账号、认证
│   │   ├── plugins/auth.ts    # authenticate / requireAdmin
│   │   ├── media/             # 上传服务（魔数检测、路径穿越防护、SVG 禁令）
│   │   ├── content/           # 内容协议验证与 Public DTO
│   │   ├── db/                # Drizzle schema、连接池
│   │   └── scripts/           # migrate.ts / seed.ts
│   ├── tests/                 # 45 个后端测试（安全/认证/媒体/内容/韧性）
│   ├── drizzle/               # 数据库 migration
│   └── Dockerfile             # API 多阶段构建
├── Dockerfile.web             # 前端+Caddy 一体镜像（服务器无需 Node）
├── compose.yaml               # 本地：db + api
├── compose.prod.yaml          # 生产：caddy + db + api
├── deploy/
│   ├── Caddyfile              # TLS、静态托管、/api 与 /uploads 反代、SPA 回退、CSP
│   └── backup-db.sh           # 数据库每日备份
├── docs/
│   ├── DEPLOY.md              # 生产部署指南（3 步上线）
│   ├── backend/               # 后端架构、API、配置文档
│   ├── content-contract.md    # 内容协议
│   └── homepage-cms.md        # CMS 边界与 QA 清单
├── .github/workflows/ci.yml   # CI（5 个 job）
├── LICENSE                    # MIT（代码）+ 内容版权边界
└── CONTRIBUTING.md            # 协作开发指南
```

## 测试与质量

```bash
npm test                       # 前端 26 测试（vitest + testing-library）
cd backend && npm test         # 后端 45 测试（node:test）
cd backend && npm run typecheck
```

- CI 门禁：PR 触发类型检查 + 测试 + 构建；push 到 master 额外跑生产依赖审计（high 级以上漏洞直接红）与两套 Docker 部署冒烟
- 安全基线：生产启动拒绝弱密钥；上传 SVG 禁令 + 魔数检测；CSP/HSTS 等安全响应头；Swagger 生产关闭；IP 加盐哈希存储

## 内容与 CMS 使用说明

### 公共官网

六个路由的内容由 `GET /api/v1/content/pages/:slug?locale=zh-CN|en` 统一提供；品牌名、联系邮箱等由 `GET /api/v1/content/settings` 提供。CMS 禁用 block 后对应内容和导航入口一起消失；语言切换失败时保留当前可用内容，不清空页面。API 故障时前端回退到内置中文兜底内容。

### 后台 CMS（/admin/homepage）

1. 用管理员账号登录（账号由部署时的 `ADMIN_EMAIL`/`ADMIN_PASSWORD` 种子创建）
2. 读取完整中英文首页，编辑七个 Typed Blocks（hero/about/capabilities/motifs/jiangnan/partners/contact）
3. 从媒体库选择或上传图片/视频/PDF（JPEG/PNG/WebP/AVIF/MP4/PDF，SVG 禁止）
4. 保存双语草稿（不影线上）；`ADMIN` 点发布后官网立即可见
5. 草稿使用 revision 乐观锁：他人先保存后旧编辑器收到 409，须重新读取处理冲突

合作线索在后台查看、改状态、加跟进备注、导出 CSV；部署时可选配置 Resend 邮件通知。

### 首次上线后必做

- [ ] 立即修改种子管理员密码（用 `/admin/homepage` 登录后经 API 修改，或直接更新数据库）
- [ ] 验收清单见 [`docs/DEPLOY.md`](docs/DEPLOY.md)（首页/健康检查/CMS/询盘/HTTPS）

## 设计系统

基于"编辑式美学"理念，安静、克制、有文献感。

| Token | 值 | 用途 |
|-------|-----|------|
| `--paper` | `#F7F5F0` | 底色（宣纸米白） |
| `--ink` | `#2A2A28` | 主文字色（墨色） |
| `--cinnabar` | `#B54A3F` | 强调色（朱砂） |
| `--celadon` | `#A4B5A4` | 辅助色（青瓷） |
| `--border` | `#C5C0B6` | 线条色 |

字体栈：`Noto Serif SC`（中文衬线）+ `Source Serif 4`（英文衬线）+ 系统无衬线（UI），全部自托管（woff2，预载关键字体）。

## 更多文档

| 文档 | 内容 |
|------|------|
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | 生产部署（架构、3 步上线、运维、备份恢复、回滚） |
| [`docs/backend/README.md`](docs/backend/README.md) | 后端架构与项目结构 |
| [`docs/backend/API.md`](docs/backend/API.md) | API 接口说明 |
| [`docs/backend/CONFIGURATION.md`](docs/backend/CONFIGURATION.md) | 环境变量与配置 |
| [`docs/content-contract.md`](docs/content-contract.md) | 内容协议与接入方式 |
| [`docs/homepage-cms.md`](docs/homepage-cms.md) | CMS 边界、草稿/发布模型、QA 清单 |
| [`docs/DEVELOPER-HANDOFF.md`](docs/DEVELOPER-HANDOFF.md) | 新成员从 GitHub 加入到完整交付 |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | 分支、提交与协作约定 |

## 开源说明

- **代码**：基于 [MIT License](LICENSE) 开源，可自由使用、修改、分发
- **内容**：品牌名称、文案、图片、设计资产**不在 MIT 范围内**（详见 [LICENSE](LICENSE) 内容版权边界）——以本仓库为模板建站请替换全部品牌内容
- 欢迎通过 Issue 反馈问题、通过 PR 贡献改进（约定见 [CONTRIBUTING.md](CONTRIBUTING.md)）

## 待完成

| 优先级 | 任务 |
|--------|------|
| P0 | 真实产品摄影图片（替换部分占位图） |
| P0 | 微信二维码（替换 Contact 占位） |
| P1 | 甲方确认 About 之外六个英文首页 block 的 draft 文案 |
| P2 | UptimeRobot 等外部可用性监控接入 |

---

观止东方 Guanzhi Oriental｜运营主体：北京见山观止文化有限公司
