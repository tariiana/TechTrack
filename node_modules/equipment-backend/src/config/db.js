const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: result.rowCount });
  return result;
}

async function getClient() {
  return await pool.connect();
}

async function initDatabase() {
  // Создаём схему если не существует
  await query(`CREATE SCHEMA IF NOT EXISTS equipment`);
  
  // Устанавливаем search_path для текущей сессии
  await query(`SET search_path TO equipment, public`);
  
  // Функция для установки пользователя в контекст (для триггеров)
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_settings WHERE name = 'myapp.current_user_id') THEN
        PERFORM set_config('myapp.current_user_id', '', false);
      END IF;
    END $$;
  `);
}

module.exports = {
  pool,
  query,
  getClient,
  initDatabase,
};