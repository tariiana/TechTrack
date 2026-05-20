import { query } from './dist/config/database.js';
import bcrypt from 'bcrypt';

async function fixPassword() {
  try {
    // Хешируем пароль admin123
    const hash = await bcrypt.hash('admin123', 10);
    console.log('Новый хеш пароля:', hash);
    
    // Обновляем пароль для admin
    await query(
      `UPDATE equipment.users SET password_hash = $1 WHERE login = $2`,
      [hash, 'admin']
    );
    
    console.log('✅ Пароль для admin обновлен на хешированный');
    
    // Проверяем
    const check = await query('SELECT login, password_hash FROM equipment.users WHERE login = $1', ['admin']);
    console.log('Проверка:', check.rows[0]);
    
  } catch (err: any) {
    console.error('❌ Ошибка:', err.message);
  }
  process.exit();
}
fixPassword();