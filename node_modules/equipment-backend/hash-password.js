const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'equipment_nodes',
  user: 'postgres',
  password: 'mend'
});

async function hashAndUpdate() {
  const password = 'admin123';
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  
  console.log('Хеш пароля:', hash);
  
  // Обновить пароль администратора
  await pool.query(
    `UPDATE equipment.users SET password_hash = $1 WHERE login = 'admin'`,
    [hash]
  );
  
  console.log('Пароль обновлен!');
  process.exit();
}

hashAndUpdate();