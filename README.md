# 📖 ZineSpace · 小众 zine 私印刊物共享平台

> 让独立创作被看见，让每一本私印 zine 都找到它的读者。

## ✨ 项目简介

ZineSpace 是一个面向小众独立出版文化的 zine 刊物共享平台。提供创作者投稿、读者订阅、站内消息、人工审核等完整功能，致力于打造一个温暖的独立创作社区。

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | Vue 3 + Vite + Vue Router + Pinia + Axios |
| **后端** | Node.js + Fastify + Prisma ORM |
| **数据库** | SQLite |
| **认证** | JWT (JSON Web Token) |

## 📦 功能模块

| 模块 | 功能说明 |
|------|----------|
| **账号系统** | 注册 / 登录 / 个人资料编辑 / 权限管理 |
| **刊物目录** | 分类浏览 / 搜索 / 排序 / 详情阅读 / 收藏 |
| **投稿系统** | 图文投稿 / 状态追踪 / 修改后重新提交 |
| **订阅系统** | 关注刊物 / 订阅列表 / 取消订阅 |
| **站内消息** | 系统通知 / 用户私信 / 未读提示 / 消息管理 |
| **后台审核** | 数据概览 / 投稿审核（通过/驳回）/ 刊物管理 / 用户角色管理 |

## 🚀 快速启动

### 方式一：一键启动脚本（推荐）

#### macOS / Linux
```bash
cd wt-8
chmod +x start.sh
./start.sh
```

#### Windows
```
双击运行 start.bat
```

### 方式二：手动命令启动

```bash
# 进入项目目录
cd wt-8

# 1. 安装所有依赖 & 初始化数据库 & 填充示例数据
npm run setup

# 2. 启动前后端（同时启动）
npm run dev
```

启动后访问：
- 🌐 **前端**：http://localhost:5173
- 🔧 **后端**：http://localhost:3001

## 🔑 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| **管理员** | admin | 123456 |
| 普通用户 | 墨香 | 123456 |
| 普通用户 | 画意 | 123456 |
| 普通用户 | 快门手 | 123456 |
| 普通用户 | 黑胶骑士 | 123456 |
| 普通用户 | 城市漫游者 | 123456 |

## 📁 目录结构

```
wt-8/
├── backend/                 # 后端服务
│   ├── prisma/
│   │   ├── schema.prisma   # 数据模型定义
│   │   ├── seed.js         # 示例数据种子脚本
│   │   └── dev.db          # SQLite 数据库（运行后生成）
│   ├── src/
│   │   ├── server.js       # 服务入口
│   │   └── routes/         # API 路由
│   │       ├── auth.js          # 认证
│   │       ├── zines.js         # 刊物
│   │       ├── submissions.js   # 投稿
│   │       ├── subscriptions.js # 订阅
│   │       ├── messages.js      # 消息
│   │       └── admin.js         # 后台管理
│   └── package.json
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── views/          # 页面组件
│   │   ├── components/     # 公共组件
│   │   ├── stores/         # Pinia 状态管理
│   │   ├── router/         # 路由配置
│   │   ├── utils/          # 工具函数
│   │   ├── assets/styles/  # 全局样式
│   │   ├── App.vue
│   │   └── main.js
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── start.sh                # macOS/Linux 启动脚本
├── start.bat               # Windows 启动脚本
└── package.json            # 根目录配置
```

## 🔌 主要 API 接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/auth/register` | 用户注册 | 公开 |
| POST | `/api/auth/login` | 用户登录 | 公开 |
| GET | `/api/zines` | 刊物列表（支持分页/筛选） | 公开 |
| GET | `/api/zines/:id` | 刊物详情 | 公开 |
| GET | `/api/submissions` | 我的投稿列表 | 登录 |
| POST | `/api/submissions` | 提交投稿 | 登录 |
| GET | `/api/subscriptions` | 订阅列表 | 登录 |
| POST | `/api/subscriptions/:zineId` | 订阅刊物 | 登录 |
| GET | `/api/messages` | 消息列表 | 登录 |
| POST | `/api/messages` | 发送私信 | 登录 |
| GET | `/api/admin/stats` | 数据统计 | 管理员 |
| POST | `/api/admin/submissions/:id/approve` | 通过投稿 | 管理员 |
| POST | `/api/admin/submissions/:id/reject` | 驳回投稿 | 管理员 |
| PUT | `/api/admin/users/:id/role` | 更改用户角色 | 管理员 |

## 📝 可用脚本

```bash
# 一键安装依赖和初始化
npm run setup

# 同时启动前后端
npm run dev

# 仅启动后端
npm run dev:backend

# 仅启动前端
npm run dev:frontend

# 重置数据库（清除数据 + 重新填充示例）
npm run reset
```

## 💡 系统特色

- 🎨 **小众审美设计**：仿纸本的复古配色与排版，契合 zine 文化气质
- 🔒 **分级权限**：普通用户 / 管理员双角色体系
- ✍️ **完整投稿流程**：提交 → 待审核 → 通过/驳回 → 修改重提
- 💬 **消息闭环**：审核结果、订阅动作等均有系统通知
- 📊 **管理后台**：数据总览、审核工作台、刊物与用户管理

## 📄 License

MIT License
