const { pool } = require('../config/db');
const { v4: uuidv4, validate: isUuid } = require('uuid');

const TEXT_FILTERS = new Map([
  ['name', 'n.name'],
  ['manufacturer', 'n.manufacturer'],
  ['model', 'n.model'],
  ['serial_number', 'n.serial_number'],
  ['inventory_number', 'n.inventory_number'],
  ['registration_number', 'n.registration_number'],
  ['location', 'n.location'],
  ['node_type_name', 'nt.name'],
  ['subsystem_name', 's.name'],
]);

const EXACT_FILTERS = new Map([
  ['status', 'n.status'],
  ['subsystem_id', 'n.subsystem_id'],
  ['node_type_id', 'n.node_type_id'],
  ['installed_in_node', 'n.installed_in_node'],
]);

const SORT_COLUMNS = new Map([
  ['name', 'n.name'],
  ['manufacturer', 'n.manufacturer'],
  ['model', 'n.model'],
  ['status', 'n.status'],
  ['location', 'n.location'],
  ['node_type_name', 'nt.name'],
  ['subsystem_name', 's.name'],
  ['manufactured_date', 'n.manufactured_date'],
  ['commission_date', 'n.commission_date'],
  ['created_at', 'n.node_id'],
]);

function normalizeDate(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}

function normalizeBool(value) {
  if (value === true || value === false) return value;
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'да'].includes(text)) return true;
  if (['false', '0', 'no', 'нет'].includes(text)) return false;
  return null;
}

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

function withMainParameter(parameters, data) {
  const next = { ...normalizeObject(parameters) };
  const mainParameter = data.main_parameter ?? data.mainParameter ?? data.primary_parameter ?? data.primaryParameter;
  if (mainParameter !== undefined) {
    next.main_parameter = mainParameter;
  }
  return next;
}

function normalizeNode(row) {
  if (!row) return row;
  const parameters = normalizeObject(row.parameters);
  const isDeleted = Boolean(row.write_off_date) || row.status === 'списан' || row.status === 'СЃРїРёСЃР°РЅ';

  return {
    ...row,
    manufactured_date: normalizeDate(row.manufactured_date),
    commission_date: normalizeDate(row.commission_date),
    decommission_date: normalizeDate(row.decommission_date),
    write_off_date: normalizeDate(row.write_off_date),
    parameters,
    main_parameter: pickMainParameter(parameters),
    type: row.is_aggregate ? 'aggregate' : 'block',
    is_deleted: isDeleted,
  };
}

function normalizeNodes(rows) {
  return rows.map(normalizeNode);
}

function parsePagination(filters) {
  const hasPagination = filters.limit !== undefined
    || filters.offset !== undefined
    || filters.page !== undefined
    || filters.pageSize !== undefined
    || filters.page_size !== undefined;

  if (!hasPagination) return null;

  const pageSize = Math.min(
    Math.max(parseInt(filters.pageSize || filters.page_size || filters.limit || '50', 10) || 50, 1),
    500
  );
  const page = Math.max(parseInt(filters.page || '1', 10) || 1, 1);
  const offset = filters.offset !== undefined
    ? Math.max(parseInt(filters.offset, 10) || 0, 0)
    : (page - 1) * pageSize;

  return { limit: pageSize, offset, page };
}

function buildSort(sort) {
  if (!sort) return 'n.name NULLS LAST, n.model NULLS LAST';

  const clauses = [];
  for (const rawPart of String(sort).split(',')) {
    const part = rawPart.trim();
    if (!part) continue;

    const direction = part.startsWith('-') ? 'DESC' : 'ASC';
    const key = part.replace(/^-/, '');
    const column = SORT_COLUMNS.get(key);
    if (!column) continue;
    clauses.push(`${column} ${direction} NULLS LAST`);
  }

  return clauses.length ? clauses.join(', ') : 'n.name NULLS LAST, n.model NULLS LAST';
}

class Node {
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
        nt.allowed_child_types,
        s.name AS subsystem_name,
        p.name AS parent_name,
        EXISTS (
          SELECT 1 FROM equipment.nodes child
          WHERE child.installed_in_node = n.node_id
        ) AS is_aggregate,
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

  static applyFilters(filters = {}, values = []) {
    const where = [];
    let idx = values.length + 1;

    if (filters.search) {
      where.push(`(
        n.name ILIKE $${idx}
        OR n.manufacturer ILIKE $${idx}
        OR n.model ILIKE $${idx}
        OR n.serial_number ILIKE $${idx}
        OR n.inventory_number ILIKE $${idx}
        OR n.registration_number ILIKE $${idx}
        OR n.location ILIKE $${idx}
        OR nt.name ILIKE $${idx}
      )`);
      values.push(`%${filters.search}%`);
      idx++;
    }

    for (const [key, column] of EXACT_FILTERS.entries()) {
      if (filters[key] !== undefined && filters[key] !== '') {
        where.push(`${column} = $${idx}`);
        values.push(filters[key]);
        idx++;
      }
    }

    for (const [key, column] of TEXT_FILTERS.entries()) {
      if (key === 'name' && filters.search) continue;
      if (filters[key] !== undefined && filters[key] !== '') {
        where.push(`${column} ILIKE $${idx}`);
        values.push(`%${filters[key]}%`);
        idx++;
      }
    }

    const isAggregate = normalizeBool(filters.is_aggregate ?? (filters.type === 'aggregate' ? true : filters.type === 'block' ? false : null));
    if (isAggregate !== null) where.push(`EXISTS (SELECT 1 FROM equipment.nodes child WHERE child.installed_in_node = n.node_id) = ${isAggregate}`);

    const isSi = normalizeBool(filters.is_si);
    if (isSi !== null) where.push(`EXISTS (SELECT 1 FROM equipment.instruments_history ih WHERE ih.node_id = n.node_id AND ih.valid_to IS NULL) = ${isSi}`);

    const hasResource = normalizeBool(filters.has_resource);
    if (hasResource !== null) where.push(`EXISTS (SELECT 1 FROM equipment.resources_history rh WHERE rh.node_id = n.node_id AND rh.valid_to IS NULL) = ${hasResource}`);

    const installed = normalizeBool(filters.installed);
    if (installed !== null) where.push(installed ? 'n.installed_in_node IS NOT NULL' : 'n.installed_in_node IS NULL');

    const isDeleted = normalizeBool(filters.is_deleted);
    if (isDeleted !== null) {
      where.push(isDeleted ? 'n.write_off_date IS NOT NULL' : 'n.write_off_date IS NULL');
    }

    return { where, values };
  }

  static async getAll(filters = {}) {
    const values = [];
    const { where } = Node.applyFilters(filters, values);
    const pagination = parsePagination(filters);
    const orderBy = buildSort(filters.sort);

    const baseSql = `
      ${Node.baseSelect()}
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    `;

    const pagedValues = [...values];
    let limitSql = '';
    if (pagination) {
      pagedValues.push(pagination.limit, pagination.offset);
      limitSql = `LIMIT $${pagedValues.length - 1} OFFSET $${pagedValues.length}`;
    }

    const result = await pool.query(`
      ${baseSql}
      ORDER BY ${orderBy}
      ${limitSql}
    `, pagedValues);

    const items = normalizeNodes(result.rows);
    if (!pagination) return items;

    const countResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM (${baseSql}) filtered_nodes
    `, values);

    return {
      items,
      total: countResult.rows[0]?.total || 0,
      limit: pagination.limit,
      offset: pagination.offset,
      page: pagination.page,
    };
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

  static async getById(id, client = pool) {
    const result = await client.query(`
      ${Node.baseSelect()}
      WHERE n.node_id = $1
    `, [id]);

    return normalizeNode(result.rows[0]);
  }

  static async getActiveHistoryForUpdate(id, client) {
    const result = await client.query(`
      SELECT *
      FROM equipment.nodes_history
      WHERE node_id = $1 AND valid_to IS NULL
      FOR UPDATE
    `, [id]);

    return result.rows[0] || null;
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

  static async getCompositionHistory(id) {
    const result = await pool.query(`
      WITH versions AS (
        SELECT
          node_id,
          installed_in_node,
          valid_from,
          created_by_user,
          LAG(installed_in_node) OVER (PARTITION BY node_id ORDER BY valid_from) AS previous_parent
        FROM equipment.nodes_history
      )
      SELECT
        v.node_id AS child_id,
        current_child.name AS child_name,
        v.previous_parent,
        prev_parent.name AS previous_parent_name,
        v.installed_in_node AS new_parent,
        new_parent.name AS new_parent_name,
        v.valid_from AS changed_at,
        v.created_by_user,
        u.login AS user_name,
        CASE
          WHEN v.node_id = $1 THEN 'node_parent_changed'
          WHEN v.installed_in_node = $1 AND v.previous_parent IS DISTINCT FROM v.installed_in_node THEN 'installed'
          WHEN v.previous_parent = $1 AND v.installed_in_node IS DISTINCT FROM v.previous_parent THEN 'uninstalled'
          ELSE 'changed'
        END AS action
      FROM versions v
      LEFT JOIN equipment.nodes current_child ON current_child.node_id = v.node_id
      LEFT JOIN equipment.nodes prev_parent ON prev_parent.node_id = v.previous_parent
      LEFT JOIN equipment.nodes new_parent ON new_parent.node_id = v.installed_in_node
      LEFT JOIN equipment.users u ON u.user_id = v.created_by_user
      WHERE (
        v.node_id = $1
        OR v.previous_parent = $1
        OR v.installed_in_node = $1
      )
        AND v.previous_parent IS DISTINCT FROM v.installed_in_node
      ORDER BY v.valid_from DESC
    `, [id]);

    return result.rows;
  }

  static async resolveNodeTypeId(data, client = pool) {
    if (data.node_type_id || data.nodeTypeId) return data.node_type_id || data.nodeTypeId;

    if (data.type_name || data.node_type_name) {
      const type = await client.query(
        `SELECT node_type_id FROM equipment.node_types WHERE name = $1 LIMIT 1`,
        [data.type_name || data.node_type_name]
      );
      if (type.rows[0]) return type.rows[0].node_type_id;
    }

    const fallback = await client.query(`
      SELECT node_type_id FROM equipment.node_types ORDER BY name LIMIT 1
    `);
    if (!fallback.rows[0]) throw new Error('Не найден ни один вид узла');
    return fallback.rows[0].node_type_id;
  }

  static async resolveSubsystemId(data, client = pool) {
    if (data.subsystem_id || data.subsys_id) return data.subsystem_id || data.subsys_id;

    if (data.subsystem_name) {
      const subsystem = await client.query(
        `SELECT subsys_id FROM equipment.subsystems WHERE name = $1 LIMIT 1`,
        [data.subsystem_name]
      );
      if (subsystem.rows[0]) return subsystem.rows[0].subsys_id;
    }

    const fallback = await client.query(`
      SELECT subsys_id FROM equipment.subsystems ORDER BY name LIMIT 1
    `);
    if (!fallback.rows[0]) throw new Error('Не найдена ни одна подсистема');
    return fallback.rows[0].subsys_id;
  }

  static async getNodeTypeTemplate(nodeTypeId, client = pool) {
    const result = await client.query(`
      SELECT parameters, allowed_child_types
      FROM equipment.node_types
      WHERE node_type_id = $1
    `, [nodeTypeId]);

    return result.rows[0] || { parameters: {}, allowed_child_types: null };
  }

  static async buildHistoryValues(id, data, old = null, userId = null, client = pool) {
    const merged = { ...(old || {}), ...data };
    const nodeTypeId = await Node.resolveNodeTypeId(merged, client);
    const subsystemId = await Node.resolveSubsystemId(merged, client);
    const template = await Node.getNodeTypeTemplate(nodeTypeId, client);
    const parameters = withMainParameter({
      ...normalizeObject(template.parameters),
      ...normalizeObject(old?.parameters),
      ...normalizeObject(data.parameters),
    }, data);

    return {
      node_id: id,
      node_type_id: nodeTypeId,
      name: merged.name,
      manufacturer: merged.manufacturer || '',
      model: merged.model || '',
      manufactured_date: normalizeDate(merged.manufactured_date),
      serial_number: merged.serial_number || null,
      inventory_number: merged.inventory_number || null,
      registration_number: merged.registration_number || merged.accounting_number || null,
      status: merged.status || 'получен',
      commission_date: normalizeDate(merged.commission_date),
      operation_mode: merged.operation_mode || null,
      decommission_date: normalizeDate(merged.decommission_date),
      write_off_date: normalizeDate(merged.write_off_date),
      location: merged.location || '',
      parameters,
      note: merged.note || null,
      installed_in_node: Object.prototype.hasOwnProperty.call(merged, 'installed_in_node')
        ? merged.installed_in_node
        : merged.parent_id || null,
      subsystem_id: subsystemId,
      created_by_user: userId || null,
    };
  }

  static async insertHistory(values, client = pool) {
    await client.query(`
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
    const client = await pool.connect();
    const id = uuidv4();

    try {
      await client.query('BEGIN');
      const values = await Node.buildHistoryValues(id, data, null, userId, client);
      await Node.insertHistory(values, client);
      await client.query('COMMIT');
      return { node_id: id };
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
      const active = await Node.getActiveHistoryForUpdate(id, client);
      if (!active) throw new Error('Узел не найден');

      const old = await Node.getById(id, client);
      const values = await Node.buildHistoryValues(id, data, old, userId, client);

      await client.query(`
        UPDATE equipment.nodes_history
        SET valid_to = CURRENT_TIMESTAMP
        WHERE node_id = $1 AND valid_to IS NULL
      `, [id]);

      await Node.insertHistory(values, client);
      await client.query('COMMIT');
      return { node_id: id };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async writeOff(id, userId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const active = await Node.getActiveHistoryForUpdate(id, client);
      if (!active) throw new Error('Узел не найден');

      const children = await client.query(`
        SELECT 1 FROM equipment.nodes WHERE installed_in_node = $1 LIMIT 1
      `, [id]);
      if (children.rows.length > 0) {
        throw new Error('Нельзя списать агрегат, содержащий узлы');
      }

      const old = await Node.getById(id, client);
      const values = await Node.buildHistoryValues(id, {
        status: 'списан',
        write_off_date: new Date().toISOString().slice(0, 10),
      }, old, userId, client);

      await client.query(`
        UPDATE equipment.nodes_history
        SET valid_to = CURRENT_TIMESTAMP
        WHERE node_id = $1 AND valid_to IS NULL
      `, [id]);
      await Node.insertHistory(values, client);
      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async assertNoCycle(childId, parentId, client = pool) {
    const result = await client.query(`
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
      throw new Error('Циклическая вложенность узлов запрещена');
    }
  }

  static async assertAllowedChildType(parent, child, client = pool) {
    const template = await Node.getNodeTypeTemplate(parent.node_type_id, client);
    const allowed = Array.isArray(template.allowed_child_types) ? template.allowed_child_types : [];
    if (allowed.length === 0) return;

    if (!allowed.map(String).includes(String(child.node_type_id))) {
      throw new Error('Вид выбранного узла не разрешён для установки в этот агрегат');
    }
  }

  static async install(childId, parentId, userId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const parentActive = await Node.getActiveHistoryForUpdate(parentId, client);
      const childActive = await Node.getActiveHistoryForUpdate(childId, client);
      if (!childActive) throw new Error('Дочерний узел не найден');
      if (!parentActive) throw new Error('Родительский узел не найден');
      if (childActive.installed_in_node) throw new Error('Узел уже установлен в другой агрегат');

      const child = await Node.getById(childId, client);
      const parent = await Node.getById(parentId, client);
      await Node.assertNoCycle(childId, parentId, client);
      await Node.assertAllowedChildType(parent, child, client);

      const values = await Node.buildHistoryValues(childId, { installed_in_node: parentId }, child, userId, client);
      await client.query(`
        UPDATE equipment.nodes_history
        SET valid_to = CURRENT_TIMESTAMP
        WHERE node_id = $1 AND valid_to IS NULL
      `, [childId]);
      await Node.insertHistory(values, client);
      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async uninstall(childId, userId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const active = await Node.getActiveHistoryForUpdate(childId, client);
      if (!active) throw new Error('Узел не найден');
      if (!active.installed_in_node) throw new Error('Узел не установлен ни в какой агрегат');

      const child = await Node.getById(childId, client);
      const values = await Node.buildHistoryValues(childId, { installed_in_node: null }, child, userId, client);
      await client.query(`
        UPDATE equipment.nodes_history
        SET valid_to = CURRENT_TIMESTAMP
        WHERE node_id = $1 AND valid_to IS NULL
      `, [childId]);
      await Node.insertHistory(values, client);
      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async getInstallableChildren(parentId, filters = {}) {
    if (!isUuid(parentId)) throw new Error('Некорректный ID агрегата');
    const parent = await Node.getById(parentId);
    if (!parent) throw new Error('Родительский узел не найден');

    const template = await Node.getNodeTypeTemplate(parent.node_type_id);
    const allowed = Array.isArray(template.allowed_child_types) ? template.allowed_child_types : [];
    const values = [parentId];
    const where = [
      'n.node_id <> $1',
      'n.installed_in_node IS NULL',
      'n.write_off_date IS NULL',
      `NOT EXISTS (
        WITH RECURSIVE descendants AS (
          SELECT node_id FROM equipment.nodes WHERE installed_in_node = n.node_id
          UNION ALL
          SELECT child.node_id
          FROM equipment.nodes child
          JOIN descendants d ON child.installed_in_node = d.node_id
        )
        SELECT 1 FROM descendants WHERE node_id = $1
      )`,
    ];
    let idx = 2;

    if (allowed.length > 0) {
      where.push(`n.node_type_id = ANY($${idx}::uuid[])`);
      values.push(allowed);
      idx++;
    }

    if (filters.search) {
      where.push(`(
        n.name ILIKE $${idx}
        OR n.manufacturer ILIKE $${idx}
        OR n.model ILIKE $${idx}
        OR n.serial_number ILIKE $${idx}
        OR n.inventory_number ILIKE $${idx}
      )`);
      values.push(`%${filters.search}%`);
      idx++;
    }

    const result = await pool.query(`
      ${Node.baseSelect()}
      WHERE ${where.join(' AND ')}
      ORDER BY n.name NULLS LAST, n.model NULLS LAST
    `, values);

    return normalizeNodes(result.rows);
  }
}

module.exports = Node;
