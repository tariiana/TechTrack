import { query, getClient } from '../config/db.js';
import { auditLog } from '../middleware/audit.js';

export async function getAllSubsystems() {
  const result = await query(
    `SELECT subsys_id, name, location, note, parent_id, created_at, updated_at
     FROM equipment.subsystems
     WHERE is_active = true
     ORDER BY name`
  );
  return result.rows;
}

export async function getSubsystemById(subsysId: string) {
  const result = await query(
    `SELECT subsys_id, name, location, note, parent_id, created_at, updated_at
     FROM equipment.subsystems
     WHERE subsys_id = $1 AND is_active = true`,
    [subsysId]
  );
  return result.rows[0] || null;
}

export async function getSubsystemTree() {
  const result = await query(
    `WITH RECURSIVE subsystem_tree AS (
       SELECT subsys_id, name, parent_id, 0 as level, subsys_id::text as path
       FROM equipment.subsystems
       WHERE parent_id IS NULL AND is_active = true
       UNION ALL
       SELECT s.subsys_id, s.name, s.parent_id, st.level + 1, st.path || ',' || s.subsys_id::text
       FROM equipment.subsystems s
       JOIN subsystem_tree st ON s.parent_id = st.subsys_id
       WHERE s.is_active = true
     )
     SELECT subsys_id, name, parent_id, level, path
     FROM subsystem_tree
     ORDER BY path`
  );
  
  // Построение дерева
  const nodesMap = new Map();
  const roots: any[] = [];
  
  for (const row of result.rows) {
    const node = { id: row.subsys_id, name: row.name, children: [] };
    nodesMap.set(row.subsys_id, node);
    
    if (!row.parent_id) {
      roots.push(node);
    } else {
      const parent = nodesMap.get(row.parent_id);
      if (parent) parent.children.push(node);
    }
  }
  
  return roots;
}

export async function getSubsystemNodes(subsysId: string) {
  const result = await query(
    `SELECT n.node_id, n.name, n.manufacturer, n.model, n.status, n.location,
            nt.name as node_type_name
     FROM equipment.nodes n
     JOIN equipment.node_types nt ON n.node_type_id = nt.node_type_id
     WHERE n.subsystem_id = $1 AND n.write_off_date IS NULL
     ORDER BY n.name`,
    [subsysId]
  );
  return result.rows;
}

export async function createSubsystem(
  data: { name: string; location: string; parent_id?: string | null; note?: string },
  userId: string | null,
  ipAddress: string | null,
  userAgent: string | null
) {
  const result = await query(
    `INSERT INTO equipment.subsystems (subsys_id, name, location, note, parent_id, is_active)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, true)
     RETURNING subsys_id, name, location, note, parent_id`,
    [data.name, data.location, data.note || null, data.parent_id || null]
  );
  
  const newSubsystem = result.rows[0];
  
  await auditLog(userId, 'CREATE_SUBSYSTEM', 'subsystem', newSubsystem.subsys_id, null, newSubsystem, ipAddress, userAgent);
  
  return newSubsystem;
}

export async function updateSubsystem(
  subsysId: string,
  data: { name?: string; location?: string; parent_id?: string | null; note?: string },
  userId: string | null,
  ipAddress: string | null,
  userAgent: string | null
) {
  const oldData = await getSubsystemById(subsysId);
  if (!oldData) {
    throw new Error('Подсистема не найдена');
  }
  
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.location !== undefined) {
    updates.push(`location = $${paramIndex++}`);
    values.push(data.location);
  }
  if (data.parent_id !== undefined) {
    updates.push(`parent_id = $${paramIndex++}`);
    values.push(data.parent_id);
  }
  if (data.note !== undefined) {
    updates.push(`note = $${paramIndex++}`);
    values.push(data.note);
  }
  
  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  
  if (updates.length === 0) {
    return oldData;
  }
  
  values.push(subsysId);
  
  await query(
    `UPDATE equipment.subsystems SET ${updates.join(', ')} WHERE subsys_id = $${paramIndex}`,
    values
  );
  
  const newData = await getSubsystemById(subsysId);
  
  await auditLog(userId, 'UPDATE_SUBSYSTEM', 'subsystem', subsysId, oldData, newData, ipAddress, userAgent);
  
  return newData;
}

export async function deleteSubsystem(subsysId: string, userId: string | null, ipAddress: string | null, userAgent: string | null) {
  const oldData = await getSubsystemById(subsysId);
  if (!oldData) {
    throw new Error('Подсистема не найдена');
  }
  
  // Проверяем, есть ли дочерние подсистемы или узлы
  const childrenCheck = await query(
    `SELECT 
       (SELECT COUNT(*) FROM equipment.subsystems WHERE parent_id = $1 AND is_active = true) as child_subsystems,
       (SELECT COUNT(*) FROM equipment.nodes WHERE subsystem_id = $1 AND write_off_date IS NULL) as child_nodes`,
    [subsysId]
  );
  
  if (childrenCheck.rows[0]?.child_subsystems > 0 || childrenCheck.rows[0]?.child_nodes > 0) {
    throw new Error('Невозможно удалить подсистему, так как она содержит дочерние подсистемы или узлы');
  }
  
  await query(
    `UPDATE equipment.subsystems SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE subsys_id = $1`,
    [subsysId]
  );
  
  await auditLog(userId, 'DELETE_SUBSYSTEM', 'subsystem', subsysId, oldData, null, ipAddress, userAgent);
  
  return oldData;
}