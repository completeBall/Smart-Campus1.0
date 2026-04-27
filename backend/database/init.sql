-- 智慧校园数据库初始化脚本
CREATE DATABASE IF NOT EXISTS smart_campus DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_campus;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(50) NOT NULL,
  role ENUM('admin', 'teacher', 'student') NOT NULL,
  avatar VARCHAR(255) DEFAULT NULL,
  class_name VARCHAR(50) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  email VARCHAR(100) DEFAULT NULL,
  signature VARCHAR(100) DEFAULT NULL COMMENT '个性签名',
  status TINYINT DEFAULT 1 COMMENT '0禁用 1启用',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME DEFAULT NULL
);

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(50) NOT NULL,
  detail TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  target_class VARCHAR(50) NOT NULL,
  deadline DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 任务提交表
CREATE TABLE IF NOT EXISTS task_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  student_id INT NOT NULL,
  content TEXT,
  status TINYINT DEFAULT 0 COMMENT '0待批改 1已批改',
  score DECIMAL(5,2) DEFAULT NULL,
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME DEFAULT NULL
);

-- 课程表
CREATE TABLE IF NOT EXISTS schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT NOT NULL,
  course_name VARCHAR(100) NOT NULL,
  class_name VARCHAR(50) NOT NULL,
  day_of_week TINYINT NOT NULL COMMENT '1-7 周一到周日',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  classroom VARCHAR(50),
  status VARCHAR(20) DEFAULT 'normal' COMMENT 'normal正常 adjusted已调课',
  adjust_reason VARCHAR(255) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 成绩表
CREATE TABLE IF NOT EXISTS grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT NOT NULL,
  student_id INT NOT NULL,
  course_name VARCHAR(100) NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  exam_type VARCHAR(50) DEFAULT '平时测验',
  remark TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 考勤表
CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_name VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  status ENUM('present', 'absent', 'late', 'leave') NOT NULL,
  remark VARCHAR(255) DEFAULT NULL,
  session_id INT DEFAULT NULL COMMENT '关联签到会话',
  check_in_at DATETIME DEFAULT NULL COMMENT '签到时刻',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 论坛帖子表
CREATE TABLE IF NOT EXISTS forum_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  view_count INT DEFAULT 0,
  is_pinned TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 论坛回复表
CREATE TABLE IF NOT EXISTS forum_replies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  parent_id INT DEFAULT NULL COMMENT '回复的目标回复ID',
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES forum_replies(id) ON DELETE CASCADE
);

-- 招聘信息表
CREATE TABLE IF NOT EXISTS jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(50) DEFAULT NULL,
  salary VARCHAR(100) DEFAULT NULL,
  location VARCHAR(100) DEFAULT NULL,
  description TEXT,
  requirements TEXT,
  contact VARCHAR(100) DEFAULT NULL,
  status TINYINT DEFAULT 1 COMMENT '0下架 1上架',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 反馈表
CREATE TABLE IF NOT EXISTS feedbacks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'suggestion',
  status TINYINT DEFAULT 0 COMMENT '0未处理 1已处理',
  reply TEXT,
  reply_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 通知公告表
CREATE TABLE IF NOT EXISTS notices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  type ENUM('all', 'teacher', 'student') DEFAULT 'all',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 请假申请表
CREATE TABLE IF NOT EXISTS leave_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type ENUM('sick', 'personal', 'other') DEFAULT 'personal' COMMENT '病假/事假/其他',
  reason TEXT NOT NULL,
  status TINYINT DEFAULT 0 COMMENT '0待审批 1已通过 2已拒绝',
  teacher_id INT DEFAULT NULL,
  reply TEXT DEFAULT NULL COMMENT '审批回复',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 综测分数表
CREATE TABLE IF NOT EXISTS comprehensive_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  academic_score DECIMAL(5,2) DEFAULT 0 COMMENT '智育分',
  moral_score DECIMAL(5,2) DEFAULT 0 COMMENT '德育分',
  sports_score DECIMAL(5,2) DEFAULT 0 COMMENT '体育分',
  arts_score DECIMAL(5,2) DEFAULT 0 COMMENT '美育分',
  labor_score DECIMAL(5,2) DEFAULT 0 COMMENT '劳育分',
  total_score DECIMAL(6,2) DEFAULT 0 COMMENT '总分',
  semester VARCHAR(20) DEFAULT '2024-2025-2' COMMENT '学期',
  is_excellent TINYINT DEFAULT 0 COMMENT '是否优秀学生 0否 1是',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_student_semester (student_id, semester)
);

-- 活动表
CREATE TABLE IF NOT EXISTS activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category ENUM('academic', 'sports', 'arts', 'volunteer', 'labor', 'other') DEFAULT 'other' COMMENT '学术/体育/艺术/志愿/劳动/其他',
  score_type ENUM('academic', 'moral', 'sports', 'arts', 'labor') DEFAULT 'moral' COMMENT '加分类型',
  score_value DECIMAL(5,2) DEFAULT 0 COMMENT '加分分值',
  max_participants INT DEFAULT 0 COMMENT '0表示不限',
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  location VARCHAR(200) DEFAULT NULL,
  organizer_id INT NOT NULL,
  status TINYINT DEFAULT 0 COMMENT '0待审批 1已通过 2已拒绝 3进行中 4已结束',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 活动参与表
CREATE TABLE IF NOT EXISTS activity_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_id INT NOT NULL,
  student_id INT NOT NULL,
  status TINYINT DEFAULT 0 COMMENT '0待审核 1已通过 2已拒绝',
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME DEFAULT NULL,
  approved_by INT DEFAULT NULL,
  UNIQUE KEY uk_activity_student (activity_id, student_id),
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 加分申请记录表（组织者提交→教师审核→才加分）
CREATE TABLE IF NOT EXISTS activity_score_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_id INT NOT NULL,
  student_id INT NOT NULL COMMENT '被加分的学生',
  participant_id INT DEFAULT NULL COMMENT '关联的报名记录ID',
  score_type ENUM('academic','moral','sports','arts','labor') NOT NULL,
  score_value DECIMAL(5,2) NOT NULL,
  semester VARCHAR(20) DEFAULT '2024-2025-2',
  status TINYINT DEFAULT 0 COMMENT '0待教师审核 1已通过 2已拒绝',
  submitted_by INT NOT NULL COMMENT '提交者(组织者)',
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_by INT DEFAULT NULL COMMENT '审核教师',
  reviewed_at DATETIME DEFAULT NULL,
  remark VARCHAR(255) DEFAULT NULL COMMENT '教师备注/拒绝原因',
  UNIQUE KEY uk_activity_student_score (activity_id, student_id),
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 插入默认管理员
INSERT INTO users (username, password, name, role, avatar) VALUES
('taball', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqQzBZN0UfGNEKjN8X4J8QW0Q8W0q', '系统管理员', 'admin', '/uploads/default-avatar.png');
-- 密码: 123456

-- 插入示例教师
INSERT INTO users (username, password, name, role, phone, email, avatar) VALUES
('teacher1', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqQzBZN0UfGNEKjN8X4J8QW0Q8W0q', '王老师', 'teacher', '13800138001', 'wang@school.com', NULL),
('teacher2', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqQzBZN0UfGNEKjN8X4J8QW0Q8W0q', '李老师', 'teacher', '13800138002', 'li@school.com', NULL);

-- 插入示例学生
INSERT INTO users (username, password, name, role, class_name, phone, avatar) VALUES
('student1', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqQzBZN0UfGNEKjN8X4J8QW0Q8W0q', 't个球', 'student', '软件技术一班', '13900139001', NULL),
('student2', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqQzBZN0UfGNEKjN8X4J8QW0Q8W0q', '李四', 'student', '软件技术一班', '13900139002', NULL),
('student3', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqQzBZN0UfGNEKjN8X4J8QW0Q8W0q', '王五', 'student', '健康管理二班', '13900139003', NULL),
('student4', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqQzBZN0UfGNEKjN8X4J8QW0Q8W0q', '赵六', 'student', '健康管理二班', '13900139004', NULL);

-- 插入示例课程表
INSERT INTO schedules (teacher_id, course_name, class_name, day_of_week, start_time, end_time, classroom) VALUES
(2, 'Java程序设计', '软件技术一班', 1, '08:00:00', '09:40:00', 'A101'),
(2, 'Java程序设计', '软件技术一班', 3, '08:00:00', '09:40:00', 'A101'),
(2, '数据库原理', '健康管理二班', 2, '10:00:00', '11:40:00', 'B203'),
(3, 'Web前端开发', '软件技术一班', 2, '14:00:00', '15:40:00', 'C305'),
(3, 'Web前端开发', '健康管理二班', 4, '14:00:00', '15:40:00', 'C305');

-- 插入示例招聘信息
INSERT INTO jobs (company, title, category, salary, location, description, requirements, contact) VALUES
('华为技术有限公司', 'Java后端开发工程师', '技术', '15k-25k', '深圳', '负责公司核心业务系统开发与维护', '本科及以上学历，熟悉Spring Boot、MySQL、Redis', 'hr@huawei.com'),
('腾讯科技', '前端开发工程师', '技术', '18k-30k', '深圳', '负责腾讯产品前端开发', '本科及以上学历，熟悉Vue/React，有实际项目经验', 'hr@tencent.com'),
('阿里巴巴', '算法工程师', '技术', '25k-40k', '杭州', '负责推荐算法优化', '硕士及以上学历，熟悉机器学习、深度学习', 'hr@alibaba.com'),
('字节跳动', '产品经理', '产品', '20k-35k', '北京', '负责抖音某模块产品规划', '本科及以上学历，有3年以上产品经验', 'hr@bytedance.com'),
('影视飓风', '视频剪辑师', '技术', '8k-15k', '杭州', '负责自媒体视频剪辑、调色及特效制作，参与创意策划', '熟练使用Premiere、DaVinci Resolve、After Effects，有短视频剪辑经验优先', 'hr@ysjf.com'),
('影视飓风', '影视编导', '技术', '10k-20k', '杭州', '负责视频内容策划、脚本撰写及现场执导', '影视传媒相关专业，具备优秀的文案能力和镜头语言理解', 'hr@ysjf.com'),
('影视飓风', '摄影师', '技术', '8k-18k', '杭州', '负责商业拍摄、产品摄影及活动跟拍', '熟练使用各类摄影器材，具备良好的构图和灯光把控能力', 'hr@ysjf.com'),
('广东电子厂', '流水线操作工', '技术', '4k-6k', '东莞', '负责电子产品组装、检测及包装工作', '身体健康，能适应两班倒，无经验可培训', 'hr@gddzc.com'),
('广东电子厂', '质检员', '技术', '5k-7k', '东莞', '负责电子产品来料检验、过程检验及成品出货检验', '工作细心负责，有质检经验优先', 'hr@gddzc.com'),
('广东电子厂', '仓库管理员', '技术', '4.5k-6k', '东莞', '负责物料收发、库存管理及盘点工作', '熟悉ERP系统操作，有仓库管理经验优先', 'hr@gddzc.com');

-- 插入示例公告
INSERT INTO notices (title, content, type) VALUES
('关于期中考试安排的通知', '期中考试将于第10周进行，请各班级做好复习准备...', 'all'),
('校园网络安全提醒', '近期发现部分同学账号存在弱密码，请及时修改密码...', 'all'),
('教师节活动通知', '本周五下午2点在礼堂举行教师节庆祝活动...', 'all');

-- 插入综测分数示例数据（智育60%，德育16%，体育8%，美育8%，劳育8%）
INSERT INTO comprehensive_scores (student_id, academic_score, moral_score, sports_score, arts_score, labor_score, total_score, semester, is_excellent) VALUES
(4, 85.00, 90.00, 88.00, 82.00, 80.00, 86.28, '2024-2025-2', 1),
(5, 78.00, 85.00, 80.00, 75.00, 70.00, 78.60, '2024-2025-2', 0),
(6, 92.00, 88.00, 85.00, 90.00, 88.00, 90.52, '2024-2025-2', 1),
(7, 70.00, 75.00, 72.00, 68.00, 65.00, 71.36, '2024-2025-2', 0);

-- 插入示例请假记录
INSERT INTO leave_requests (student_id, start_date, end_date, type, reason, status, teacher_id, reply) VALUES
(4, '2025-04-20', '2025-04-21', 'sick', '感冒发烧，需要休息两天', 1, 2, '已批准，注意身体'),
(5, '2025-04-22', '2025-04-22', 'personal', '家中有事，需请假一天', 0, NULL, NULL);

-- 插入示例活动（状态1已通过，表示已审批通过的活动）
INSERT INTO activities (title, description, category, score_type, score_value, max_participants, start_time, end_time, location, organizer_id, status) VALUES
('校园编程大赛', '面向全校学生的编程竞赛，提升编程能力', 'academic', 'academic', 5.00, 50, '2025-05-10 09:00:00', '2025-05-10 17:00:00', '计算机楼实验室', 2, 1),
('春季运动会', '一年一度的校园春季运动会', 'sports', 'sports', 3.00, 0, '2025-04-28 08:00:00', '2025-04-28 18:00:00', '学校体育场', 2, 1),
('志愿服务活动-社区清洁', '前往附近社区进行环境清洁志愿服务', 'volunteer', 'moral', 2.00, 30, '2025-05-05 14:00:00', '2025-05-05 17:00:00', '学校东门集合', 3, 1),
('校园歌手大赛', '展示歌唱才艺，丰富校园文化生活', 'arts', 'arts', 3.00, 40, '2025-05-15 19:00:00', '2025-05-15 21:30:00', '学校礼堂', 3, 1),
('劳动实践-植树活动', '春季校园植树劳动实践活动', 'labor', 'labor', 2.00, 25, '2025-05-01 09:00:00', '2025-05-01 12:00:00', '校园绿化带', 2, 0);

-- 插入示例活动参与记录
INSERT INTO activity_participants (activity_id, student_id, status, applied_at, approved_at, approved_by) VALUES
(1, 4, 1, '2025-04-15 10:00:00', '2025-04-15 14:00:00', 2),
(2, 4, 1, '2025-04-16 09:30:00', '2025-04-16 10:00:00', 2),
(1, 5, 0, '2025-04-18 11:00:00', NULL, NULL),
(3, 6, 1, '2025-04-17 15:00:00', '2025-04-17 16:00:00', 3);

-- 好友申请表
CREATE TABLE IF NOT EXISTS friend_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_user_id INT NOT NULL,
  to_user_id INT NOT NULL,
  status TINYINT DEFAULT 0 COMMENT '0待处理 1已同意 2已拒绝',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME DEFAULT NULL,
  UNIQUE KEY uk_from_to (from_user_id, to_user_id),
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 好友关系表(约定 user_a_id < user_b_id)
CREATE TABLE IF NOT EXISTS friendships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_a_id INT NOT NULL,
  user_b_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_pair (user_a_id, user_b_id),
  FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 群聊表
CREATE TABLE IF NOT EXISTS chat_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  owner_id INT NOT NULL,
  avatar VARCHAR(255) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 群成员表
CREATE TABLE IF NOT EXISTS chat_group_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_group_user (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 消息表(私聊+群聊统一)
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  target_type ENUM('user','group') NOT NULL,
  target_id INT NOT NULL COMMENT '私聊=对方user_id 群聊=group_id',
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_target (target_type, target_id, created_at),
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 课堂签到会话表
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT NOT NULL,
  schedule_id INT DEFAULT NULL COMMENT '关联课程表id(可空)',
  course_name VARCHAR(100) NOT NULL,
  class_name VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  start_at DATETIME NOT NULL COMMENT '签到开始时刻',
  late_at DATETIME NOT NULL COMMENT '迟到截止 = start_at + 3min',
  end_at DATETIME NOT NULL COMMENT '关闭 = start_at + 5min',
  status TINYINT DEFAULT 1 COMMENT '1进行中 2已结束',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);
