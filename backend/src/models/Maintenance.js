const { pool } = require('../config/db');
const {
  calculateMaintenanceExpiryDate,
  daysBetween,
} = require('../utils/businessCalendar');

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

const AUTO_GENERATED_NOTE = 'Автоматическая генерация';
const LEGACY_AUTO_GENERATED_NOTE = 'Automatically generated from maintenance plan';

function normalizeDate(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return value;
}

function maxDateKey(...values) {
  const dates = values.map(normalizeDate).filter(Boolean);
  if (dates.length === 0) return null;
  return dates.sort().at(-1);
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
  const expiryDate = normalizeDate(row.expiry_date);

  return {
    ...row,
    completed_date: normalizeDate(row.completed_date),
    commission_date: normalizeDate(row.commission_date),
    last_completed_date: normalizeDate(row.last_completed_date),
    expiry_date: expiryDate,
    recommended_date: expiryDate,
    notes: row.notes === LEGACY_AUTO_GENERATED_NOTE ? AUTO_GENERATED_NOTE : row.notes,
    service_type: getApiType(row.service_type),
    status_name: getApiStatus(row.status_name),
    is_overdue: row.is_overdue === true,
    overdue_days: Number(row.overdue_days || 0),
  };
}

const aggregateCondition = `
  (
    LOWER(nt.name) LIKE '%агрегат%'
    OR
    COALESCE(array_length(nt.allowed_child_types, 1), 0) > 0
    OR EXISTS (
      SELECT 1 FROM equipment.nodes child
      WHERE child.installed_in_node = n.node_id
    )
  )
`;

function applyTaskDates(row) {
  const expiryDate = calculateMaintenanceExpiryDate(row.expiry_base_date);
  const storedCompletedDate = normalizeDate(row.completed_date);
  const completedDate = storedCompletedDate || expiryDate;
  const compareDate = completedDate || normalizeDate(new Date());
  const overdueDays = expiryDate ? Math.max(daysBetween(expiryDate, compareDate), 0) : 0;

  return mapTask({
    ...row,
    completed_date: completedDate,
    completed_date_auto_filled: !storedCompletedDate && !!completedDate,
    expiry_date: expiryDate,
    is_overdue: overdueDays > 0,
    overdue_days: overdueDays,
  });
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
    const baseDateSql = `COALESCE(GREATEST(prev.last_completed_date, n.commission_date), prev.last_completed_date, n.commission_date)`;

    const tasksResult = await pool.query(`
      SELECT
        t.maintenance_id,
        t.node_id,
        n.name AS node_name,
        n.location,
        n.location AS node_location,
        n.commission_date,
        prev.last_completed_date,
        ${baseDateSql} AS expiry_base_date,
        t.completed_date,
        t.type_id,
        mt.name AS service_type,
        t.status_id,
        ms.name AS status_name,
        t.notes,
        t.created_at,
        t.updated_at
      FROM equipment.maintenance_tasks t
      JOIN equipment.nodes n ON t.node_id = n.node_id
      JOIN equipment.maintenance_types mt ON t.type_id = mt.type_id
      JOIN equipment.maintenance_statuses ms ON t.status_id = ms.status_id
      LEFT JOIN LATERAL (
        SELECT MAX(prev_task.completed_date) AS last_completed_date
        FROM equipment.maintenance_tasks prev_task
        JOIN equipment.maintenance_statuses prev_status ON prev_status.status_id = prev_task.status_id
        WHERE prev_task.node_id = t.node_id
          AND prev_task.maintenance_id <> t.maintenance_id
          AND prev_task.completed_date IS NOT NULL
          AND prev_status.name = 'выполнено'
          AND (t.completed_date IS NULL OR prev_task.completed_date < t.completed_date)
      ) prev ON true
      WHERE t.plan_id = $1
      ORDER BY n.name, t.created_at
    `, [id]);

    plan.tasks = tasksResult.rows
      .map(applyTaskDates)
      .sort((a, b) => {
        if (!a.expiry_date && !b.expiry_date) return (a.node_name || '').localeCompare(b.node_name || '');
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return a.expiry_date.localeCompare(b.expiry_date) || (a.node_name || '').localeCompare(b.node_name || '');
      });
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
    const { node_id, plan_id, service_type, status_name, completed_date, notes } = data;
    const typeId = await Maintenance.getTypeId(service_type);
    const statusId = await Maintenance.getStatusId(completed_date && !status_name ? 'completed' : status_name);

    const result = await pool.query(`
      INSERT INTO equipment.maintenance_tasks (maintenance_id, node_id, plan_id, completed_date, type_id, status_id, notes)
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6)
      RETURNING maintenance_id, node_id, plan_id, completed_date, type_id, status_id, notes, created_at, updated_at
    `, [node_id, plan_id || null, completed_date || null, typeId, statusId, notes || null]);

    return result.rows[0];
  }

  static async updateTask(id, data) {
    const { node_id, plan_id, service_type, status_name, completed_date, notes } = data;
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

    if (completed_date !== undefined) {
      updates.push(`completed_date = $${idx++}`);
      values.push(completed_date || null);
    }

    if (service_type) {
      updates.push(`type_id = $${idx++}`);
      values.push(await Maintenance.getTypeId(service_type));
    }

    if (status_name) {
      updates.push(`status_id = $${idx++}`);
      values.push(await Maintenance.getStatusId(status_name));
    } else if (completed_date) {
      updates.push(`status_id = $${idx++}`);
      values.push(await Maintenance.getStatusId('completed'));
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
    const baseDateSql = `COALESCE(GREATEST(last_done.last_completed_date, n.commission_date), last_done.last_completed_date, n.commission_date)`;
    const result = await pool.query(`
      SELECT
        n.node_id,
        n.name,
        n.location,
        n.status,
        n.commission_date,
        last_done.last_completed_date,
        ${baseDateSql} AS expiry_base_date,
        last_cal.last_calibration_date,
        last_cal.next_calibration_date,
        nt.name AS node_type_name,
        ${aggregateCondition} AS is_aggregate,
        EXISTS (
          SELECT 1 FROM equipment.nodes child
          WHERE child.installed_in_node = n.node_id
        ) AS has_children
      FROM equipment.nodes n
      LEFT JOIN equipment.node_types nt ON nt.node_type_id = n.node_type_id
      LEFT JOIN equipment.instruments_history i
        ON i.node_id = n.node_id
       AND i.valid_to IS NULL
      LEFT JOIN LATERAL (
        SELECT MAX(t.completed_date) AS last_completed_date
        FROM equipment.maintenance_tasks t
        JOIN equipment.maintenance_statuses done_status ON done_status.status_id = t.status_id
        WHERE t.node_id = n.node_id
          AND t.completed_date IS NOT NULL
          AND done_status.name = 'выполнено'
      ) last_done ON true
      LEFT JOIN LATERAL (
        SELECT
          ch.calibration_date AS last_calibration_date,
          (ch.calibration_date + (i.calibration_interval * INTERVAL '1 year'))::date AS next_calibration_date
        FROM equipment.calibration_history ch
        WHERE ch.node_id = n.node_id
        ORDER BY ch.calibration_date DESC, ch.performed_at DESC
        LIMIT 1
      ) last_cal ON true
      WHERE ${aggregateCondition}
      ORDER BY n.name NULLS LAST, n.model NULLS LAST
    `);

    return result.rows.map((node) => {
      const expiryBaseDate = normalizeDate(node.expiry_base_date);
      const maintenanceExpiryDate = calculateMaintenanceExpiryDate(expiryBaseDate);
      const calibrationExpiryDate = normalizeDate(node.next_calibration_date);
      return {
        ...node,
        commission_date: normalizeDate(node.commission_date),
        last_completed_date: normalizeDate(node.last_completed_date),
        expiry_base_date: expiryBaseDate,
        last_calibration_date: normalizeDate(node.last_calibration_date),
        next_calibration_date: calibrationExpiryDate,
        expiry_date: maxDateKey(maintenanceExpiryDate, calibrationExpiryDate),
      };
    });
  }

  static async generatePlan(startDate, endDate, nodeIds = null, planId = null) {
    const targetPlanId = await Maintenance.findPlanId(startDate, endDate, planId);
    if (!targetPlanId) {
      throw new Error('Maintenance plan was not found for task generation');
    }

    const typeId = await Maintenance.getTypeId('плановое ТО');
    const statusId = await Maintenance.getStatusId('pending');
    const baseDateSql = `COALESCE(GREATEST(last_done.last_completed_date, n.commission_date), last_done.last_completed_date, n.commission_date)`;

    const nodesResult = await pool.query(`
      SELECT
        n.node_id,
        n.name,
        ${baseDateSql} AS expiry_base_date
      FROM equipment.nodes n
      LEFT JOIN equipment.node_types nt ON nt.node_type_id = n.node_type_id
      LEFT JOIN LATERAL (
        SELECT MAX(t.completed_date) AS last_completed_date
        FROM equipment.maintenance_tasks t
        JOIN equipment.maintenance_statuses done_status ON done_status.status_id = t.status_id
        WHERE t.node_id = n.node_id
          AND t.completed_date IS NOT NULL
          AND done_status.name = 'выполнено'
      ) last_done ON true
      WHERE ${aggregateCondition}
        AND ($1::uuid[] IS NULL OR n.node_id = ANY($1::uuid[]))
      ORDER BY n.name
    `, [nodeIds && nodeIds.length ? nodeIds : null]);

    const candidateNodes = nodesResult.rows
      .map((node) => ({
        ...node,
        expiry_date: calculateMaintenanceExpiryDate(node.expiry_base_date),
      }))
      .filter((node) => node.expiry_date && node.expiry_date >= startDate && node.expiry_date <= endDate)
      .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date) || (a.name || '').localeCompare(b.name || ''));

    await pool.query(`
      DELETE FROM equipment.maintenance_tasks
      WHERE plan_id = $1
        AND type_id = $2
        AND status_id = $3
        AND notes IN ($4, $5)
        AND (completed_date IS NULL OR updated_at = created_at)
    `, [
      targetPlanId,
      typeId,
      statusId,
      LEGACY_AUTO_GENERATED_NOTE,
      AUTO_GENERATED_NOTE,
    ]);

    let createdCount = 0;
    for (const node of candidateNodes) {
      const insertResult = await pool.query(`
        INSERT INTO equipment.maintenance_tasks (maintenance_id, node_id, plan_id, completed_date, type_id, status_id, notes)
        SELECT uuid_generate_v4(), $1, $2, $3, $4, $5, $6
        WHERE NOT EXISTS (
          SELECT 1
          FROM equipment.maintenance_tasks
          WHERE node_id = $1 AND plan_id = $2 AND type_id = $4
        )
      `, [node.node_id, targetPlanId, node.expiry_date, typeId, statusId, AUTO_GENERATED_NOTE]);
      createdCount += insertResult.rowCount;
    }

    return {
      success: true,
      plan_id: targetPlanId,
      tasks_created: createdCount,
      candidates_count: candidateNodes.length,
    };
  }
}

module.exports = Maintenance;
