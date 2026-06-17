const pool = require('../config/db');

async function migrateYouthCreation() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS youth_creation_posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        province_code VARCHAR(12) NOT NULL,
        province_name VARCHAR(50) NOT NULL,
        city_code VARCHAR(12) NOT NULL,
        city_name VARCHAR(50) NOT NULL,
        author_name VARCHAR(50) DEFAULT NULL,
        content TEXT NOT NULL,
        images JSON DEFAULT NULL,
        status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
        reviewed_by INT DEFAULT NULL,
        reviewed_at DATETIME DEFAULT NULL,
        review_note VARCHAR(255) DEFAULT NULL,
        like_count INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_youth_region (province_code, city_code, created_at),
        INDEX idx_youth_status (status, created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    const [authorColumns] = await conn.query("SHOW COLUMNS FROM youth_creation_posts LIKE 'author_name'");
    if (!authorColumns.length) {
      await conn.query('ALTER TABLE youth_creation_posts ADD COLUMN author_name VARCHAR(50) DEFAULT NULL AFTER city_name');
    }
    const ensureColumn = async (name, ddl) => {
      const [columns] = await conn.query(`SHOW COLUMNS FROM youth_creation_posts LIKE ?`, [name]);
      if (!columns.length) await conn.query(ddl);
    };
    await ensureColumn('status', "ALTER TABLE youth_creation_posts ADD COLUMN status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved' AFTER images");
    await ensureColumn('reviewed_by', 'ALTER TABLE youth_creation_posts ADD COLUMN reviewed_by INT DEFAULT NULL AFTER status');
    await ensureColumn('reviewed_at', 'ALTER TABLE youth_creation_posts ADD COLUMN reviewed_at DATETIME DEFAULT NULL AFTER reviewed_by');
    await ensureColumn('review_note', 'ALTER TABLE youth_creation_posts ADD COLUMN review_note VARCHAR(255) DEFAULT NULL AFTER reviewed_at');
    const [statusIndexes] = await conn.query("SHOW INDEX FROM youth_creation_posts WHERE Key_name = 'idx_youth_status'");
    if (!statusIndexes.length) {
      await conn.query('CREATE INDEX idx_youth_status ON youth_creation_posts (status, created_at)');
    }
    await conn.query(`
      CREATE TABLE IF NOT EXISTS youth_creation_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_youth_like (post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES youth_creation_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await seedYouthCreationPosts(conn);
    console.log('Youth creation tables are ready');
  } finally {
    conn.release();
  }
}

async function seedYouthCreationPosts(conn) {
  const [[author]] = await conn.query(
    "SELECT id, name FROM users WHERE username = 'student1' LIMIT 1"
  );
  if (!author) return;

  const seedPosts = [
    {
      province_code: '440000',
      province_name: '广东省',
      city_code: '440100',
      city_name: '广州市',
      author_name: 't个球',
      content: '好看',
      images: ['/uploads/1781599346426-369277338.jpg'],
      created_at: '2026-06-16 16:42:39'
    },
    {
      province_code: '110000',
      province_name: '北京市',
      city_code: '110101',
      city_name: '东城区',
      author_name: 'Jainoni',
      content: '',
      images: [
        '/uploads/1781616154493-824277943.jpg',
        '/uploads/1781616157436-530690459.jpg'
      ],
      created_at: '2026-06-16 21:22:37'
    },
    {
      province_code: '110000',
      province_name: '北京市',
      city_code: '110114',
      city_name: '昌平区',
      author_name: 'Jainoni',
      content: '',
      images: ['/uploads/1781620175017-643866492.jpg'],
      created_at: '2026-06-16 22:29:35'
    }
  ];

  for (const post of seedPosts) {
    const imageJson = JSON.stringify(post.images);
    const [[existing]] = await conn.query(
      `SELECT id FROM youth_creation_posts
       WHERE user_id = ?
         AND province_code = ?
         AND city_code = ?
         AND author_name = ?
         AND content = ?
         AND JSON_CONTAINS(images, CAST(? AS JSON))
       LIMIT 1`,
      [
        author.id,
        post.province_code,
        post.city_code,
        post.author_name,
        post.content,
        imageJson
      ]
    );
    if (existing) {
      await conn.query(
        `UPDATE youth_creation_posts
         SET status = 'approved', reviewed_at = COALESCE(reviewed_at, ?)
         WHERE id = ?`,
        [post.created_at, existing.id]
      );
      continue;
    }

    await conn.query(
      `INSERT INTO youth_creation_posts
       (user_id, province_code, province_name, city_code, city_name, author_name,
        content, images, status, reviewed_at, like_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), 'approved', ?, 0, ?)`,
      [
        author.id,
        post.province_code,
        post.province_name,
        post.city_code,
        post.city_name,
        post.author_name,
        post.content,
        imageJson,
        post.created_at,
        post.created_at
      ]
    );
  }
}

module.exports = migrateYouthCreation;

if (require.main === module) {
  migrateYouthCreation().then(() => process.exit(0)).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
