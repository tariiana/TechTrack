const { pool } = require('../config/db');
const { v4: uuidv4, validate: isUuid } = require('uuid');

const AGGREGATE_RU_PATTERN = '%\u0430\u0433\u0440\u0435\u0433\u0430\u0442%';
const AGGREGATE_EN_PATTERN = '%aggregate%';

// Подсистема - иерархический каталог. Содержимое подсистемы хранится в разных
// таблицах, но большинство сущностей можно перемещать через связанный node_id.
const CONTENT_TYPES = new Set(['equipment', 'instrument', 'resource', 'maintenance', 'plan']);
const MOVABLE_TYPES = new Set(['equipment', 'instrument', 'resource', 'maintenance']);

function aggregateCondition() {
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

function makeHttpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function assertUuid(value, message) {
  if (!isUuid(value)) throw makeHttpError(message);
}

function normalizeSubsystem(row) {
  if (!row) return null;

  return {
    subsys_id: row.subsys_id,
    parent_id: row.parent_id,
    name: row.name,
    location: row.location,
    note: row.note || '',
  };
}

function normalizeSubsystemData(data) {
  const name = cleanText(data.name);
  const location = cleanText(data.location);
  const parentId = data.parent_id || null;
  const note = cleanText(data.note) || null;

  if (!name) throw makeHttpError('Введите наименование подсистемы');
  if (!location) throw makeHttpError('Введите расположение подсистемы');
  if (parentId && !isUuid(parentId)) {
    throw makeHttpError('Некорректный ID родительской подсистемы');
  }

  return { name, location, parent_id: parentId, note };
}

function normalizeContentType(type) {
  const normalized = cleanText(type).toLowerCase();
  if (!CONTENT_TYPES.has(normalized)) {
    throw makeHttpError('Некорректный тип содержимого');
  }

  return normalized;
}

function normalizeSearchText(value) {
  return cleanText(value).slice(0, 120);
}

function contentSearchPattern(search) {
  // Экранируем wildcard-символы ILIKE, чтобы пользовательский текст не менял
  // смысл поиска.
  return `%${search.replace(/[%_]/g, '\\$&')}%`;
}

class Subsystem {
  static async getAll(client = pool) {
    const result = await client.query(`
      SELECT subsys_id, parent_id, name, location, note
      FROM equipment.subsystems
      ORDER BY name NULLS LAST
    `);

    return result.rows.map(normalizeSubsystem);
  }

  static async getTree() {
    const all = await this.getAll();
    const map = new Map();
    const roots = [];

    // Дерево собирается в памяти: таблица уже отдает текущие версии подсистем,
    // а фронтенду нужен вложенный children.
    for (const subsystem of all) {
      map.set(subsystem.subsys_id, { ...subsystem, children: [] });
    }

    for (const subsystem of all) {
      const treeNode = map.get(subsystem.subsys_id);
      if (subsystem.parent_id && map.has(subsystem.parent_id)) {
        map.get(subsystem.parent_id).children.push(treeNode);
      } else {
        roots.push(treeNode);
      }
    }

    const sortTree = (items) => {
      items.sort((left, right) => left.name.localeCompare(right.name, 'ru'));
      for (const item of items) sortTree(item.children);
      return items;
    };

    return sortTree(roots);
  }

  static async getById(id, client = pool) {
    assertUuid(id, 'Некорректный ID подсистемы');

    const result = await client.query(
      `
        SELECT subsys_id, parent_id, name, location, note
        FROM equipment.subsystems
        WHERE subsys_id = $1
      `,
      [id]
    );

    return normalizeSubsystem(result.rows[0]);
  }

  static async getNodes(id) {
    assertUuid(id, 'Некорректный ID подсистемы');

    const result = await pool.query(
      `
        SELECT
          n.node_id,
          n.name,
          n.manufacturer,
          n.model,
          n.serial_number,
          n.inventory_number,
          n.registration_number,
          n.status,
          n.location,
          nt.name AS node_type_name,
          ${aggregateCondition()} AS is_aggregate
        FROM equipment.nodes n
        LEFT JOIN equipment.node_types nt ON nt.node_type_id = n.node_type_id
        WHERE n.subsystem_id = $1
        ORDER BY n.name NULLS LAST, n.model NULLS LAST
      `,
      [id]
    );

    return result.rows;
  }

  static async getContent(id) {
    assertUuid(id, 'Некорректный ID подсистемы');

    const subsystem = await this.getById(id);
    if (!subsystem) throw makeHttpError('Подсистема не найдена', 404);

    // Содержимое читается параллельно из разных доменных таблиц: каждая выборка
    // возвращает единый type/id/title/subtitle для карточек UI.
    const [equipment, instruments, resources, maintenance, plans] = await Promise.all([
      this.getEquipmentContent(id),
      this.getInstrumentContent(id),
      this.getResourceContent(id),
      this.getMaintenanceContent(id),
      this.getPlanContent(id),
    ]);

    return {
      subsystem,
      equipment,
      instruments,
      resources,
      maintenance,
      plans,
      counts: {
        equipment: equipment.length,
        instruments: instruments.length,
        resources: resources.length,
        maintenance: maintenance.length,
        plans: plans.length,
      },
    };
  }

  static async getEquipmentContent(subsystemId) {
    const result = await pool.query(
      `
        SELECT
          'equipment' AS type,
          n.node_id AS id,
          n.node_id,
          n.name AS title,
          CONCAT_WS(' ', n.manufacturer, n.model) AS subtitle,
          n.name,
          n.manufacturer,
          n.model,
          n.serial_number,
          n.inventory_number,
          n.registration_number,
          n.status,
          n.location,
          n.subsystem_id,
          s.name AS subsystem_name,
          nt.name AS node_type_name,
          ${aggregateCondition()} AS is_aggregate
        FROM equipment.nodes n
        LEFT JOIN equipment.subsystems s ON s.subsys_id = n.subsystem_id
        LEFT JOIN equipment.node_types nt ON nt.node_type_id = n.node_type_id
        WHERE n.subsystem_id = $1
        ORDER BY n.name NULLS LAST, n.model NULLS LAST
      `,
      [subsystemId]
    );

    return result.rows;
  }

  static async getInstrumentContent(subsystemId) {
    const result = await pool.query(
      `
        SELECT
          'instrument' AS type,
          n.node_id AS id,
          n.node_id,
          n.name AS title,
          CONCAT_WS(' ', 'Таб. №', i.tab_number) AS subtitle,
          n.name,
          n.manufacturer,
          n.model,
          n.serial_number,
          n.inventory_number,
          n.status AS node_status,
          n.location,
          n.subsystem_id,
          s.name AS subsystem_name,
          i.tab_number,
          i.calibration_interval::float AS calibration_interval,
          i.status AS instrument_status,
          last_cal.calibration_date AS last_calibration_date,
          (last_cal.calibration_date + (i.calibration_interval * INTERVAL '1 year'))::date AS next_calibration_date,
          last_cal.calibrator,
          last_cal.certificate_number,
          last_cal.result AS calibration_result
        FROM equipment.nodes n
        JOIN equipment.instruments_history i
          ON i.node_id = n.node_id AND i.valid_to IS NULL
        LEFT JOIN equipment.subsystems s ON s.subsys_id = n.subsystem_id
        LEFT JOIN LATERAL (
          SELECT ch.*
          FROM equipment.calibration_history ch
          WHERE ch.node_id = n.node_id
          ORDER BY ch.calibration_date DESC, ch.performed_at DESC
          LIMIT 1
        ) last_cal ON true
        WHERE n.subsystem_id = $1
        ORDER BY n.name NULLS LAST, i.tab_number NULLS LAST
      `,
      [subsystemId]
    );

    return result.rows;
  }

  static async getResourceContent(subsystemId) {
    const result = await pool.query(
      `
        SELECT
          'resource' AS type,
          n.node_id AS id,
          n.node_id,
          COALESCE(rh.resource_params->>'name', n.name) AS title,
          CONCAT_WS(' ', n.manufacturer, n.model) AS subtitle,
          n.name AS node_name,
          n.manufacturer,
          n.model,
          n.status AS node_status,
          n.location,
          n.subsystem_id,
          s.name AS subsystem_name,
          rh.registration_date,
          rh.resource_params,
          rh.note
        FROM equipment.nodes n
        JOIN (
          SELECT DISTINCT ON (node_id) *
          FROM equipment.resources_history
          WHERE valid_to IS NULL
          ORDER BY node_id, valid_from DESC
        ) rh ON rh.node_id = n.node_id
        LEFT JOIN equipment.subsystems s ON s.subsys_id = n.subsystem_id
        WHERE n.subsystem_id = $1
        ORDER BY title NULLS LAST, n.name NULLS LAST
      `,
      [subsystemId]
    );

    return result.rows;
  }

  static async getMaintenanceContent(subsystemId) {
    const result = await pool.query(
      `
        SELECT
          'maintenance' AS type,
          t.maintenance_id AS id,
          t.maintenance_id,
          t.node_id,
          COALESCE(mt.name, 'ТО') AS title,
          n.name AS subtitle,
          n.name AS node_name,
          n.location AS node_location,
          n.subsystem_id,
          s.name AS subsystem_name,
          p.plan_id,
          p.name AS plan_name,
          t.completed_date,
          mt.name AS service_type,
          ms.name AS status_name,
          t.notes,
          t.created_at,
          t.updated_at
        FROM equipment.maintenance_tasks t
        JOIN equipment.nodes n ON n.node_id = t.node_id
        LEFT JOIN equipment.subsystems s ON s.subsys_id = n.subsystem_id
        LEFT JOIN equipment.maintenance_plans p ON p.plan_id = t.plan_id
        JOIN equipment.maintenance_types mt ON mt.type_id = t.type_id
        JOIN equipment.maintenance_statuses ms ON ms.status_id = t.status_id
        WHERE n.subsystem_id = $1
        ORDER BY t.completed_date DESC NULLS LAST, t.created_at DESC
      `,
      [subsystemId]
    );

    return result.rows;
  }

  static async getPlanContent(subsystemId) {
    const result = await pool.query(
      `
        SELECT
          'plan' AS type,
          p.plan_id AS id,
          p.plan_id,
          p.name AS title,
          CONCAT_WS(' - ', p.start_date::text, p.end_date::text) AS subtitle,
          p.name,
          p.start_date,
          p.end_date,
          p.created_at,
          p.updated_at,
          COUNT(t.maintenance_id)::int AS subsystem_tasks_count
        FROM equipment.maintenance_plans p
        JOIN equipment.maintenance_tasks t ON t.plan_id = p.plan_id
        JOIN equipment.nodes n ON n.node_id = t.node_id
        WHERE n.subsystem_id = $1
        GROUP BY p.plan_id
        ORDER BY p.start_date DESC, p.created_at DESC
      `,
      [subsystemId]
    );

    return result.rows;
  }

  static async searchContent({ query = '', type = 'all', limit = 20 } = {}) {
    // Общий поиск используется перед привязкой: возвращает только первые safeLimit
    // результатов, чтобы модальное окно не загружало огромные списки.
    const search = normalizeSearchText(query);
    const normalizedType = type === 'all' || !type ? 'all' : normalizeContentType(type);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const pattern = contentSearchPattern(search);
    const results = [];

    if (normalizedType === 'all' || normalizedType === 'equipment') {
      results.push(...await this.searchEquipment(pattern, safeLimit));
    }
    if (normalizedType === 'all' || normalizedType === 'instrument') {
      results.push(...await this.searchInstruments(pattern, safeLimit));
    }
    if (normalizedType === 'all' || normalizedType === 'resource') {
      results.push(...await this.searchResources(pattern, safeLimit));
    }
    if (normalizedType === 'all' || normalizedType === 'maintenance') {
      results.push(...await this.searchMaintenance(pattern, safeLimit));
    }
    if (normalizedType === 'all' || normalizedType === 'plan') {
      results.push(...await this.searchPlans(pattern, safeLimit));
    }

    return results.slice(0, safeLimit);
  }

  static async searchEquipment(pattern, limit) {
    const result = await pool.query(
      `
        SELECT
          'equipment' AS type,
          n.node_id AS id,
          n.node_id,
          COALESCE(n.name, n.model) AS title,
          CONCAT_WS(' ', nt.name, n.manufacturer, n.model) AS subtitle,
          n.subsystem_id AS current_subsystem_id,
          s.name AS current_subsystem_name,
          true AS attachable
        FROM equipment.nodes n
        LEFT JOIN equipment.node_types nt ON nt.node_type_id = n.node_type_id
        LEFT JOIN equipment.subsystems s ON s.subsys_id = n.subsystem_id
        WHERE
          COALESCE(n.name, '') ILIKE $1 ESCAPE '\\'
          OR COALESCE(n.manufacturer, '') ILIKE $1 ESCAPE '\\'
          OR COALESCE(n.model, '') ILIKE $1 ESCAPE '\\'
          OR COALESCE(n.serial_number, '') ILIKE $1 ESCAPE '\\'
          OR COALESCE(n.inventory_number, '') ILIKE $1 ESCAPE '\\'
        ORDER BY title NULLS LAST
        LIMIT $2
      `,
      [pattern, limit]
    );

    return result.rows;
  }

  static async searchInstruments(pattern, limit) {
    const result = await pool.query(
      `
        SELECT
          'instrument' AS type,
          n.node_id AS id,
          n.node_id,
          COALESCE(n.name, n.model) AS title,
          CONCAT_WS(' ', 'Таб. №', i.tab_number, n.manufacturer, n.model) AS subtitle,
          n.subsystem_id AS current_subsystem_id,
          s.name AS current_subsystem_name,
          true AS attachable
        FROM equipment.nodes n
        JOIN equipment.instruments_history i
          ON i.node_id = n.node_id AND i.valid_to IS NULL
        LEFT JOIN equipment.subsystems s ON s.subsys_id = n.subsystem_id
        WHERE
          COALESCE(n.name, '') ILIKE $1 ESCAPE '\\'
          OR COALESCE(n.manufacturer, '') ILIKE $1 ESCAPE '\\'
          OR COALESCE(n.model, '') ILIKE $1 ESCAPE '\\'
          OR COALESCE(i.tab_number, '') ILIKE $1 ESCAPE '\\'
        ORDER BY title NULLS LAST
        LIMIT $2
      `,
      [pattern, limit]
    );

    return result.rows;
  }

  static async searchResources(pattern, limit) {
    const result = await pool.query(
      `
        SELECT
          'resource' AS type,
          n.node_id AS id,
          n.node_id,
          COALESCE(rh.resource_params->>'name', n.name, n.model) AS title,
          CONCAT_WS(' ', n.manufacturer, n.model) AS subtitle,
          n.subsystem_id AS current_subsystem_id,
          s.name AS current_subsystem_name,
          true AS attachable
        FROM equipment.nodes n
        JOIN (
          SELECT DISTINCT ON (node_id) *
          FROM equipment.resources_history
          WHERE valid_to IS NULL
          ORDER BY node_id, valid_from DESC
        ) rh ON rh.node_id = n.node_id
        LEFT JOIN equipment.subsystems s ON s.subsys_id = n.subsystem_id
        WHERE
          COALESCE(rh.resource_params->>'name', '') ILIKE $1 ESCAPE '\\'
          OR COALESCE(n.name, '') ILIKE $1 ESCAPE '\\'
          OR COALESCE(n.manufacturer, '') ILIKE $1 ESCAPE '\\'
          OR COALESCE(n.model, '') ILIKE $1 ESCAPE '\\'
        ORDER BY title NULLS LAST
        LIMIT $2
      `,
      [pattern, limit]
    );

    return result.rows;
  }

  static async searchMaintenance(pattern, limit) {
    const result = await pool.query(
      `
        SELECT
          'maintenance' AS type,
          t.maintenance_id AS id,
          t.node_id,
          mt.name AS title,
          CONCAT_WS(' ', n.name, p.name, ms.name) AS subtitle,
          n.subsystem_id AS current_subsystem_id,
          s.name AS current_subsystem_name,
          true AS attachable
        FROM equipment.maintenance_tasks t
        JOIN equipment.nodes n ON n.node_id = t.node_id
        LEFT JOIN equipment.subsystems s ON s.subsys_id = n.subsystem_id
        LEFT JOIN equipment.maintenance_plans p ON p.plan_id = t.plan_id
        JOIN equipment.maintenance_types mt ON mt.type_id = t.type_id
        JOIN equipment.maintenance_statuses ms ON ms.status_id = t.status_id
        WHERE
          COALESCE(n.name, '') ILIKE $1 ESCAPE '\\'
          OR COALESCE(p.name, '') ILIKE $1 ESCAPE '\\'
          OR COALESCE(mt.name, '') ILIKE $1 ESCAPE '\\'
          OR COALESCE(t.notes, '') ILIKE $1 ESCAPE '\\'
        ORDER BY t.created_at DESC
        LIMIT $2
      `,
      [pattern, limit]
    );

    return result.rows;
  }

  static async searchPlans(pattern, limit) {
    const result = await pool.query(
      `
        SELECT
          'plan' AS type,
          p.plan_id AS id,
          NULL::uuid AS node_id,
          p.name AS title,
          CONCAT_WS(' - ', p.start_date::text, p.end_date::text) AS subtitle,
          NULL::uuid AS current_subsystem_id,
          NULL::text AS current_subsystem_name,
          false AS attachable
        FROM equipment.maintenance_plans p
        WHERE COALESCE(p.name, '') ILIKE $1 ESCAPE '\\'
        ORDER BY p.start_date DESC, p.created_at DESC
        LIMIT $2
      `,
      [pattern, limit]
    );

    return result.rows;
  }

  static async resolveNodeIdForContent(client, type, objectId) {
    // У оборудования, СИ, ресурса и задачи ТО разные id, но перемещается всегда
    // узел. Этот метод находит соответствующий node_id.
    normalizeContentType(type);
    assertUuid(objectId, 'Некорректный ID объекта');

    if (type === 'equipment') {
      const result = await client.query('SELECT node_id FROM equipment.nodes WHERE node_id = $1', [objectId]);
      if (!result.rows[0]) throw makeHttpError('Оборудование не найдено', 404);
      return result.rows[0].node_id;
    }

    if (type === 'instrument') {
      const result = await client.query(
        `
          SELECT node_id
          FROM equipment.instruments_history
          WHERE node_id = $1 AND valid_to IS NULL
        `,
        [objectId]
      );
      if (!result.rows[0]) throw makeHttpError('Средство измерения не найдено', 404);
      return result.rows[0].node_id;
    }

    if (type === 'resource') {
      const result = await client.query(
        `
          SELECT node_id
          FROM equipment.resources_history
          WHERE node_id = $1 AND valid_to IS NULL
          LIMIT 1
        `,
        [objectId]
      );
      if (!result.rows[0]) throw makeHttpError('Ресурс не найден', 404);
      return result.rows[0].node_id;
    }

    if (type === 'maintenance') {
      const result = await client.query(
        'SELECT node_id FROM equipment.maintenance_tasks WHERE maintenance_id = $1',
        [objectId]
      );
      if (!result.rows[0]) throw makeHttpError('Задача ТО не найдена', 404);
      return result.rows[0].node_id;
    }

    throw makeHttpError('План ТО нельзя напрямую добавить в подсистему без изменения схемы БД', 409);
  }

  static async moveNodeToSubsystem(client, nodeId, subsystemId, userId = null) {
    // Перемещение узла тоже версионное: закрываем активную nodes_history и
    // вставляем новую версию с другим subsystem_id.
    const subsystem = await this.getById(subsystemId, client);
    if (!subsystem) throw makeHttpError('Целевая подсистема не найдена', 404);

    const nodeResult = await client.query('SELECT * FROM equipment.nodes WHERE node_id = $1', [nodeId]);
    const node = nodeResult.rows[0];
    if (!node) throw makeHttpError('Узел не найден', 404);

    if (node.subsystem_id === subsystemId) {
      return { node_id: nodeId, subsystem_id: subsystemId, changed: false };
    }

    const closed = await client.query(
      `
        UPDATE equipment.nodes_history
        SET valid_to = CURRENT_TIMESTAMP
        WHERE node_id = $1 AND valid_to IS NULL
      `,
      [nodeId]
    );

    if (closed.rowCount === 0) {
      throw makeHttpError('Активная версия узла не найдена', 404);
    }

    await client.query(
      `
        INSERT INTO equipment.nodes_history (
          node_id, node_type_id, name, manufacturer, model, manufactured_date,
          serial_number, inventory_number, registration_number, status,
          commission_date, operation_mode, decommission_date, write_off_date,
          location, parameters, note, installed_in_node, subsystem_id,
          valid_from, created_by_user
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17, $18, $19,
          CURRENT_TIMESTAMP, $20
        )
      `,
      [
        node.node_id,
        node.node_type_id,
        node.name,
        node.manufacturer,
        node.model,
        node.manufactured_date,
        node.serial_number,
        node.inventory_number,
        node.registration_number,
        node.status,
        node.commission_date,
        node.operation_mode,
        node.decommission_date,
        node.write_off_date,
        node.location,
        node.parameters,
        node.note,
        node.installed_in_node,
        subsystemId,
        userId,
      ]
    );

    return { node_id: nodeId, subsystem_id: subsystemId, changed: true };
  }

  static async attachContent(subsystemId, type, objectId, userId = null) {
    const normalizedType = normalizeContentType(type);
    if (!MOVABLE_TYPES.has(normalizedType)) {
      throw makeHttpError('Этот тип содержимого нельзя напрямую добавить в подсистему без изменения схемы БД', 409);
    }

    assertUuid(subsystemId, 'Некорректный ID подсистемы');
    assertUuid(objectId, 'Некорректный ID объекта');

    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const nodeId = await this.resolveNodeIdForContent(client, normalizedType, objectId);
      const result = await this.moveNodeToSubsystem(client, nodeId, subsystemId, userId);
      await client.query('COMMIT');
      return { ...result, type: normalizedType, id: objectId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async moveContent(type, objectId, targetSubsystemId, userId = null) {
    const normalizedType = normalizeContentType(type);
    if (!MOVABLE_TYPES.has(normalizedType)) {
      throw makeHttpError('Этот тип содержимого нельзя переместить без изменения схемы БД', 409);
    }

    assertUuid(targetSubsystemId, 'Некорректный ID целевой подсистемы');
    assertUuid(objectId, 'Некорректный ID объекта');

    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const nodeId = await this.resolveNodeIdForContent(client, normalizedType, objectId);
      const result = await this.moveNodeToSubsystem(client, nodeId, targetSubsystemId, userId);
      await client.query('COMMIT');
      return { ...result, type: normalizedType, id: objectId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async detachContent() {
    // У узла subsystem_id обязательный, поэтому "удалить из подсистемы" без
    // выбора новой подсистемы невозможно.
    throw makeHttpError(
      'Удаление из подсистемы недоступно без целевой подсистемы: в БД у узла поле subsystem_id обязательно. Используйте перемещение.',
      409
    );
  }

  static async ensureParentIsValid(client, subsystemId, parentId) {
    // Проверяет существование родителя и запрещает циклы в дереве подсистем.
    if (!parentId) return;

    if (subsystemId && parentId === subsystemId) {
      throw makeHttpError('Подсистема не может быть родителем самой себя');
    }

    const parent = await this.getById(parentId, client);
    if (!parent) throw makeHttpError('Родительская подсистема не найдена');

    if (!subsystemId) return;

    const cycleCheck = await client.query(
      `
        WITH RECURSIVE parents AS (
          SELECT subsys_id, parent_id
          FROM equipment.subsystems
          WHERE subsys_id = $1

          UNION ALL

          SELECT s.subsys_id, s.parent_id
          FROM equipment.subsystems s
          JOIN parents p ON s.subsys_id = p.parent_id
        )
        SELECT 1
        FROM parents
        WHERE subsys_id = $2
        LIMIT 1
      `,
      [parentId, subsystemId]
    );

    if (cycleCheck.rows.length > 0) {
      throw makeHttpError('Недопустимая иерархия: родителем выбрана дочерняя подсистема');
    }
  }

  static async create(data, userId = null) {
    const values = normalizeSubsystemData(data);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await this.ensureParentIsValid(client, null, values.parent_id);

      const id = uuidv4();
      const result = await client.query(
        `
          INSERT INTO equipment.subsystems_history (
            subsys_id, parent_id, name, location, note, valid_from, created_by_user
          )
          VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
          RETURNING subsys_id, parent_id, name, location, note
        `,
        [id, values.parent_id, values.name, values.location, values.note, userId]
      );

      await client.query('COMMIT');
      return normalizeSubsystem(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(id, data, userId = null) {
    assertUuid(id, 'Некорректный ID подсистемы');

    const values = normalizeSubsystemData(data);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const current = await this.getById(id, client);
      if (!current) throw makeHttpError('Подсистема не найдена', 404);

      await this.ensureParentIsValid(client, id, values.parent_id);

      // Подсистемы тоже хранятся в history-таблице: update закрывает старую
      // активную версию и вставляет новую.
      const closed = await client.query(
        `
          UPDATE equipment.subsystems_history
          SET valid_to = CURRENT_TIMESTAMP
          WHERE subsys_id = $1 AND valid_to IS NULL
        `,
        [id]
      );

      if (closed.rowCount === 0) {
        throw makeHttpError('Активная версия подсистемы не найдена', 404);
      }

      const result = await client.query(
        `
          INSERT INTO equipment.subsystems_history (
            subsys_id, parent_id, name, location, note, valid_from, created_by_user
          )
          VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
          RETURNING subsys_id, parent_id, name, location, note
        `,
        [id, values.parent_id, values.name, values.location, values.note, userId]
      );

      await client.query('COMMIT');
      return normalizeSubsystem(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(id) {
    assertUuid(id, 'Некорректный ID подсистемы');

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const current = await this.getById(id, client);
      if (!current) throw makeHttpError('Подсистема не найдена', 404);

      const usage = await client.query(
        `
          SELECT
            (SELECT COUNT(*)::int FROM equipment.subsystems WHERE parent_id = $1) AS child_subsystems,
            (SELECT COUNT(*)::int FROM equipment.nodes WHERE subsystem_id = $1) AS nodes
        `,
        [id]
      );

      const childSubsystems = usage.rows[0]?.child_subsystems || 0;
      const nodes = usage.rows[0]?.nodes || 0;

      if (childSubsystems > 0 || nodes > 0) {
        throw makeHttpError('Невозможно удалить подсистему: есть дочерние подсистемы или привязанные узлы', 409);
      }

      await client.query(
        `
          UPDATE equipment.subsystems_history
          SET valid_to = CURRENT_TIMESTAMP
          WHERE subsys_id = $1 AND valid_to IS NULL
        `,
        [id]
      );

      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Subsystem;
