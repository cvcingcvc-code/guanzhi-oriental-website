# 观止东方官网 API 说明

基础地址：`http://localhost:8080/api/v1`  
在线文档：启动服务后访问 `http://localhost:8080/docs`  
请求和响应默认使用 `application/json; charset=utf-8`。

## 1. 通用约定

成功响应：

```json
{ "ok": true, "data": {} }
```

失败响应：

```json
{
  "ok": false,
  "error": {
    "code": "REQUEST_ERROR",
    "message": "请求参数校验失败",
    "details": []
  }
}
```

后台接口在请求头携带：

```http
Authorization: Bearer <login 返回的 token>
```

## 2. 公共接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/health` | 健康检查，同时验证数据库连接 |
| GET | `/content/pages/{slug}?locale=zh-CN` | 读取经过 Content Contract 验证和媒体解析的已发布页面 |
| GET | `/content/settings` | 读取明确允许公开的站点设置 DTO |
| POST | `/inquiries` | 提交合作需求；单 IP 每小时最多 5 次 |

合作需求示例：

```json
{
  "name": "张三",
  "organization": "某某旅行机构",
  "jobTitle": "产品负责人",
  "email": "zhangsan@example.com",
  "contact": "wx_zhangsan",
  "intent": "custom-rd",
  "message": "希望联合研发江南主题产品。",
  "locale": "zh-CN",
  "sourceUrl": "https://example.com/contact",
  "website": ""
}
```

`intent` 可选值：`custom-rd`、`co-production`、`licensing`、`white-label`、`per-group`、`training`、`other`。`website` 是蜜罐字段，正常用户必须留空。

## 3. 认证与账号

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/admin/auth/login` | 公开 | 管理员登录 |
| GET | `/admin/auth/me` | 登录 | 当前账号 |
| GET | `/admin/users` | ADMIN | 账号列表 |
| POST | `/admin/users` | ADMIN | 创建管理员或编辑员 |

登录：

```json
{ "email": "admin@example.com", "password": "your-password" }
```

## 4. 页面内容

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/admin/pages` | 页面列表 |
| GET | `/admin/pages/{id}` | 页面及所有语言版本 |
| POST | `/admin/pages` | 新建页面 |
| PUT | `/admin/pages/{id}` | 更新页面并生成版本快照 |
| POST | `/admin/pages/{id}/publish` | 发布；必须同时有中英文 |
| POST | `/admin/pages/{id}/unpublish` | 撤回为草稿 |
| GET | `/admin/pages/{id}/revisions` | 版本历史 |

页面写入结构：

```json
{
  "slug": "about",
  "translations": [
    {
      "locale": "zh-CN",
      "title": "关于观止东方",
      "seoTitle": "关于观止东方｜观止东方",
      "seoDescription": "公司介绍",
      "blocks": {
        "version": 1,
        "blocks": [
          { "type": "prose", "enabled": true, "order": 10, "paragraphs": ["第一段", "第二段"] }
        ]
      }
    },
    {
      "locale": "en",
      "title": "About Guanzhi Oriental",
      "blocks": {
        "version": 1,
        "blocks": [
          { "type": "prose", "enabled": true, "order": 10, "paragraphs": ["Paragraph one"] }
        ]
      }
    }
  ]
}
```

`blocks` 已采用版本 1 Typed Content Contract。首页要求 `hero`、`about`、`capabilities`、`motifs`、`jiangnan`、`partners`、`contact` 各一个；其他页面当前支持 `prose` 和 `lead`。协议不接受任意 HTML、React 组件名、CSS class 或动画参数。

公共页面响应不会直接暴露数据库 JSONB。响应包含 `version`、`slug`、`locale`、SEO 和解析后的 blocks。媒体字段输出公开 `url`、对应语言的 `alt`、MIME、宽高和可选 poster；不会向前端暴露本机文件路径。

公共设置响应只包含白名单字段：locale、品牌名、法定主体、所在地和联系邮箱。后台私有设置不会被原样返回。

## 5. 媒体、线索与设置

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/admin/media` | 媒体列表 |
| POST | `/admin/media?altZh=...&altEn=...&category=...` | `multipart/form-data` 上传单文件 |
| DELETE | `/admin/media/{id}` | 软删除媒体 |
| GET | `/admin/inquiries` | 线索分页；支持 `page`、`pageSize`、`status`、`q` |
| GET | `/admin/inquiries/{id}` | 线索详情与跟进记录 |
| PATCH | `/admin/inquiries/{id}/status` | 更新状态 |
| POST | `/admin/inquiries/{id}/notes` | 添加内部跟进记录 |
| GET | `/admin/inquiries/export.csv` | 导出 CSV |
| GET | `/admin/inquiries/stats/summary` | 简单线索统计 |
| GET | `/admin/settings` | 全部站点设置 |
| PUT | `/admin/settings/{key}` | 新建或更新设置 |
| GET | `/admin/settings/audit-logs` | 操作日志，仅 ADMIN |

线索状态：`NEW`、`CONTACTED`、`NEGOTIATING`、`WON`、`CLOSED`。

允许上传：JPEG、PNG、WebP、AVIF、SVG、MP4、PDF；默认上限 10 MiB。当前文件地址为 `/uploads/{storageKey}`。

## 6. 常用状态码

| 状态码 | 含义 |
| --- | --- |
| 200/201 | 成功/创建成功 |
| 401 | 未登录或 token 无效 |
| 403 | 角色权限不足 |
| 404 | 资源不存在 |
| 409 | 唯一字段冲突 |
| 413/415 | 文件过大/类型不支持 |
| 422 | 输入校验失败 |
| 429 | 请求过于频繁 |
| 500 | 未预期的服务端错误 |
