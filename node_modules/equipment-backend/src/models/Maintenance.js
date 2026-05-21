const { pool } = require('../config/db');

const STATUS_TO_DB = {
  pending: 'ожидает',
  in_progress: 'в работе',
  completed: 'выполнено',
  not_completed: 'не выполнено',
  canceled: 'отменено',
  overdue: 'просрочено',
};

const STATUS_FROM_DB = Object.fromEntries(
  Object.entries(STATUS_TO_DB).map(([apiValue, dbValue]) => [dbValue, apiValue])
);

const TYPE_TO_DB = {
  'плановое то': 'плановое',
  'внеплановое то': 'внеплановое',
  'капитальный ремонт': 'капитальный ремонт',
  'аварийный ремонт': 'аварийный ремонт',
  'текущий ремонт': 'регламент',
  регламент: 'регламент',
  диагностика: 'диагностика',
};

const TYPE_FROM_DB = {
  плановое: 'плановое ТО',
  внеплановое: 'внеплановое ТО',
  'капитальный ремонт': 'капитальный ремонт',
  'аварийный ремонт': 'аварийный ремонт',
  регламент: 'текущий ремонт',
  диагностика: 'диагностика',
};

function normalizeDate(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}

function getApiStatus(dbStatus) {
  return STATUS_FROM_DB[dbStatus] || dbStatus;
}

function getApiType(dbType) {
  return TYPE_FROM_DB[dbType] || dbType;
}

function getDbStatus(apiStatus) {
  const key = typeof apiStatus === 'string' ? apiStatus.trim().toLowerCase() : apiStatus;
  return STATUS_TO_DB[key] || apiStatus || 'ожидает';
}

function getDbType(apiType) {
  const key = typeof apiType === 'string' ? apiType.trim().toLowerCase() : apiType;
  return TYPE_TO_DB[key] || apiType || 'плановое';
}

function mapPlan(row) {
  return {
    ...row,
    start_date: normalizeDate(row.start_date),
    end_date: normalizeDate(row.end_date),
  };
}

function mapTask(row) {
  const recommendedDate = normalizeDate(row.recommended_date || row.expiry_date || row.created_at);

  return {
    ...row,
    completed_date: normalizeDate(row.completed_date),
    recommended_date: recommendedDate,
    expiry_date: recommendedDate,
    service_type: getApiType(row.service_type),
    status_name: getApiStatus(row.status_name),
  };
}

class Maintenance {
  static async getTypeId(serviceType) {
    const dbType = getDbType(serviceType);
    const existing = await pool.query(
      `SELECT type_id FROM equipment.maintenance_types WHERE name = $1`,
      [dbType]
    );

    if (existing.rows.length > 0) return existing.rows[0].type_id;

    const created = await pool.query(`
      INSERT INTO equipment.maintenance_types (type_id, name, description)
      SELECT COALESCE(MAX(type_id), 0) + 1, $1, $2
      FROM equipment.maintenance_types
      RETURNING type_id
    `, [dbType, dbType]);
    return created.rows[0].type_id;
  }

  static async getStatusId(statusName = 'pending') {
    const dbStatus = getDbStatus(statusName);
    const result = await pool.query(
      `SELECT status_id FROM equipment.maintenance_statuses WHERE name = $1`,
      [dbStatus]
    );

    if (result.rows.length === 0) {
      throw new Error(`Unknown maintenance status: ${statusName}`);
    }

    return result.rows[0].status_id;
  }

  static async findPlanId(startDate, endDate, explicitPlanId = null) {
    if (explicitPlanId) return explicitPlanId;

    const result = await pool.query(`
      SELECT plan_id
      FROM equipment.maintenance_plans
      WHERE start_date = $1
        AND (end_date IS NOT DISTINCT FROM $2::date)
      ORDER BY created_at DESC
      LIMIT 1
    `, [startDate, endDate || null]);

    return result.rows[0]?.plan_id || null;
  }

  static async getAllPlans() {
    const result = await pool.query(`
      SELECT 
        mp.plan_id,
        mp.name,
        mp.start_date,
        mp.end_date,
        mp.created_at,
        mp.updated_at,
        COUNT(t.maintenance_id)::int AS tasks_count
      FROM equipment.maintenance_plans mp
      LEFT JOIN equipment.maintenance_tasks t ON t.plan_id = mp.plan_id
      GROUP BY mp.plan_id
      ORDER BY mp.start_date DESC, mp.created_at DESC
    `);

    return result.rows.map(mapPlan);
  }

  static async getPlanById(id) {
    const result = await pool.query(`
      SELECT 
        plan_id,
        name,
        start_date,
        end_date,
        created_at,
        updated_at
      FROM equipment.maintenance_plans
      WHERE plan_id = $1
    `, [id]);

    if (result.rows.length === 0) return null;

    const plan = mapPlan(result.rows[0]);
    const tasksResult = await pool.query(`
      SELECT 
        t.maintenance_id,
        t.node_id,
        n.name AS node_name,
        n.location,
        n.location AS node_location,
        t.completed_date,
        t.type_id,
        mt.name AS service_type,
        t.status_id,
        ms.name AS status_name,
        t.notes,
        t.created_at,
        t.updated_at,
        p.start_date AS recommended_date
      FROM equipment.maintenance_tasks t
      JOIN equipment.nodes n ON t.node_id = n.node_id
      LEFT JOIN equipment.maintenance_plans p ON t.plan_id = p.plan_id
      JOIN equipment.maintenance_types mt ON t.type_id = mt.type_id
      JOIN equipment.maintenance_statuses ms ON t.status_id = ms.status_id
      WHERE t.plan_id = $1
      ORDER BY p.start_date, n.name, t.created_at
    `, [id]);

    plan.tasks = tasksResult.rows.map(mapTask);
    return plan;
  }

  static async createPlan(data) {
    const { name, start_date, end_date } = data;
    const result = await pool.query(`
      INSERT INTO equipment.maintenance_plans (plan_id, name, start_date, end_date)
      VALUES (uuid_generate_v4(), $1, $2, $3)
      RETURNING plan_id, name, start_date, end_date, created_at, updated_at
    `, [name, start_date, end_date || null]);

    return mapPlan(result.rows[0]);
  }

  static async updatePlan(id, data) {
    const { name, start_date, end_date } = data;
    const result = await pool.query(`
      UPDATE equipment.maintenance_plans
      SET name = $1, start_date = $2, end_date = $3, updated_at = CURRENT_TIMESTAMP
      WHERE plan_id = $4
      RETURNING plan_id, name, start_date, end_date, created_at, updated_at
    `, [name, start_date, end_date || null, id]);

    return result.rows[0] ? mapPlan(result.rows[0]) : null;
  }

  static async deletePlan(id) {
    await pool.query(`DELETE FROM equipment.maintenance_tasks WHERE plan_id = $1`, [id]);
    const result = await pool.query(`DELETE FROM equipment.maintenance_plans WHERE plan_id = $1`, [id]);
    return { success: result.rowCount > 0 };
  }

  static async createTask(data) {
    const { node_id, plan_id, service_type, status_name, notes } = data;
    const typeId = await Maintenance.getTypeId(service_type);
    const statusId = await Maintenance.getStatusId(status_name);

    const result = await pool.query(`
      INSERT INTO equipment.maintenance_tasks (maintenance_id, node_id, plan_id, type_id, status_id, notes)
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)
      RETURNING maintenance_id, node_id, plan_id, completed_date, type_id, status_id, notes, created_at, updated_at
    `, [node_id, plan_id || null, typeId, statusId, notes || null]);

    return result.rows[0];
  }

  static async updateTask(id, data) {
    const { node_id, plan_id, service_type, status_name, notes } = data;
    const updates = [];
    const values = [];
    let idx = 1;

    if (node_id) {
      updates.push(`node_id = $${idx++}`);
      values.push(node_id);
    }

    if (plan_id !== undefined) {
      updates.push(`plan_id = $${idx++}`);
      values.push(plan_id || null);
    }

    if (service_type) {
      updates.push(`type_id = $${idx++}`);
      values.push(await Maintenance.getTypeId(service_type));
    }

    if (status_name) {
      updates.push(`status_id = $${idx++}`);
      values.push(await Maintenance.getStatusId(status_name));
    }

    if (notes !== undefined) {
      updates.push(`notes = $${idx++}`);
      values.push(notes);
    }

    if (updates.length === 0) return null;

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(`
      UPDATE equipment.maintenance_tasks
      SET ${updates.join(', ')}
      WHERE maintenance_id = $${idx}
      RETURNING maintenance_id
    `, values);

    return result.rowCount > 0 ? { success: true } : null;
  }

  static async deleteTask(id) {
    const result = await pool.query(`DELETE FROM equipment.maintenance_tasks WHERE maintenance_id = $1`, [id]);
    return { success: result.rowCount > 0 };
  }

  static async completeTask(id) {
    const completedStatusId = await Maintenance.getStatusId('completed');
    const result = await pool.query(`
      UPDATE equipment.maintenance_tasks
      SET completed_date = CURRENT_DATE, status_id = $2, updated_at = CURRENT_TIMESTAMP
      WHERE maintenance_id = $1
    `, [id, completedStatusId]);

    return { success: result.rowCount > 0 };
  }

  static async getEquipmentNodes() {
    const result = await pool.query(`
      SELECT node_id, name, location, status
      FROM equipment.nodes
      ORDER BY name NULLS LAST, model NULLS LAST
    `);

    return result.rows;
  }

  static async generatePlan(startDate, endDate, nodeIds = null, planId = null) {
    const targetPlanId = await Maintenance.findPlanId(startDate, endDate, planId);
    if (!targetPlanId) {
      throw new Error('Maintenance plan was not found for task generation');
    }

    const typeId = await Maintenance.getTypeId('плановое ТО');
    const statusId = await Maintenance.getStatusId('pending');
    const nodesResult = nodeIds && nodeIds.length
      ? await pool.query(`SELECT node_id FROM equipment.nodes WHERE node_id = ANY($1::uuid[])`, [nodeIds])
      : await pool.query(`SELECT node_id FROM equipment.nodes`);

    let createdCount = 0;
    for (const node of nodesResult.rows) {
      const insertResult = await pool.query(`
        INSERT INTO equipment.maintenance_tasks (maintenance_id, node_id, plan_id, type_id, status_id, notes)
        SELECT uuid_generate_v4(), $1, $2, $3, $4, $5
        WHERE NOT EXISTS (
          SELECT 1
          FROM equipment.maintenance_tasks
          WHERE node_id = $1 AND plan_id = $2 AND type_id = $3
        )
      `, [node.node_id, targetPlanId, typeId, statusId, 'Automatically generated from maintenance plan']);
      createdCount += insertResult.rowCount;
    }

    return { success: true, plan_id: targetPlanId, tasks_created: createdCount };
  }
}

module.exports = Maintenance;
