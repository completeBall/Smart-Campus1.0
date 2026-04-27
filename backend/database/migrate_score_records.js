const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'smart_campus'
  });

  console.log('Starting score-records migration...');

  await conn.execute(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('Created activity_score_records table');

  await conn.end();
  console.log('Migration completed successfully!');
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
