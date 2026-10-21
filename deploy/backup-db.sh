#!/usr/bin/env bash
# 观止东方 · 数据库每日备份脚本
# crontab 示例（服务器上 crontab -e）：
#   0 3 * * * /opt/guanzhi-oriental-website/deploy/backup-db.sh >> /var/log/guanzhi-backup.log 2>&1
set -euo pipefail

COMPOSE_FILE="compose.prod.yaml"
BACKUP_DIR="${BACKUP_DIR:-/opt/guanzhi-backups}"
RETENTION_DAYS=14

cd "$(dirname "$0")/.."

# 从 .env 读取数据库凭据（不回显）
set -a
# shellcheck disable=SC1091
source ./.env
set +a

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%F-%H%M)"
OUT="$BACKUP_DIR/guanzhi-db-$STAMP.sql.gz"

docker compose -f "$COMPOSE_FILE" exec -T db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$OUT"

echo "[$(date -Is)] backup ok: $OUT ($(du -h "$OUT" | cut -f1))"

# 清理过期备份
find "$BACKUP_DIR" -name 'guanzi-db-*.sql.gz' -mtime "+$RETENTION_DAYS" -print -delete
