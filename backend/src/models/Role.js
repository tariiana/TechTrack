const { pool } = require('../config/db');

// Роли читаются из БД и используются UI для формы пользователя. Проверка прав
// сейчас находится в middleware/rbac.js.
class Role {
  static async getAll() {
    const result = await pool.query(`
      SELECT role_id, name, description
      FROM equipment.roles
      ORDER BY name
    `);
    return result.rows;
  }

  static async getById(id) {
    const result = await pool.query(`SELECT role_id, name, description FROM equipment.roles WHERE role_id = $1`, [id]);
    return result.rows[0] || null;
  }
}

module.exports = Role;
