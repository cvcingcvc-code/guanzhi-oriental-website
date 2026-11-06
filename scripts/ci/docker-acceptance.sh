#!/usr/bin/env bash
# 观止东方 · Docker 生产模式容器验收（CI 用）
#
# 前置：仓库根目录已存在 .env（由 .env.production.example 生成并替换强密码），
#       且 `docker compose -f compose.prod.yaml up --build -d` 已执行成功。
# 本脚本会真实覆盖：Caddy 路由/TLS 重定向、健康检查、深层路由、CMS 草稿与发布、
#       询盘入库、媒体上传与反代、备份脚本（含过期清理）、备份恢复、容器销毁重建后的
#       数据库与媒体持久化。
#
# 用法：bash scripts/ci/docker-acceptance.sh
# 退出码：0 = 全部 PASS；1 = 存在 FAIL

set -uo pipefail

COMPOSE_FILE="compose.prod.yaml"
COMPOSE=(docker compose -f "$COMPOSE_FILE")
API="http://127.0.0.1:8080"
CURL_SITE=(curl -sS -k --resolve localhost:443:127.0.0.1)
CURL_HTTP=(curl -s -o /dev/null -w '%{http_code}' --resolve localhost:80:127.0.0.1)

FAILED=0
declare -a ROWS=()

record() { # record <状态> <名称> <证据>
  ROWS+=("$1|$2|$3")
  printf '[%s] %-46s %s\n' "$1" "$2" "$3"
  if [ "$1" = "FAIL" ]; then FAILED=1; fi
}
pass() { record PASS "$1" "$2"; }
fail() { record FAIL "$1" "$2"; }
skip() { record SKIP "$1" "$2"; }

wait_health() { # wait_health <最多尝试次数>
  local n=${1:-40} i=0
  until [ "$(curl -s -o /dev/null -w '%{http_code}' "$API/api/v1/health")" = "200" ]; do
    i=$((i + 1)); [ "$i" -ge "$n" ] && return 1; sleep 3
  done
  return 0
}

# shellcheck disable=SC1091
set -a; source ./.env; set +a
BASE_URL="${PUBLIC_BASE_URL:-https://localhost}"
API_HOST="${API_HOST:-127.0.0.1:8080}"
API="http://$API_HOST"

echo "==================== 0. 容器与镜像 ===================="
"${COMPOSE[@]}" ps || true
docker image ls --format '{{.Repository}}:{{.Tag}} {{.Size}}' | grep -E 'guanzhi|postgres|caddy|node' || true

echo "==================== 1. 启动与健康检查 ===================="
"${COMPOSE[@]}" up -d --wait >/dev/null 2>&1
if wait_health 40; then
  pass "API 健康检查（直连）" "$(curl -s "$API/api/v1/health")"
else
  fail "API 健康检查（直连）" "40 次轮询仍非 200"
fi

code=$("${CURL_SITE[@]}" -o /dev/null -w '%{http_code}' https://localhost/api/v1/health || echo 000)
[ "$code" = "200" ] && pass "API 健康检查（经 Caddy HTTPS）" "HTTP $code" || fail "API 健康检查（经 Caddy HTTPS）" "HTTP $code"

code=$("${CURL_SITE[@]}" -o /dev/null -w '%{http_code}' https://localhost/ || echo 000)
body=$("${CURL_SITE[@]}" https://localhost/ 2>/dev/null | grep -c '<div id="root"></div>' || true)
if [ "$code" = "200" ] && [ "$body" -ge 1 ]; then
  pass "首页静态产物（镜像内构建）" "HTTP 200 + #root 占位"
else
  fail "首页静态产物（镜像内构建）" "HTTP $code / root=$body"
fi

for p in /about /capabilities /into-jiangnan /partners /contact /admin/homepage; do
  code=$("${CURL_SITE[@]}" -o /dev/null -w '%{http_code}' "https://localhost$p" || echo 000)
  [ "$code" = "200" ] && pass "深层路由刷新 $p" "HTTP 200（SPA 回退）" || fail "深层路由刷新 $p" "HTTP $code"
done

code=$("${CURL_HTTP[@]}" http://localhost/api/v1/health || echo 000)
case "$code" in 301|308) pass "HTTP→HTTPS 重定向" "HTTP $code" ;; *) fail "HTTP→HTTPS 重定向" "HTTP $code" ;; esac

headers=$("${CURL_SITE[@]}" -D - -o /dev/null https://localhost/ 2>/dev/null | tr -d '\r')
for h in "strict-transport-security" "content-security-policy" "x-frame-options: DENY" "x-content-type-options: nosniff"; do
  if echo "$headers" | grep -qi "$h"; then pass "安全响应头 $h" "存在"; else fail "安全响应头 $h" "缺失"; fi
done

# ==================== 2. CMS：登录 → 草稿隔离 → 发布 ====================
echo "==================== 2. CMS 草稿与发布 ===================="
LOGIN=$(curl -s -X POST "$API/api/v1/admin/auth/login" -H 'content-type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
TOKEN=$(echo "$LOGIN" | jq -r '.data.token // empty')
if [ -n "$TOKEN" ]; then pass "管理员登录" "role=$(echo "$LOGIN" | jq -r '.data.user.role')"; else fail "管理员登录" "$(echo "$LOGIN" | head -c 200)"; fi

SNAPSHOT=$(curl -s -H "Authorization: Bearer $TOKEN" "$API/api/v1/admin/homepage")
REV=$(echo "$SNAPSHOT" | jq -r '.data.revision')
echo "$SNAPSHOT" | jq '.data.translations' > /tmp/orig-translations.json
MARK="[CI-$(date +%H%M%S)]"

jq --arg m "$MARK" 'map(if .locale=="zh-CN" then .blocks.blocks |= map(if .type=="hero" then .headingLines = [($m + .headingLines[0])] + .headingLines[1:] else . end) else . end)' \
  /tmp/orig-translations.json > /tmp/mod-translations.json
jq -n --argjson base "$REV" --slurpfile t /tmp/mod-translations.json '{baseRevision:$base, translations:$t[0]}' > /tmp/draft-body.json

SAVE=$(curl -s -X PUT "$API/api/v1/admin/homepage/draft" -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' --data-binary @/tmp/draft-body.json)
NEWREV=$(echo "$SAVE" | jq -r '.data.revision // empty')
if [ -n "$NEWREV" ] && [ "$NEWREV" != "$REV" ]; then
  pass "保存中文草稿" "Revision $REV → $NEWREV"
else
  fail "保存中文草稿" "$(echo "$SAVE" | head -c 200)"
fi

PUB_BEFORE=$(curl -s "$API/api/v1/content/pages/home?locale=zh-CN" | jq -r '.data.blocks[] | select(.type=="hero") | .headingLines[0]')
case "$PUB_BEFORE" in
  "$MARK"*) fail "草稿与已发布隔离" "草稿内容已出现在公开接口" ;;
  *) pass "草稿与已发布隔离" "公开接口仍为原文案" ;;
esac

PUB=$(curl -s -X POST "$API/api/v1/admin/homepage/publish" -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d "{\"revision\":$NEWREV}")
PUB_AFTER=$(curl -s "$API/api/v1/content/pages/home?locale=zh-CN" | jq -r '.data.blocks[] | select(.type=="hero") | .headingLines[0]')
case "$PUB_AFTER" in
  "$MARK"*) pass "发布后前台更新" "公开接口出现草稿标记" ;;
  *) fail "发布后前台更新" "$(echo "$PUB" | head -c 160)" ;;
esac

# 还原内容，保持环境干净
CUR=$(curl -s -H "Authorization: Bearer $TOKEN" "$API/api/v1/admin/homepage" | jq -r '.data.revision')
jq -n --argjson base "$CUR" --slurpfile t /tmp/orig-translations.json '{baseRevision:$base, translations:$t[0]}' > /tmp/restore-body.json
R1=$(curl -s -X PUT "$API/api/v1/admin/homepage/draft" -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' --data-binary @/tmp/restore-body.json | jq -r '.data.revision // empty')
curl -s -X POST "$API/api/v1/admin/homepage/publish" -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d "{\"revision\":$R1}" >/dev/null
RESTORED=$(curl -s "$API/api/v1/content/pages/home?locale=zh-CN" | jq -r '.data.blocks[] | select(.type=="hero") | .headingLines[0]')
case "$RESTORED" in
  "$MARK"*) fail "内容还原" "标记仍在" ;;
  *) pass "内容还原" "已恢复原始文案" ;;
esac

# 未授权访问
code=$(curl -s -o /dev/null -w '%{http_code}' "$API/api/v1/admin/homepage")
[ "$code" = "401" ] && pass "未授权访问被拒绝" "HTTP 401" || fail "未授权访问被拒绝" "HTTP $code"

# ==================== 3. 询盘入库 ====================
echo "==================== 3. 询盘入库 ===================="
INQ=$(curl -s -X POST "$API/api/v1/inquiries" -H 'content-type: application/json' \
  -d '{"name":"CI验收测试","organization":"CI容器验收机构","email":"ci.audit@example.com","intent":"co-production","message":"GitHub Actions Linux runner 容器验收测试，非真实客户数据。","locale":"zh-CN"}')
INQ_ID=$(echo "$INQ" | jq -r '.data.id // empty')
[ -n "$INQ_ID" ] && pass "询盘提交（POST /inquiries）" "id=${INQ_ID:0:8}…" || fail "询盘提交（POST /inquiries）" "$(echo "$INQ" | head -c 200)"

DB_INQ=$("${COMPOSE[@]}" exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc 'select count(*) from inquiries' | tr -d '[:space:]')
case "$DB_INQ" in ''|*[!0-9]*) fail "PostgreSQL 真实写入" "查询失败：$DB_INQ" ;; *) [ "$DB_INQ" -ge 1 ] && pass "PostgreSQL 真实写入" "inquiries=$DB_INQ" || fail "PostgreSQL 真实写入" "inquiries=$DB_INQ" ;; esac

BAD=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/api/v1/inquiries" -H 'content-type: application/json' \
  -d '{"name":"x","organization":"y","email":"not-an-email","intent":"other"}')
case "$BAD" in 400|422) pass "非法输入被拒绝" "HTTP $BAD" ;; *) fail "非法输入被拒绝" "HTTP $BAD" ;; esac

# ==================== 4. CMS 媒体上传 + /uploads 反代 ====================
echo "==================== 4. 媒体上传与反代 ===================="
printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' | base64 -d > /tmp/ci-media.png
UP=$(curl -s -X POST "$API/api/v1/admin/media?altZh=CI%E5%AA%92%E4%BD%93%E9%AA%8C%E6%94%B6" \
  -H "Authorization: Bearer $TOKEN" -F 'file=@/tmp/ci-media.png;type=image/png')
MEDIA_PATH=$(echo "$UP" | jq -r '.data.url // empty' | sed -E 's#^https?://[^/]+##')
if [ -n "$MEDIA_PATH" ]; then
  pass "媒体上传（admin/media）" "$MEDIA_PATH"
  MEDIA_CODE=$("${CURL_SITE[@]}" -o /dev/null -w '%{http_code} %{content_type}' "https://localhost$MEDIA_PATH" || echo 000)
  case "$MEDIA_CODE" in 200*image/png*) pass "Caddy /uploads 反代" "$MEDIA_CODE" ;; *) fail "Caddy /uploads 反代" "$MEDIA_CODE" ;; esac
else
  fail "媒体上传（admin/media）" "$(echo "$UP" | head -c 200)"
fi

SVG=$(printf '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"></svg>' > /tmp/ci.svg; \
  curl -s -o /dev/null -w '%{http_code}' -X POST "$API/api/v1/admin/media?altZh=svg" -H "Authorization: Bearer $TOKEN" -F 'file=@/tmp/ci.svg;type=image/svg+xml')
[ "$SVG" = "415" ] && pass "SVG 上传被拒绝" "HTTP 415" || fail "SVG 上传被拒绝" "HTTP $SVG"

# ==================== 5. 备份脚本 + 过期清理 ====================
echo "==================== 5. 备份与过期清理 ===================="
BACKUP_DIR="/tmp/guanzhi-backups"
rm -rf "$BACKUP_DIR"; mkdir -p "$BACKUP_DIR"
# 伪造一个 20 天前的旧备份，验证 RETENTION_DAYS=14 的清理逻辑真的生效
touch -d "20 days ago" "$BACKUP_DIR/guanzhi-db-2020-01-01-0000.sql.gz"

if BACKUP_DIR="$BACKUP_DIR" bash deploy/backup-db.sh > /tmp/backup.log 2>&1; then
  LATEST=$(ls -1t "$BACKUP_DIR"/guanzhi-db-*.sql.gz 2>/dev/null | head -1)
  # 用 gzip -t 校验完整性，避免 gunzip|head 触发 SIGPIPE 噪音
  if [ -n "$LATEST" ] && gzip -t "$LATEST" 2>/dev/null; then
    pass "备份脚本执行" "$(basename "$LATEST") $(du -h "$LATEST" | cut -f1)"
  else
    fail "备份脚本执行" "备份文件缺失或内容异常"
  fi
  if [ -f "$BACKUP_DIR/guanzhi-db-2020-01-01-0000.sql.gz" ]; then
    fail "过期备份清理（RETENTION_DAYS=14）" "20 天前的旧备份仍存在"
  else
    pass "过期备份清理（RETENTION_DAYS=14）" "旧备份已删除，当日备份保留"
  fi
else
  fail "备份脚本执行" "$(tail -3 /tmp/backup.log | tr '\n' ' ')"
  skip "过期备份清理（RETENTION_DAYS=14）" "备份未成功，无法验证清理"
fi

# ==================== 6. 备份恢复演练 ====================
echo "==================== 6. 备份恢复 ===================="
"${COMPOSE[@]}" exec -T db psql -U "$POSTGRES_USER" -d postgres -q \
  -c 'DROP DATABASE IF EXISTS restore_check' -c 'CREATE DATABASE restore_check' >/dev/null 2>&1
if [ -n "${LATEST:-}" ] && gunzip -c "$LATEST" | "${COMPOSE[@]}" exec -T db psql -U "$POSTGRES_USER" -d restore_check -q >/dev/null 2>&1; then
  SRC=$("${COMPOSE[@]}" exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc 'select count(*) from inquiries' | tr -d '[:space:]')
  DST=$("${COMPOSE[@]}" exec -T db psql -U "$POSTGRES_USER" -d restore_check -tAc 'select count(*) from inquiries' | tr -d '[:space:]')
  SRC_P=$("${COMPOSE[@]}" exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc 'select count(*) from pages' | tr -d '[:space:]')
  DST_P=$("${COMPOSE[@]}" exec -T db psql -U "$POSTGRES_USER" -d restore_check -tAc 'select count(*) from pages' | tr -d '[:space:]')
  if [ "$SRC" = "$DST" ] && [ "$SRC_P" = "$DST_P" ] && [ "${SRC:-0}" -ge 1 ]; then
    pass "备份恢复一致性" "inquiries $SRC→$DST / pages $SRC_P→$DST_P"
  else
    fail "备份恢复一致性" "inquiries $SRC→$DST / pages $SRC_P→$DST_P"
  fi
else
  fail "备份恢复" "恢复导入失败"
fi

# ==================== 7. 容器销毁重建后的持久化 ====================
echo "==================== 7. 容器销毁重建持久化 ===================="
BEFORE_INQ=$("${COMPOSE[@]}" exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc 'select count(*) from inquiries' | tr -d '[:space:]')
"${COMPOSE[@]}" down >/dev/null 2>&1
if "${COMPOSE[@]}" up -d --wait >/dev/null 2>&1 && wait_health 40; then
  pass "down（保留卷）→ up 重建" "容器重建后 API 就绪"
else
  fail "down（保留卷）→ up 重建" "重建后健康检查未通过"
fi
AFTER_INQ=$("${COMPOSE[@]}" exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc 'select count(*) from inquiries' | tr -d '[:space:]')
if [ "$BEFORE_INQ" = "$AFTER_INQ" ] && [ "${AFTER_INQ:-0}" -ge 1 ]; then
  pass "数据库卷持久化" "inquiries $BEFORE_INQ → $AFTER_INQ"
else
  fail "数据库卷持久化" "inquiries $BEFORE_INQ → $AFTER_INQ"
fi
if [ -n "${MEDIA_PATH:-}" ]; then
  MCODE=$("${CURL_SITE[@]}" -o /dev/null -w '%{http_code}' "https://localhost$MEDIA_PATH" || echo 000)
  [ "$MCODE" = "200" ] && pass "媒体卷持久化" "重建后 /uploads 仍 200" || fail "媒体卷持久化" "HTTP $MCODE"
else
  skip "媒体卷持久化" "无已上传媒体"
fi
PUB_PAGES=$("${COMPOSE[@]}" exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "select count(*) from page_translations where locale='zh-CN'" | tr -d '[:space:]')
[ "${PUB_PAGES:-0}" -ge 1 ] && pass "CMS 内容持久化" "page_translations(zh-CN)=$PUB_PAGES" || fail "CMS 内容持久化" "page_translations(zh-CN)=$PUB_PAGES"

# 容器日志（证据）
echo "==================== 8. 容器状态 ===================="
"${COMPOSE[@]}" ps

# ==================== 汇总 ====================
echo "==================== 汇总 ===================="
printf '%s\n' "${ROWS[@]}" | awk -F'|' '{printf "%-6s %-48s %s\n", $1, $2, $3}'
TOTAL=${#ROWS[@]}
PASSN=$(printf '%s\n' "${ROWS[@]}" | grep -c '^PASS|' || true)
FAILN=$(printf '%s\n' "${ROWS[@]}" | grep -c '^FAIL|' || true)
SKIPN=$(printf '%s\n' "${ROWS[@]}" | grep -c '^SKIP|' || true)

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "### Docker 生产模式容器验收"
    echo
    echo "| 状态 | 检查项 | 证据 |"
    echo "|---|---|---|"
    printf '%s\n' "${ROWS[@]}" | awk -F'|' '{printf "| %s | %s | %s |\n", $1, $2, $3}'
    echo
    echo "合计 $TOTAL 项：PASS $PASSN / FAIL $FAILN / SKIPPED $SKIPN"
  } >> "$GITHUB_STEP_SUMMARY"
fi

echo "合计 $TOTAL 项：PASS $PASSN / FAIL $FAILN / SKIPPED $SKIPN"
[ "$FAILED" -eq 0 ] || exit 1
