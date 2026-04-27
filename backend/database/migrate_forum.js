const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'smart_campus'
  });

  console.log('Starting forum migration (likes + images + attachments)...');

  // 1. forum_posts 增加 images 和 attachments 列(JSON 数组,存路径)
  const [cols] = await conn.execute(`SHOW COLUMNS FROM forum_posts`);
  const has = (name) => cols.some(c => c.Field === name);

  if (!has('images')) {
    await conn.execute(`ALTER TABLE forum_posts ADD COLUMN images TEXT DEFAULT NULL COMMENT '图片URL列表,JSON数组'`);
    console.log('Added forum_posts.images');
  }
  if (!has('attachments')) {
    await conn.execute(`ALTER TABLE forum_posts ADD COLUMN attachments TEXT DEFAULT NULL COMMENT '附件列表,JSON数组[{name,url,size}]'`);
    console.log('Added forum_posts.attachments');
  }
  if (!has('like_count')) {
    await conn.execute(`ALTER TABLE forum_posts ADD COLUMN like_count INT DEFAULT 0 COMMENT '点赞数(冗余字段)'`);
    console.log('Added forum_posts.like_count');
  }
  if (!has('reply_count')) {
    await conn.execute(`ALTER TABLE forum_posts ADD COLUMN reply_count INT DEFAULT 0 COMMENT '回复数(冗余字段)'`);
    console.log('Added forum_posts.reply_count');
  }

  // 2. forum_likes 表
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS forum_likes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id INT NOT NULL,
      user_id INT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_post_user (post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('Created forum_likes table');

  // 3. 回填 reply_count
  await conn.execute(`
    UPDATE forum_posts p
    LEFT JOIN (SELECT post_id, COUNT(*) c FROM forum_replies GROUP BY post_id) r ON r.post_id = p.id
    SET p.reply_count = COALESCE(r.c, 0)
  `);
  console.log('Backfilled reply_count');

  await conn.end();
  console.log('Forum migration completed successfully!');
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
