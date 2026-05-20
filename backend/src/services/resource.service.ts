import { query } from '../config/db.js';
import { auditLog } from '../middleware/audit.js';

export async function getAllResources(filters?: { node_id?: string; search?: string }) {
  let sql = `
    SELECT r.resource_id, r.node_id, r.registration_date, r.resource_params, r.note,
           n.name as node_name,
           n.manufacturer as node_manufacturer,
           n.model as node_model,
           n.location as node_location
    FROM equipment.resources r
    JOIN equipment.nodes n ON r.node_id = n.node_id
    WHERE n.write_off_date IS NULL
  `;
  
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (filters?.node_id) {
    conditions.push(`r.node_id = $${paramIndex++}`);
    values.push(filters.node_id);
  }
  if (filters?.search) {
    conditions.push(`(n.name ILIKE $${paramIndex++} OR n.model ILIKE $${paramIndex})`);
    const searchPattern = `%${filters.search}%`;
    values.push(searchPattern, searchPattern);
  }
  
  if (conditions.length > 0) {
    sql += ' AND ' + conditions.join(' AND ');
  }
  
  sql += ` ORDER BY r.registration_date DESC`;
  
  const result = await query(sql, values);
  return result.rows;
}

export async function getResourceById(resourceId: string) {
  const result = await query(
    `SELECT r.resource_id, r.node_id, r.registration_date, r.resource_params, r.note,
            n.name as node_name,
            n.manufacturer as node_manufacturer,
            n.model as node_model,
            n.location as node_location,
            n.status as node_status
     FROM equipment.resources r
     JOIN equipment.nodes n ON r.node_id = n.node_id
     WHERE r.resource_id = $1 AND n.write_off_date IS NULL`,
    [resourceId]
  );
  return result.rows[0] || null;
}

export async function getResourcesForNode(nodeId: string) {
  const result = await query(
    `SELECT resource_id, registration_date, resource_params, note
     FROM equipment.resources
     WHERE node_id = $1
     ORDER BY registration_date DESC`,
    [nodeId]
  );
  return result.rows;
}

export async function createResource(
  data: {
    node_id: string;
    registration_date: string;
    resource_params: any;
    note?: string | null;
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
    `INSERT INTO equipment.resources (resource_id, node_id, registration_date, resource_params, note)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4)
     RETURNING resource_id, node_id, registration_date`,
    [data.node_id, data.registration_date, data.resource_params || {}, data.note || null]
  );
  
  const newResource = result.rows[0];
  
  await auditLog(userId, 'CREATE_RESOURCE', 'resource', newResource.resource_id, null, newResource, ipAddress, userAgent);
  
  return newResource;
}

export async function updateResource(
  resourceId: string,
  data: {
    registration_date?: string;
    resource_params?: any;
    note?: string | null;
  },
  userId: string | null,
  ipAddress: string | null,
  userAgent: string | null
) {
  const oldData = await getResourceById(resourceId);
  if (!oldData) {
    throw new Error('Ресурс не найден');
  }
  
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (data.registration_date !== undefined) {
    updates.push(`registration_date = $${paramIndex++}`);
    values.push(data.registration_date);
  }
  if (data.resource_params !== undefined) {
    updates.push(`resource_params = $${paramIndex++}`);
    values.push(data.resource_params);
  }
  if (data.note !== undefined) {
    updates.push(`note = $${paramIndex++}`);
    values.push(data.note);
  }
  
  if (updates.length === 0) {
    return oldData;
  }
  
  values.push(resourceId);
  
  await query(
    `UPDATE equipment.resources SET ${updates.join(', ')} WHERE resource_id = $${paramIndex}`,
    values
  );
  
  const newData = await getResourceById(resourceId);
  
  await auditLog(userId, 'UPDATE_RESOURCE', 'resource', resourceId, oldData, newData, ipAddress, userAgent);
  
  return newData;
}

export async function deleteResource(resourceId: string, userId: string | null, ipAddress: string | null, userAgent: string | null) {
  const oldData = await getResourceById(resourceId);
  if (!oldData) {
    throw new Error('Ресурс не найден');
  }
  
  await query(`DELETE FROM equipment.resources WHERE resource_id = $1`, [resourceId]);
  
  await auditLog(userId, 'DELETE_RESOURCE', 'resource', resourceId, oldData, null, ipAddress, userAgent);
  
  return oldData;
}

// Автоматический расчёт ресурса на основе режима работы
export async function calculateResource(nodeId: string, workHoursPerYear: number) {
  // Получаем узел и его ресурс
  const nodeResult = await query(
    `SELECT n.node_id, n.name, n.operation_mode,
            r.resource_params
     FROM equipment.nodes n
     LEFT JOIN equipment.resources r ON r.node_id = n.node_id
     WHERE n.node_id = $1 AND n.write_off_date IS NULL`,
    [nodeId]
  );
  
  if (nodeResult.rows.length === 0) {
    throw new Error('Узел не найден');
  }
  
  const node = nodeResult.rows[0];
  const resourceParams = node.resource_params || {};
  
  // Пример расчёта для АКБ: остаточный ресурс = (оставшийся срок службы / общий срок службы) * 100
  let calculatedResource = null;
  
  if (resourceParams.service_life_years && resourceParams.years_in_operation !== undefined) {
    const remainingPercent = ((resourceParams.service_life_years - resourceParams.years_in_operation) / resourceParams.service_life_years) * 100;
    calculatedResource = Math.max(0, Math.min(100, remainingPercent));
  }
  
  return {
    node_id: node.node_id,
    node_name: node.name,
    work_hours_per_year: workHoursPerYear,
    calculated_resource_percent: calculatedResource,
    current_resource_params: resourceParams,
  };
}