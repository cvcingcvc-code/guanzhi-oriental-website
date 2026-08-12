# Homepage CMS Editor 最小闭环

## 1. 本阶段范围

本阶段只为现有 `home` 页面建立可实际使用的编辑闭环：

1. 登录并恢复当前标签页会话。
2. 读取已发布首页或尚未发布的最新草稿。
3. 同时编辑 `zh-CN` 与 `en` 两份完整 Content Document。
4. 从现有媒体库选择文件，或上传后立即选用。
5. 以 revision optimistic lock 原子保存双语草稿。
6. 由 `ADMIN` 显式发布指定 revision。
7. 发布后通过公共 API 验证中英文官网内容。

不在本阶段范围内：News、Projects、Cases、Dashboard、通用 Page Builder、任意 HTML/组件编辑、复杂多人审批、Revision 恢复 UI、通用 Settings 编辑器、媒体 DAM、云存储、部署与 SSR。

## 2. 固定内容模型

Homepage Editor 复用 `backend/src/content/contract.ts`，不生成任意组件配置。每个 locale 必须且只能提交以下七个 block：

1. `hero`
2. `about`
3. `capabilities`
4. `motifs`
5. `jiangnan`
6. `partners`
7. `contact`

七种类型各一个，使用唯一 `order` 保持既定视觉顺序。Hero 是首页必显结构，不能在 CMS 中关闭；其余六块可按需显隐。列表型 block 的 item 仍使用稳定 `id`、`order` 与 `enabled`。CMS 可以修改内容和媒体引用，不能修改 React 组件名、CSS class、动画参数或注入 HTML。

`contentStatus: approved | draft` 是文案获批状态元数据，不是发布权限或发布门禁。当前英文 About 为 `approved`，其他六个英文 block 即使仍为 `draft` 也可随整页发布；UI 应明确展示状态，但不能把它误解为保存草稿的生命周期状态。

## 3. 草稿与发布隔离

本阶段复用现有表，不增加列：

- `page_translations`：公共官网正在读取的已发布双语投影。
- `page_revisions`：每次原子保存的完整双语草稿快照，`revision` 单调递增。
- `pages`：页面身份、发布状态和发布时间。
- `audit_logs`：保存与发布等关键操作记录。

保存草稿只新增 `page_revisions`，不更新 `page_translations`，因此已发布官网不会因为编辑器点击“保存草稿”而提前变化。发布时服务端在事务内再次验证指定 revision，然后将该完整双语快照一次性提升为 `page_translations` 的新发布投影并更新页面发布信息。发布任何一门语言都必须同时携带另一门语言，禁止半套首页进入公共 API。

该模型不需要数据库 Schema 变更或 Migration。是否存在未发布草稿由最新 revision 与当前已发布投影的内容关系判断；API 通过 `source: "draft" | "published"` 将结果显式告诉编辑器，UI 不自行猜测。

## 4. 专用 Admin API

统一响应：

```json
{
  "ok": true,
  "data": {
    "page": {
      "id": "uuid",
      "slug": "home",
      "status": "PUBLISHED",
      "publishedAt": "2026-08-12T00:00:00.000Z",
      "updatedAt": "2026-08-12T00:00:00.000Z"
    },
    "revision": 3,
    "savedAt": "2026-08-12T00:00:00.000Z",
    "source": "draft",
    "translations": []
  }
}
```

### `GET /api/v1/admin/homepage`

权限：`ADMIN`、`EDITOR`。

返回最新可编辑状态。如果存在未发布草稿则返回该完整快照并标记 `source: "draft"`；否则返回当前发布投影并标记 `source: "published"`。首次尚无 revision 时可使用 `revision: 0` 作为后续保存的基线。

### `PUT /api/v1/admin/homepage/draft`

权限：`ADMIN`、`EDITOR`。

以下请求体只展示外层结构；两个 `blocks` 占位都必须替换为完整七个 Typed Blocks，不能原样提交：

```json
{
  "baseRevision": 3,
  "translations": [
    {
      "locale": "zh-CN",
      "title": "观止东方",
      "seoTitle": "观止东方",
      "seoDescription": "……",
      "blocks": { "version": 1, "blocks": ["<完整七个 Typed Blocks，示例省略>"] }
    },
    {
      "locale": "en",
      "title": "Guanzhi Oriental",
      "seoTitle": "Guanzhi Oriental",
      "seoDescription": "……",
      "blocks": { "version": 1, "blocks": ["<完整七个 Typed Blocks，示例省略>"] }
    }
  ]
}
```

服务端要求两种 locale 恰好各一份，并分别通过完整 Homepage Contract。`baseRevision` 必须等于服务端最新 revision；保存成功后生成下一 revision 并返回完整状态。

若 revision 已落后，返回 `409`。客户端必须保留当前表单内容、提示内容已被其他会话更新，并要求用户重新读取；不得自动重试覆盖。

### `POST /api/v1/admin/homepage/publish`

权限：仅 `ADMIN`。

```json
{ "revision": 4 }
```

服务端只发布当前最新 revision。发布前再次验证双 locale、固定七 blocks 与 Typed Contract，在一个数据库事务中提升完整双语快照。过期或不存在的 revision 返回冲突/请求错误，不能退而发布其他版本。

通用 `/api/v1/admin/pages` 继续作为既有后端能力保留，但 Homepage Editor 只调用上述专用端点，不提供新建页面、修改 slug、撤回其他页面或通用 Page Builder 入口。

## 5. 登录与权限

- 登录使用 `POST /api/v1/admin/auth/login`，会话确认使用 `GET /api/v1/admin/auth/me`。
- 后台请求携带 `Authorization: Bearer <token>`。
- UI 只在当前标签页的 `sessionStorage` 保存 JWT；不写入 URL、Content Document 或长期 `localStorage`。
- 页面刷新时先通过 `/me` 验证 token。退出登录或任何后台请求返回 `401` 时立即清除本地会话并回到登录界面。
- `EDITOR` 可读、保存草稿，但不可发布；服务端必须返回 `403`，UI 隐藏或禁用发布按钮只是辅助，不是安全边界。
- `ADMIN` 可读、保存与发布。
- 登录已有每 15 分钟最多 10 次的限流，非活动账号或错误凭据统一返回 `401`。

## 6. 媒体选择与上传

媒体字段继续保存 `MediaReference`，业务内容不接触 storageKey 或服务器绝对路径。

- 媒体选择器读取 `GET /api/v1/admin/media`。
- 媒体库为空时显示明确空状态，编辑器其余文字内容仍可编辑，不得白屏。
- 选择已有资产后只把其 `assetId` 和协议允许的媒体字段写入草稿。
- 上传复用 `POST /api/v1/admin/media`；上传成功后把服务端返回资产加入选择器并允许立即选用。
- 上传仍遵守真实 MIME、白名单、大小、SVG 禁止、图片尺寸提取和失败清理策略。
- 已删除或不存在的 asset 不得通过发布链路形成失效的公共页面媒体。
- 迁移期已有 `fallbackUrl` 可继续显示和保存，但 UI 不推导 LocalStorage 或未来对象存储的 key 规则。

## 7. 编辑器交互约束

- 中文与英文在同一编辑会话中管理，切换 tab 不触发单语保存。
- “保存草稿”提交两种 locale 的完整快照；任一 locale 校验失败则整体失败。
- 加载、保存或发布期间避免重复提交。
- 保存成功后用响应中的 `revision` 替换本地基线，并显示明确的 revision 与草稿/已发布来源；响应同时保留 `savedAt` 供后续审计界面使用。
- 网络失败和 `422` 不清空用户输入；`409` 不静默合并；`401` 清理会话；`403` 明确提示权限不足。
- 发布成功后以服务端返回的完整状态更新编辑器；最终 QA 另行读取专用 Admin API 与公共 `zh-CN`、`en` API，确认双语发布投影一致。
- 页面预览是现有官网链接，不在 CMS 内复制主站布局或实现可视化 Page Builder。

## 8. 最终 QA 清单

### Git、数据库与服务

- [ ] HEAD 与阶段安全基线一致，开始前工作树 clean；完成后没有 `.env`、token、密码、uploads、dist 或 node_modules 入库。
- [ ] PostgreSQL `home` 页面存在，两种 locale 均有固定七 blocks。
- [ ] 公共 zh-CN/en API 与实际页面在编辑前正常。
- [ ] 保存草稿后 `page_translations` 和公共 API 均保持不变。
- [ ] 发布后两种公共 API 同时更新，不出现半发布状态。

### 认证与权限

- [ ] 正确账号可登录，错误密码、停用账号、缺失/过期 token 返回 `401`。
- [ ] 刷新后台页面可通过 `sessionStorage` + `/me` 恢复；退出和 `401` 会清理会话。
- [ ] `EDITOR` 可以 GET/PUT draft，但 POST publish 返回 `403`。
- [ ] `ADMIN` 可以 GET/PUT draft/POST publish。
- [ ] token 不进入 URL、日志、Content Document 或长期 `localStorage`。

### 内容与校验

- [ ] GET 可区分 `source: published` 与 `source: draft`，首次 revision 基线明确。
- [ ] zh-CN 与 en 恰好各一份；缺失、重复或非法 locale 返回 `422`。
- [ ] 缺失/重复/额外 block、错误顺序、重复 order、非法 CTA、非法媒体引用返回 `422`。
- [ ] About 正式英文原文不被意外改写；六个英文 draft 的状态清晰。
- [ ] Contact 不重新维护品牌、法定主体、邮箱或未确认 location。
- [ ] `contentStatus` 不被误作发布生命周期门禁。

### Revision 与发布隔离

- [ ] 正确 `baseRevision` 保存成功并递增 revision，生成完整双语快照和 Audit。
- [ ] 两个会话基于同一 revision 编辑：先保存者成功，后保存者收到 `409`，已有表单不丢失。
- [ ] 旧 revision、未来 revision 或不存在 revision 均不能发布。
- [ ] 发布事务失败时两种 locale 都不改变。
- [ ] 发布成功记录 actor、before/after 与时间，公共 API 只见已发布投影。

### Media 与 UI

- [ ] 媒体库为空时显示空状态且不白屏。
- [ ] 可选择已有图片/视频并正确保留 assetId。
- [ ] 合法文件上传后可立即选择；非法 MIME、伪造 MIME、超大文件、不支持类型和 SVG 被拒绝。
- [ ] 390px 与桌面视口均可完成登录、双语切换、编辑、保存和发布；无页面级横向溢出。
- [ ] loading、无内容、校验错误、网络错误、401、403、409、保存成功、发布成功均有可理解反馈。

### 回归

- [ ] Frontend typecheck/build 通过。
- [ ] Backend typecheck/build 与全部 tests 通过。
- [ ] 现有 Content、Media、Inquiry 测试继续通过。
- [ ] `git diff --check` 通过，最终 `git status` clean。

## 9. Schema 与 Migration

本阶段不修改数据库 Schema，不新增 Migration。现有 `page_translations`、`page_revisions`、`pages` 与 `audit_logs` 已能建立 Homepage Editor 的草稿隔离、版本锁和发布闭环；新生命周期数据保存在既有 revision snapshot JSONB 中。未来只有在需要分支草稿、多人审批、定时发布或高频 Revision 查询时，才评估增加独立 draft/publish 指针列或审批表。
