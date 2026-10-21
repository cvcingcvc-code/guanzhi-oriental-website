# 观止东方 · 生产部署指南

> 目标形态：一台云服务器（2核4G 起步）+ Docker Compose，公网仅暴露 80/443。
> 本指南对应 `compose.prod.yaml` + `deploy/Caddyfile`，5 分钟可完成从空机到 HTTPS 上线。

## 架构

```text
Internet ── 80/443 ── Caddy（TLS 自动签发）
                        ├── 静态文件  dist/client（React 官网 + /admin/homepage）
                        └── /api/* ── Fastify（容器网络）── PostgreSQL（容器网络）
```

- 公网只暴露 Caddy 的 80/443；API 仅绑定 127.0.0.1 供调试，PostgreSQL 不出容器网络。
- TLS 证书由 Caddy 自动申请、自动续期，无需 certbot。

## 前置要求

- 一台 Linux 服务器（Ubuntu 22.04/24.04 均可），2核4G、40G 盘
- 域名一个，A 记录指向服务器 IP
- 服务器已安装 Docker Engine 与 Compose 插件：

```bash
curl -fsSL https://get.docker.com | sh
```

- 防火墙/安全组放行 80、443（TLS-01 验证需要 80 可达）

## 部署步骤

### 1. 拉代码并构建前端

```bash
git clone https://github.com/cvcingcvc-code/guanzhi-oriental-website.git
cd guanzhi-oriental-website
npm ci && npm run build          # 产出 dist/client（Node 24）
```

### 2. 配置环境变量

```bash
cp .env.production.example .env
vi .env   # 填入域名、数据库密码、JWT_SECRET、ADMIN 初始账号等
```

生成强随机值：

```bash
openssl rand -hex 32   # JWT_SECRET / IP_HASH_SALT
openssl rand -base64 24  # POSTGRES_PASSWORD / ADMIN_PASSWORD
```

### 3. 启动

```bash
docker compose -f compose.prod.yaml up --build -d
docker compose -f compose.prod.yaml ps      # 三容器均 healthy
curl -fsS https://your-domain.com/api/v1/health
```

首次启动会自动执行数据库 migration 与 seed（创建管理员与首页内容）。

### 4. 验收清单

- [ ] `https://域名` 首页正常、中英文切换正常
- [ ] `https://域名/api/v1/health` 返回 ok
- [ ] `https://域名/admin/homepage` 可登录、可保存草稿、可发布
- [ ] 合作询盘表单提交后入库（admin 后台可见）
- [ ] `http://` 自动 301 到 `https://`
- [ ] 首个管理员登录后**立即修改初始密码**

## 日常运维

### 更新发布

```bash
git pull
npm ci && npm run build            # 重新构建前端
docker compose -f compose.prod.yaml up --build -d api   # 重建 API（含 migration）
# 静态文件挂载自宿主机 dist/client，构建完成即生效
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
| 前端 | `npm run dev`（Vite 3000） | Caddy 托管 `dist/client` |
| TLS | 无 | Caddy 自动 HTTPS |
| API 暴露 | 127.0.0.1:8080 | 仅容器网络（调试时绑 127.0.0.1） |
| PostgreSQL | 127.0.0.1:5432 | 不暴露 |
| 反代 | Vite proxy `/api` | Caddy `reverse_proxy api:8080` |

## 回滚

```bash
git checkout <上一个发布 tag/commit>
npm ci && npm run build
docker compose -f compose.prod.yaml up --build -d api
```

数据库回滚需使用最近备份恢复（见上），migration 回滚不自动执行。
