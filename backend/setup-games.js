const mysql = require('./node_modules/mysql2/promise');

(async () => {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '123456', database: 'smart_campus' });
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS game_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      game_type ENUM('minesweeper', 'sudoku') NOT NULL,
      score INT DEFAULT 0,
      level VARCHAR(20) DEFAULT 'easy',
      play_time INT DEFAULT 0 COMMENT '完成用时(秒)',
      play_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('game_records table created');
  await pool.end();
})();
