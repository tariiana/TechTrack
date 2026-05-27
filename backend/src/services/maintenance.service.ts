import { query, getClient } from '../config/db.js';
import { auditLog } from '../middleware/audit.js';

// TypeScript-сервис ТО: управляет планами, задачами и автогенерацией плана по
// агрегатам/выбранным узлам.
export async function getAllMaintenancePlans() {
  const result = await query(
    `SELECT plan_id, name, start_date, end_date, created_at, updated_at,
            (SELECT COUNT(*) FROM equipment.maintenance_items WHERE plan_id = mp.plan_id) as tasks_count
     FROM equipment.maintenance_plans mp
     WHERE end_date IS NULL OR end_date >= CURRENT_DATE - INTERVAL '1 year'
     ORDER BY start_date DESC`
  );
  return result.rows;
}

export async function getMaintenancePlanById(planId: string) {
  const result = await query(
    `SELECT plan_id, name, start_date, end_date, created_at, updated_at
     FROM equipment.maintenance_plans
     WHERE plan_id = $1`,
    [planId]
  );
  
  if (result.rows.length === 0) return null;
  
  const plan = result.rows[0];
  
  // Получаем задачи плана
  // Задачи подтягиваются отдельным запросом, чтобы вернуть план вместе с
  // удобным массивом tasks.
  const tasksResult = await query(
    `SELECT m.maintenance_id, m.node_id, m.completed_date, m.type_id, m.status_id, m.notes,
            n.name as node_name, n.location as node_location,
            mt.name as service_type,
            ms.name as status_name,
            (SELECT next_calibration_date FROM equipment.calibration_history 
             WHERE instrument_id::text = m.node_id::text 
             ORDER BY calibration_date DESC LIMIT 1) as expiry_date
     FROM equipment.maintenance_items mi
     JOIN equipment.maintenance m ON mi.maintenance_id = m.maintenance_id
     JOIN equipment.nodes n ON m.node_id = n.node_id
     JOIN equipment.maintenance_types mt ON m.type_id = mt.type_id
     JOIN equipment.maintenance_statuses ms ON m.status_id = ms.status_id
     WHERE mi.plan_id = $1
     ORDER BY m.created_at`,
    [planId]
  );
  
  return { ...plan, tasks: tasksResult.rows };
}

export async function createMaintenancePlan(
  data: { name: string; start_date: string; end_date?: string | null },
  userId: string | null,
  ipAddress: string | null,
  userAgent: string | null
) {
  const result = await query(
    `INSERT INTO equipment.maintenance_plans (plan_id, name, start_date, end_date)
     VALUES (uuid_generate_v4(), $1, $2, $3)
     RETURNING plan_id, name, start_date, end_date`,
    [data.name, data.start_date, data.end_date || null]
  );
  
  const newPlan = result.rows[0];
  
  await auditLog(userId, 'CREATE_MAINTENANCE_PLAN', 'maintenance_plan', newPlan.plan_id, null, newPlan, ipAddress, userAgent);
  
  return newPlan;
}

export async function updateMaintenancePlan(
  planId: string,
  data: { name?: string; start_date?: string; end_date?: string | null },
  userId: string | null,
  ipAddress: string | null,
  userAgent: string | null
) {
  const oldData = await getMaintenancePlanById(planId);
  if (!oldData) {
    throw new Error('План ТО не найден');
  }
  
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.start_date !== undefined) {
    updates.push(`start_date = $${paramIndex++}`);
    values.push(data.start_date);
  }
  if (data.end_date !== undefined) {
    updates.push(`end_date = $${paramIndex++}`);
    values.push(data.end_date);
  }
  
  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  
  if (updates.length === 0) {
    return oldData;
  }
  
  values.push(planId);
  
  await query(
    `UPDATE equipment.maintenance_plans SET ${updates.join(', ')} WHERE plan_id = $${paramIndex}`,
    values
  );
  
  const newData = await getMaintenancePlanById(planId);
  
  await auditLog(userId, 'UPDATE_MAINTENANCE_PLAN', 'maintenance_plan', planId, oldData, newData, ipAddress, userAgent);
  
  return newData;
}

export async function deleteMaintenancePlan(planId: string, userId: string | null, ipAddress: string | null, userAgent: string | null) {
  const oldData = await getMaintenancePlanById(planId);
  if (!oldData) {
    throw new Error('План ТО не найден');
  }
  
  // Удаление каскадное из-за внешних ключей
  await query(`DELETE FROM equipment.maintenance_plans WHERE plan_id = $1`, [planId]);
  
  await auditLog(userId, 'DELETE_MAINTENANCE_PLAN', 'maintenance_plan', planId, oldData, null, ipAddress, userAgent);
  
  return oldData;
}

// Управление задачами ТО
export async function getAllMaintenanceTasks(filters?: { node_id?: string; status_id?: number; type_id?: number }) {
  let sql = `
    SELECT m.maintenance_id, m.node_id, m.completed_date, m.type_id, m.status_id, m.notes,
           n.name as node_name, n.location as node_location,
           mt.name as service_type,
           ms.name as status_name,
           m.created_at, m.updated_at,
           (SELECT array_agg(mp.name) FROM equipment.maintenance_items mi 
            JOIN equipment.maintenance_plans mp ON mi.plan_id = mp.plan_id
            WHERE mi.maintenance_id = m.maintenance_id) as plan_names
    FROM equipment.maintenance m
    JOIN equipment.nodes n ON m.node_id = n.node_id
    JOIN equipment.maintenance_types mt ON m.type_id = mt.type_id
    JOIN equipment.maintenance_statuses ms ON m.status_id = ms.status_id
    WHERE n.write_off_date IS NULL
  `;
  
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (filters?.node_id) {
    conditions.push(`m.node_id = $${paramIndex++}`);
    values.push(filters.node_id);
  }
  if (filters?.status_id) {
    conditions.push(`m.status_id = $${paramIndex++}`);
    values.push(filters.status_id);
  }
  if (filters?.type_id) {
    conditions.push(`m.type_id = $${paramIndex++}`);
    values.push(filters.type_id);
  }
  
  if (conditions.length > 0) {
    sql += ' AND ' + conditions.join(' AND ');
  }
  
  sql += ` ORDER BY m.created_at DESC`;
  
  const result = await query(sql, values);
  return result.rows;
}

export async function getMaintenanceTaskById(taskId: string) {
  const result = await query(
    `SELECT m.maintenance_id, m.node_id, m.completed_date, m.type_id, m.status_id, m.notes,
            n.name as node_name, n.location as node_location,
            mt.name as service_type,
            ms.name as status_name,
            m.created_at, m.updated_at
     FROM equipment.maintenance m
     JOIN equipment.nodes n ON m.node_id = n.node_id
     JOIN equipment.maintenance_types mt ON m.type_id = mt.type_id
     JOIN equipment.maintenance_statuses ms ON m.status_id = ms.status_id
     WHERE m.maintenance_id = $1 AND n.write_off_date IS NULL`,
    [taskId]
  );
  return result.rows[0] || null;
}

export async function createMaintenanceTask(
  data: {
    node_id: string;
    type_id: number;
    status_id?: number;
    notes?: string | null;
  },
  userId: string | null,
  ipAddress: string | null,
  userAgent: string | null
) {
  // Проверяем существование узла
  const nodeCheck = await query(
    `SELECT node_id FROM equipment.nodes WHERE node_id = $1 AND write_off_date IS NULL`,
    [data.node_id]
  );
  if (nodeCheck.rows.length === 0) {
    throw new Error('Узел не найден или списан');
  }
  
  const result = await query(
    `INSERT INTO equipment.maintenance (maintenance_id, node_id, type_id, status_id, notes)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4)
     RETURNING maintenance_id, node_id, type_id, status_id`,
    [data.node_id, data.type_id, data.status_id || 1, data.notes || null]
  );
  
  const newTask = result.rows[0];
  
  await auditLog(userId, 'CREATE_MAINTENANCE_TASK', 'maintenance', newTask.maintenance_id, null, newTask, ipAddress, userAgent);
  
  return newTask;
}

export async function updateMaintenanceTask(
  taskId: string,
  data: {
    node_id?: string;
    completed_date?: string | null;
    type_id?: number;
    status_id?: number;
    notes?: string | null;
  },
  userId: string | null,
  ipAddress: string | null,
  userAgent: string | null
) {
  const oldData = await getMaintenanceTaskById(taskId);
  if (!oldData) {
    throw new Error('Задача ТО не найдена');
  }
  
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (data.node_id !== undefined) {
    updates.push(`node_id = $${paramIndex++}`);
    values.push(data.node_id);
  }
  if (data.completed_date !== undefined) {
    updates.push(`completed_date = $${paramIndex++}`);
    values.push(data.completed_date);
  }
  if (data.type_id !== undefined) {
    updates.push(`type_id = $${paramIndex++}`);
    values.push(data.type_id);
  }
  if (data.status_id !== undefined) {
    updates.push(`status_id = $${paramIndex++}`);
    values.push(data.status_id);
  }
  if (data.notes !== undefined) {
    updates.push(`notes = $${paramIndex++}`);
    values.push(data.notes);
  }
  
  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  
  if (updates.length === 0) {
    return oldData;
  }
  
  values.push(taskId);
  
  await query(
    `UPDATE equipment.maintenance SET ${updates.join(', ')} WHERE maintenance_id = $${paramIndex}`,
    values
  );
  
  const newData = await getMaintenanceTaskById(taskId);
  
  await auditLog(userId, 'UPDATE_MAINTENANCE_TASK', 'maintenance', taskId, oldData, newData, ipAddress, userAgent);
  
  return newData;
}

export async function deleteMaintenanceTask(taskId: string, userId: string | null, ipAddress: string | null, userAgent: string | null) {
  const oldData = await getMaintenanceTaskById(taskId);
  if (!oldData) {
    throw new Error('Задача ТО не найдена');
  }
  
  await query(`DELETE FROM equipment.maintenance WHERE maintenance_id = $1`, [taskId]);
  
  await auditLog(userId, 'DELETE_MAINTENANCE_TASK', 'maintenance', taskId, oldData, null, ipAddress, userAgent);
  
  return oldData;
}

// Связывание задач с планами
export async function addTaskToPlan(planId: string, taskId: string, userId: string | null, ipAddress: string | null, userAgent: string | null) {
  // Проверяем существование плана и задачи
  // ON CONFLICT делает операцию идемпотентной: повторное добавление не падает.
  const planCheck = await query(`SELECT plan_id FROM equipment.maintenance_plans WHERE plan_id = $1`, [planId]);
  const taskCheck = await query(`SELECT maintenance_id FROM equipment.maintenance WHERE maintenance_id = $1`, [taskId]);
  
  if (planCheck.rows.length === 0) throw new Error('План не найден');
  if (taskCheck.rows.length === 0) throw new Error('Задача не найдена');
  
  const result = await query(
    `INSERT INTO equipment.maintenance_items (item_id, plan_id, maintenance_id)
     VALUES (uuid_generate_v4(), $1, $2)
     ON CONFLICT (plan_id, maintenance_id) DO NOTHING
     RETURNING item_id`,
    [planId, taskId]
  );
  
  await auditLog(userId, 'ADD_TASK_TO_PLAN', 'maintenance_item', result.rows[0]?.item_id || null, null, { plan_id: planId, maintenance_id: taskId }, ipAddress, userAgent);
  
  return result.rows[0] || null;
}

export async function removeTaskFromPlan(planId: string, taskId: string, userId: string | null, ipAddress: string | null, userAgent: string | null) {
  await auditLog(userId, 'REMOVE_TASK_FROM_PLAN', 'maintenance_item', null, { plan_id: planId, maintenance_id: taskId }, null, ipAddress, userAgent);
  
  await query(`DELETE FROM equipment.maintenance_items WHERE plan_id = $1 AND maintenance_id = $2`, [planId, taskId]);
  
  return { success: true };
}

// Автоматическая генерация плана ТО
export async function generateMaintenancePlan(
  startDate: string,
  endDate: string,
  nodeIds?: string[],
  userId: string | null = null,
  ipAddress: string | null = null,
  userAgent: string | null = null
) {
  // Если список узлов не задан, сервис сам выбирает активные агрегаты и создает
  // по одной плановой задаче на каждый узел.
  // Если узлы не указаны, берём все активные агрегаты (узлы, у которых есть дочерние)
  let targetNodes: any[];
  
  if (nodeIds && nodeIds.length > 0) {
    const result = await query(
      `SELECT node_id, name, location FROM equipment.nodes 
       WHERE node_id = ANY($1::uuid[]) AND write_off_date IS NULL`,
      [nodeIds]
    );
    targetNodes = result.rows;
  } else {
    // Находим все агрегаты (узлы, которые являются родителями для других)
    const result = await query(
      `SELECT DISTINCT n.node_id, n.name, n.location
       FROM equipment.nodes n
       WHERE EXISTS (SELECT 1 FROM equipment.nodes child WHERE child.installed_in_node = n.node_id)
         AND n.write_off_date IS NULL`
    );
    targetNodes = result.rows;
  }
  
  // Создаём план
  const planResult = await createMaintenancePlan(
    { name: `План ТО с ${startDate} по ${endDate}`, start_date: startDate, end_date: endDate },
    userId,
    ipAddress,
    userAgent
  );
  
  const planId = planResult.plan_id;
  const tasksCreated = [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (const node of targetNodes) {
    // Получаем последнюю дату ТО для узла
    const lastMaintenanceResult = await query(
      `SELECT MAX(created_at) as last_date
       FROM equipment.maintenance m
       JOIN equipment.maintenance_items mi ON m.maintenance_id = mi.maintenance_id
       WHERE m.node_id = $1 AND m.status_id = 3`,
      [node.node_id]
    );
    
    let recommendedDate = new Date(start);
    
    if (lastMaintenanceResult.rows[0]?.last_date) {
      const lastDate = new Date(lastMaintenanceResult.rows[0].last_date);
      // Рекомендуемая дата: через год после последнего ТО, но не позже endDate
      const nextDate = new Date(lastDate);
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      
      if (nextDate <= end && nextDate >= start) {
        recommendedDate = nextDate;
      }
    }
    
    // Создаём задачу ТО
    const task = await createMaintenanceTask(
      {
        node_id: node.node_id,
        type_id: 1, // плановое ТО
        status_id: 1, // ожидает
        notes: `Автоматически сгенерированная задача. Рекомендуемая дата: ${recommendedDate.toISOString().split('T')[0]}`,
      },
      userId,
      ipAddress,
      userAgent
    );
    
    // Добавляем задачу в план
    await addTaskToPlan(planId, task.maintenance_id, userId, ipAddress, userAgent);
    
    tasksCreated.push({
      task_id: task.maintenance_id,
      node_id: node.node_id,
      node_name: node.name,
      recommended_date: recommendedDate.toISOString().split('T')[0],
    });
  }
  
  return {
    plan_id: planId,
    plan_name: planResult.name,
    tasks_count: tasksCreated.length,
    tasks: tasksCreated,
  };
}
