const { pool } = require('../config/db');
const { v4: uuidv4, validate: isUuid } = require('uuid');

function makeHttpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
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

function validateSubsystemData(data) {
  const name = cleanText(data.name);
  const location = cleanText(data.location);
  const parentId = data.parent_id || null;
  const note = cleanText(data.note) || null;

  if (!name) {
    throw makeHttpError('Введите наименование подсистемы');
  }

  if (!location) {
    throw makeHttpError('Введите расположение подсистемы');
  }

  if (parentId && !isUuid(parentId)) {
    throw makeHttpError('Некорректный ID родительской подсистемы');
  }

  return { name, location, parent_id: parentId, note };
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
    if (!isUuid(id)) {
      throw makeHttpError('Некорректный ID подсистемы', 400);
    }

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
    if (!isUuid(id)) {
      throw makeHttpError('Некорректный ID подсистемы', 400);
    }

    const result = await pool.query(
      `
        SELECT
          n.node_id,
          n.name,
          n.manufacturer,
          n.model,
          n.serial_number,
          n.inventory_number,
          n.status,
          n.location,
          nt.name AS node_type_name,
          EXISTS (
            SELECT 1
            FROM equipment.nodes child
            WHERE child.installed_in_node = n.node_id
          ) AS is_aggregate
        FROM equipment.nodes n
        LEFT JOIN equipment.node_types nt ON nt.node_type_id = n.node_type_id
        WHERE n.subsystem_id = $1
        ORDER BY n.name NULLS LAST, n.model NULLS LAST
      `,
      [id]
    );

    return result.rows;
  }

  static async ensureParentIsValid(client, subsystemId, parentId) {
    if (!parentId) return;

    if (subsystemId && parentId === subsystemId) {
      throw makeHttpError('Подсистема не может быть родителем самой себя');
    }

    const parent = await this.getById(parentId, client);
    if (!parent) {
      throw makeHttpError('Родительская подсистема не найдена');
    }

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
    const values = validateSubsystemData(data);
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
    if (!isUuid(id)) {
      throw makeHttpError('Некорректный ID подсистемы', 400);
    }

    const values = validateSubsystemData(data);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const current = await this.getById(id, client);
      if (!current) {
        throw makeHttpError('Подсистема не найдена', 404);
      }

      await this.ensureParentIsValid(client, id, values.parent_id);

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
    if (!isUuid(id)) {
      throw makeHttpError('Некорректный ID подсистемы', 400);
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const current = await this.getById(id, client);
      if (!current) {
        throw makeHttpError('Подсистема не найдена', 404);
      }

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
