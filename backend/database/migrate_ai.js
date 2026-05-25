const pool = require('../config/db');

async function migrateAi() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS ai_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      provider VARCHAR(30) NOT NULL DEFAULT 'deepseek',
      api_key TEXT DEFAULT NULL,
      model VARCHAR(120) DEFAULT NULL,
      base_url VARCHAR(255) DEFAULT NULL,
      enabled TINYINT DEFAULT 0,
      last_test_status VARCHAR(20) DEFAULT NULL,
      last_test_message VARCHAR(255) DEFAULT NULL,
      last_test_at DATETIME DEFAULT NULL,
      updated_by INT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS ai_usage_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT DEFAULT NULL,
      provider VARCHAR(30) NOT NULL,
      model VARCHAR(120) DEFAULT NULL,
      prompt_tokens INT DEFAULT 0,
      completion_tokens INT DEFAULT 0,
      total_tokens INT DEFAULT 0,
      purpose VARCHAR(30) DEFAULT 'chat',
      success TINYINT DEFAULT 1,
      error_message VARCHAR(255) DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ai_usage_created (created_at),
      INDEX idx_ai_usage_user (user_id)
    )
  `);

  const [[{ count }]] = await pool.execute('SELECT COUNT(*) AS count FROM ai_settings');
  if (count === 0) {
    await pool.execute(
      `INSERT INTO ai_settings (provider, model, base_url, enabled, created_at, updated_at)
       VALUES ('deepseek', 'deepseek-chat', 'https://api.deepseek.com', 0, NOW(), NOW())`
    );
  }

  console.log('[AI] ai_settings and ai_usage_logs are ready');
}

module.exports = migrateAi;
