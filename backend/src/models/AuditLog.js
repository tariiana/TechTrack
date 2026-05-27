const { pool } = require('../config/db');

// Читает журнал аудита с фильтрами и ограничением размера страницы, чтобы
// админский экран не выгружал всю историю разом.
class AuditLog {
  static async getAll(filters = {}) {
    const where = [];
    const values = [];
    let idx = 1;

    if (filters.user_id) {
      where.push(`l.user_id = $${idx++}`);
      values.push(filters.user_id);
    }

    if (filters.entity_type) {
      where.push(`l.entity_type = $${idx++}`);
      values.push(filters.entity_type);
    }

    if (filters.entity_id) {
      where.push(`l.entity_id = $${idx++}`);
      values.push(filters.entity_id);
    }

    if (filters.action) {
      where.push(`l.action ILIKE $${idx++}`);
      values.push(`%${filters.action}%`);
    }

    if (filters.start_date) {
      where.push(`l.performed_at >= $${idx++}`);
      values.push(filters.start_date);
    }

    if (filters.end_date) {
      where.push(`l.performed_at <= $${idx++}`);
      values.push(filters.end_date);
    }

    // Жесткий потолок 500 защищает БД и UI от слишком тяжелых запросов.
    const limit = Number(filters.limit) > 0 ? Math.min(Number(filters.limit), 500) : 100;
    const offset = Number(filters.offset) > 0 ? Number(filters.offset) : 0;

    values.push(limit, offset);

    const result = await pool.query(`
      SELECT
        l.log_id,
        l.user_id,
        u.login,
        u.full_name,
        l.action,
        l.entity_type,
        l.entity_id,
        l.ip_address,
        l.user_agent,
        l.performed_at
      FROM equipment.audit_log l
      LEFT JOIN equipment.users u ON u.user_id = l.user_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY l.performed_at DESC
      LIMIT $${idx++}
      OFFSET $${idx}
    `, values);

    return result.rows;
  }

  static async getByEntity(entityType, entityId, limit = 100) {
    const result = await pool.query(`
      SELECT
        l.log_id,
        l.user_id,
        u.login,
        u.full_name,
        l.action,
        l.entity_type,
        l.entity_id,
        l.ip_address,
        l.user_agent,
        l.performed_at
      FROM equipment.audit_log l
      LEFT JOIN equipment.users u ON u.user_id = l.user_id
      WHERE l.entity_type = $1 AND l.entity_id = $2
      ORDER BY l.performed_at DESC
      LIMIT $3
    `, [entityType, entityId, Math.min(Number(limit) || 100, 500)]);

    return result.rows;
  }
}

module.exports = AuditLog;
