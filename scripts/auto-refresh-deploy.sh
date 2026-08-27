#!/usr/bin/env bash
# 自动刷新热力图 fallback 数据并部署到 Vercel 生产环境
# 由 WorkBuddy 自动化在交易时段定时触发；Vercel token 从 ~/.workbuddy/vercel_token.txt 读取（不入库）
set -u

PROJ="/c/Users/陶国庆/WorkBuddy/2026-08-25-11-55-58/a-share-heatmap"
NODE="/c/Users/陶国庆/.workbuddy/binaries/node/versions/22.22.2/node.exe"
VERCEL_BIN="/c/Users/陶国庆/.workbuddy/binaries/node/workspace/node_modules/.bin/vercel"
TOKEN_FILE="/c/Users/陶国庆/.workbuddy/vercel_token.txt"
SSH_KEY="/c/Users/陶国庆/.ssh/id_ed25519_github"

cd "$PROJ" || exit 1

TOKEN="$(cat "$TOKEN_FILE" 2>/dev/null)"
if [ -z "$TOKEN" ]; then
  echo "[auto-refresh] ERROR: Vercel token 文件缺失: $TOKEN_FILE"
  exit 1
fi

echo "[auto-refresh] $(date '+%Y-%m-%d %H:%M:%S') 步骤1/2: 拉取东财实时行情刷新 fallback JSON"
"$NODE" scripts/refresh-fallback.mjs
if [ $? -ne 0 ]; then
  echo "[auto-refresh] 刷新失败，放弃本次部署（保留上次正常部署）"
  exit 1
fi

# 最佳努力：提交并推送，保持仓库与线上一致（失败不影响部署）
git add src/lib/data/market-heatmap-fallback.json
git commit -m "auto: refresh fallback $(date '+%Y-%m-%dT%H:%M')" >/dev/null 2>&1 || true
GIT_SSH_COMMAND="ssh -i $SSH_KEY -o IdentitiesOnly=yes" git push origin main >/dev/null 2>&1 || true

echo "[auto-refresh] 步骤2/2: 部署到 Vercel 生产环境"
HTTP_PROXY= HTTPS_PROXY= NO_PROXY="*" \
  VERCEL_ORG_ID=team_3JHdvva39dus8tKzDzuUpfxv \
  VERCEL_PROJECT_ID=prj_MWAqyay3Kzi03JxfgaD31uuBi0Yb \
  "$VERCEL_BIN" --prod --yes --token="$TOKEN"
echo "[auto-refresh] 完成 $(date '+%Y-%m-%d %H:%M:%S')"
