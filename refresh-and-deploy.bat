@echo off
chcp 65001 >nul
cd /d "C:\Users\陶国庆\WorkBuddy\2026-08-25-11-55-58\a-share-heatmap"

if "%VERCEL_TOKEN%"=="" (
  echo [错误] 请先设置环境变量: set VERCEL_TOKEN=your_token_here
  pause
  exit /b 1
)

echo [%time%] 1/2 拉取东财实时行情(走 Akile 代理 127.0.0.1:7893)...
node scripts/refresh-fallback.mjs
if errorlevel 1 (
  echo [错误] 刷新失败，已中止部署
  pause
  exit /b 1
)

echo [%time%] 2/2 部署到 Vercel...
vercel --prod --yes --token=%VERCEL_TOKEN%
echo [%time%] 完成
