const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { dbConfig } = require('../config/db');

async function migrate() {
  const conn = await mysql.createConnection(dbConfig);

  const correctHash = await bcrypt.hash('123456', 10);

  // 确保所有种子用户存在且密码正确
  const seedUsers = [
    ['taball', '系统管理员', 'admin'],
    ['teacher1', '王老师', 'teacher'],
    ['teacher2', '李老师', 'teacher'],
    ['student1', 't个球', 'student'],
    ['student2', '李四', 'student'],
    ['student3', '王五', 'student'],
    ['student4', '赵六', 'student']
  ];

  for (const [username, name, role] of seedUsers) {
    const [rows] = await conn.execute(
      'SELECT id, password FROM users WHERE username = ?',
      [username]
    );
    if (rows.length === 0) {
      await conn.execute(
        'INSERT INTO users (username, password, name, role, avatar) VALUES (?, ?, ?, ?, ?)',
        [username, correctHash, name, role, '/uploads/default-avatar.png']
      );
      console.log(`Created user: ${username} (${name})`);
    } else {
      const valid = await bcrypt.compare('123456', rows[0].password);
      if (!valid) {
        await conn.execute(
          'UPDATE users SET password = ? WHERE username = ?',
          [correctHash, username]
        );
        console.log(`Fixed password for: ${username} (${name})`);
      }
    }
  }

  await conn.end();
  console.log('Seed users verified successfully');
}

module.exports = migrate;

if (require.main === module) {
  migrate().catch(err => {
    console.error('Seed user fix failed:', err.message);
    process.exit(1);
  });
}
