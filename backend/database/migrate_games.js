const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'smart_campus'
  });

  console.log('Starting games migration (add chess + gomoku to game_records)...');

  await conn.execute(`
    ALTER TABLE game_records
    MODIFY COLUMN game_type ENUM('minesweeper','sudoku','chess','gomoku') NOT NULL
  `);
  console.log('Updated game_records.game_type enum');

  await conn.end();
  console.log('Migration completed successfully!');
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
