const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function pickMainParameter(parameters = {}) {
  return parameters.main_parameter
    ?? parameters.mainParameter
    ?? parameters.primary_parameter
    ?? parameters.primaryParameter
    ?? parameters['Основной параметр']
    ?? null;
}

function buildParameters(data, fallback = {}) {
  const parameters = {
    ...normalizeObject(fallback),
    ...normalizeObject(data.parameters),
  };

  const mainParameter = data.main_parameter ?? data.mainParameter ?? data.primary_parameter ?? data.primaryParameter;
  if (mainParameter !== undefined) {
    parameters.main_parameter = mainParameter;
  }

  return parameters;
}

function normalizeNodeType(row) {
  if (!row) return row;
  const parameters = normalizeObject(row.parameters);
  return {
    ...row,
    parameters,
    main_parameter: pickMainParameter(parameters),
  };
}

class NodeType {
  static async getAll() {
    const result = await pool.query(`
      SELECT node_type_id, parent_node_type_id, name, parameters, allowed_child_types, note,
        (SELECT COUNT(*) FROM equipment.node_types WHERE parent_node_type_id = nt.node_type_id) as child_count
      FROM equipment.node_types nt
      ORDER BY name
    `);
    return result.rows.map(normalizeNodeType);
  }

  static async getById(id, client = pool) {
    const result = await client.query(`
      SELECT node_type_id, name, parameters, allowed_child_types, note, parent_node_type_id
      FROM equipment.node_types WHERE node_type_id = $1
    `, [id]);
    return normalizeNodeType(result.rows[0]);
  }

  static async getTemplate(id) {
    const nodeType = await this.getById(id);
    if (!nodeType) return null;

    return {
      node_type_id: nodeType.node_type_id,
      name: nodeType.name,
      parameters: nodeType.parameters,
      main_parameter: nodeType.main_parameter,
      allowed_child_types: nodeType.allowed_child_types,
      defaults: {
        node_type_id: nodeType.node_type_id,
        status: 'получен',
        parameters: nodeType.parameters,
        main_parameter: nodeType.main_parameter,
      },
    };
  }

  static async create(data, userId) {
    const id = uuidv4();
    const parameters = buildParameters(data);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(`
        INSERT INTO equipment.node_types_history (
          node_type_id,
          parent_node_type_id,
          name,
          parameters,
          allowed_child_types,
          note,
          valid_from,
          created_by_user
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
      `, [
        id,
        data.parent_node_type_id || null,
        data.name,
        parameters,
        data.allowed_child_types || null,
        data.note || null,
        userId || null,
      ]);
      await client.query('COMMIT');
      return { node_type_id: id };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async update(id, data, userId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const old = await this.getById(id, client);
      if (!old) throw new Error('Вид узла не найден');

      await client.query(`
        UPDATE equipment.node_types_history
        SET valid_to = CURRENT_TIMESTAMP
        WHERE node_type_id = $1 AND valid_to IS NULL
      `, [id]);

      await client.query(`
        INSERT INTO equipment.node_types_history (
          node_type_id,
          parent_node_type_id,
          name,
          parameters,
          allowed_child_types,
          note,
          valid_from,
          created_by_user
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
      `, [
        id,
        data.parent_node_type_id !== undefined ? data.parent_node_type_id : old.parent_node_type_id,
        data.name || old.name,
        buildParameters(data, old.parameters),
        data.allowed_child_types !== undefined ? data.allowed_child_types : old.allowed_child_types,
        data.note !== undefined ? data.note : old.note,
        userId || null,
      ]);

      await client.query('COMMIT');
      return { node_type_id: id };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async delete(id) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const nodes = await client.query(`SELECT COUNT(*) FROM equipment.nodes WHERE node_type_id = $1`, [id]);
      if (parseInt(nodes.rows[0].count, 10) > 0) {
        throw new Error('Нельзя удалить вид узла, так как он используется в оборудовании');
      }

      await client.query(`
        UPDATE equipment.node_types_history
        SET valid_to = CURRENT_TIMESTAMP
        WHERE node_type_id = $1 AND valid_to IS NULL
      `, [id]);
      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = NodeType;
