import { query } from '../config/db.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');

export interface LoginResult {
  success: boolean;
  token?: string;
  user?: {
    user_id: string;
    login: string;
    full_name: string;
    role: string;
  };
  error?: string;
}

export async function login(login: string, password: string, ipAddress: string | null, userAgent: string | null): Promise<LoginResult> {
  // Ищем пользователя
  const result = await query(
    `SELECT u.user_id, u.login, u.password_hash, u.full_name, u.is_active, r.name as role_name
     FROM equipment.users u
     JOIN equipment.roles r ON u.role_id = r.role_id
     WHERE u.login = $1`,
    [login]
  );
  
  if (result.rows.length === 0) {
    await auditLog(null, 'LOGIN_FAILED', 'auth', null, null, { login }, ipAddress, userAgent);
    return { success: false, error: 'Неверный логин или пароль' };
  }
  
  const user = result.rows[0];
  
  if (!user.is_active) {
    return { success: false, error: 'Учётная запись деактивирована' };
  }
  
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  
  if (!isValidPassword) {
    await auditLog(user.user_id, 'LOGIN_FAILED', 'auth', null, null, { login }, ipAddress, userAgent);
    return { success: false, error: 'Неверный логин или пароль' };
  }
  
  const token = generateToken({
    user_id: user.user_id,
    login: user.login,
    role: user.role_name,
    full_name: user.full_name,
  });
  
  await auditLog(user.user_id, 'LOGIN_SUCCESS', 'auth', null, null, null, ipAddress, userAgent);
  
  return {
    success: true,
    token,
    user: {
      user_id: user.user_id,
      login: user.login,
      full_name: user.full_name,
      role: user.role_name,
    },
  };
}

export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<{ success: boolean; error?: string }> {
  // Получаем текущий хеш пароля
  const result = await query(
    `SELECT password_hash FROM equipment.users WHERE user_id = $1`,
    [userId]
  );
  
  if (result.rows.length === 0) {
    return { success: false, error: 'Пользователь не найден' };
  }
  
  const isValid = await bcrypt.compare(oldPassword, result.rows[0].password_hash);
  
  if (!isValid) {
    await auditLog(userId, 'CHANGE_PASSWORD_FAILED', 'user', userId, null, null, ipAddress, userAgent);
    return { success: false, error: 'Неверный текущий пароль' };
  }
  
  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  
  await query(
    `UPDATE equipment.users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
    [newHash, userId]
  );
  
  await auditLog(userId, 'CHANGE_PASSWORD_SUCCESS', 'user', userId, null, null, ipAddress, userAgent);
  
  return { success: true };
}