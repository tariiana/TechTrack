const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const AGGREGATE_RU_PATTERN = '%\u0430\u0433\u0440\u0435\u0433\u0430\u0442%';
const AGGREGATE_EN_PATTERN = '%aggregate%';

function makeHttpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeDate(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}

function normalizeNode(row) {
  if (!row) return row;

  return {
    ...row,
    manufactured_date: normalizeDate(row.manufactured_date),
    commission_date: normalizeDate(row.commission_date),
    decommission_date: normalizeDate(row.decommission_date),
    write_off_date: normalizeDate(row.write_off_date),
    type: row.is_aggregate ? 'aggregate' : 'block',
  };
}

function normalizeNodes(rows) {
  return rows.map(normalizeNode);
}

class Node {
  static aggregateCondition() {
    return `
      (
        LOWER(COALESCE(nt.name, '')) LIKE '${AGGREGATE_RU_PATTERN}'
        OR LOWER(COALESCE(nt.name, '')) LIKE '${AGGREGATE_EN_PATTERN}'
        OR COALESCE(array_length(nt.allowed_child_types, 1), 0) > 0
        OR EXISTS (
          SELECT 1 FROM equipment.nodes child
          WHERE child.installed_in_node = n.node_id
        )
      )
    `;
  }

  static baseSelect() {
    return `
      SELECT
        n.node_id,
        n.node_type_id,
        n.name,
        n.manufacturer,
        n.model,
        n.manufactured_date,
        n.serial_number,
        n.inventory_number,
        n.registration_number,
        n.status,
        n.commission_date,
        n.operation_mode,
        n.decommission_date,
        n.write_off_date,
        n.location,
        n.parameters,
        n.note,
        n.installed_in_node,
        n.subsystem_id,
        nt.name AS node_type_name,
        s.name AS subsystem_name,
        p.name AS parent_name,
        n.installed_in_node AS parent_id,
        ${Node.aggregateCondition()} AS is_aggregate,
        EXISTS (
          SELECT 1 FROM equipment.instruments_history ih
          WHERE ih.node_id = n.node_id AND ih.valid_to IS NULL
        ) AS is_si,
        EXISTS (
          SELECT 1 FROM equipment.resources_history rh
          WHERE rh.node_id = n.node_id AND rh.valid_to IS NULL
        ) AS has_resource
      FROM equipment.nodes n
      LEFT JOIN equipment.node_types nt ON nt.node_type_id = n.node_type_id
      LEFT JOIN equipment.subsystems s ON s.subsys_id = n.subsystem_id
      LEFT JOIN equipment.nodes p ON p.node_id = n.installed_in_node
    `;
  }

  static async getAll(filters = {}) {
    const where = [];
    const values = [];
    let idx = 1;

    if (filters.search) {
      where.push(`(
        n.name ILIKE $${idx}
        OR n.manufacturer ILIKE $${idx}
        OR n.model ILIKE $${idx}
        OR n.serial_number ILIKE $${idx}
        OR n.inventory_number ILIKE $${idx}
        OR n.registration_number ILIKE $${idx}
      )`);
      values.push(`%${filters.search}%`);
      idx++;
    }

    if (filters.status) {
      where.push(`n.status = $${idx}`);
      values.push(filters.status);
      idx++;
    }

    if (filters.subsystem_id) {
      where.push(`n.subsystem_id = $${idx}`);
      values.push(filters.subsystem_id);
      idx++;
    }

    if (filters.node_type_id) {
      where.push(`n.node_type_id = $${idx}`);
      values.push(filters.node_type_id);
      idx++;
    }

    const sql = `
      ${Node.baseSelect()}
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY n.name NULLS LAST, n.model NULLS LAST
    `;

    const result = await pool.query(sql, values);
    return normalizeNodes(result.rows);
  }

  static async getTree() {
    const nodes = await Node.getAll();
    const map = new Map();
    const roots = [];

    for (const node of nodes) {
      map.set(node.node_id, { ...node, children: [] });
    }

    for (const node of nodes) {
      if (node.installed_in_node && map.has(node.installed_in_node)) {
        map.get(node.installed_in_node).children.push(map.get(node.node_id));
      } else {
        roots.push(map.get(node.node_id));
      }
    }

    return roots;
  }

  static async getById(id) {
    const result = await pool.query(`
      ${Node.baseSelect()}
      WHERE n.node_id = $1
    `, [id]);

    return normalizeNode(result.rows[0]);
  }

  static async getChildren(id) {
    const result = await pool.query(`
      ${Node.baseSelect()}
      WHERE n.installed_in_node = $1
      ORDER BY n.name NULLS LAST, n.model NULLS LAST
    `, [id]);

    return normalizeNodes(result.rows);
  }

  static async getMovementHistory(id) {
    const result = await pool.query(`
      SELECT
        moved_at,
        previous_location,
        new_location,
        moved_by_user,
        u.login AS user_name
      FROM equipment.node_movement_history_view mh
      LEFT JOIN equipment.users u ON u.user_id = mh.moved_by_user
      WHERE mh.node_id = $1
      ORDER BY moved_at DESC
    `, [id]);

    return result.rows;
  }

  static async resolveNodeTypeId(data) {
    if (data.node_type_id || data.nodeTypeId) return data.node_type_id || data.nodeTypeId;

    if (data.type_name || data.node_type_name) {
      const type = await pool.query(
        `SELECT node_type_id FROM equipment.node_types WHERE name = $1 LIMIT 1`,
        [data.type_name || data.node_type_name]
      );
      if (type.rows[0]) return type.rows[0].node_type_id;
    }

    const fallback = await pool.query(`
      SELECT node_type_id FROM equipment.node_types ORDER BY name LIMIT 1
    `);
    if (!fallback.rows[0]) throw makeHttpError('Не найден ни один вид узла');
    return fallback.rows[0].node_type_id;
  }

  static async resolveSubsystemId(data) {
    if (data.subsystem_id || data.subsys_id) return data.subsystem_id || data.subsys_id;

    if (data.subsystem_name) {
      const subsystem = await pool.query(
        `SELECT subsys_id FROM equipment.subsystems WHERE name = $1 LIMIT 1`,
        [data.subsystem_name]
      );
      if (subsystem.rows[0]) return subsystem.rows[0].subsys_id;
    }

    const fallback = await pool.query(`
      SELECT subsys_id FROM equipment.subsystems ORDER BY name LIMIT 1
    `);
    if (!fallback.rows[0]) throw makeHttpError('Не найдена ни одна подсистема');
    return fallback.rows[0].subsys_id;
  }

  static async buildHistoryValues(id, data, old = null, userId = null) {
    const merged = { ...(old || {}), ...data };
    const nodeTypeId = await Node.resolveNodeTypeId(merged);
    const subsystemId = await Node.resolveSubsystemId(merged);

    return {
      node_id: id,
      node_type_id: nodeTypeId,
      name: merged.name,
      manufacturer: merged.manufacturer || '',
      model: merged.model || '',
      manufactured_date: merged.manufactured_date || null,
      serial_number: merged.serial_number || null,
      inventory_number: merged.inventory_number || null,
      registration_number: merged.registration_number || merged.accounting_number || null,
      status: merged.status || 'получен',
      commission_date: merged.commission_date || null,
      operation_mode: merged.operation_mode === '' || merged.operation_mode === undefined
        ? null
        : merged.operation_mode,
      decommission_date: merged.decommission_date || null,
      write_off_date: merged.write_off_date || null,
      location: merged.location || '',
      parameters: merged.parameters || {},
      note: merged.note || null,
      installed_in_node: Object.prototype.hasOwnProperty.call(merged, 'installed_in_node')
        ? merged.installed_in_node
        : merged.parent_id || null,
      subsystem_id: subsystemId,
      created_by_user: userId || null,
    };
  }

  static async insertHistory(values) {
    await pool.query(`
      INSERT INTO equipment.nodes_history (
        node_id,
        node_type_id,
        name,
        manufacturer,
        model,
        manufactured_date,
        serial_number,
        inventory_number,
        registration_number,
        status,
        commission_date,
        operation_mode,
        decommission_date,
        write_off_date,
        location,
        parameters,
        note,
        installed_in_node,
        subsystem_id,
        valid_from,
        created_by_user
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19,
        CURRENT_TIMESTAMP, $20
      )
    `, [
      values.node_id,
      values.node_type_id,
      values.name,
      values.manufacturer,
      values.model,
      values.manufactured_date,
      values.serial_number,
      values.inventory_number,
      values.registration_number,
      values.status,
      values.commission_date,
      values.operation_mode,
      values.decommission_date,
      values.write_off_date,
      values.location,
      values.parameters,
      values.note,
      values.installed_in_node,
      values.subsystem_id,
      values.created_by_user,
    ]);
  }

  static async create(data, userId) {
    const id = uuidv4();
    const values = await Node.buildHistoryValues(id, data, null, userId);
    await Node.insertHistory(values);
    return { node_id: id };
  }

  static async update(id, data, userId) {
    const old = await Node.getById(id);
    if (!old) throw makeHttpError('Узел не найден', 404);

    const values = await Node.buildHistoryValues(id, data, old, userId);

    await pool.query(`
      UPDATE equipment.nodes_history
      SET valid_to = CURRENT_TIMESTAMP
      WHERE node_id = $1 AND valid_to IS NULL
    `, [id]);

    await Node.insertHistory(values);
    return { node_id: id };
  }

  static async writeOff(id, userId) {
    const node = await Node.getById(id);
    if (!node) throw makeHttpError('Узел не найден', 404);

    const children = await Node.getChildren(id);
    if (children.length > 0) {
      throw makeHttpError('Нельзя списать агрегат, содержащий узлы');
    }

    await Node.update(id, {
      status: 'списан',
      write_off_date: new Date().toISOString().slice(0, 10),
    }, userId);

    return { success: true };
  }

  static async assertNoCycle(childId, parentId) {
    const result = await pool.query(`
      WITH RECURSIVE ancestors AS (
        SELECT node_id, installed_in_node
        FROM equipment.nodes
        WHERE node_id = $1
        UNION ALL
        SELECT n.node_id, n.installed_in_node
        FROM equipment.nodes n
        JOIN ancestors a ON n.node_id = a.installed_in_node
      )
      SELECT EXISTS (
        SELECT 1 FROM ancestors WHERE node_id = $2
      ) AS has_cycle
    `, [parentId, childId]);

    if (result.rows[0]?.has_cycle) {
      throw makeHttpError('Циклическая вложенность узлов запрещена');
    }
  }

  static async install(childId, parentId, userId) {
    const child = await Node.getById(childId);
    if (!child) throw makeHttpError('Дочерний узел не найден', 404);
    if (child.installed_in_node) throw makeHttpError('Узел уже установлен в другой агрегат');

    const parent = await Node.getById(parentId);
    if (!parent) throw makeHttpError('Родительский узел не найден', 404);

    await Node.assertNoCycle(childId, parentId);
    await Node.update(childId, { installed_in_node: parentId }, userId);

    return { success: true };
  }

  static async uninstall(childId, userId) {
    const child = await Node.getById(childId);
    if (!child) throw makeHttpError('Узел не найден', 404);
    if (!child.installed_in_node) throw makeHttpError('Узел не установлен ни в какой агрегат');

    await Node.update(childId, { installed_in_node: null }, userId);
    return { success: true };
  }
}

module.exports = Node;
