import { query } from '../config/db.js';
import bcrypt from 'bcrypt';
import { auditLog } from '../middleware/audit.js';

// TypeScript-сервис пользователей: используется сервисным слоем и дополнительно
// пишет старые/новые значения в audit_log.
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');

export async function getAllUsers() {
  const result = await query(
    `SELECT u.user_id, u.login, u.full_name, u.is_active, u.created_at, u.updated_at,
            r.role_id, r.name as role_name
     FROM equipment.users u
     JOIN equipment.roles r ON u.role_id = r.role_id
     WHERE u.is_active = true
     ORDER BY u.created_at`
  );
  return result.rows;
}

export async function getUserById(userId: string) {
  const result = await query(
    `SELECT u.user_id, u.login, u.full_name, u.is_active, u.created_at, u.updated_at,
            r.role_id, r.name as role_name
     FROM equipment.users u
     JOIN equipment.roles r ON u.role_id = r.role_id
     WHERE u.user_id = $1 AND u.is_active = true`,
    [userId]
  );
  return result.rows[0] || null;
}

export async function createUser(
  login: string,
  password: string,
  fullName: string,
  roleId: string,
  creatorId: string | null,
  ipAddress: string | null,
  userAgent: string | null
) {
  // Проверяем уникальность логина до вставки, чтобы контроллер мог вернуть
  // понятную доменную ошибку.
  // Проверяем, существует ли пользователь с таким логином
  const existing = await query(`SELECT user_id FROM equipment.users WHERE login = $1`, [login]);
  if (existing.rows.length > 0) {
    throw new Error('Пользователь с таким логином уже существует');
  }
  
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  
  const result = await query(
    `INSERT INTO equipment.users (user_id, login, password_hash, role_id, full_name, is_active)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, true)
     RETURNING user_id, login, full_name`,
    [login, passwordHash, roleId, fullName]
  );
  
  const newUser = result.rows[0];
  
  await auditLog(creatorId, 'CREATE_USER', 'user', newUser.user_id, null, newUser, ipAddress, userAgent);
  
  return newUser;
}

export async function updateUser(
  userId: string,
  data: { login?: string; full_name?: string; role_id?: string; is_active?: boolean },
  updaterId: string | null,
  ipAddress: string | null,
  userAgent: string | null
) {
  // oldData нужен для аудита и для возврата без изменений, если тело пустое.
  // Получаем старые данные для аудита
  const oldData = await getUserById(userId);
  
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (data.login !== undefined) {
    updates.push(`login = $${paramIndex++}`);
    values.push(data.login);
  }
  if (data.full_name !== undefined) {
    updates.push(`full_name = $${paramIndex++}`);
    values.push(data.full_name);
  }
  if (data.role_id !== undefined) {
    updates.push(`role_id = $${paramIndex++}`);
    values.push(data.role_id);
  }
  if (data.is_active !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(data.is_active);
  }
  
  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  
  if (updates.length === 0) {
    return oldData;
  }
  
  values.push(userId);
  
  await query(
    `UPDATE equipment.users SET ${updates.join(', ')} WHERE user_id = $${paramIndex}`,
    values
  );
  
  const newData = await getUserById(userId);
  
  await auditLog(updaterId, 'UPDATE_USER', 'user', userId, oldData, newData, ipAddress, userAgent);
  
  return newData;
}

export async function deleteUser(userId: string, deleterId: string | null, ipAddress: string | null, userAgent: string | null) {
  const oldData = await getUserById(userId);
  
  if (!oldData) {
    throw new Error('Пользователь не найден');
  }
  
  await query(
    `UPDATE equipment.users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
    [userId]
  );
  
  await auditLog(deleterId, 'DELETE_USER', 'user', userId, oldData, null, ipAddress, userAgent);
  
  return oldData;
}

export async function getRoles() {
  const result = await query(`SELECT role_id, name, description FROM equipment.roles ORDER BY name`);
  return result.rows;
}
