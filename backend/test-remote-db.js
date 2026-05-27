// test-remote-db.js
// Диагностика удаленной БД по настройкам из .env: соединение, SSL и типичные
// сетевые/pg_hba ошибки.
require('dotenv').config();
const { Pool } = require('pg');

const config = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 10000,
};

if (process.env.DB_SSL === 'require') {
  // Для managed PostgreSQL часто нужен SSL без проверки локального CA.
  config.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(config);

async function testConnection() {
  console.log('🔍 Проверка подключения к удаленной БД...');
  console.log('📡 Хост:', config.host);
  console.log('🔌 Порт:', config.port);
  console.log('💾 База:', config.database);
  console.log('👤 Пользователь:', config.user);
  console.log('🔒 SSL:', config.ssl ? 'включен' : 'выключен');
  console.log('');

  try {
    const res = await pool.query('SELECT NOW() as time, version() as version');
    console.log('✅ Подключение успешно!');
    console.log('🕐 Время на БД:', res.rows[0].time);
    console.log('📊 Версия PostgreSQL:', res.rows[0].version);
    return true;
  } catch (err) {
    console.error('❌ Ошибка подключения:', err.message);
    console.log('\n💡 Решения:');
    if (err.code === 'ENOTFOUND') {
      console.log('   - Неверный хост, проверьте DB_HOST');
    } else if (err.code === 'ECONNREFUSED') {
      console.log('   - Порт закрыт или сервер не отвечает, проверьте DB_PORT');
      console.log('   - Возможно, нужно открыть порт в брандмауэре');
    } else if (err.code === '28P01') {
      console.log('   - Неверный пароль, проверьте DB_PASSWORD');
    } else if (err.message.includes('no pg_hba.conf entry')) {
      console.log('   - Сервер БД не разрешает подключения с вашего IP');
      console.log('   - Добавьте IP в pg_hba.conf на сервере');
    } else if (err.message.includes('SSL required')) {
      console.log('   - Требуется SSL, добавьте DB_SSL=require в .env');
    }
    return false;
  } finally {
    await pool.end();
  }
}

testConnection();
