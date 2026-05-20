const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Node {
  // Получить список узлов с фильтрацией (без детей, плоский список)
  static async getAll(filters = {}) {
  let sql = `
    SELECT 
      n.node_id,
      n.name,
      n.manufacturer,
      n.model,
      n.serial_number,
      n.inventory_number,
      n.status,
      n.location,
      n.note,
      n.parameters,
      n.installed_in_node,
      n.subsystem_id,
      n.commission_date,
      n.operation_mode,
      (SELECT s.name FROM equipment.subsystems s WHERE s.subsys_id = n.subsystem_id) as subsystem_name,
      (SELECT p.name FROM equipment.nodes p WHERE p.node_id = n.installed_in_node) as parent_name,
      EXISTS(SELECT 1 FROM equipment.nodes WHERE installed_in_node = n.node_id) as is_aggregate,
      EXISTS(SELECT 1 FROM equipment.measuring_instruments WHERE instrument_id::text = n.node_id::text) as is_si
    FROM equipment.nodes n
  `;
    const values = [];
    let idx = 1;
    if (filters.search) {
      sql += ` AND (n.name ILIKE $${idx} OR n.manufacturer ILIKE $${idx} OR n.model ILIKE $${idx})`;
      values.push(`%${filters.search}%`);
      idx++;
    }
    if (filters.status) {
      sql += ` AND n.status = $${idx}`;
      values.push(filters.status);
      idx++;
    }
    if (filters.subsystem_id) {
      sql += ` AND n.subsystem_id = $${idx}`;
      values.push(filters.subsystem_id);
      idx++;
    }
    if (filters.node_type_id) {
      sql += ` AND n.node_type_id = $${idx}`;
      values.push(filters.node_type_id);
      idx++;
    }
    sql += ` ORDER BY n.name`;
    const result = await pool.query(sql, values);
    return result.rows;
  }

  // Получить дерево узлов (иерархия)
  static async getTree() {
    const nodes = await this.getAll();
    const map = new Map();
    const roots = [];
    for (const node of nodes) {
      map.set(node.node_id, { ...node, children: [] });
    }
    for (const node of nodes) {
      if (node.installed_in_node && map.has(node.installed_in_node)) {
        const parent = map.get(node.installed_in_node);
        parent.children.push(map.get(node.node_id));
      } else {
        roots.push(map.get(node.node_id));
      }
    }
    return roots;
  }

  // Получить один узел по ID
  static async getById(id) {
    const result = await pool.query(`
      SELECT 
        n.node_id,
        n.node_type_id,
        n.name,
        n.manufacturer,
        n.model,
        n.serial_number,
        n.inventory_number,
        n.registration_number,
        n.status,
        n.location,
        n.note,
        n.parameters,
        n.installed_in_node,
        n.subsystem_id,
        n.commission_date,
        n.operation_mode,
        n.production_date,
        (SELECT name FROM equipment.subsystems WHERE subsys_id = n.subsystem_id) as subsystem_name,
        (SELECT name FROM equipment.nodes WHERE node_id = n.installed_in_node) as parent_name,
        EXISTS(SELECT 1 FROM equipment.nodes WHERE installed_in_node = n.node_id) as is_aggregate,
        EXISTS(SELECT 1 FROM equipment.measuring_instruments WHERE instrument_id::text = n.node_id::text) as is_si
      FROM equipment.nodes n
      WHERE n.node_id = $1 AND n.valid_to IS NULL
    `, [id]);
    return result.rows[0];
  }

  // Получить дочерние узлы (состав агрегата)
  static async getChildren(id) {
    const result = await pool.query(`
      SELECT 
        n.node_id,
        n.name,
        n.manufacturer,
        n.model,
        n.status,
        n.location,
        n.parameters,
        n.note,
        (SELECT name FROM equipment.node_types WHERE node_type_id = n.node_type_id) as type_name
      FROM equipment.nodes n
      WHERE n.installed_in_node = $1 AND n.valid_to IS NULL
      ORDER BY n.name
    `, [id]);
    return result.rows;
  }

  // Получить историю перемещений узла (из представления)
  static async getMovementHistory(id) {
    const result = await pool.query(`
      SELECT 
        moved_at,
        previous_location,
        new_location,
        (SELECT login FROM equipment.users WHERE user_id = moved_by_user) as user_name
      FROM equipment.node_movement_history_view
      WHERE node_id = $1
      ORDER BY moved_at DESC
    `, [id]);
    return result.rows;
  }

  // Создать узел (вставить первую версию)
static async create(data, userId) {
  const {
    name,
    manufacturer,
    model,
    serial_number,
    inventory_number,
    accounting_number,
    status,
    location,
    note,
    parent_id,
    commission_date,
    operation_mode,
    production_date,    // из фронта
    type_name,
    subsystem_name,
  } = data;

  // Найти node_type_id по имени
  let node_type_id = null;
  if (type_name) {
    const typeRes = await pool.query(`SELECT node_type_id FROM equipment.node_types WHERE name = $1`, [type_name]);
    if (typeRes.rows.length) node_type_id = typeRes.rows[0].node_type_id;
  }

  // Найти subsystem_id по имени
  let subsystem_id = null;
  if (subsystem_name) {
    const subsysRes = await pool.query(`SELECT subsys_id FROM equipment.subsystems WHERE name = $1`, [subsystem_name]);
    if (subsysRes.rows.length) subsystem_id = subsysRes.rows[0].subsys_id;
  }

  const nodeId = uuidv4();
  await pool.query(`
    INSERT INTO equipment.nodes_history (
      node_id, node_type_id, name, manufacturer, model, serial_number,
      inventory_number, registration_number, status, location, parameters,
      note, installed_in_node, subsystem_id, commission_date, operation_mode,
      manufactured_date, valid_from, created_by_user
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP, $18
    )
  `, [
    nodeId, node_type_id, name, manufacturer, model, serial_number || null,
    inventory_number || null, accounting_number || null, status || 'получен',
    location, {}, note || null, parent_id || null, subsystem_id,
    commission_date || null, operation_mode || null, production_date || null,
    userId
  ]);
  return { node_id: nodeId };
}


  // Обновить узел (версионирование)
  static async update(id, data, userId) {
    const old = await this.getById(id);
    if (!old) throw new Error('Узел не найден');
    // закрыть старую версию
    await pool.query(`UPDATE equipment.nodes_history SET valid_to = CURRENT_TIMESTAMP WHERE node_id = $1 AND valid_to IS NULL`, [id]);
    // вставить новую
    fields: ['node_type_id', 'name', 'manufacturer', 'model', 'serial_number',
         'inventory_number', 'registration_number', 'status', 'location',
         'parameters', 'note', 'installed_in_node', 'subsystem_id',
         'commission_date', 'operation_mode', 'manufactured_date']   // ← здесь
    const values = [];
    let idx = 1;
    for (const f of fields) {
      let val = data[f] !== undefined ? data[f] : old[f];
      if (val === undefined || val === null) val = null;
      values.push(val);
      idx++;
    }
    values.push(id, userId);
    await pool.query(`
      INSERT INTO equipment.nodes_history (
        node_id, node_type_id, name, manufacturer, model, serial_number,
        inventory_number, registration_number, status, location, parameters,
        note, installed_in_node, subsystem_id, commission_date, operation_mode,
        production_date, valid_from, created_by_user
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP, $18)
    `, [id, ...values]);
    return { node_id: id };
  }

  // Логическое удаление (списание)
  static async writeOff(id, userId) {
    const node = await this.getById(id);
    if (!node) throw new Error('Узел не найден');
    if (node.is_aggregate) {
      const children = await this.getChildren(id);
      if (children.length) throw new Error('Нельзя списать агрегат, содержащий узлы');
    }
    await this.update(id, { status: 'списан' }, userId);
    return { success: true };
  }

  // Установка узла в другой узел (комплектация)
  static async install(childId, parentId, userId) {
    const child = await this.getById(childId);
    if (!child) throw new Error('Дочерний узел не найден');
    if (child.installed_in_node) throw new Error('Узел уже установлен в другой агрегат');
    const parent = await this.getById(parentId);
    if (!parent) throw new Error('Родительский узел не найден');
    // проверка циклической вложенности
    const cycleCheck = await pool.query(`
      WITH RECURSIVE ancestors AS (
        SELECT node_id, installed_in_node FROM equipment.nodes WHERE node_id = $1
        UNION ALL
        SELECT n.node_id, n.installed_in_node FROM equipment.nodes n
        JOIN ancestors a ON n.node_id = a.installed_in_node
        WHERE n.valid_to IS NULL
      )
      SELECT EXISTS(SELECT 1 FROM ancestors WHERE node_id = $2) as has_cycle
    `, [parentId, childId]);
    if (cycleCheck.rows[0].has_cycle) throw new Error('Циклическая вложенность запрещена');
    // обновляем
    await this.update(childId, { installed_in_node: parentId }, userId);
    return { success: true };
  }

  // Извлечение узла из агрегата
  static async uninstall(childId, userId) {
    const child = await this.getById(childId);
    if (!child) throw new Error('Узел не найден');
    if (!child.installed_in_node) throw new Error('Узел не установлен ни в какой агрегат');
    await this.update(childId, { installed_in_node: null }, userId);
    return { success: true };
  }
}

module.exports = Node;