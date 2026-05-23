const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { dbConfig } = require('../config/db');

async function ensureDatabase() {
  const conn = await mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password
  });
  await conn.execute(
    `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log(`Database '${dbConfig.database}' is ready`);
  await conn.end();
}

async function runInitSql() {
  const conn = await mysql.createConnection(dbConfig);
  try {
    const [tables] = await conn.execute(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
      [dbConfig.database]
    );
    if (tables.length > 0) {
      console.log('Core tables already exist, skipping init.sql');
      return;
    }
  } finally {
    await conn.end();
  }

  const initPath = path.join(__dirname, 'init.sql');
  let sql = fs.readFileSync(initPath, 'utf8');
  // 替换 init.sql 中硬编码的数据库名为用户配置的名称
  sql = sql.replace(/smart_campus/g, dbConfig.database);
  const conn2 = await mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    multipleStatements: true
  });
  try {
    await conn2.query(sql);
    console.log('init.sql executed successfully');
  } finally {
    await conn2.end();
  }
}

async function runMigrations() {
  const migrations = [
    { name: 'colleges', fn: require('./migrate_colleges') },
    { name: 'forum', fn: require('./migrate_forum') },
    { name: 'social', fn: require('./migrate_social') },
    { name: 'score_records', fn: require('./migrate_score_records') },
    { name: 'games', fn: require('./migrate_games') },
    { name: 'software_major', fn: require('./migrate_software_major') }
  ];

  for (const m of migrations) {
    console.log(`--- Running migration: ${m.name} ---`);
    try {
      await m.fn();
    } catch (err) {
      console.error(`Migration '${m.name}' failed:`, err.message);
      throw err;
    }
  }
}

async function migrate() {
  await ensureDatabase();
  await runInitSql();
  await runMigrations();
  console.log('All migrations completed successfully!');
}

module.exports = migrate;

if (require.main === module) {
  migrate().catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });
}
