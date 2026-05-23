const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { dbConfig } = require('../config/db');

// 判断是否为表空间损坏错误 (MySQL 1812 / 1146)
function isTablespaceError(err) {
  return err.code === 'ER_TABLESPACE_MISSING' ||
         err.code === 'ER_NO_SUCH_TABLE' ||
         (err.message && err.message.includes('Tablespace is missing'));
}

// 检测是否配置了 .env，没有则提醒
function checkEnvWarning() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.log('========================================');
    console.log('  [!] 未检测到 backend/.env 文件');
    console.log('  正在使用默认数据库配置:');
    console.log(`     主机: ${dbConfig.host}`);
    console.log(`     用户: ${dbConfig.user}`);
    console.log(`     密码: ${dbConfig.password}`);
    console.log(`     数据库: ${dbConfig.database}`);
    console.log('');
    console.log('  如需自定义配置，请复制 .env.example 为 .env 并修改');
    console.log('========================================');
  }
}

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

// 尝试执行 DROP TABLE 清理表空间残留定义，返回清理数量
async function cleanupOrphanTables(conn) {
  const [tables] = await conn.execute(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
    [dbConfig.database]
  );
  let cleaned = 0;
  for (const t of tables) {
    try {
      await conn.execute(`DROP TABLE IF EXISTS \`${t.TABLE_NAME}\``);
      cleaned++;
    } catch (e) { /* 个别表无法清理则跳过 */ }
  }
  return cleaned;
}

async function runInitSql() {
  const conn = await mysql.createConnection(dbConfig);
  let needsInit = false;
  try {
    const [tables] = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
      [dbConfig.database]
    );
    if (tables[0].cnt === 0) {
      needsInit = true;
    } else {
      // 用户表存在，验证是否可用
      try {
        await conn.execute('SELECT 1 FROM users LIMIT 1');
        console.log('Core tables verified, skipping init.sql');
      } catch (err) {
        if (isTablespaceError(err)) {
          console.log('检测到已有表空间损坏，将清理并重建...');
          needsInit = true;
        } else {
          throw err;
        }
      }
    }
  } finally {
    await conn.end();
  }

  if (!needsInit) return;

  // 清理所有残留表定义后重新执行 init.sql
  const cleanConn = await mysql.createConnection(dbConfig);
  try {
    const cleaned = await cleanupOrphanTables(cleanConn);
    if (cleaned > 0) {
      console.log(`已清理 ${cleaned} 个损坏表，正在重新初始化...`);
    }
  } finally {
    await cleanConn.end();
  }

  const initPath = path.join(__dirname, 'init.sql');
  let sql = fs.readFileSync(initPath, 'utf8');
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
    { name: 'seed_users', fn: require('./migrate_seed_users') },
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
  checkEnvWarning();

  // 先测试 MySQL 连接，给出清晰错误提示
  try {
    const testConn = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });
    await testConn.ping();
    await testConn.end();
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      throw new Error(
        `无法连接到 MySQL (${dbConfig.host})，请检查 MySQL 服务是否已启动`
      );
    }
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      throw new Error(
        `MySQL 登录失败: 用户 '${dbConfig.user}' 密码不正确，请检查 backend/.env 中的数据库配置`
      );
    }
    throw err;
  }

  console.log('MySQL connection verified, starting migration...');
  await ensureDatabase();
  await runInitSql();
  await runMigrations();
  console.log('All migrations completed successfully!');
}

module.exports = migrate;
module.exports.isTablespaceError = isTablespaceError;

if (require.main === module) {
  migrate().catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });
}
