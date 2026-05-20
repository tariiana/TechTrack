const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class NodeType {
  static async getAll() {
    const result = await pool.query(`
      SELECT node_type_id, name, parameters, allowed_child_types, note,
        (SELECT COUNT(*) FROM equipment.node_types WHERE parent_node_type_id = nt.node_type_id) as child_count
      FROM equipment.node_types nt
      ORDER BY name
    `);
    return result.rows;
  }

  static async getById(id) {
    const result = await pool.query(`
      SELECT node_type_id, name, parameters, allowed_child_types, note, parent_node_type_id
      FROM equipment.node_types WHERE node_type_id = $1
    `, [id]);
    return result.rows[0];
  }

  static async create(data, userId) {
    const { name, parameters, allowed_child_types, note, parent_node_type_id } = data;
    const id = uuidv4();
    await pool.query(`
      INSERT INTO equipment.node_types_history (node_type_id, parent_node_type_id, name, parameters, allowed_child_types, note, valid_from, created_by_user)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
    `, [id, parent_node_type_id || null, name, parameters || {}, allowed_child_types || null, note || null, userId]);
    return { node_type_id: id };
  }

  static async update(id, data, userId) {
    const old = await this.getById(id);
    if (!old) throw new Error('Вид узла не найден');
    await pool.query(`UPDATE equipment.node_types_history SET valid_to = CURRENT_TIMESTAMP WHERE node_type_id = $1 AND valid_to IS NULL`, [id]);
    const { name, parameters, allowed_child_types, note, parent_node_type_id } = data;
    await pool.query(`
      INSERT INTO equipment.node_types_history (node_type_id, parent_node_type_id, name, parameters, allowed_child_types, note, valid_from, created_by_user)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
    `, [id, parent_node_type_id !== undefined ? parent_node_type_id : old.parent_node_type_id, name || old.name, parameters || old.parameters, allowed_child_types !== undefined ? allowed_child_types : old.allowed_child_types, note !== undefined ? note : old.note, userId]);
    return { node_type_id: id };
  }

  static async delete(id) {
    // проверяем, используются ли типы в узлах
    const nodes = await pool.query(`SELECT COUNT(*) FROM equipment.nodes WHERE node_type_id = $1`, [id]);
    if (parseInt(nodes.rows[0].count) > 0) throw new Error('Нельзя удалить вид узла, так как он используется в оборудовании');
    await pool.query(`UPDATE equipment.node_types_history SET valid_to = CURRENT_TIMESTAMP WHERE node_type_id = $1 AND valid_to IS NULL`, [id]);
    return { success: true };
  }
}

module.exports = NodeType;