#!/bin/bash

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}
╔═══════════════════════════════════════════════════════════╗
║                    ZineSpace 启动脚本                       ║
║          小众 zine 私印刊物共享平台                         ║
╚═══════════════════════════════════════════════════════════╝
${NC}"

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo -e "❌ ${YELLOW}未检测到 Node.js，请先安装 Node.js 18+${NC}"
  echo "   下载地址：https://nodejs.org/"
  exit 1
fi
echo -e "✅ Node.js 版本: $(node -v)"

# 检查 npm
if ! command -v npm &> /dev/null; then
  echo -e "❌ 未检测到 npm"
  exit 1
fi
echo -e "✅ npm 版本: $(npm -v)"

echo ""
echo -e "${BLUE}━━━ 第 1 步：安装根目录依赖 ━━━${NC}"
cd "$ROOT_DIR"
if [ ! -d "node_modules" ]; then
  npm install
  echo -e "${GREEN}✓ 根目录依赖安装完成${NC}"
else
  echo -e "⚡ 根目录依赖已存在，跳过"
fi

echo ""
echo -e "${BLUE}━━━ 第 2 步：后端环境设置 ━━━${NC}"
cd "$BACKEND_DIR"

if [ ! -d "node_modules" ]; then
  echo "📦 安装后端依赖..."
  npm install
  echo -e "${GREEN}✓ 后端依赖安装完成${NC}"
else
  echo -e "⚡ 后端依赖已存在"
fi

if [ ! -f "prisma/dev.db" ]; then
  echo "🗄️ 初始化数据库..."
  npx prisma migrate dev --name init 2>/dev/null || npx prisma db push
  npx prisma generate
  echo "🌱 填充示例数据..."
  node prisma/seed.js
  echo -e "${GREEN}✓ 数据库初始化完成${NC}"
else
  echo -e "⚡ 数据库已存在，跳过初始化"
fi

echo ""
echo -e "${BLUE}━━━ 第 3 步：前端环境设置 ━━━${NC}"
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
  echo "📦 安装前端依赖..."
  npm install
  echo -e "${GREEN}✓ 前端依赖安装完成${NC}"
else
  echo -e "⚡ 前端依赖已存在"
fi

echo ""
echo -e "${GREEN}
╔═══════════════════════════════════════════════════════════╗
║                    🎉 环境准备完成！                         ║
╚═══════════════════════════════════════════════════════════╝

📋 测试账号：
─────────────────────────────────────────────────────────
  管理员账号： admin / 123456
  普通用户：
    • 墨香     / 123456   (moxiang@zine.com)
    • 画意     / 123456   (huayi@zine.com)
    • 快门手   / 123456   (kuaimen@zine.com)
    • 黑胶骑士 / 123456   (heijiao@zine.com)
    • 城市漫游者 / 123456 (chengshi@zine.com)
─────────────────────────────────────────────────────────

${NC}"

read -p "是否现在启动服务？(Y/n) " START_NOW
START_NOW=${START_NOW:-Y}

if [[ "$START_NOW" =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${BLUE}🚀 启动服务中...${NC}"
  echo -e "   后端地址：http://localhost:3001"
  echo -e "   前端地址：http://localhost:5173"
  echo ""
  echo -e "${YELLOW}提示：按 Ctrl+C 停止所有服务${NC}"
  echo ""
  cd "$ROOT_DIR"
  npx concurrently \
    --names "BACKEND,FRONTEND" \
    --prefix-colors "red.bold,green.bold" \
    "cd backend && npm run dev" \
    "cd frontend && npm run dev"
fi
