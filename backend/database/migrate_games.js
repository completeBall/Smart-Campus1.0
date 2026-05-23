const mysql = require('mysql2/promise');
const { dbConfig } = require('../config/db');

async function migrate() {
  const conn = await mysql.createConnection(dbConfig);

  console.log('Starting games migration (add chess + gomoku to game_records)...');

  try {
    await conn.execute(`
      ALTER TABLE game_records
      MODIFY COLUMN game_type ENUM('minesweeper','sudoku','chess','gomoku','doudizhu','sokoban','idiom','snake') NOT NULL
    `);
    console.log('Updated game_records.game_type enum');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME' && !e.message.includes('Duplicate')) {
      console.log('game_type ENUM may already contain new values or table missing:', e.message);
    }
  }

  await conn.end();
  console.log('Migration completed successfully!');
}

module.exports = migrate;

if (require.main === module) {
  migrate().catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });
}
