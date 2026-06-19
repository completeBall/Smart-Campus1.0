# 智慧校园管理系统

基于 Vue 3、Node.js、Express 和 MySQL 的智慧校园 Web 应用，面向管理员、教师、学生三类角色，覆盖教学管理、校园社交、活动综测、AI 助手、招聘信息、考勤请假等校园场景。

## 项目简介

本项目采用前后端分离架构：

- 前端提供三端统一布局、浅色/深色主题、路由鉴权、文件上传、实时交互式页面。
- 后端提供 REST API、JWT 登录鉴权、MySQL 自动建库和迁移、上传文件静态服务。
- 数据库迁移在后端启动时自动执行，首次运行会初始化表结构和演示数据。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | Vue 3、Vite、Vue Router、Pinia、Element Plus、Axios、ECharts、Sass、Tailwind CSS |
| 后端 | Node.js、Express、MySQL2、JWT、bcryptjs、multer、dayjs、xlsx |
| 数据库 | MySQL 8.x |
| 工具脚本 | Windows batch、PowerShell |

## 项目结构

```text
smart-campus/
├── backend/                 # 后端服务
│   ├── app.js               # Express 入口
│   ├── config/              # 数据库配置
│   ├── database/            # init.sql 与迁移脚本
│   ├── middleware/          # 鉴权中间件
│   ├── routes/              # auth/admin/teacher/student/social/profile API
│   ├── services/            # 业务服务
│   ├── uploads/             # 上传文件目录
│   └── package.json
├── frontend/                # 前端项目
│   ├── src/
│   │   ├── api/             # Axios API 封装
│   │   ├── components/      # 公共布局组件
│   │   ├── router/          # 路由和角色守卫
│   │   ├── stores/          # Pinia 状态
│   │   └── views/           # admin/teacher/student/social/profile 页面
│   ├── vite.config.js       # Vite 配置与代理
│   └── package.json
├── start.bat                # Windows 一键启动脚本
├── start.ps1                # PowerShell 启动脚本
└── README.md
```

## 功能模块

### 管理员端

- 数据概览：用户、任务、反馈等统计信息。
- 用户管理：创建、编辑、禁用用户，重置密码。
- 操作日志：查看系统操作记录。
- 反馈管理：查看并回复用户反馈。
- 通知公告：发布和维护校园公告。
- AI 设置：配置学生端智能 AI 的服务参数和用量。
- 青年共创审核：审核学生发布的青年共创内容。

### 教师端

- 教师首页：教学任务、学生、待批改、今日课程概览。
- 任务发布：给班级发布作业任务。
- 作业批改：查看提交内容、附件、评分和评语。
- 课程表：查看和维护教师课程安排，可发起课堂签到。
- 成绩管理：录入、编辑和查询学生成绩。
- 审批管理：处理请假、活动、综测加分等申请。
- 学生管理：查看班级学生列表。
- 签到详情：查看课堂签到会话和学生出勤状态。
- 社交功能：好友、私聊、群聊、个人主页、24 小时状态。

### 学生端

- 首页：任务统计、待完成作业、学习日历、今日课程、学习备忘录、生日设置。
- 我的作业：查看任务，提交文本和附件，查看批改结果。
- 课程表：查看个人课程安排。
- 成绩查询：查看课程成绩。
- 校园论坛：发帖、回复、点赞、图片/附件上传。
- 企业招聘：浏览岗位、筛选分类、查看招聘详情。
- 考勤记录：查看出勤、迟到、缺勤、请假记录，并完成课堂签到。
- 请假申请：提交请假并查看审批记录。
- 综测分数：展示智育、德育、体育、美育、劳育总分、排名和加分明细。
- 活动广场：浏览活动、报名活动、发起活动、提交加分名单。
- 青年共创：围绕城市/区域发布图文分享并等待审核。
- 每日背单词：单词练习和学习加分。
- 智能 AI：学生端聊天助手，支持使用后台配置的模型服务。
- 我的同学：查看班级同学和个人主页。
- 学院专业：浏览学院与专业介绍。
- 意见反馈：向管理员提交反馈并查看回复。
- 社交功能：好友申请、私聊、群聊、个人资料、头像/背景图/精选照片。
- 内置小游戏：扫雷、数独、象棋、五子棋、斗地主、成语游戏、推箱子、贪吃蛇、俄罗斯方块、打字练习、灯谜等。

## 快速启动

### 环境要求

- Node.js 16+
- MySQL 8.x
- npm

### 1. 配置后端

```bash
cd backend
npm install
copy .env.example .env
```

按本机 MySQL 修改 `backend/.env`：

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=123456
DB_NAME=smart_campus
PORT=3000
JWT_SECRET=smart-campus-secret-key-2024
```

后端启动时会自动执行 `backend/database/migrate.js`，包括建库、初始化表和执行增量迁移。

### 2. 启动后端

```bash
cd backend
npm start
```

开发模式：

```bash
npm run dev
```

服务地址：`http://localhost:3000`

健康检查：`http://localhost:3000/api/health`

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

访问地址：`http://localhost:5173`

Vite 已将 `/api` 和 `/uploads` 代理到 `http://localhost:3000`。

### 4. 一键启动

项目根目录提供 Windows 启动脚本：

```bash
start.bat
```

或：

```powershell
.\start.ps1
```

## 构建

```bash
cd frontend
npm run build
```

构建产物输出到 `frontend/dist/`。

## 默认账号

默认密码通常为 `123456`，具体账号由数据库初始化和迁移脚本写入。

| 角色 | 示例账号 | 密码 |
| --- | --- | --- |
| 管理员 | taball | 123456 |
| 教师 | teacher1 / teacher2 | 123456 |
| 学生 | student1 / student2 / student3 / student4 | 123456 |

## 接口概览

后端接口统一以 `/api` 开头：

| 路由前缀 | 说明 |
| --- | --- |
| `/api/auth` | 登录认证 |
| `/api/admin` | 管理员统计、用户、日志、公告、反馈、AI 配置 |
| `/api/teacher` | 教师任务、批改、课程、成绩、审批、签到 |
| `/api/student` | 学生首页、作业、课程、论坛、活动、综测、AI、请假、考勤 |
| `/api/social` | 好友、聊天、群聊、个人状态、用户公开主页 |
| `/api/profile` | 当前用户资料、头像、背景、精选照片 |
| `/api/upload/avatar` | 单张图片上传，头像/背景/照片使用 |
| `/api/upload/image` | 论坛等多图片上传，最多 9 张 |
| `/api/upload/file` | 普通附件上传 |

## 上传限制

- 头像、背景图、精选照片：图片文件，最大 30MB。
- 论坛图片：图片文件，最多 9 张，单次最大 30MB。
- 普通附件：最大 10MB。
- 上传文件通过 `/uploads/...` 静态访问。

## 主题与界面

- 全站支持浅色/深色模式。
- 三端共用侧边栏布局和顶部面包屑。
- 学生端包含学习日历、卡片式统计、空状态插画、活动/论坛/聊天等较完整交互。
- 深色模式已对聊天、综测、请假、反馈、考勤、招聘、首页等页面做可读性适配。

## 数据库迁移

主要迁移文件位于 `backend/database/`：

- `init.sql`：基础表结构和初始数据。
- `migrate.js`：统一迁移入口。
- `migrate_social.js`：社交、好友、聊天和状态相关结构。
- `migrate_forum.js`：论坛相关结构。
- `migrate_words.js`：每日背单词数据。
- `migrate_score_records.js`：综测加分记录。
- `migrate_ai.js`：AI 设置和用量。
- `migrate_colleges.js`：学院专业数据。
- `migrate_games.js`：游戏相关数据。
- `migrate_youth_creation.js`：青年共创数据。

## 开发注意事项

- 后端启动前请确认 MySQL 服务已启动，且 `.env` 中账号密码正确。
- 前端请求通过 `frontend/src/api/request.js` 统一注入 token。
- 路由在 `frontend/src/router/index.js` 中按 `admin`、`teacher`、`student` 角色守卫。
- 不要提交本地上传文件、日志和构建产物，按需检查 `.gitignore`。

## 作者

t个球

AI 联合开发项目 | 智慧校园测试版本
