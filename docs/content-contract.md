# 官网内容协议与首批接入

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

每个 block 都有固定 `type`、`enabled`、`order` 和类型化字段。CMS 数据不能控制 React 组件名、CSS class、GSAP 参数或任意 HTML。

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

公共设置 API只允许输出品牌名、法定主体、所在地、联系邮箱和 locale。其他后台设置不会无条件公开。

## Seed 安全策略

- 默认 `SEED_CONTENT_MODE=bootstrap`：只补充缺失数据，不覆盖已有 CMS 内容，适合生产启动。
- `SEED_CONTENT_MODE=refresh`：刷新开发数据库的基准内容，仅允许非 production 环境。
- production 明确拒绝 refresh；正式内容变更应通过 CMS 或经过审查的数据迁移完成。

Seed 已集中维护正式 `brand.name`、`company.legalName`、`flagship.name`。`bootstrap` 只补缺，不覆盖 CMS；开发环境显式执行 `refresh` 才会修正历史值。所在地尚未确认，因此 Seed 不写入 `company.location`。

## 前端首批接入

当前接入：

- `GET /api/v1/content/pages/home?locale=zh-CN` 的 Hero 与 About block（同一次请求）
- `GET /api/v1/content/settings` 的联系邮箱

React 初始状态始终使用当前静态内容。API 成功后替换对应字段；请求、数据库或响应校验失败时继续使用静态 fallback，不产生首屏空白。

## SEO 限制

当前是 Vite SPA，`index.html` 的 title、description 和 OG 标签在构建时固定。浏览器运行后修改 head 不能保证搜索引擎和社交分享抓取器获得按 CMS 更新的元数据。

当前单页阶段可继续使用静态首页 SEO。未来增加 News、Projects、Cases 独立路由时，优先考虑：

1. 构建时 SSG/prerender，从 Public Content API生成静态 HTML；或
2. 在现有 Vite 技术栈上增加小型 SSR/预渲染层。

不需要为了本阶段迁移到 Next.js。

## 待甲方确认

- 公司所在地
- About 之外首页区块的正式英文稿
