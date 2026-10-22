# 观止东方 · 生产部署指南

> 目标形态：一台云服务器（2核4G 起步）+ Docker，公网仅暴露 80/443。
> 服务器**只需要 Docker，不需要 Node**——前端在容器内构建。
> 本指南对应 `compose.prod.yaml` + `deploy/Caddyfile` + `Dockerfile.web`，约 5 分钟从空机到 HTTPS 上线。

## 架构

```text
Internet ── 80/443 ── Caddy（TLS 自动签发，镜像内含构建好的前端静态文件）
                        ├── 静态文件  /srv/www（React 官网 + /admin/homepage）
                        ├── /api/* ──── Fastify（容器网络）
                        └── /uploads/* ─ Fastify（CMS 上传媒体）
                                        └── PostgreSQL（容器网络）
```

- 公网只暴露 Caddy 的 80/443；API 仅绑定 127.0.0.1 供调试，PostgreSQL 不出容器网络。
- 前端静态产物由 `Dockerfile.web` 多阶段构建：先在 Node 24 容器内 `npm ci && npm run build`，再把 `dist/client` 叠加进 Caddy 官方镜像。
- TLS 证书由 Caddy 自动申请、自动续期，无需 certbot。

## 前置要求

- 一台 Linux 服务器（Ubuntu 22.04/24.04 均可），2核4G、40G 盘
- 域名一个，A 记录指向服务器 IP
- 服务器已安装 Docker Engine 与 Compose 插件：

```bash
curl -fsSL https://get.docker.com | sh
```

- 防火墙/安全组放行 80、443（TLS-01 验证需要 80 可达）

## 部署步骤（共 3 步）

### 1. 拉代码

```bash
git clone https://github.com/cvcingcvc-code/guanzhi-oriental-website.git
cd guanzhi-oriental-website
```

### 2. 配置环境变量

```bash
cp .env.production.example .env
vi .env   # 填入域名、数据库密码、JWT_SECRET、ADMIN 初始账号等
```

生成强随机值：

```bash
openssl rand -hex 32     # JWT_SECRET / IP_HASH_SALT
openssl rand -base64 24  # POSTGRES_PASSWORD / ADMIN_PASSWORD
```

必填项：`POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、`JWT_SECRET`、`ADMIN_EMAIL`、`ADMIN_PASSWORD`、`CORS_ORIGINS`、`PUBLIC_BASE_URL`、`IP_HASH_SALT`。
`CORS_ORIGINS` 与 `PUBLIC_BASE_URL` 填 `https://你的域名`；生产启动会拒绝本地/示例弱值。

### 3. 一键启动（自动构建前端 + 数据库 migration + seed）

```bash
docker compose -f compose.prod.yaml up --build -d
docker compose -f compose.prod.yaml ps      # 三容器均 healthy
curl -fsS https://your-domain.com/api/v1/health
```

首次 `up --build` 会：① 容器内构建前端静态产物并叠加进 Caddy 镜像；② 执行数据库 migration 与 seed（创建管理员与首页内容）。

### 验收清单

- [ ] `https://域名` 首页正常、中英文切换正常
- [ ] `https://域名/api/v1/health` 返回 ok
- [ ] `https://域名/admin/homepage` 可登录、可保存草稿、可发布
- [ ] 合作询盘表单提交后入库（admin 后台可见）
- [ ] CMS 上传一张图片后前台可见（`/uploads/*` 经 Caddy 反代）
- [ ] `http://` 自动 301 到 `https://`
- [ ] 首个管理员登录后**立即修改初始密码**

## 日常运维

### 更新发布

```bash
git pull
docker compose -f compose.prod.yaml up --build -d   # 前端+API 一并重建（API 含 migration）
# 前端产物在镜像内，重建 caddy 服务即生效
```

只改了 Caddyfile（如加域名、调缓存）：

```bash
vi deploy/Caddyfile
docker compose -f compose.prod.yaml up -d --force-recreate caddy
```

### 数据库备份（每日）

```bash
# deploy/backup-db.sh，建议加入 crontab：0 3 * * * /path/backup-db.sh
docker compose -f compose.prod.yaml exec -T db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "/backup/guanzhi-$(date +%F).sql.gz"
find /backup -name 'guanzhi-*.sql.gz' -mtime +14 -delete
```

### 上传文件备份

媒体文件在 named volume `backend_uploads`，定期：

```bash
docker run --rm -v guanzhi-prod_backend_uploads:/data -v /backup:/backup alpine \
  tar czf /backup/uploads-$(date +%F).tgz -C /data .
```

### 恢复演练（每季度）

```bash
gunzip < /backup/guanzhi-YYYY-MM-DD.sql.gz | \
  docker compose -f compose.prod.yaml exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

## 与本地 compose.yaml 的差异

| 项 | 本地 compose.yaml | 生产 compose.prod.yaml |
|----|------------------|------------------------|
| 前端 | `npm run dev`（Vite 3000） | `Dockerfile.web` 容器内构建 → Caddy 托管 `/srv/www` |
| TLS | 无 | Caddy 自动 HTTPS |
| API 暴露 | 127.0.0.1:8080 | 仅容器网络（调试时绑 127.0.0.1） |
| PostgreSQL | 127.0.0.1:5432 | 不暴露 |
| 反代 | Vite proxy `/api` | Caddy `reverse_proxy api:8080`（/api 与 /uploads） |
| 服务器依赖 | Node 24 + Docker | 仅 Docker |

## 回滚

```bash
git checkout <上一个发布 tag/commit>
docker compose -f compose.prod.yaml up --build -d
```

数据库回滚需使用最近备份恢复（见上），migration 回滚不自动执行。

## 安全基线（本仓库已内置）

- 生产启动拒绝弱密钥（`JWT_SECRET`/`IP_HASH_SALT`/密码黑名单校验）
- 全部 admin 路由鉴权：登录可读、发布/账号管理需 ADMIN；JWT 每请求从 DB 重载用户
- 上传安全：SVG 禁令、魔数检测、路径穿越双重防护、按类别限大小
- 安全响应头：HSTS、nosniff、X-Frame-Options DENY、严格 CSP、Referrer-Policy
- Swagger 生产关闭；限流：登录 10 次/15 分钟、询盘 5 次/小时
- IP 加盐哈希存储，不存明文 IP
