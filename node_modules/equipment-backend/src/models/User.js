const { pool } = require('../config/db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

class User {
  static async getAll(filters = {}) {
    let sql = `
      SELECT 
        u.user_id,
        u.login,
        u.full_name,
        u.is_active,
        u.created_at,
        u.updated_at,
        r.role_id,
        r.name AS role_name
      FROM equipment.users u
      JOIN equipment.roles r ON u.role_id = r.role_id
      WHERE 1=1
    `;
    const values = [];
    let idx = 1;
    if (filters.search) {
      sql += ` AND (u.login ILIKE $${idx} OR u.full_name ILIKE $${idx})`;
      values.push(`%${filters.search}%`);
      idx++;
    }
    if (filters.role_id) {
      sql += ` AND u.role_id = $${idx}`;
      values.push(filters.role_id);
      idx++;
    }
    if (filters.is_active !== undefined && filters.is_active !== '') {
      const active = filters.is_active === 'true';
      sql += ` AND u.is_active = $${idx}`;
      values.push(active);
      idx++;
    }
    sql += ` ORDER BY u.created_at DESC`;
    const result = await pool.query(sql, values);
    return result.rows;
  }

  static async getById(id) {
    const result = await pool.query(`
      SELECT 
        u.user_id,
        u.login,
        u.full_name,
        u.is_active,
        u.created_at,
        u.updated_at,
        r.role_id,
        r.name AS role_name
      FROM equipment.users u
      JOIN equipment.roles r ON u.role_id = r.role_id
      WHERE u.user_id = $1
    `, [id]);
    return result.rows[0] || null;
  }

  static async getByLogin(login) {
    const result = await pool.query(`
      SELECT user_id, login, password_hash, full_name, role_id, is_active
      FROM equipment.users WHERE login = $1
    `, [login]);
    return result.rows[0] || null;
  }

  static async create(data, userId) {
    const { login, password, full_name, role_id, is_active } = data;
    // Проверка уникальности логина
    const existing = await this.getByLogin(login);
    if (existing) throw new Error('Пользователь с таким логином уже существует');

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserId = uuidv4();
    await pool.query(`
      INSERT INTO equipment.users (user_id, login, password_hash, full_name, role_id, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [newUserId, login, hashedPassword, full_name, role_id, is_active !== undefined ? is_active : true]);
    return { user_id: newUserId };
  }

  static async update(id, data, userId) {
    const { login, password, full_name, role_id, is_active } = data;
    const user = await this.getById(id);
    if (!user) throw new Error('Пользователь не найден');

    // Проверка уникальности логина (если меняется)
    if (login && login !== user.login) {
      const existing = await this.getByLogin(login);
      if (existing) throw new Error('Пользователь с таким логином уже существует');
    }

    const updates = [];
    const values = [];
    let idx = 1;
    if (login !== undefined) { updates.push(`login = $${idx++}`); values.push(login); }
    if (full_name !== undefined) { updates.push(`full_name = $${idx++}`); values.push(full_name); }
    if (role_id !== undefined) { updates.push(`role_id = $${idx++}`); values.push(role_id); }
    if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); values.push(is_active); }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${idx++}`);
      values.push(hashed);
    }
    if (updates.length === 0) return user;

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    await pool.query(`UPDATE equipment.users SET ${updates.join(', ')} WHERE user_id = $${idx}`, values);
    return this.getById(id);
  }

  static async delete(id) {
    await pool.query(`DELETE FROM equipment.users WHERE user_id = $1`, [id]);
    return { success: true };
  }
}

module.exports = User;
