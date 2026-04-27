const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'smart_campus'
  });

  console.log('Starting social/attendance/doudizhu migration...');

  // 1. users.signature 列(个性签名)
  try {
    await conn.execute(`ALTER TABLE users ADD COLUMN signature VARCHAR(100) DEFAULT NULL COMMENT '个性签名'`);
    console.log('Added signature column to users');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    console.log('signature column already exists');
  }

  // 2. friend_requests 好友申请表
  await conn.execute(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('Created friend_requests table');

  // 3. friendships 好友关系表(约定: user_a_id < user_b_id)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS friendships (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_a_id INT NOT NULL,
      user_b_id INT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_pair (user_a_id, user_b_id),
      FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('Created friendships table');

  // 4. chat_groups 群聊
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS chat_groups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      owner_id INT NOT NULL,
      avatar VARCHAR(255) DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('Created chat_groups table');

  // 5. chat_group_members 群成员
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS chat_group_members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      group_id INT NOT NULL,
      user_id INT NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_group_user (group_id, user_id),
      FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('Created chat_group_members table');

  // 6. messages 消息表(私聊+群聊统一)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT NOT NULL,
      target_type ENUM('user','group') NOT NULL,
      target_id INT NOT NULL COMMENT '私聊=对方user_id 群聊=group_id',
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_target (target_type, target_id, created_at),
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('Created messages table');

  // 7. attendance_sessions 课堂签到会话
  await conn.execute(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('Created attendance_sessions table');

  // 8. attendance.session_id + check_in_at
  try {
    await conn.execute(`ALTER TABLE attendance ADD COLUMN session_id INT DEFAULT NULL COMMENT '关联签到会话'`);
    console.log('Added session_id column to attendance');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    console.log('attendance.session_id already exists');
  }
  try {
    await conn.execute(`ALTER TABLE attendance ADD COLUMN check_in_at DATETIME DEFAULT NULL COMMENT '签到时刻'`);
    console.log('Added check_in_at column to attendance');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    console.log('attendance.check_in_at already exists');
  }

  // 9. game_records.game_type 扩枚举: doudizhu
  await conn.execute(`
    ALTER TABLE game_records
    MODIFY COLUMN game_type ENUM('minesweeper','sudoku','chess','gomoku','doudizhu') NOT NULL
  `);
  console.log('Extended game_records.game_type ENUM with doudizhu');

  // 10. user_statuses 用户24小时状态(公开,好友可见)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS user_statuses (
      user_id INT PRIMARY KEY,
      emoji VARCHAR(10) NOT NULL,
      text VARCHAR(100) DEFAULT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('Created user_statuses table');

  // 11. chat_reads 聊天已读标记(用于未读红点)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS chat_reads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      target_type ENUM('user','group') NOT NULL,
      target_id INT NOT NULL,
      last_msg_id INT NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_user_target (user_id, target_type, target_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('Created chat_reads table');

  // 12. users.background_image 主页背景图
  try {
    await conn.execute(`ALTER TABLE users ADD COLUMN background_image VARCHAR(255) DEFAULT NULL COMMENT '主页背景图'`);
    console.log('Added background_image column to users');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    console.log('background_image column already exists');
  }

  // 13. users.featured_photos 精选照片(JSON数组)
  try {
    await conn.execute(`ALTER TABLE users ADD COLUMN featured_photos JSON DEFAULT NULL COMMENT '主页精选照片URL数组'`);
    console.log('Added featured_photos column to users');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    console.log('featured_photos column already exists');
  }

  await conn.end();
  console.log('Migration completed successfully!');
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
