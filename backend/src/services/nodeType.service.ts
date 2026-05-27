import { query } from '../config/db.js';
import { auditLog } from '../middleware/audit.js';

// TypeScript-сервис видов узлов: хранит шаблоны параметров и допустимые дочерние
// типы, а также проверяет, можно ли удалить тип.
export async function getAllNodeTypes() {
  const result = await query(
    `SELECT node_type_id, name, parameters, allowed_child_types, note, parent_node_type_id
     FROM equipment.node_types
     ORDER BY name`
  );
  return result.rows;
}

export async function getNodeTypeById(nodeTypeId: string) {
  const result = await query(
    `SELECT node_type_id, name, parameters, allowed_child_types, note, parent_node_type_id
     FROM equipment.node_types
     WHERE node_type_id = $1`,
    [nodeTypeId]
  );
  return result.rows[0] || null;
}

export async function createNodeType(
  data: { name: string; parameters?: any; allowed_child_types?: string[]; note?: string; parent_node_type_id?: string | null },
  userId: string | null,
  ipAddress: string | null,
  userAgent: string | null
) {
  const result = await query(
    `INSERT INTO equipment.node_types (node_type_id, name, parameters, allowed_child_types, note, parent_node_type_id)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)
     RETURNING node_type_id, name`,
    [data.name, data.parameters || {}, data.allowed_child_types || null, data.note || null, data.parent_node_type_id || null]
  );
  
  const newNodeType = result.rows[0];
  
  await auditLog(userId, 'CREATE_NODE_TYPE', 'node_type', newNodeType.node_type_id, null, newNodeType, ipAddress, userAgent);
  
  return newNodeType;
}

export async function updateNodeType(
  nodeTypeId: string,
  data: { name?: string; parameters?: any; allowed_child_types?: string[]; note?: string; parent_node_type_id?: string | null },
  userId: string | null,
  ipAddress: string | null,
  userAgent: string | null
) {
  // Динамический UPDATE позволяет менять только переданные поля без перезаписи
  // parameters/allowed_child_types пустыми значениями.
  const oldData = await getNodeTypeById(nodeTypeId);
  if (!oldData) {
    throw new Error('Вид узла не найден');
  }
  
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.parameters !== undefined) {
    updates.push(`parameters = $${paramIndex++}`);
    values.push(data.parameters);
  }
  if (data.allowed_child_types !== undefined) {
    updates.push(`allowed_child_types = $${paramIndex++}`);
    values.push(data.allowed_child_types);
  }
  if (data.note !== undefined) {
    updates.push(`note = $${paramIndex++}`);
    values.push(data.note);
  }
  if (data.parent_node_type_id !== undefined) {
    updates.push(`parent_node_type_id = $${paramIndex++}`);
    values.push(data.parent_node_type_id);
  }
  
  if (updates.length === 0) {
    return oldData;
  }
  
  values.push(nodeTypeId);
  
  await query(
    `UPDATE equipment.node_types SET ${updates.join(', ')} WHERE node_type_id = $${paramIndex}`,
    values
  );
  
  const newData = await getNodeTypeById(nodeTypeId);
  
  await auditLog(userId, 'UPDATE_NODE_TYPE', 'node_type', nodeTypeId, oldData, newData, ipAddress, userAgent);
  
  return newData;
}

export async function deleteNodeType(nodeTypeId: string, userId: string | null, ipAddress: string | null, userAgent: string | null) {
  const oldData = await getNodeTypeById(nodeTypeId);
  if (!oldData) {
    throw new Error('Вид узла не найден');
  }
  
  // Проверяем, есть ли узлы этого типа
  // Тип нельзя удалить, пока есть активные узлы этого типа.
  const nodesCheck = await query(
    `SELECT COUNT(*) FROM equipment.nodes WHERE node_type_id = $1 AND write_off_date IS NULL`,
    [nodeTypeId]
  );
  
  if (parseInt(nodesCheck.rows[0].count) > 0) {
    throw new Error('Невозможно удалить вид узла, так как существуют узлы этого типа');
  }
  
  await query(`DELETE FROM equipment.node_types WHERE node_type_id = $1`, [nodeTypeId]);
  
  await auditLog(userId, 'DELETE_NODE_TYPE', 'node_type', nodeTypeId, oldData, null, ipAddress, userAgent);
  
  return oldData;
}

// Получение шаблона узла по типу для автозаполнения формы
export async function getNodeTypeTemplate(nodeTypeId: string) {
  const result = await query(
    `SELECT node_type_id, name, parameters
     FROM equipment.node_types
     WHERE node_type_id = $1`,
    [nodeTypeId]
  );
  
  if (result.rows.length === 0) return null;
  
  const template = result.rows[0];
  
  return {
    node_type_id: template.node_type_id,
    name: template.name,
    parameters: template.parameters,
    // Можем также вернуть дефолтные значения для полей узла
    default_fields: {
      manufacturer: '',
      model: '',
      status: 'получен',
    }
  };
}
