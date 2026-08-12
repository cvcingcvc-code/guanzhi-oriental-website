# 官网内容协议与双语首页接入

当前内容协议版本为 `1`，后端权威实现位于 `backend/src/content/contract.ts`。前端不得导入 `backend/src`，只声明实际消费的 Public DTO 投影，避免 Vite 与后端独立 TypeScript 构建、Docker 产物互相耦合。

## Locale

新内容只允许：

- `zh-CN`
- `en`

公共设置读取会把历史 `zh` 兼容为 `zh-CN`，但 Seed 和新写入不再产生 `zh`。

## ContentDocument

`page_translations.blocks` 保存版本化文档，而不是未校验的对象数组：

```json
{
  "version": 1,
  "blocks": []
}
```

首页必须且只能包含一个以下 block：

1. `hero`
2. `about`
3. `capabilities`
4. `motifs`
5. `jiangnan`
6. `partners`
7. `contact`

每个 block 都有固定 `type`、`enabled`、`order`、`contentStatus` 和类型化字段。CMS 数据不能控制 React 组件名、CSS class、GSAP 参数或任意 HTML。

`contentStatus` 是 block 级内容审批状态：

- `approved`：已确认内容。
- `draft`：可用于首期双语联调和展示，但仍待甲方确认。

状态必须放在 block 上，而不是只放在英文页面级别，因为同一个 `home / en` Document 中 About 已获确认，而其他区块尚未确认。当前英文状态为：

| Block | `contentStatus` | 状态来源 |
| --- | --- | --- |
| `about` | `approved` | 甲方正式提供的英文原文 |
| `hero` | `draft` | 现有英文表达，待甲方确认 |
| `capabilities` | `draft` | 根据中文迁移基准形成的英文初稿 |
| `motifs` | `draft` | 根据中文迁移基准形成的英文初稿 |
| `jiangnan` | `draft` | 根据中文迁移基准形成的英文初稿 |
| `partners` | `draft` | 根据中文迁移基准形成的英文初稿 |
| `contact` | `draft` | 根据中文迁移基准形成的英文初稿 |

`zh-CN` 首页七块均使用当前正式中文迁移基准并标记为 `approved`。替换英文 draft 为正式文案时只更新相应 locale 的 Content Document 和状态，不需要修改 React 或数据库表。

## MediaReference

数据库内容使用：

- `assetId`：引用 `media_assets.id`
- `fallbackUrl`：迁移期间使用的站点相对 URL
- 双语 `alt`
- 可选 MIME、宽高和视频 poster

至少提供 `assetId` 或 `fallbackUrl`。禁止保存本机绝对路径。Public DTO会将 `assetId` 解析成公开 URL，因此以后切换对象存储时只需替换服务端 URL 解析策略，不需要修改 React 页面或数据库内容。

## Public DTO

公共页面 API会：

1. 查询已发布页面和指定 locale。
2. 按 Content Contract 验证 JSONB。
3. 收集并读取媒体资产。
4. 将 MediaReference 解析为 `{ url, alt, mimeType, width, height, poster }`。
5. 返回稳定的版本化 DTO。

公共设置 API只允许输出品牌名、法定主体、旗舰名称、所在地、联系邮箱和 locale。其他后台设置不会无条件公开。

Contact block 只管理页面内容，例如 kicker/合作说明、标题、描述和 CTA。品牌名、法定主体、联系邮箱以及未来确认后的所在地由 Public Settings 提供，不能在 Contact block 中再维护一份冲突数据。Footer 同样由 `brand.name`、`company.legalName`、`contact.email` 组合展示；当前不输出未确认的所在地。

## Seed 安全策略

- 默认 `SEED_CONTENT_MODE=bootstrap`：只补充缺失数据，不覆盖已有 CMS 内容，适合生产启动。
- `SEED_CONTENT_MODE=refresh`：刷新开发数据库的基准内容，仅允许非 production 环境。
- production 明确拒绝 refresh；正式内容变更应通过 CMS 或经过审查的数据迁移完成。

Seed 已集中维护正式 `brand.name`、`company.legalName`、`flagship.name`。`bootstrap` 只补缺，不覆盖 CMS；开发环境显式执行 `refresh` 才会修正历史值。所在地尚未确认，因此 Seed 不写入 `company.location`。

本次完整首页接入只调整 `page_translations.blocks` 内的 JSONB Content Document 与 Seed 内容。现有表结构已满足需求，因此未修改数据库 Schema，也没有新增 Migration。

## Homepage CMS 草稿契约

Homepage Editor 保存的是一份原子双语快照，不是某个输入框或单一 locale 的 patch。请求必须同时且仅包含 `zh-CN` 与 `en`，每份都通过相同的 Homepage Contract；任一语言失败则整次保存失败。

草稿与发布使用现有数据结构隔离：

- `page_translations.blocks` 始终代表公共官网可见的已发布投影。
- `page_revisions.snapshot` 保存 Homepage Editor 每次成功保存的完整双语草稿。
- PUT draft 不修改 `page_translations`；POST publish 才在事务内提升指定 revision。

客户端加载时取得 `revision`，保存时作为 `baseRevision` 提交；发布时提交 `revision`。服务端只接受当前最新 revision，否则返回 `409`，避免两个编辑会话发生静默覆盖。API 返回的 `source: published | draft` 是草稿来源的权威判断，客户端不根据时间或 `contentStatus` 猜测。

`contentStatus` 与这个生命周期严格分离：它表示某个 block 的文案是否已获甲方确认，不代表数据库记录是草稿，也不自动阻止整页发布。当前英文六个非 About block 仍可保留 `draft` 状态随首页发布。

该策略复用现有 JSONB 和 revision 表，不需要 Schema 或 Migration。详细端点、权限、媒体选择和 QA 见 [`homepage-cms.md`](homepage-cms.md)。

## 双语首页请求与切换

两个 locale 使用同一个公共端点：

- `GET /api/v1/content/pages/home?locale=zh-CN`
- `GET /api/v1/content/pages/home?locale=en`

数据库中的 Homepage Document 固定包含七种唯一 block，并按规定的视觉区块顺序使用不重复 `order`。Hero 是首页与前端 fallback 的必显入口，Contract 要求 `hero.enabled=true`；其余六块可以按需显隐。Public DTO 会按 `enabled` 过滤 block/item 并按 `order` 排序；React 条件渲染其余可见子集。Footer 独立于 Contact 的 enabled 状态，始终由 Public Settings 组合。每个 locale 仍只发一次请求，不为 Hero、About、Capabilities、Motifs、Jiangnan、Partners 和 Contact 分别请求。

切换时先继续显示当前 Document，再请求目标 locale；响应的可见 block 子集及其嵌套字段全部通过校验后一次性替换。目标 locale 请求失败、响应 locale 不一致或内容不满足协议时，保留切换前内容并显示非侵入式错误状态，不产生整页空白。

固定 UI 微文案不进入 CMS：菜单开关、语言切换提示、表单字段、placeholder、校验错误、提交状态和必要 accessibility 文案由前端轻量 `zh-CN`/`en` dictionary 管理。

## Fallback 长期策略

迁移期当前保留：

- 完整 `zh-CN` 首页静态 fallback，用于首次加载失败。
- 正式品牌名、法定主体、旗舰名称和联系邮箱的 Settings fallback。
- 语言切换失败时保留当前已加载 Document 的内存级容错。
- 不依赖 CMS 的表单错误、提交状态与 accessibility 微文案。

正式 CMS Editor、发布流程、API 可用性监控和缓存策略稳定后，应逐步移除：

- 与 PostgreSQL 中七个 block 重复的整套正式正文。
- 独立维护的英文 block fallback；英文 draft/正式稿只保留一个 CMS 权威来源。
- 任何为了迁移而长期复制的媒体标题、说明和 CTA。

长期仍应保留最小可用的品牌/联系信息、通用故障界面，以及“请求失败不清空当前内容”的行为。这样既保证故障韧性，也避免代码和 CMS 形成两套难以同步的官网文案。

## SEO 限制

当前是 Vite SPA，`index.html` 的 title、description 和 OG 标签在构建时固定。浏览器运行后修改 head 不能保证搜索引擎和社交分享抓取器获得按 CMS 更新的元数据。

当前单页阶段可继续使用静态首页 SEO。未来增加 News、Projects、Cases 独立路由时，优先考虑：

1. 构建时 SSG/prerender，从 Public Content API生成静态 HTML；或
2. 在现有 Vite 技术栈上增加小型 SSR/预渲染层。

不需要为了本阶段迁移到 Next.js。

## 待甲方确认

- 公司所在地
- About 之外首页区块的正式英文稿
