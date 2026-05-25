import { query } from '../config/db.js';

export async function getAuditLog(filters?: {
  user_id?: string;
  entity_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}) {
  let sql = `
    SELECT l.log_id, l.user_id, l.action, l.entity_type, l.entity_id,
           l.old_data, l.new_data, l.performed_at,
           u.login, u.full_name
    FROM equipment.audit_log l
    LEFT JOIN equipment.users u ON l.user_id = u.user_id
    WHERE 1=1
  `;
  
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (filters?.user_id) {
    conditions.push(`l.user_id = $${paramIndex++}`);
    values.push(filters.user_id);
  }
  if (filters?.entity_type) {
    conditions.push(`l.entity_type = $${paramIndex++}`);
    values.push(filters.entity_type);
  }
  if (filters?.start_date) {
    conditions.push(`l.performed_at >= $${paramIndex++}`);
    values.push(filters.start_date);
  }
  if (filters?.end_date) {
    conditions.push(`l.performed_at <= $${paramIndex++}`);
    values.push(filters.end_date);
  }
  
  if (conditions.length > 0) {
    sql += ' AND ' + conditions.join(' AND ');
  }
  
  sql += ` ORDER BY l.performed_at DESC`;
  
  if (filters?.limit) {
    sql += ` LIMIT $${paramIndex++}`;
    values.push(filters.limit);
  }
  if (filters?.offset) {
    sql += ` OFFSET $${paramIndex++}`;
    values.push(filters.offset);
  }
  
  const result = await query(sql, values);
  return result.rows;
}

export async function getEntityAuditHistory(entityType: string, entityId: string) {
  const result = await query(
    `SELECT l.log_id, l.user_id, l.action, l.old_data, l.new_data, l.performed_at,
            u.login, u.full_name
     FROM equipment.audit_log l
     LEFT JOIN equipment.users u ON l.user_id = u.user_id
     WHERE l.entity_type = $1 AND l.entity_id = $2
     ORDER BY l.performed_at DESC`,
    [entityType, entityId]
  );
  return result.rows;
}