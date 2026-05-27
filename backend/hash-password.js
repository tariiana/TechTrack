const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Одноразовый сервисный скрипт: хеширует пароль admin123 и записывает его
// пользователю admin в локальной БД.
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'equipment_nodes',
  user: 'postgres',
  password: 'mend'
});

async function hashAndUpdate() {
  // Если пароль меняется, измените password здесь и повторно запустите скрипт.
  const password = 'admin123';
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  
  console.log('Хеш пароля:', hash);
  
  // Обновить пароль администратора
  // В БД сохраняется только bcrypt-хеш, не открытый пароль.
  await pool.query(
    `UPDATE equipment.users SET password_hash = $1 WHERE login = 'admin'`,
    [hash]
  );
  
  console.log('Пароль обновлен!');
  process.exit();
}

hashAndUpdate();
