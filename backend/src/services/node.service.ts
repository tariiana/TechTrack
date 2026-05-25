import { query, getClient } from '../config/db.js';
import { auditLog } from '../middleware/audit.js';

export async function getAllNodes(filters?: { subsystem_id?: string; node_type_id?: string; status?: string; search?: string }) {
  let sql = `
    SELECT n.node_id, n.node_type_id, n.name, n.manufacturer, n.model, 
           n.serial_number, n.inventory_number, n.registration_number,
           n.status, n.location, n.parameters, n.note, n.installed_in_node, n.subsystem_id,
           n.commission_date, n.operation_mode, n.decommission_date, n.write_off_date,
           n.manufactured_date,
           (SELECT COUNT(*) FROM equipment.nodes WHERE installed_in_node = n.node_id) > 0 as is_aggregate,
           EXISTS(SELECT 1 FROM equipment.measuring_instruments mi WHERE mi.instrument_id::text = n.node_id::text) as is_si,
           nt.name as node_type_name,
           s.name as subsystem_name,
           parent.name as parent_node_name
    FROM equipment.nodes n
    JOIN equipment.node_types nt ON n.node_type_id = nt.node_type_id
    JOIN equipment.subsystems s ON n.subsystem_id = s.subsys_id
    LEFT JOIN equipment.nodes parent ON n.installed_in_node = parent.node_id
    WHERE n.write_off_date IS NULL
  `;
  
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (filters?.subsystem_id) {
    conditions.push(`n.subsystem_id = $${paramIndex++}`);
    values.push(filters.subsystem_id);
  }
  if (filters?.node_type_id) {
    conditions.push(`n.node_type_id = $${paramIndex++}`);
    values.push(filters.node_type_id);
  }
  if (filters?.status) {
    conditions.push(`n.status = $${paramIndex++}`);
    values.push(filters.status);
  }
  if (filters?.search) {
    conditions.push(`(n.name ILIKE $${paramIndex++} OR n.manufacturer ILIKE $${paramIndex} OR n.model ILIKE $${paramIndex})`);
    const searchPattern = `%${filters.search}%`;
    values.push(searchPattern, searchPattern);
    paramIndex++;
  }
  
  if (conditions.length > 0) {
    sql += ' AND ' + conditions.join(' AND ');
  }
  
  sql += ` ORDER BY n.created_at DESC`;
  
  const result = await query(sql, values);
  return result.rows;
}

export async function getNodeById(nodeId: string) {
  const result = await query(
    `SELECT n.node_id, n.node_type_id, n.name, n.manufacturer, n.model, 
            n.serial_number, n.inventory_number, n.registration_number,
            n.status, n.location, n.parameters, n.note, n.installed_in_node, n.subsystem_id,
            n.commission_date, n.operation_mode, n.decommission_date, n.write_off_date,
            n.manufactured_date,
            nt.name as node_type_name,
            s.name as subsystem_name,
            parent.name as parent_node_name,
            (SELECT json_agg(json_build_object('node_id', child.node_id, 'name', child.name, 'node_type_name', nt2.name))
             FROM equipment.nodes child
             JOIN equipment.node_types nt2 ON child.node_type_id = nt2.node_type_id
             WHERE child.installed_in_node = n.node_id AND child.write_off_date IS NULL) as children
     FROM equipment.nodes n
     JOIN equipment.node_types nt ON n.node_type_id = nt.node_type_id
     JOIN equipment.subsystems s ON n.subsystem_id = s.subsys_id
     LEFT JOIN equipment.nodes parent ON n.installed_in_node = parent.node_id
     WHERE n.node_id = $1 AND n.write_off_date IS NULL`,
    [nodeId]
  );
  
  if (result.rows.length === 0) return null;
  
  return result.rows[0];
}

export async function getNodeTree() {
  const result = await query(
    `WITH RECURSIVE node_tree AS (
       SELECT node_id, name, installed_in_node, 0 as level, node_id::text as path
       FROM equipment.nodes
       WHERE installed_in_node IS NULL AND write_off_date IS NULL
       UNION ALL
       SELECT n.node_id, n.name, n.installed_in_node, nt.level + 1, nt.path || ',' || n.node_id::text
       FROM equipment.nodes n
       JOIN node_tree nt ON n.installed_in_node = nt.node_id
       WHERE n.write_off_date IS NULL
     )
     SELECT node_id, name, installed_in_node, level, path
     FROM node_tree
     ORDER BY path`
  );
  
  // Построение дерева
  const nodesMap = new Map();
  const roots: any[] = [];
  
  for (const row of result.rows) {
    const node = { id: row.node_id, name: row.name, children: [] };
    nodesMap.set(row.node_id, node);
    
    if (!row.installed_in_node) {
      roots.push(node);
    } else {
      const parent = nodesMap.get(row.installed_in_node);
      if (parent) parent.children.push(node);
    }
  }
  
  return roots;
}

export async function getNodeChildren(nodeId: string) {
  const result = await query(
    `SELECT n.node_id, n.name, n.manufacturer, n.model, n.status, n.location,
            nt.name as node_type_name
     FROM equipment.nodes n
     JOIN equipment.node_types nt ON n.node_type_id = nt.node_type_id
     WHERE n.installed_in_node = $1 AND n.write_off_date IS NULL
     ORDER BY n.name`,
    [nodeId]
  );
  return result.rows;
}

export async function getNodeMovementHistory(nodeId: string) {
  const result = await query(
    `SELECT history_id, previous_location, new_location, moved_at,
            u.full_name as moved_by_user
     FROM equipment.node_movement_history mh
     LEFT JOIN equipment.users u ON mh.moved_by_user = u.user_id
     WHERE mh.node_id = $1
     ORDER BY mh.moved_at DESC`,
    [nodeId]
  );
  return result.rows;
}

export async function createNode(
  nodeData: any,
  userId: string | null,
  ipAddress: string | null,
  userAgent: string | null
) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    // Проверяем, существует ли подсистема
    const subsystemCheck = await client.query(
      `SELECT subsys_id FROM equipment.subsystems WHERE subsys_id = $1`,
      [nodeData.subsystem_id]
    );
    if (subsystemCheck.rows.length === 0) {
      throw new Error('Указанная подсистема не существует');
    }
    
    // Если указан родительский узел, проверяем возможность установки
    if (nodeData.installed_in_node) {
      const parentCheck = await client.query(
        `SELECT node_id FROM equipment.nodes WHERE node_id = $1 AND write_off_date IS NULL`,
        [nodeData.installed_in_node]
      );
      if (parentCheck.rows.length === 0) {
        throw new Error('Родительский узел не существует или списан');
      }
      
      // Проверяем циклическую вложенность (будет в триггере, но дублируем для хорошего сообщения)
    }
    
    const result = await client.query(
      `INSERT INTO equipment.nodes (
         node_id, node_type_id, name, manufacturer, model, manufactured_date,
         serial_number, inventory_number, registration_number, status,
         commission_date, operation_mode, location, parameters, note,
         installed_in_node, subsystem_id
       ) VALUES (
         uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
       ) RETURNING node_id, name`,
      [
        nodeData.node_type_id || null,
        nodeData.name,
        nodeData.manufacturer,
        nodeData.model,
        nodeData.manufactured_date || null,
        nodeData.serial_number || null,
        nodeData.inventory_number || null,
        nodeData.registration_number || null,
        nodeData.status,
        nodeData.commission_date || null,
        nodeData.operation_mode || null,
        nodeData.location,
        nodeData.parameters || {},
        nodeData.note || null,
        nodeData.installed_in_node || null,
        nodeData.subsystem_id,
      ]
    );
    
    await client.query('COMMIT');
    
    const newNode = result.rows[0];
    
    await auditLog(userId, 'CREATE_NODE', 'node', newNode.node_id, null, newNode, ipAddress, userAgent);
    
    return newNode;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateNode(
  nodeId: string,
  nodeData: any,
  userId: string | null,
  ipAddress: string | null,
  userAgent: string | null
) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    // Получаем старые данные
    const oldData = await getNodeById(nodeId);
    if (!oldData) {
      throw new Error('Узел не найден');
    }
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (nodeData.node_type_id !== undefined) {
      updates.push(`node_type_id = $${paramIndex++}`);
      values.push(nodeData.node_type_id);
    }
    if (nodeData.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(nodeData.name);
    }
    if (nodeData.manufacturer !== undefined) {
      updates.push(`manufacturer = $${paramIndex++}`);
      values.push(nodeData.manufacturer);
    }
    if (nodeData.model !== undefined) {
      updates.push(`model = $${paramIndex++}`);
      values.push(nodeData.model);
    }
    if (nodeData.manufactured_date !== undefined) {
      updates.push(`manufactured_date = $${paramIndex++}`);
      values.push(nodeData.manufactured_date);
    }
    if (nodeData.serial_number !== undefined) {
      updates.push(`serial_number = $${paramIndex++}`);
      values.push(nodeData.serial_number);
    }
    if (nodeData.inventory_number !== undefined) {
      updates.push(`inventory_number = $${paramIndex++}`);
      values.push(nodeData.inventory_number);
    }
    if (nodeData.registration_number !== undefined) {
      updates.push(`registration_number = $${paramIndex++}`);
      values.push(nodeData.registration_number);
    }
    if (nodeData.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(nodeData.status);
    }
    if (nodeData.commission_date !== undefined) {
      updates.push(`commission_date = $${paramIndex++}`);
      values.push(nodeData.commission_date);
    }
    if (nodeData.operation_mode !== undefined) {
      updates.push(`operation_mode = $${paramIndex++}`);
      values.push(nodeData.operation_mode);
    }
    if (nodeData.location !== undefined) {
      updates.push(`location = $${paramIndex++}`);
      values.push(nodeData.location);
    }
    if (nodeData.parameters !== undefined) {
      updates.push(`parameters = $${paramIndex++}`);
      values.push(nodeData.parameters);
    }
    if (nodeData.note !== undefined) {
      updates.push(`note = $${paramIndex++}`);
      values.push(nodeData.note);
    }
    if (nodeData.installed_in_node !== undefined) {
      updates.push(`installed_in_node = $${paramIndex++}`);
      values.push(nodeData.installed_in_node);
    }
    if (nodeData.subsystem_id !== undefined) {
      updates.push(`subsystem_id = $${paramIndex++}`);
      values.push(nodeData.subsystem_id);
    }
    
    if (updates.length === 0) {
      return oldData;
    }
    
    values.push(nodeId);
    
    await client.query(
      `UPDATE equipment.nodes SET ${updates.join(', ')} WHERE node_id = $${paramIndex}`,
      values
    );
    
    await client.query('COMMIT');
    
    const newData = await getNodeById(nodeId);
    
    await auditLog(userId, 'UPDATE_NODE', 'node', nodeId, oldData, newData, ipAddress, userAgent);
    
    return newData;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function writeOffNode(nodeId: string, userId: string | null, ipAddress: string | null, userAgent: string | null) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    const oldData = await getNodeById(nodeId);
    if (!oldData) {
      throw new Error('Узел не найден');
    }
    
    await client.query(
      `UPDATE equipment.nodes SET write_off_date = CURRENT_DATE, status = 'списан' WHERE node_id = $1`,
      [nodeId]
    );
    
    await client.query('COMMIT');
    
    await auditLog(userId, 'WRITE_OFF_NODE', 'node', nodeId, oldData, { write_off_date: new Date().toISOString().split('T')[0] }, ipAddress, userAgent);
    
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}