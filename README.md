# 智慧校园管理系统————————————————————————

> 基于 Vue 3 + Node.js + Express + MySQL 的全栈 Web 应用，支持管理员、教师、学生三端协同工作。

## 项目简介

本项目是为 Web 应用与开发比赛设计的智慧校园管理系统，覆盖校园日常教学、管理、交流、活动等核心场景。系统分为三个角色端：管理员端、教师端和学生端，默认登录密码为 **123456**。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite + Element Plus + Vue Router + Pinia + Axios + ECharts + Sass |
| 后端 | Node.js + Express + MySQL2 + JWT + bcryptjs + multer + dayjs |
| 数据库 | MySQL 8.0 |

## 项目结构

```
smart-campus/
├── backend/              # 后端服务
│   ├── config/           # 数据库配置
│   ├── middleware/       # JWT 认证中间件
│   ├── routes/           # API 路由
│   ├── database/         # 数据库初始化与迁移脚本
│   ├── uploads/          # 文件上传目录
│   ├── app.js            # 入口文件
│   └── package.json
├── frontend/             # 前端项目
│   ├── src/
│   │   ├── api/          # 接口封装
│   │   ├── components/   # 公共组件
│   │   ├── router/       # 路由配置
│   │   ├── stores/       # Pinia 状态管理
│   │   ├── views/        # 页面视图
│   │   │   ├── login/    # 登录页
│   │   │   ├── admin/    # 管理员端
│   │   │   ├── teacher/  # 教师端
│   │   │   ├── student/  # 学生端
│   │   │   ├── social/   # 社交功能
│   │   │   └── profile/  # 个人中心
│   │   ├── App.vue
│   │   └── main.js
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── start.bat             # Windows 一键启动脚本
├── start.ps1             # PowerShell 启动脚本
└── README.md
```

## 功能模块

### 管理员端
- **数据概览**：统计面板 + ECharts 可视化图表
- **用户管理**：增删改查用户，重置密码，状态管理
- **操作日志**：全站用户操作记录审计
- **反馈管理**：查看并回复学生/教师反馈
- **通知公告**：发布和管理公告

### 教师端
- **教学概览**：任务、学生、待批改统计 + 今日课程
- **发布任务**：指定班级发布作业任务
- **批改作业**：查看提交、评分、写评语，支持查看学生附件
- **课程表**：可视化课程表，支持调课标记
- **成绩管理**：录入和编辑学生成绩
- **审批管理**：审核请假、活动、加分申请
- **学生管理**：查看班级学生列表
- **课堂签到**：创建限时签到会话（3分钟迟到截止，5分钟关闭）
- **我的好友 / 聊天**：社交功能
- **24小时状态**：设置心情状态，好友可见

### 学生端
- **首页**：任务统计、今日课程、学习日历、学习备忘录、待完成作业、24小时状态
- **我的作业**：查看任务、提交作答（支持文本+附件上传）、查看成绩
- **课程表**：个人班级课程表查看
- **成绩查询**：各科成绩一览
- **综测分数**：智育/德育/体育/美育/劳育五维评分 + 排行榜 + 加分明细
- **校园论坛**：发帖、回复、点赞、热帖排行
- **企业招聘**：浏览招聘信息
- **考勤记录**：出勤/缺勤/迟到/请假记录，课堂签到
- **请假申请**：向教师提交请假
- **活动广场**：浏览活动、报名参与、发起活动
- **每日背单词**：每天3次挑战，答满50题且正确率>=80%可加智育分
- **我的同学**：班级同学列表，访问个人主页
- **我的好友 / 聊天**：好友申请、私聊、群聊
- **学院专业**：浏览院校和专业信息
- **意见反馈**：向管理员提交反馈
- **个人中心**：头像、背景图、精选照片、个性签名、24小时状态
- **内置小游戏**：
  - 扫雷、数独、象棋、五子棋
  - 斗地主、成语游戏
  - 推箱子、贪吃蛇

## 快速启动

### 1. 环境要求
- Node.js >= 16
- MySQL >= 8.0

### 2. 数据库初始化
```bash
# 登录 MySQL
mysql -u root -p --default-character-set=utf8mb4

# 执行初始化脚本（密码: 123456）
source backend/database/init.sql
```

后端服务启动时会自动执行数据库迁移，创建学院/专业表并填充种子数据。

### 3. 启动后端
```bash
cd backend
npm install
npm start
# 服务运行在 http://localhost:3000
# 开发模式可使用 npm run dev（nodemon 热重载）
```

### 4. 启动前端
```bash
cd frontend
npm install
npm run dev
# 访问 http://localhost:5173
```

### 5. Windows 一键启动（可选）
在项目根目录执行：
```bash
# 批处理方式
start.bat

# PowerShell 方式
start.ps1
```

## 默认账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 管理员 | taball | 123456 |
| 教师 | teacher1 | 123456 |
| 教师 | teacher2 | 123456 |
| 学生 | student1 | 123456 |
| 学生 | student2 | 123456 |
| 学生 | student3 | 123456 |
| 学生 | student4 | 123456 |

## 核心功能说明

### 作业提交与批改
- 学生提交作业时支持上传附件（图片/PDF/Word/压缩包等，最大10MB）
- 教师在批改弹窗中可直接查看并下载学生附件

### 综测分数体系
- **智育分**（60%）+ **德育分**（16%）+ **体育分**（8%）+ **美育分**（8%）+ **劳育分**（8%）
- 参与活动、每日背单词等可获得对应类型的加分
- 加分记录可在"加分明细"中查看审核状态

### 社交功能
- **24小时状态**：设置心情 emoji + 文字，24小时后自动消失
- **好友系统**：搜索用户、发送申请、同意/拒绝、删除好友
- **即时聊天**：私聊、群聊、未读消息红点提示

### 活动广场加分流程
1. 学生报名活动 -> 组织者审核通过
2. 组织者提交加分名单 -> 教师审核通过
3. 加分自动计入综测对应维度

## 界面特色

- 登录页面采用**毛玻璃效果**，左侧为登录卡片，右侧为动态渐变主题区
- 三端均采用深色侧边栏 + 卡片式内容区，现代简洁
- 课程表采用网格布局，直观展示每周课程
- 数据统计使用 ECharts 图表，信息可视化
- 个人主页支持滚动查看完整背景图、精选照片墙

## 接口文档

后端接口统一前缀 `/api`，主要路由：

| 路由 | 说明 |
|------|------|
| POST /api/auth/login | 登录 |
| GET /api/admin/statistics | 管理员统计 |
| GET /api/admin/users | 用户列表 |
| GET /api/teacher/tasks | 任务列表 |
| GET /api/teacher/submissions | 作业提交列表 |
| PUT /api/teacher/submissions/:id | 批改作业 |
| GET /api/teacher/score-records | 加分审核列表 |
| GET /api/student/tasks | 学生任务 |
| POST /api/student/tasks/:id/submit | 提交作业 |
| GET /api/student/assessment | 我的综测分数 |
| GET /api/student/score-records | 我的加分明细 |
| GET /api/student/forum/posts | 论坛帖子 |
| GET /api/student/jobs | 招聘信息 |
| GET /api/social/me/status | 我的24小时状态 |
| GET /api/social/users/:id/profile | 用户公开主页 |

## 配置文件说明

### vite.config.js
- 开发服务器端口：5173
- 代理：`/api` 和 `/uploads` 代理到 `http://localhost:3000`
- 路径别名：`@` 指向 `src`

### config/db.js
- 主机：localhost
- 用户：root
- 密码：123456
- 数据库：smart_campus

## 作者

**t个球**

AI 联合开发项目 | 智慧校园测试专用版本
