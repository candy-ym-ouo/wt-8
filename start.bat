@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                    ZineSpace 启动脚本                       ║
echo ║          小众 zine 私印刊物共享平台                         ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] 未检测到 Node.js，请先安装 Node.js 18+
    echo     下载地址：https://nodejs.org/
    pause
    exit /b 1
)

for /f "delims=" %%i in ('node -v') do set NODE_VER=%%i
echo [OK] Node.js 版本: %NODE_VER%

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] 未检测到 npm
    pause
    exit /b 1
)

echo.
echo ==============  第 1 步：安装根目录依赖  ==============
cd /d "%~dp0"
if not exist "node_modules" (
    npm install
    echo [OK] 根目录依赖安装完成
) else (
    echo [跳过] 根目录依赖已存在
)

echo.
echo ==============  第 2 步：后端环境设置  ==============
cd /d "%~dp0backend"

if not exist "node_modules" (
    echo [安装] 后端依赖...
    npm install
    echo [OK] 后端依赖安装完成
) else (
    echo [跳过] 后端依赖已存在
)

if not exist "prisma\dev.db" (
    echo [初始化] 数据库...
    npx prisma migrate dev --name init 2>nul
    if %errorlevel% neq 0 npx prisma db push
    npx prisma generate
    echo [填充] 示例数据...
    node prisma\seed.js
    echo [OK] 数据库初始化完成
) else (
    echo [跳过] 数据库已存在
)

echo.
echo ==============  第 3 步：前端环境设置  ==============
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo [安装] 前端依赖...
    npm install
    echo [OK] 前端依赖安装完成
) else (
    echo [跳过] 前端依赖已存在
)

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                    [OK] 环境准备完成！                      ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 测试账号：
echo ----------------------------------------------------------------
echo   管理员账号： admin / 123456
echo   普通用户：
echo     - 墨香     / 123456
echo     - 画意     / 123456
echo     - 快门手   / 123456
echo     - 黑胶骑士 / 123456
echo     - 城市漫游者 / 123456
echo ----------------------------------------------------------------
echo.
set /p START_NOW=是否现在启动服务？(Y/n): 
if "%START_NOW%"=="" set START_NOW=Y

if /i "%START_NOW%"=="Y" (
    echo.
    echo [启动] 服务启动中...
    echo    后端地址：http://localhost:3001
    echo    前端地址：http://localhost:5173
    echo.
    echo 提示：关闭此窗口即停止所有服务
    echo.
    cd /d "%~dp0"
    npx concurrently --names "BACKEND,FRONTEND" --prefix-colors "red.bold,green.bold" "cd backend && npm run dev" "cd frontend && npm run dev"
)

pause
