const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Resource {
  // Получить все ресурсы (активные версии) с плоскими полями
  static async getAll(filters = {}) {
    let sql = `
      SELECT 
        node_id,
        registration_date,
        resource_params->>'name' AS name,
        resource_params->>'mark' AS mark,
        resource_params->>'type' AS type,
        resource_params->>'production_date' AS production_date,
        (resource_params->>'registration_number')::int AS registration_number,
        (resource_params->>'service_life')::float AS service_life,
        (resource_params->>'time_to_service')::float AS time_to_service,
        (resource_params->>'initial_resource')::float AS initial_resource,
        (resource_params->>'remaining_resource')::float AS remaining_resource,
        resource_params->>'installed_in' AS installed_in,
        resource_params->>'location' AS location,
        note,
        resource_params,
        valid_from,
        valid_to
      FROM equipment.resources_history
      WHERE valid_to IS NULL
    `;
    const values = [];
    let idx = 1;
    if (filters.node_id) {
      sql += ` AND node_id = $${idx++}`;
      values.push(filters.node_id);
    }
    sql += ` ORDER BY registration_date DESC`;
    const result = await pool.query(sql, values);
    return result.rows.map(r => ({
      ...r,
      resource_id: r.node_id,   // для совместимости с фронтом
      id: r.node_id,
    }));
  }

  // Получить ресурс по node_id
  static async getById(nodeId) {
    const result = await pool.query(`
      SELECT 
        node_id,
        registration_date,
        resource_params->>'name' AS name,
        resource_params->>'mark' AS mark,
        resource_params->>'type' AS type,
        resource_params->>'production_date' AS production_date,
        (resource_params->>'registration_number')::int AS registration_number,
        (resource_params->>'service_life')::float AS service_life,
        (resource_params->>'time_to_service')::float AS time_to_service,
        (resource_params->>'initial_resource')::float AS initial_resource,
        (resource_params->>'remaining_resource')::float AS remaining_resource,
        resource_params->>'installed_in' AS installed_in,
        resource_params->>'location' AS location,
        note,
        resource_params
      FROM equipment.resources_history
      WHERE node_id = $1 AND valid_to IS NULL
    `, [nodeId]);
    if (result.rows.length === 0) return null;
    const r = result.rows[0];
    return {
      ...r,
      resource_id: r.node_id,
      id: r.node_id,
    };
  }

  // Создать или обновить ресурс (upsert)
  static async upsert(nodeId, data, userId) {
    const {
      name, mark, type, production_date, registration_number,
      service_life, time_to_service, initial_resource, remaining_resource,
      installed_in, location, note, resource_params
    } = data;
    
    // Собираем все параметры в JSONB
    const params = {
      ...(resource_params || {}),
      name, mark, type, production_date, registration_number,
      service_life, time_to_service, initial_resource, remaining_resource,
      installed_in, location
    };
    // Удаляем undefined поля
    Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);
    
    const registrationDate = new Date().toISOString().slice(0,10);
    
    // Закрываем текущую активную версию
    await pool.query(`
      UPDATE equipment.resources_history
      SET valid_to = CURRENT_TIMESTAMP
      WHERE node_id = $1 AND valid_to IS NULL
    `, [nodeId]);
    
    // Вставляем новую версию
    await pool.query(`
      INSERT INTO equipment.resources_history (
        node_id, registration_date, resource_params, note, valid_from, created_by_user
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
    `, [nodeId, registrationDate, params, note || null, userId]);
    
    return { node_id: nodeId };
  }

  // Удалить ресурс (логически)
  static async delete(nodeId, userId) {
    await pool.query(`
      UPDATE equipment.resources_history
      SET valid_to = CURRENT_TIMESTAMP
      WHERE node_id = $1 AND valid_to IS NULL
    `, [nodeId]);
    return { success: true };
  }

  // Расчёт ресурса (пример)
  static async calculate(nodeId, workHoursPerYear) {
    const resource = await this.getById(nodeId);
    if (!resource) throw new Error('Ресурс для этого узла не найден');
    let calculatedPercent = resource.remaining_resource;
    if (resource.service_life && resource.initial_resource) {
      const consumptionPerYear = 100 / resource.service_life;
      const yearsPassed = (new Date().getFullYear() - new Date(resource.production_date || resource.registration_date).getFullYear());
      const consumed = consumptionPerYear * yearsPassed;
      calculatedPercent = Math.max(0, resource.initial_resource - consumed);
      calculatedPercent = Math.min(100, calculatedPercent);
    }
    return {
      node_id: nodeId,
      calculated_resource_percent: Math.round(calculatedPercent),
      work_hours_per_year: workHoursPerYear
    };
  }
}

module.exports = Resource;