# 观止东方官网后端架构

版本：v1.0-foundation  
定位：可本地运行、可平滑迁移到云服务器的轻量官网 CMS API。

## 1. 本阶段边界

当前只建设后端基础框架：

- 中英文页面内容管理与发布
- 文字、结构化内容块和媒体资产管理
- 合作需求表单收集与简单跟进
- 管理员登录、管理员/编辑员两级权限
- 内容版本历史与关键操作日志
- PostgreSQL 数据库迁移、初始化数据、Docker Compose
- OpenAPI 在线接口文档

明确不做：在线预订、支付、会员、商城、实时库存和复杂 CRM。现有 React 单页前端暂不改造；后续只需逐块把硬编码内容切换到公共内容 API。

## 2. 技术栈

| 层级 | 选型 | 用途 |
| --- | --- | --- |
| 运行时 | Node.js 24 | 当前 LTS 级容器运行时 |
| 语言 | TypeScript 5 | 严格类型检查 |
| Web 框架 | Fastify 5 | 高性能、轻量、插件生态成熟 |
| 数据库 | PostgreSQL 17 | 云服务器和主流云数据库均可部署 |
| ORM/迁移 | Drizzle ORM + Drizzle Kit | 类型安全查询与版本化 SQL 迁移 |
| 校验 | Zod 4 | API 输入及环境变量校验 |
| 认证 | JWT + bcrypt | 后台账号认证；密码只存哈希 |
| 接口文档 | OpenAPI + Swagger UI | 启动后访问 `/docs` |
| 文件存储 | Storage Adapter + 本地持久卷（首期） | 后续替换为 OSS/R2/S3/COS |
| 容器 | Docker Compose | 本地和云服务器保持一致 |

## 3. 总体结构

```text
guanzhi-dongfang/
├─ src/                         # 现有 React 单页前端（本阶段不改）
├─ backend/
│  ├─ src/
│  │  ├─ app.ts                # Fastify 装配、公共中间件、路由挂载
│  │  ├─ server.ts             # 进程启动与优雅退出
│  │  ├─ config.ts             # 环境变量唯一入口
│  │  ├─ db/
│  │  │  ├─ schema.ts          # 数据表与关系定义
│  │  │  └─ client.ts          # PostgreSQL 连接池
│  │  ├─ plugins/auth.ts       # JWT 鉴权和角色守卫
│  │  ├─ routes/               # 公共接口与后台接口
│  │  ├─ lib/                  # HTTP 错误、审计、CSV 等通用能力
│  │  └─ scripts/              # 数据库迁移与初始化
│  ├─ drizzle/                 # 可提交、可审查的 SQL 迁移历史
│  ├─ Dockerfile
│  └─ package.json
├─ docs/backend/
│  ├─ README.md                # 本文：架构和技术栈
│  ├─ API.md                   # 接口说明
│  └─ CONFIGURATION.md         # 配置、启动与部署说明
├─ compose.yaml                # API + PostgreSQL
└─ .env.docker.example         # Docker 配置模板
```

## 4. 数据模型

| 表 | 作用 |
| --- | --- |
| `users` | 管理员/编辑员账号 |
| `pages` | 页面主记录、草稿/发布状态 |
| `page_translations` | 每页的 `zh-CN`、`en` 内容与 SEO 字段 |
| `page_revisions` | 页面每次保存的版本快照 |
| `media_assets` | 图片、视频、PDF 元数据；文件位于持久卷 |
| `inquiries` | 官网合作需求和状态流转 |
| `inquiry_notes` | 内部跟进记录 |
| `site_settings` | 公司名称、邮箱、导航等全局配置 |
| `audit_logs` | 关键后台操作审计 |

页面正文使用版本化 `ContentDocument`。`page_translations.blocks` 当前结构为 `{ version: 1, blocks: [...] }`，由 `backend/src/content/contract.ts` 的 Zod Schema 严格验证，不再接受未经验证的任意对象数组。首页固定支持 `hero`、`about`、`capabilities`、`motifs`、`jiangnan`、`partners` 和 `contact` typed blocks。

数据库模型不直接作为公共 API 响应。公共内容路由会验证内容协议、解析媒体引用并输出稳定 Public DTO。详见 [`../content-contract.md`](../content-contract.md)。

## 5. 设计原则

- API 路径统一为 `/api/v1`，为后续兼容升级留空间。
- 公共读取只返回已发布内容；后台保存草稿后需要显式发布。
- 发布前要求中英文都存在，避免线上出现半套双语页面。
- 数据库结构变更必须生成迁移文件，不在生产环境使用自动 `push`。
- 媒体业务通过 `StorageAdapter` 读写，首期 `LocalStorageAdapter` 使用 Docker volume；云上可替换对象存储。
- 上传根据文件内容识别真实 MIME；只允许 JPEG、PNG、WebP、AVIF、MP4、PDF，明确禁止 SVG。
- 图片上限 12 MiB、PDF 20 MiB、视频 50 MiB；图片入库时读取 width/height。
- 软删除前扫描页面 Content Document 的 `assetId` 引用；后续规模扩大时再建立持久化引用索引。
- 不保存原始访问 IP，只保存带盐 SHA-256 摘要用于反垃圾和审计。
- 数据库不暴露公网；生产流量由 Nginx/Caddy 终止 HTTPS 后转发给 API。

## 6. 后续迭代顺序

1. 用现有前端接入 `GET /api/v1/content/pages/:slug` 与合作表单。
2. 开发独立后台管理页面，先覆盖页面、媒体和线索三个模块。
3. 云服务器测试：域名、HTTPS、备份、日志轮转和监控。
4. 媒体量增加后切换 OSS/R2/S3，并增加 WebP/AVIF 异步处理。
5. 有真实运营数据后再决定是否增加邮件模板、企业微信通知或更完整的 CRM。

## 7. 当前前端接入边界

当前将 Site Settings 联系邮箱及 `home` 页 Hero、About block 接入 API。Hero 与 About 共用一次首页请求，React 初始状态使用正式静态 fallback，API 或数据库故障不会造成首屏空白。Capabilities、Motifs、Jiangnan、Partners 和 Contact 正文仍保持静态渲染，等待分阶段验收。
