const pool = require('../config/db');

class Maintenance {
  // ========== ПЛАНЫ ==========
  static async getAllPlans() {
    const result = await pool.query(`
      SELECT 
        plan_id,
        name,
        start_date,
        end_date,
        created_at,
        updated_at
      FROM equipment.maintenance_plans
      ORDER BY start_date DESC
    `);
    return result.rows;
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
    const plan = result.rows[0];
    // Получаем задачи для этого плана
    const tasksResult = await pool.query(`
      SELECT 
        t.maintenance_id,
        t.node_id,
        n.name AS node_name,
        t.completed_date,
        t.type_id,
        mt.name AS service_type,
        t.status_id,
        ms.name AS status_name,
        t.notes,
        t.created_at,
        t.updated_at,
        -- Вычисляем рекомендуемую дату (можно взять из плана или использовать created_at)
        COALESCE(t.created_at::DATE, CURRENT_DATE) AS recommended_date,
        -- Для совместимости с фронтендом: дата истечения срока (условно + 1 год)
        (COALESCE(t.created_at::DATE, CURRENT_DATE) + INTERVAL '1 year')::DATE AS expiry_date
      FROM equipment.maintenance_tasks t
      JOIN equipment.nodes n ON t.node_id = n.node_id
      JOIN equipment.maintenance_types mt ON t.type_id = mt.type_id
      JOIN equipment.maintenance_statuses ms ON t.status_id = ms.status_id
      WHERE t.plan_id = $1
      ORDER BY t.created_at
    `, [id]);
    plan.tasks = tasksResult.rows;
    return plan;
  }

  static async createPlan(data) {
    const { name, start_date, end_date } = data;
    const result = await pool.query(`
      INSERT INTO equipment.maintenance_plans (plan_id, name, start_date, end_date)
      VALUES (uuid_generate_v4(), $1, $2, $3)
      RETURNING plan_id, name, start_date, end_date
    `, [name, start_date, end_date || null]);
    return result.rows[0];
  }

  static async updatePlan(id, data) {
    const { name, start_date, end_date } = data;
    const result = await pool.query(`
      UPDATE equipment.maintenance_plans
      SET name = $1, start_date = $2, end_date = $3, updated_at = CURRENT_TIMESTAMP
      WHERE plan_id = $4
      RETURNING plan_id, name, start_date, end_date
    `, [name, start_date, end_date || null, id]);
    return result.rows[0];
  }

  static async deletePlan(id) {
    await pool.query(`DELETE FROM equipment.maintenance_plans WHERE plan_id = $1`, [id]);
    return { success: true };
  }

  // ========== ЗАДАЧИ ==========
  static async createTask(data, userId) {
  const { node_id, plan_id, service_type, recommended_date, notes } = data;
  // Ищем type_id по имени (точное совпадение)
  const typeRes = await pool.query(`SELECT type_id FROM equipment.maintenance_types WHERE name = $1`, [service_type]);
  if (typeRes.rows.length === 0) {
    throw new Error(`Неизвестный тип обслуживания: ${service_type}`);
  }
  const type_id = typeRes.rows[0].type_id;
  const result = await pool.query(`
    INSERT INTO equipment.maintenance_tasks (maintenance_id, node_id, plan_id, type_id, status_id, notes)
    VALUES (uuid_generate_v4(), $1, $2, $3, 1, $4)
    RETURNING maintenance_id
  `, [node_id, plan_id || null, type_id, notes || null]);
  return { maintenance_id: result.rows[0].maintenance_id };
}

  static async updateTask(id, data) {
    const { service_type, status_name, recommended_date, notes } = data;
    const updates = [];
    const values = [];
    let idx = 1;
    if (service_type) {
      const typeRes = await pool.query(`SELECT type_id FROM equipment.maintenance_types WHERE name = $1`, [service_type]);
      if (typeRes.rows.length === 0) throw new Error('Неизвестный тип обслуживания');
      updates.push(`type_id = $${idx++}`);
      values.push(typeRes.rows[0].type_id);
    }
    if (status_name) {
      const statusRes = await pool.query(`SELECT status_id FROM equipment.maintenance_statuses WHERE name = $1`, [status_name]);
      if (statusRes.rows.length === 0) throw new Error('Неизвестный статус');
      updates.push(`status_id = $${idx++}`);
      values.push(statusRes.rows[0].status_id);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${idx++}`);
      values.push(notes);
    }
    if (updates.length === 0) return null;
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    await pool.query(`
      UPDATE equipment.maintenance_tasks
      SET ${updates.join(', ')}
      WHERE maintenance_id = $${idx}
    `, values);
    return { success: true };
  }

  static async deleteTask(id) {
    await pool.query(`DELETE FROM equipment.maintenance_tasks WHERE maintenance_id = $1`, [id]);
    return { success: true };
  }

  static async completeTask(id) {
    await pool.query(`
      UPDATE equipment.maintenance_tasks
      SET completed_date = CURRENT_DATE, status_id = (SELECT status_id FROM equipment.maintenance_statuses WHERE name = 'completed'), updated_at = CURRENT_TIMESTAMP
      WHERE maintenance_id = $1
    `, [id]);
    return { success: true };
  }

  // ========== ВСПОМОГАТЕЛЬНЫЕ ==========
  static async getEquipmentNodes() {
    const result = await pool.query(`
      SELECT node_id, name, location
      FROM equipment.nodes
      WHERE valid_to IS NULL
      ORDER BY name
    `);
    return result.rows;
  }

  // Генерация плана (упрощённая версия – создаёт задачи для всех узлов)
  static async generatePlan(startDate, endDate, nodeIds = null) {
    // Если nodeIds не передан – берём все узлы
    let nodes = [];
    if (nodeIds && nodeIds.length) {
      const res = await pool.query(`SELECT node_id FROM equipment.nodes WHERE node_id = ANY($1::uuid[]) AND valid_to IS NULL`, [nodeIds]);
      nodes = res.rows;
    } else {
      const res = await pool.query(`SELECT node_id FROM equipment.nodes WHERE valid_to IS NULL`);
      nodes = res.rows;
    }
    // Создаём задачи для каждого узла (тип 'плановое ТО', статус 'ожидает')
    for (const node of nodes) {
      await pool.query(`
        INSERT INTO equipment.maintenance_tasks (maintenance_id, node_id, type_id, status_id, notes)
        VALUES (
          uuid_generate_v4(),
          $1,
          (SELECT type_id FROM equipment.maintenance_types WHERE name = 'плановое ТО'),
          1,
          'Автоматически сгенерировано из плана'
        )
      `, [node.node_id]);
    }
    return { success: true, tasks_created: nodes.length };
  }
}

module.exports = Maintenance;