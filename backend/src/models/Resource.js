const db = require('../config/db');

const RESERVED_PARAM_KEYS = new Set([
  'name',
  'mark',
  'type',
  'production_date',
  'registration_number',
  'last_service_date',
  'service_life',
  'time_to_service',
  'initial_resource',
  'remaining_resource',
  'installed_in',
  'location',
]);

function normalizeDate(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const match = String(value).replace(',', '.').match(/-?\d+(\.\d+)?/);
  if (!match) return null;

  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function isBlank(value) {
  return value === null || value === undefined || value === '';
}

function normalizeParams(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
}

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source || {}, key);
}

function pickValue(params, key, fallback = null) {
  const value = params[key];
  if (value && typeof value === 'object' && !Array.isArray(value) && hasOwn(value, 'value')) {
    return value.value;
  }
  return !isBlank(value) ? value : fallback;
}

function firstPresent(...values) {
  for (const value of values) {
    if (!isBlank(value)) return value;
  }
  return null;
}

function getMeasurementValue(params, ...keys) {
  for (const key of keys) {
    const value = pickValue(params, key);
    if (!isBlank(value)) return value;
  }
  return null;
}

function buildMeasurement(row, index = 0) {
  const params = normalizeParams(row.resource_params);
  const voltage = getMeasurementValue(params, 'voltage', 'U');
  const resistance = getMeasurementValue(params, 'resistance', 'R');
  const capacity = getMeasurementValue(params, 'capacity', 'C', 'E');
  const health = getMeasurementValue(params, 'health', 'remaining_resource', 'remaining_life', 'battery_level');
  const measurementDate = normalizeDate(row.registration_date || row.valid_from);
  const createdAt = row.valid_from || row.registration_date || new Date().toISOString();

  return {
    id: new Date(createdAt).getTime() + index,
    measurement_date: measurementDate,
    parameters: {
      ...params,
      voltage,
      resistance,
      capacity,
      health,
      U: voltage,
      R: resistance,
      C: capacity,
      E: capacity,
    },
    note: row.note || null,
    created_at: createdAt,
  };
}

function mapResource(row) {
  if (!row) return null;

  const params = normalizeParams(row.resource_params);
  const name = pickValue(params, 'name', row.node_name);
  const mark = pickValue(params, 'mark', row.node_model);
  const type = pickValue(params, 'type', row.node_type_name);
  const productionDate = normalizeDate(pickValue(params, 'production_date'));
  const registrationDate = normalizeDate(row.registration_date);
  const lastServiceDate = normalizeDate(pickValue(params, 'last_service_date'));
  const location = pickValue(params, 'location', row.node_location);
  const installedIn = pickValue(params, 'installed_in', row.installed_in_node_name);
  const remainingResource = firstPresent(
    pickValue(params, 'remaining_resource'),
    pickValue(params, 'remaining_life'),
    pickValue(params, 'remainingLife'),
    pickValue(params, 'health'),
    pickValue(params, 'battery_level')
  );
  const initialResource = firstPresent(
    pickValue(params, 'initial_resource'),
    pickValue(params, 'initial_life'),
    pickValue(params, 'initialLife'),
    remainingResource !== null ? 100 : null
  );
  const registrationNumber = firstPresent(
    pickValue(params, 'registration_number'),
    row.node_registration_number,
    row.node_inventory_number
  );
  const resourceParams = {
    ...params,
    measurements: Array.isArray(params.measurements) ? params.measurements : [],
  };

  return {
    node_id: row.node_id,
    nodeId: row.node_id,
    resource_id: row.node_id,
    id: row.node_id,
    node_name: row.node_name,
    nodeName: row.node_name,
    node_manufacturer: row.node_manufacturer,
    node_model: row.node_model,
    node_location: row.node_location,
    node_status: row.node_status,
    manufacturer: row.node_manufacturer,
    registrationNumber,
    inventory_number: row.node_inventory_number,
    name,
    mark,
    type,
    production_date: productionDate,
    registration_date: registrationDate,
    registration_number: registrationNumber,
    service_life: parseNumber(pickValue(params, 'service_life')),
    time_to_service: parseNumber(pickValue(params, 'time_to_service')),
    initial_resource: initialResource,
    remaining_resource: remainingResource,
    last_service_date: lastServiceDate,
    installed_in: installedIn,
    location,
    note: row.note,
    resource_params: resourceParams,
    created_at: row.valid_from,
    updated_at: row.valid_from,
    valid_from: row.valid_from,
    valid_to: row.valid_to,
    is_deleted: false,
  };
}

function mapResources(rows) {
  return rows.map(mapResource);
}

function baseSelect() {
  return `
    SELECT
      rh.node_id,
      rh.registration_date,
      rh.resource_params,
      rh.note,
      rh.valid_from,
      rh.valid_to,
      n.name AS node_name,
      n.manufacturer AS node_manufacturer,
      n.model AS node_model,
      n.registration_number AS node_registration_number,
      n.inventory_number AS node_inventory_number,
      n.location AS node_location,
      n.status AS node_status,
      n.operation_mode,
      nt.name AS node_type_name,
      parent.name AS installed_in_node_name
    FROM (
      SELECT DISTINCT ON (node_id) *
      FROM equipment.resources_history
      WHERE valid_to IS NULL
      ORDER BY node_id, valid_from DESC
    ) rh
    JOIN equipment.nodes n ON n.node_id = rh.node_id
    LEFT JOIN equipment.node_types nt ON nt.node_type_id = n.node_type_id
    LEFT JOIN equipment.nodes parent ON parent.node_id = n.installed_in_node
  `;
}

function buildParams(data, existingParams, node) {
  const params = { ...normalizeParams(existingParams) };
  const incomingParams = normalizeParams(data.resource_params);

  for (const [key, value] of Object.entries(incomingParams)) {
    if (RESERVED_PARAM_KEYS.has(key) && !hasOwn(data, key)) continue;
    params[key] = value;
  }

  const fallbackValues = {
    name: node?.name || null,
    mark: node?.model || null,
    location: node?.location || null,
  };

  for (const key of RESERVED_PARAM_KEYS) {
    if (hasOwn(data, key)) {
      if (data[key] === undefined) delete params[key];
      else params[key] = data[key];
    } else if (!hasOwn(params, key) && fallbackValues[key] !== undefined && fallbackValues[key] !== null) {
      params[key] = fallbackValues[key];
    }
  }

  for (const key of Object.keys(params)) {
    if (params[key] === undefined) delete params[key];
  }

  return params;
}

async function attachMeasurements(resources) {
  if (!resources.length) return resources;

  const ids = [...new Set(resources.map(resource => resource.node_id))];
  const result = await db.query(`
    SELECT
      node_id,
      registration_date,
      resource_params,
      note,
      valid_from
    FROM equipment.resources_history
    WHERE node_id = ANY($1::uuid[])
    ORDER BY node_id, registration_date DESC NULLS LAST, valid_from DESC
  `, [ids]);

  const grouped = new Map();
  for (const row of result.rows) {
    const list = grouped.get(row.node_id) || [];
    list.push(buildMeasurement(row, list.length));
    grouped.set(row.node_id, list);
  }

  return resources.map(resource => {
    const existing = Array.isArray(resource.resource_params?.measurements)
      ? resource.resource_params.measurements
      : [];
    const generated = grouped.get(resource.node_id) || [];

    return {
      ...resource,
      resource_params: {
        ...resource.resource_params,
        measurements: existing.length ? existing : generated,
      },
    };
  });
}

class Resource {
  static async getAll(filters = {}) {
    const where = ['rh.valid_to IS NULL', 'n.write_off_date IS NULL'];
    const values = [];
    let idx = 1;

    if (filters.node_id) {
      where.push(`rh.node_id = $${idx++}`);
      values.push(filters.node_id);
    }

    if (filters.search) {
      where.push(`(
        n.name ILIKE $${idx}
        OR n.manufacturer ILIKE $${idx}
        OR n.model ILIKE $${idx}
        OR COALESCE(rh.resource_params->>'name', '') ILIKE $${idx}
        OR COALESCE(rh.resource_params->>'mark', '') ILIKE $${idx}
        OR COALESCE(rh.resource_params->>'type', '') ILIKE $${idx}
        OR COALESCE(rh.resource_params->>'registration_number', '') ILIKE $${idx}
      )`);
      values.push(`%${filters.search}%`);
      idx++;
    }

    const result = await db.query(`
      ${baseSelect()}
      WHERE ${where.join(' AND ')}
      ORDER BY rh.registration_date DESC NULLS LAST, COALESCE(rh.resource_params->>'name', n.name) NULLS LAST
    `, values);

    return attachMeasurements(mapResources(result.rows));
  }

  static async getById(nodeId) {
    const result = await db.query(`
      ${baseSelect()}
      WHERE rh.node_id = $1
        AND rh.valid_to IS NULL
        AND n.write_off_date IS NULL
    `, [nodeId]);

    const [resource] = await attachMeasurements([mapResource(result.rows[0])].filter(Boolean));
    return resource || null;
  }

  static async upsert(nodeId, data, userId) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const nodeResult = await client.query(`
        SELECT node_id, name, model, location
        FROM equipment.nodes
        WHERE node_id = $1 AND write_off_date IS NULL
      `, [nodeId]);

      if (nodeResult.rows.length === 0) {
        throw new Error('Node was not found or was written off');
      }

      const currentResult = await client.query(`
        SELECT registration_date, resource_params, note
        FROM equipment.resources_history
        WHERE node_id = $1 AND valid_to IS NULL
        ORDER BY valid_from DESC
        LIMIT 1
        FOR UPDATE
      `, [nodeId]);

      const current = currentResult.rows[0] || null;
      const params = buildParams(data || {}, current?.resource_params, nodeResult.rows[0]);
      const registrationDate = data?.registration_date
        || normalizeDate(current?.registration_date)
        || new Date().toISOString().slice(0, 10);
      const note = hasOwn(data, 'note') ? (data.note || null) : (current?.note || null);

      if (current) {
        await client.query(`
          UPDATE equipment.resources_history
          SET valid_to = CURRENT_TIMESTAMP
          WHERE node_id = $1 AND valid_to IS NULL
        `, [nodeId]);
      }

      const result = await client.query(`
        INSERT INTO equipment.resources_history (
          node_id,
          registration_date,
          resource_params,
          note,
          valid_from,
          created_by_user
        ) VALUES (
          $1, $2, $3, $4, CURRENT_TIMESTAMP, $5
        )
        RETURNING node_id
      `, [nodeId, registrationDate, params, note, userId || null]);

      await client.query('COMMIT');
      return { node_id: result.rows[0].node_id, resource_id: result.rows[0].node_id };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(nodeId) {
    const result = await db.query(`
      UPDATE equipment.resources_history
      SET valid_to = CURRENT_TIMESTAMP
      WHERE node_id = $1 AND valid_to IS NULL
    `, [nodeId]);

    return { success: result.rowCount > 0 };
  }

  static async calculate(nodeId, workHoursPerYear) {
    const resource = await this.getById(nodeId);
    if (!resource) throw new Error('Resource was not found for this node');

    const serviceLife = parseNumber(resource.service_life);
    const currentRemaining = parseNumber(resource.remaining_resource);
    const yearlyHours = parseNumber(workHoursPerYear) || 8760;
    const startDate = resource.production_date || resource.registration_date;

    let calculatedPercent = currentRemaining;
    let timeToService = parseNumber(resource.time_to_service);

    if (serviceLife && startDate) {
      const elapsedMs = Date.now() - new Date(startDate).getTime();
      const yearsPassed = Math.max(0, elapsedMs / (365.25 * 24 * 60 * 60 * 1000));
      const usageFactor = Math.max(yearlyHours, 0) / 8760;
      const effectiveYearsPassed = yearsPassed * usageFactor;
      const yearsLeft = Math.max(0, serviceLife - effectiveYearsPassed);

      calculatedPercent = Math.round(Math.min(100, Math.max(0, (yearsLeft / serviceLife) * 100)));
      timeToService = Number(yearsLeft.toFixed(2));
    }

    return {
      node_id: nodeId,
      resource_id: nodeId,
      work_hours_per_year: yearlyHours,
      calculated_resource_percent: calculatedPercent,
      remaining_resource: calculatedPercent,
      time_to_service: timeToService,
      current_resource_params: resource.resource_params,
    };
  }
}

module.exports = Resource;
