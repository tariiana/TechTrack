const pool = require('../config/db');

class Subsystem {
  static async getAll() {
    const result = await pool.query(`
      SELECT 
        subsys_id,
        parent_id,
        name,
        location,
        note
      FROM equipment.subsystems
      ORDER BY name
    `);
    return result.rows;
  }

  static async getTree() {
    const all = await this.getAll();
    const map = new Map();
    const roots = [];
    for (const sub of all) {
      map.set(sub.subsys_id, { ...sub, children: [] });
    }
    for (const sub of all) {
      if (sub.parent_id && map.has(sub.parent_id)) {
        map.get(sub.parent_id).children.push(map.get(sub.subsys_id));
      } else {
        roots.push(map.get(sub.subsys_id));
      }
    }
    return roots;
  }

  static async getById(id) {
    const result = await pool.query(`
      SELECT subsys_id, parent_id, name, location, note
      FROM equipment.subsystems
      WHERE subsys_id = $1
    `, [id]);
    return result.rows[0] || null;
  }

  static async create(data, userId) {
    const { name, location, parent_id, note } = data;
    const id = require('uuid').v4();
    await pool.query(`
      INSERT INTO equipment.subsystems_history (subsys_id, parent_id, name, location, note, valid_from, created_by_user)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
    `, [id, parent_id || null, name, location, note || null, userId]);
    return { subsys_id: id };
  }

  static async update(id, data, userId) {
    const { name, location, parent_id, note } = data;
    await pool.query(`UPDATE equipment.subsystems_history SET valid_to = CURRENT_TIMESTAMP WHERE subsys_id = $1 AND valid_to IS NULL`, [id]);
    await pool.query(`
      INSERT INTO equipment.subsystems_history (subsys_id, parent_id, name, location, note, valid_from, created_by_user)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
    `, [id, parent_id || null, name, location, note || null, userId]);
    return { subsys_id: id };
  }

  static async delete(id) {
    await pool.query(`UPDATE equipment.subsystems_history SET valid_to = CURRENT_TIMESTAMP WHERE subsys_id = $1 AND valid_to IS NULL`, [id]);
    return { success: true };
  }
}

module.exports = Subsystem;