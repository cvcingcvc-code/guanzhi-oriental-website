# 后端配置与运行说明

## 1. 推荐：Docker 本地启动

在项目根目录执行：

```powershell
Copy-Item .env.docker.example .env
# 编辑 .env，至少替换数据库密码、JWT_SECRET、管理员密码和 IP_HASH_SALT
docker compose up --build -d
docker compose ps
```

服务地址：

- API：`http://localhost:8080/api/v1`
- Swagger：`http://localhost:8080/docs`
- 健康检查：`http://localhost:8080/api/v1/health`

首次启动会按顺序执行数据库迁移、幂等初始化管理员和基础中英文内容，再启动 API。已存在的账号和页面不会被覆盖。

常用命令：

```powershell
docker compose logs -f api
docker compose restart api
docker compose down
```

`docker compose down` 不删除数据库和上传文件。只有显式使用 `docker compose down -v` 才会删除 volume；生产环境不要随意执行带 `-v` 的命令。

## 2. 不使用 Docker 的开发方式

先准备 PostgreSQL，再进入 `backend`：

```powershell
Copy-Item .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Seed 默认使用安全的 `bootstrap` 模式，只插入缺失数据，不覆盖 CMS 已编辑内容。需要将本地开发数据库刷新为当前官网基准内容时，可显式执行：

```powershell
$env:SEED_CONTENT_MODE='refresh'
npm run db:seed
```

`refresh` 在 `NODE_ENV=production` 下会被拒绝。生产内容更新必须通过 CMS 或经过审查的数据迁移完成。

生成新的数据库迁移：

```powershell
npm run db:generate
npm run db:migrate
```

生产环境只应用已经提交的迁移，不直接修改数据库表。

## 3. 配置项

| 变量 | 必填 | 默认/示例 | 说明 |
| --- | --- | --- | --- |
| `NODE_ENV` | 是 | `production` | 运行环境 |
| `HOST` | 是 | `0.0.0.0` | 监听地址 |
| `PORT` | 是 | `8080` | 容器内 API 端口 |
| `LOG_LEVEL` | 否 | `info` | 日志等级 |
| `DATABASE_URL` | 是 | `postgresql://...` | PostgreSQL 连接串 |
| `DB_POOL_MAX` | 否 | `10` | 最大数据库连接数 |
| `JWT_SECRET` | 是 | 无 | 至少 32 字符；生产随机生成 |
| `JWT_EXPIRES_IN` | 否 | `8h` | 后台 token 有效期 |
| `ADMIN_EMAIL` | 首次启动 | 无 | 初始化管理员邮箱 |
| `ADMIN_PASSWORD` | 首次启动 | 无 | 至少 12 字符 |
| `CORS_ORIGINS` | 是 | 前端域名列表 | 英文逗号分隔，禁止写 `*` |
| `PUBLIC_BASE_URL` | 是 | `https://api.example.com` | 媒体绝对地址和 OpenAPI server |
| `UPLOAD_DIR` | 是 | `/app/data/uploads` | 上传目录 |
| `MAX_UPLOAD_BYTES` | 否 | `10485760` | 单文件字节上限 |
| `IP_HASH_SALT` | 是 | 无 | 至少 16 字符，用于 IP 摘要 |
| `RESEND_API_KEY` | 否 | 空 | 新线索邮件通知 |
| `NOTIFICATION_FROM` | 邮件启用时 | 空 | 已验证发件地址 |
| `NOTIFICATION_TO` | 邮件启用时 | 空 | 接收通知地址 |

生成安全随机值示例：

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

## 4. 云服务器部署基线

建议 Ubuntu/Debian 云服务器安装 Docker Engine 和 Compose Plugin，项目通过 Git 拉取。生产环境：

1. `.env` 只保存在服务器，不提交 Git。
2. PostgreSQL 不映射公网端口；如无需从宿主机访问，可删除 `compose.yaml` 中数据库的 `ports`。
3. 使用 Nginx 或 Caddy 提供 HTTPS，将 `/api/`、`/docs`、`/uploads/` 反向代理到 `127.0.0.1:8080`。
4. 防火墙只开放 22、80、443；SSH 最好限制来源并禁用密码登录。
5. 每日执行 `pg_dump`，同时备份上传 volume；定期做恢复演练。
6. 新版本先备份，再 `git pull` 和 `docker compose up --build -d`；迁移由 API 容器启动前自动执行。
7. 正式上线后限制或关闭公网 `/docs`，也可由反向代理增加基础认证。

## 5. 从本地文件存储迁移到对象存储

当前媒体记录将物理文件名放在 `storage_key`，页面只引用媒体 ID/URL。未来迁移 OSS、R2 或 S3 时保持 API 响应结构不变：上传实现改为对象存储，历史文件批量同步并更新公开基础地址即可，不需要改页面数据模型。

## 6. 上线前检查

- 所有示例密码和本地 secret 已替换。
- `CORS_ORIGINS` 只包含真实前端域名。
- 管理员已能登录并改为个人强密码。
- 中英文页面均完整后再发布。
- HTTPS、数据库备份、上传文件备份已验证。
- `/health`、提交合作需求、后台读取线索均通过。
- 日志中没有数据库连接串、密码或 JWT。
