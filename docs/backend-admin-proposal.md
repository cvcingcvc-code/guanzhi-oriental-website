# 观止东方 · 后台管理系统草案（Historical Proposal / Deprecated Architecture）

> 版本: v0.1-draft | 日期: 2026-08-09 | 状态: 待评审

> **历史说明：** 本文记录早期 Cloudflare Workers / D1 / R2 架构设想，不代表当前实现。当前正式后端以 Fastify、Drizzle ORM 和 PostgreSQL 为准，接口与数据模型请以 `docs/backend/` 和实际代码为准。本文仅作为需求与设计讨论档案保留。

---

## 一、背景与目标

### 1.1 现状

官网目前为**纯静态 React SPA**，所有内容硬编码在 TypeScript 源码中：

| 数据类型 | 当前位置 | 数量 | 更新方式 |
|----------|----------|------|----------|
| 核心能力 | `Solutions.tsx` → `CAPABILITIES[]` | 4 项 | 改代码 + 重新构建部署 |
| 文化母题 | `Lab.tsx` → `MOTIFS[]` | 5 款 | 改代码 + 重新构建部署 |
| 卷轴场景 | `CulturalScroll.tsx` → `SCENES[]` | 8 张图 | 改代码 + 重新构建部署 |
| 合作对象 | `Contact.tsx` → `PARTNER_TYPES[]` | 6 项 | 改代码 + 重新构建部署 |
| 合作模式 | `Contact.tsx` → `COLLAB_MODES[]` | 6 项 | 改代码 + 重新构建部署 |
| 创始人文案 | `Founder.tsx` | 全段 | 改代码 + 重新构建部署 |
| About 文案 | `About.tsx` | 全段 | 改代码 + 重新构建部署 |
| 联系邮箱 | `Contact.tsx` | 1 个 | 改代码 + 重新构建部署 |
| 微信二维码 | `Contact.tsx` 占位 | 1 张 | 手动替换 |

**痛点：** 任何文字修改、图片替换都需要走完整的前端构建 → 部署流程，非技术人员无法操作。

### 1.2 目标

建设一个**轻量级 CMS 后台**，实现：

1. **内容可配置** — 所有文案、图片、列表项可通过后台编辑，无需改代码
2. **非技术人员可操作** — 运营/市场同事可独立完成内容更新
3. **合作线索管理** — 收集官网联系表单提交，沉淀为 CRM 线索
4. **图片资产管理** — 统一管理官网所有视觉素材，支持 WebP/AVIF 自动转换

---

## 二、功能模块设计

### 2.1 模块全景图

```
┌─────────────────────────────────────────────────────┐
│                  观止东方 管理后台                      │
├─────────────┬─────────────┬─────────────┬─────────────┤
│  ① 内容管理  │  ② 媒体库    │  ③ 线索管理  │  ④ 系统设置  │
│  CMS        │  Media      │  CRM        │  Settings   │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ · 首页文案  │ · 图片上传   │ · 线索列表   │ · 账号管理   │
│ · 核心能力  │ · 自动压缩   │ · 状态跟踪   │ · 操作日志   │
│ · 文化母题  │ · 分类标签   │ · 导出 CSV   │ · 站点预览   │
│ · 卷轴场景  │ · 历史版本   │ · 邮件通知   │              │
│ · 合作信息  │             │             │              │
│ · 创始人页  │             │             │              │
│ · 全局配置  │             │             │              │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### 2.2 ① 内容管理 (CMS Core)

**核心思路：** 将每个组件的数据从 TSX 中抽离为结构化 API 响应，后台提供对应的 CRUD 表单。

#### 2.2.1 首页与关于 (About)

| 字段 | 类型 | 说明 |
|------|------|------|
| 左侧标题行 1-3 | text (×3) | "东方文化旅游 / 深度体验产品 / 研发与供应商" |
| 正文段落 | rich text (×3) | 支持基本排版（段落、加粗、链接） |
| 资质说明 | textarea | 底部企业资质文案 |

#### 2.2.2 产品与解决方案 (Solutions)

每条能力记录：

| 字段 | 类型 | 说明 |
|------|------|------|
| 编号 | string | "01" ~ "04" |
| 标题 | text | "文化产品研发" 等 |
| 描述 | textarea | 详细说明 |
| 标签 | tag[] | "内容脚本" "流程设计" 等 |
| 排序 | number | 控制展示顺序 |
| 启用 | boolean | 是否在前端展示 |

#### 2.2.3 文化母题卡片 (Lab)

| 字段 | 类型 | 说明 |
|------|------|------|
| 编号 | string | "01" ~ "05" |
| 中文标题 | text | "园林" |
| 英文标题 | text | "Garden" |
| 副标题 | text | "如何走进一首中国式的诗" |
| 研发状态 | select | "研究中" / "合作开发中" / "已发布" |
| 封面图 | image ref | 从媒体库选择或上传 |
| 详情描述 | rich text | 点击卡片后的展开内容（预留） |
| 排序 | number | |
| 启用 | boolean | |

#### 2.2.4 文化意境卷轴 (CulturalScroll)

| 字段 | 类型 | 说明 |
|------|------|------|
| 序号 | number | 0 ~ N，决定滚动顺序 |
| 中文关键词 | text | "湖面·晨雾" |
| 英文 subtitle | text | "Stillness of the West Lake" |
| 图片 | image ref | 建议 1920×1080，从媒体库选 |
| 是否尾帧 | boolean | 最后一张用更大字号 + 居中布局 |

#### 2.2.5 联系与合作 (Contact)

| 字段 | 类型 | 说明 |
|------|------|------|
| 合作对象列表 | text[] | 可增删改排序 |
| 合作模式列表 | {标题, 描述}[] | 同上 |
| CTA 文案 | text | "期待与您探讨…" |
| 联系邮箱 | email | hello@guanzhidongfang.com |
| 微信二维码 | image | 替换占位 |
| 公司全称 | text | 底部版权信息 |
| Footer 文案 | text | © 年份/版权 |

#### 2.2.6 创始人页 (Founder)

| 字段 | 类型 | 说明 |
|------|------|------|
| 标题 | text | "一位内容策划者与资源整合者" |
| 正文段落 | rich text (×2) | 创始人介绍 |
| 项目卡片 — 标题 | text | "过往项目：国风小注" |
| 项目卡片 — 描述 | textarea | 项目详情 |
| 项目卡片 — 链接 | url | 可选 |

#### 2.2.7 全局配置

| 字段 | 类型 | 说明 |
|------|------|------|
| 站点标题 | text | `<title>` 标签 |
| SEO 描述 | textarea | `<meta description>` |
| OG 图片 | image | 社交分享缩略图 |
| Favicon | image | |
| Hero 视频 | file | hero-loop.mp4 |
| 导航菜单项 | {label, href}[] | 支持锚点或外链 |

---

### 2.3 ② 媒体库 (Media Library)

轻量级 DAM，统一管理官网视觉资产：

- **上传** — 拖拽上传，支持 JPG/PNG/WebP/MP4/SVG
- **自动转码** — 上传原图 → 自动生成 WebP (桌面) + AVIF (移动) + 缩略图
- **标签与分类** — 按页面区块分类（Hero / Lab / Scroll / 通用）
- **图片预览** — 网格列表 + 大图预览
- **引用追踪** — 显示每张图片被哪些内容引用，防止误删
- **历史版本** — 覆盖上传时保留上一版本，可回滚（保留最近 3 版）
- **存储** — Cloudflare R2 或阿里云 OSS

---

### 2.4 ③ 线索管理 (Lead CRM)

当官网接入联系表单后，后台统一管理合作线索：

#### 表单字段（前端）

| 字段 | 必填 | 说明 |
|------|------|------|
| 姓名 | ✓ | |
| 机构名称 | ✓ | |
| 职位 | | |
| 邮箱 | ✓ | |
| 手机/微信 | | |
| 合作意向 | select | 委托研发 / 联合出品 / 内容授权 / 白标 / 其他 |
| 留言 | textarea | |
| 来源页 | 自动 | 记录用户从哪个页面提交 |

#### 后台功能

- **线索列表** — 表格展示，支持按状态/时间/意向筛选
- **状态流转** — 新线索 → 已联系 → 洽谈中 → 已合作 / 已关闭
- **跟进记录** — 每条线索可添加内部备注和时间线
- **导出 CSV** — 一键导出全部/筛选结果
- **邮件通知** — 新线索到达时通知管理员邮箱
- **统计卡片** — 今日新增 / 本月新增 / 转化率（简易）

---

### 2.5 ④ 系统设置

| 功能 | 说明 |
|------|------|
| 管理员账号 | 初始超级管理员 + 可创建编辑员（仅内容，无系统设置权限） |
| 操作日志 | 记录谁在什么时间改了哪个字段，从什么改成什么 |
| 站点预览 | 一键打开前端预览链接（可带 `?preview=true` 加载草稿内容） |
| 发布管理 | "保存草稿" vs "发布" — 发布后触发前端 CDN 缓存刷新 |

---

## 三、技术方案

### 3.1 推荐架构：Cloudflare 全栈

```
┌──────────────┐     ┌─────────────────┐     ┌──────────┐
│  管理后台 SPA  │──▶  │  CF Workers API  │──▶  │  D1 数据库 │
│  (React/Vite) │     │  (Hono/itty)    │     │  (SQLite) │
└──────────────┘     └────────┬────────┘     └──────────┘
                              │
                              ▼
                       ┌──────────┐
                       │  R2 存储   │
                       │  (图片/视频)│
                       └──────────┘
```

| 层级 | 选型 | 理由 |
|------|------|------|
| API 层 | **Cloudflare Workers** + Hono | 边缘计算，低延迟，与 Pages 同生态 |
| 数据库 | **Cloudflare D1** (SQLite) | 免费额度大，适合轻量 CMS；或 **Turso** |
| 文件存储 | **Cloudflare R2** | 零出站流量费，S3 兼容 API，内置图片变体 (Image Resizing) |
| 认证 | **Cloudflare Access** 或 JWT (jose) | 轻量鉴权，无需自建 OAuth |
| 后台前端 | **React 18 + Ant Design / shadcn/ui** | 与主站同技术栈，降低维护成本 |
| 部署 | `admin.guanzhidongfang.com` | Cloudflare Pages 独立项目 |

### 3.2 备选方案：轻量 BaaS

如果不想自己搭建 API，可用 **Strapi** 或 **Payload CMS** 自建，或 **Contentful / Sanity** 等 Headless CMS SaaS。但鉴于网站体量小、数据模型简单，自建 CF Workers API 更轻量且无第三方依赖。

### 3.3 前端架构改造

当前官网从静态硬编码 → API 驱动：

```typescript
// 改造前 (当前)
const CAPABILITIES: Capability[] = [
  { number: '01', title: '文化产品研发', ... },
  // ...
];

// 改造后
const { data } = useQuery({
  queryKey: ['solutions'],
  queryFn: () => fetch('/api/content/solutions').then(r => r.json()),
  staleTime: 5 * 60 * 1000, // 5 分钟内不重新请求
});
```

**构建策略选型：**

| 方案 | 描述 | 推荐场景 |
|------|------|----------|
| **SSR (CF Pages Functions)** | 每次请求实时拉取 CMS 数据 | 内容变更频繁 |
| **ISR (增量静态再生)** | 构建时生成静态页，后台更新时触发重新生成 | ✅ 推荐 |
| **CSR + API** | 客户端直接调用 Workers API | 最简单，SEO 较弱 |

**推荐 ISR 模式：** 后台保存 → 调用 Pages Deploy Hook → 自动重新构建（~1-2 分钟）。对品牌官网来说，内容更新频率低（一周几次），1-2 分钟的发布延迟完全可接受，同时保持了纯静态站点的性能优势。

---

## 四、数据模型（D1 核心表）

```sql
-- 内容块：所有可编辑内容统一存储
CREATE TABLE content_blocks (
  id          TEXT PRIMARY KEY,       -- e.g. "about.paragraph_1"
  section     TEXT NOT NULL,          -- "about" | "solutions" | "lab" | ...
  field       TEXT NOT NULL,          -- "title" | "paragraph_1" | ...
  content     TEXT,                   -- JSON/文本/HTML
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by  TEXT
);

-- 列表项：核心能力 / 母题 / 场景 / 合作模式 等
CREATE TABLE content_items (
  id          TEXT PRIMARY KEY,
  section     TEXT NOT NULL,          -- "solutions" | "lab" | "scroll" | "contact"
  sort_order  INTEGER NOT NULL DEFAULT 0,
  data        TEXT NOT NULL,          -- JSON: {title, desc, tags, image, ...}
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 媒体文件
CREATE TABLE media (
  id          TEXT PRIMARY KEY,
  filename    TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  size        INTEGER NOT NULL,
  r2_key      TEXT NOT NULL,          -- R2 对象键
  variants    TEXT,                   -- JSON: {webp, avif, thumb}
  tags        TEXT,                   -- JSON string array
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 线索
CREATE TABLE leads (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  org         TEXT NOT NULL,
  title       TEXT,
  email       TEXT NOT NULL,
  phone       TEXT,
  intent      TEXT,                   -- 合作意向
  message     TEXT,
  source_page TEXT,
  status      TEXT NOT NULL DEFAULT 'new',  -- new | contacted | negotiating | won | lost
  notes       TEXT,                   -- JSON array of {author, text, time}
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 管理员
CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  username    TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'editor',  -- 'admin' | 'editor'
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 操作日志
CREATE TABLE audit_log (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  action      TEXT NOT NULL,          -- 'create' | 'update' | 'delete'
  target_type TEXT NOT NULL,          -- 'content' | 'media' | 'lead'
  target_id   TEXT NOT NULL,
  detail      TEXT,                   -- JSON diff
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 五、API 设计概览

```
# ── 内容管理 ──
GET    /api/content/:section           # 获取某区块所有内容
PUT    /api/content/:section           # 批量更新区块内容
GET    /api/items/:section             # 获取列表项 (lab/solutions/scroll)
POST   /api/items/:section             # 新增列表项
PUT    /api/items/:section/:id         # 更新列表项
DELETE /api/items/:section/:id         # 删除列表项
PUT    /api/items/:section/reorder     # 批量排序

# ── 媒体库 ──
GET    /api/media                       # 列表，支持 ?tag=&section=
POST   /api/media/upload                # multipart 上传 (自动转码)
DELETE /api/media/:id                   # 删除 + R2 清理
GET    /api/media/:id                   # 单文件详情

# ── 线索管理 ──
GET    /api/leads                       # 列表，支持 ?status=&page=
GET    /api/leads/:id                   # 详情（含跟进记录）
PUT    /api/leads/:id                   # 更新状态 / 添加备注
POST   /api/leads/export                # 导出 CSV
POST   /api/leads                       # 前端表单提交（公开接口）

# ── 认证 ──
POST   /api/auth/login                  # 登录，返回 JWT
POST   /api/auth/refresh                # 刷新令牌

# ── 系统 ──
GET    /api/system/audit-log            # 操作日志
POST   /api/system/publish              # 触发 Pages Deploy Hook
GET    /api/system/health               # 健康检查
```

---

## 六、后台 UI 布局草案

```
┌─────────────────────────────────────────────────┐
│  观止东方 Admin                    [预览] [👤]  │  顶部导航
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ 📝 内容   │  ┌─ 面包屑：内容 > 产品与解决方案 ──┐ │
│  · 首页  │  │                                   │
│  · 能力  │  │  [新增能力]              [保存]   │
│  · 母题  │  │                                   │
│  · 卷轴  │  │  ┌─────────────────────────────┐  │
│  · 合作  │  │  │ 01  文化产品研发    [编辑]   │  │
│  · 创始人│  │  │     内容脚本 · 流程设计 ...    │  │
│          │  │  ├─────────────────────────────┤  │
│ 🖼 媒体库 │  │  │ 02  标准体验模块    [编辑]   │  │
│          │  │  │     模块化 · 可组合 ...        │  │
│ 📊 线索   │  │  ├─────────────────────────────┤  │
│          │  │  │ ...                         │  │
│ ⚙ 设置    │  │  └─────────────────────────────┘  │
│          │  │                                   │
│          │  └───────────────────────────────────┘ │
└──────────┴──────────────────────────────────────┘
```

- **左侧** — 固定侧边栏，按功能模块分组
- **右侧** — 内容区，按 section 切换，每类内容一个独立的 CRUD 视图
- **顶部** — 站点预览按钮 + 用户头像下拉（退出登录）
- **风格** — 与主站一致的编辑式美学：宣纸米白底、墨色文字、朱砂点缀、衬线字体

---

## 七、分阶段实施计划

### Phase 0 — 基础后端（1 周）
- [ ] D1 建表 + Workers API 骨架
- [ ] 认证系统（JWT 登录）
- [ ] 基础 CRUD for content_items
- [ ] API 文档

### Phase 1 — 内容管理（2 周）
- [ ] 管理后台前端项目初始化（Vite + shadcn/ui）
- [ ] 6 个内容模块的编辑页面
- [ ] 列表拖拽排序
- [ ] "保存草稿 / 发布" 双状态
- [ ] 前端官网接入 API（ISR 模式）

### Phase 2 — 媒体库（1 周）
- [ ] R2 存储接入
- [ ] 图片上传 + 拖拽
- [ ] WebP/AVIF 自动转码（CF Image Resizing）
- [ ] 媒体库浏览 + 搜索 + 引用追踪

### Phase 3 — 线索管理（1 周）
- [ ] 联系表单组件 + API
- [ ] 线索 CRUD + 状态流转
- [ ] CSV 导出
- [ ] 邮件通知

### Phase 4 — 收尾（1 周）
- [ ] 操作日志
- [ ] 权限管理（管理员 vs 编辑员）
- [ ] 页面整体打磨（loading / 空状态 / 错误处理）
- [ ] 部署 + 文档

**总计预估：5-6 周（1 名全栈工程师）**

---

## 八、成本估算

| 资源 | 方案 | 预估月费 |
|------|------|----------|
| Workers | 免费额度 10M 请求/月，足够 | ¥0 |
| D1 | 免费 5GB 存储 + 5M 读取/月 | ¥0 |
| R2 | 免费 10GB + 10M 操作/月 | ¥0 |
| Pages | 免费 500 次构建/月 | ¥0 |
| 域名 | admin.guanzhidongfang.com | 已有 |

**结论：** 在 CF 免费额度内完全覆盖，零运营成本。

---

## 九、讨论点（待领导确认）

1. **是否需要多语言内容管理？** — 如果 Phase 2 要做英文版 i18n，CMS 字段需要设计双语结构（`title_zh` / `title_en`）
2. **是否需要产品详情页？** — 当前 Lab 卡片没有独立详情页；如果未来有 `/products/01-garden`，后台需要支持详情内容编辑
3. **是否需要数据统计？** — 官网访问量、各区块曝光率、联系表单转化漏斗？（可接入 Cloudflare Web Analytics，免费）
4. **移动端是否需要管理后台？** — 后台是否需要移动端响应式适配？（建议做，方便运营随时改）
5. **是否需要内容审核流程？** — 编辑员修改 → 管理员审核 → 发布？（初期可不做，只有一个管理员时没必要）

---

*草案作者：Claude | 下次评审：待定*
