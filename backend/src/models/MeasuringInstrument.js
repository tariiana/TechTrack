const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const pool = db.pool || db;

const DB_TO_CLIENT_STATUS = {
  'в эксплуатации': 'в эксплуатации',
  'на поверке': 'на поверке',
  'в ремонте': 'в ремонте',
  'списано': 'списано',
};

const CLIENT_TO_DB_STATUS = {
  'в эксплуатации': 'в эксплуатации',
  'на поверке': 'на поверке',
  'в ремонте': 'в ремонте',
  'списано': 'списано',
  'РІ СЌРєСЃРїР»СѓР°С‚Р°С†РёРё': 'в эксплуатации',
  'РЅР° РїРѕРІРµСЂРєРµ': 'на поверке',
  'РІ СЂРµРјРѕРЅС‚Рµ': 'в ремонте',
  'РІС‹РІРµРґРµРЅРѕ': 'списано',
  'СЃРїРёСЃР°РЅРѕ': 'списано',
};

const DB_TO_CLIENT_RESULT = {
  'годен': 'годен',
  'не годен': 'не годен',
};

const CLIENT_TO_DB_RESULT = {
  'годен': 'годен',
  'не годен': 'не годен',
  'РіРѕРґРµРЅ': 'годен',
  'РЅРµ РіРѕРґРµРЅ': 'не годен',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DB_STATUSES = new Set(Object.values(DB_TO_CLIENT_STATUS));
const DB_RESULTS = new Set(Object.values(CLIENT_TO_DB_RESULT));

function normalizeDate(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}

function valueOrFallback(value, fallback) {
  return value === undefined ? fallback : value;
}

function makeHttpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function assertUuid(value, fieldName = 'id') {
  if (!UUID_RE.test(String(value || ''))) {
    throw makeHttpError(`Некорректный UUID: ${fieldName}`);
  }
}

function assertNonEmpty(value, message) {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw makeHttpError(message);
  }
}

function assertPositiveNumber(value, message) {
  if (value === undefined || value === null || Number(value) <= 0 || Number.isNaN(Number(value))) {
    throw makeHttpError(message);
  }
}

function assertDate(value, fieldName) {
  const date = normalizeDate(value);
  if (!date || Number.isNaN(new Date(date).getTime())) {
    throw makeHttpError(`Некорректная дата: ${fieldName}`);
  }
  return date;
}

function assertDateOrder(transferDate, receiptDate) {
  const transfer = normalizeDate(transferDate);
  const receipt = normalizeDate(receiptDate);
  if (transfer && receipt && transfer > receipt) {
    throw makeHttpError('Дата передачи не может быть позже даты получения');
  }
}

function normalizeStatus(status, fallback = 'в эксплуатации') {
  if (!status) return fallback;
  const text = String(status).trim();
  const normalized = CLIENT_TO_DB_STATUS[text] || CLIENT_TO_DB_STATUS[text.toLowerCase()] || text;
  if (!DB_STATUSES.has(normalized)) {
    throw makeHttpError(`Недопустимый статус СИ: ${status}`);
  }
  return normalized;
}

function normalizeResult(result) {
  if (!result) return 'годен';
  const text = String(result).trim();
  const normalized = CLIENT_TO_DB_RESULT[text] || CLIENT_TO_DB_RESULT[text.toLowerCase()] || text;
  if (!DB_RESULTS.has(normalized)) {
    throw makeHttpError(`Недопустимый результат поверки: ${result}`);
  }
  return normalized;
}

function toClientStatus(status) {
  return DB_TO_CLIENT_STATUS[status] || status;
}

function toClientResult(result) {
  return DB_TO_CLIENT_RESULT[result] || result;
}

function parseVerificationNotes(notes, fallbackDate = null) {
  const fallback = normalizeDate(fallbackDate);
  if (!notes) {
    return {
      transferDate: fallback,
      receiptDate: fallback,
      notes: null,
    };
  }

  try {
    const parsed = JSON.parse(notes);
    if (parsed && parsed.__siVerification === true) {
      return {
        transferDate: normalizeDate(parsed.transferDate) || fallback,
        receiptDate: normalizeDate(parsed.receiptDate) || fallback,
        notes: parsed.notes || null,
      };
    }
  } catch (err) {
    // Старые записи хранили в notes обычный текст.
  }

  return {
    transferDate: fallback,
    receiptDate: fallback,
    notes,
  };
}

function serializeVerificationNotes(data) {
  const notes = data.notes ?? data.note ?? null;
  return JSON.stringify({
    __siVerification: true,
    transferDate: normalizeDate(data.transferDate || data.calibrationDate || data.receiptDate),
    receiptDate: normalizeDate(data.receiptDate || data.calibrationDate || data.transferDate),
    notes,
  });
}

function normalizeInstrument(row) {
  if (!row) return null;

  const status = toClientStatus(row.dbStatus);
  const lastVerificationDate = normalizeDate(row.lastVerificationDate);
  const nextVerificationDate = normalizeDate(row.nextVerificationDate);
  const verificationNotes = parseVerificationNotes(row.lastVerificationNotes, lastVerificationDate);

  return {
    ...row,
    id: row.id,
    nodeId: row.nodeId,
    node_id: row.nodeId,
    tabNumber: row.tabNumber,
    tab_number: row.tabNumber,
    serialNumber: row.serialNumber,
    serial_number: row.serialNumber,
    inventoryNumber: row.inventoryNumber,
    inventory_number: row.inventoryNumber,
    registrationNumber: row.registrationNumber,
    registration_number: row.registrationNumber,
    productionDate: normalizeDate(row.productionDate),
    manufactured_date: normalizeDate(row.productionDate),
    lastVerificationDate,
    last_verification_date: lastVerificationDate,
    nextVerificationDate,
    next_verification_date: nextVerificationDate,
    verificationInterval: Number(row.verificationInterval || 1),
    calibration_interval: Number(row.verificationInterval || 1),
    verifier: row.verifier,
    calibrator: row.verifier,
    status,
    instrumentStatus: row.dbStatus,
    instrument_status: row.dbStatus,
    nodeStatus: row.nodeStatus,
    node_status: row.nodeStatus,
    typeId: row.typeId,
    typeName: row.typeName,
    nodeTypeId: row.typeId,
    nodeTypeName: row.typeName,
    subsystemId: row.subsystemId,
    subsystemName: row.subsystemName,
    mainParams: row.mainParams || {},
    parameters: row.mainParams || {},
    additionalData: row.mainParams || {},
    notes: row.notes,
    note: row.notes,
    transferDate: verificationNotes.transferDate,
    receiptDate: verificationNotes.receiptDate,
    isDeleted: row.dbStatus === 'списано',
    is_deleted: row.dbStatus === 'списано',
  };
}

function normalizeVerification(row, interval) {
  if (!row) return null;

  const calibrationDate = normalizeDate(row.calibrationDate);
  const nextCalibrationDate = normalizeDate(row.nextCalibrationDate);
  const verificationNotes = parseVerificationNotes(row.notes, calibrationDate);

  return {
    ...row,
    id: row.id,
    siId: row.siId,
    si_id: row.siId,
    nodeId: row.siId,
    node_id: row.siId,
    calibrationDate,
    calibration_date: calibrationDate,
    transferDate: verificationNotes.transferDate,
    receiptDate: verificationNotes.receiptDate,
    verifier: row.verifier,
    calibrator: row.verifier,
    certificateNumber: row.certificateNumber,
    certificate_number: row.certificateNumber,
    nextCalibrationDate,
    next_calibration_date: nextCalibrationDate,
    verificationInterval: Number(interval || row.verificationInterval || 1),
    result: toClientResult(row.result),
    dbResult: row.result,
    notes: verificationNotes.notes,
  };
}

function hasAny(data, fields) {
  return fields.some((field) => data[field] !== undefined);
}

function getTabNumber(data) {
  return data.tabNumber || data.tab_number;
}

function getCalibrationInterval(data) {
  return data.verificationInterval ?? data.calibration_interval;
}

function validateInstrumentInput(data, { create = false } = {}) {
  if (create) {
    assertNonEmpty(getTabNumber(data), 'Укажите табельный номер СИ');
    assertPositiveNumber(getCalibrationInterval(data), 'Межповерочный интервал должен быть больше 0');
  }

  if (data.nodeId || data.node_id) assertUuid(data.nodeId || data.node_id, 'nodeId');
  if (data.nodeTypeId || data.node_type_id || data.typeId) assertUuid(data.nodeTypeId || data.node_type_id || data.typeId, 'nodeTypeId');
  if (data.subsystemId || data.subsystem_id || data.subsys_id) assertUuid(data.subsystemId || data.subsystem_id || data.subsys_id, 'subsystemId');
  if (data.installed_in_node || data.parentId) assertUuid(data.installed_in_node || data.parentId, 'installed_in_node');
  if (getCalibrationInterval(data) !== undefined) {
    assertPositiveNumber(getCalibrationInterval(data), 'Межповерочный интервал должен быть больше 0');
  }
  if (data.status !== undefined) normalizeStatus(data.status);
  if (getTabNumber(data) !== undefined) assertNonEmpty(getTabNumber(data), 'Укажите табельный номер СИ');
}

function validateVerificationInput(data, { create = false } = {}) {
  if (create) {
    const date = data.receiptDate || data.calibrationDate || data.lastVerificationDate || data.transferDate;
    assertDate(date, 'дата поверки');
  }

  if (data.transferDate !== undefined) assertDate(data.transferDate, 'Дата передачи');
  if (data.receiptDate !== undefined) assertDate(data.receiptDate, 'Дата получения');
  if (data.calibrationDate !== undefined) assertDate(data.calibrationDate, 'Дата поверки');
  if (data.lastVerificationDate !== undefined) assertDate(data.lastVerificationDate, 'Дата последней поверки');
  assertDateOrder(data.transferDate, data.receiptDate);

  if (data.result !== undefined) normalizeResult(data.result);
  if (create) assertNonEmpty(data.verifier || data.calibrator, 'Укажите поверителя');
}

function parseBoolean(value) {
  if (value === undefined || value === null || value === '') return null;
  return ['true', '1', 'yes', 'да'].includes(String(value).toLowerCase());
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

class MeasuringInstrument {
  static baseSelect() {
    return `
      SELECT
        n.node_id AS "id",
        n.node_id AS "nodeId",
        n.node_type_id AS "typeId",
        nt.name AS "typeName",
        n.name,
        n.name AS "nodeName",
        n.manufacturer,
        n.model,
        n.manufactured_date AS "productionDate",
        n.serial_number AS "serialNumber",
        n.inventory_number AS "inventoryNumber",
        n.registration_number AS "registrationNumber",
        n.status AS "nodeStatus",
        n.location,
        n.parameters AS "mainParams",
        n.note AS "notes",
        n.subsystem_id AS "subsystemId",
        s.name AS "subsystemName",
        i.tab_number AS "tabNumber",
        i.calibration_interval::float AS "verificationInterval",
        i.status AS "dbStatus",
        last_cal.calibration_date AS "lastVerificationDate",
        (last_cal.calibration_date + (i.calibration_interval * INTERVAL '1 year'))::date AS "nextVerificationDate",
        last_cal.calibrator AS "verifier",
        last_cal.certificate_number AS "certificateNumber",
        last_cal.result AS "lastVerificationResult",
        last_cal.notes AS "lastVerificationNotes"
      FROM equipment.nodes n
      JOIN equipment.instruments_history i
        ON i.node_id = n.node_id
       AND i.valid_to IS NULL
      LEFT JOIN equipment.node_types nt ON nt.node_type_id = n.node_type_id
      LEFT JOIN equipment.subsystems s ON s.subsys_id = n.subsystem_id
      LEFT JOIN LATERAL (
        SELECT ch.*
        FROM equipment.calibration_history ch
        WHERE ch.node_id = n.node_id
        ORDER BY ch.calibration_date DESC, ch.performed_at DESC
        LIMIT 1
      ) last_cal ON true
    `;
  }

  static async getAll(filters = {}) {
    const where = [];
    const values = [];
    let idx = 1;
    const nextDateSql = `(last_cal.calibration_date + (i.calibration_interval * INTERVAL '1 year'))::date`;

    if (filters.search) {
      where.push(`(
        n.name ILIKE $${idx}
        OR n.manufacturer ILIKE $${idx}
        OR n.model ILIKE $${idx}
        OR n.serial_number ILIKE $${idx}
        OR n.inventory_number ILIKE $${idx}
        OR i.tab_number ILIKE $${idx}
      )`);
      values.push(`%${filters.search}%`);
      idx++;
    }

    if (filters.status) {
      where.push(`i.status = $${idx}`);
      values.push(normalizeStatus(filters.status));
      idx++;
    }

    if (filters.verifier || filters.calibrator) {
      where.push(`last_cal.calibrator ILIKE $${idx}`);
      values.push(`%${filters.verifier || filters.calibrator}%`);
      idx++;
    }

    if (filters.result) {
      where.push(`last_cal.result = $${idx}`);
      values.push(normalizeResult(filters.result));
      idx++;
    }

    if (filters.nextCalibrationFrom) {
      where.push(`${nextDateSql} >= $${idx}::date`);
      values.push(assertDate(filters.nextCalibrationFrom, 'nextCalibrationFrom'));
      idx++;
    }

    if (filters.nextCalibrationTo) {
      where.push(`${nextDateSql} <= $${idx}::date`);
      values.push(assertDate(filters.nextCalibrationTo, 'nextCalibrationTo'));
      idx++;
    }

    const dueWithinDays = parsePositiveInteger(filters.dueWithinDays || filters.days, 30);
    const overdue = parseBoolean(filters.overdue);
    if (overdue === true) {
      where.push(`${nextDateSql} < CURRENT_DATE`);
      where.push(`i.status <> 'списано'`);
    }

    const verificationStatus = filters.verificationStatus || filters.verification_status;
    if (verificationStatus) {
      if (verificationStatus === 'overdue') {
        where.push(`${nextDateSql} < CURRENT_DATE`);
        where.push(`i.status <> 'списано'`);
      } else if (verificationStatus === 'upcoming') {
        where.push(`${nextDateSql} >= CURRENT_DATE`);
        where.push(`${nextDateSql} <= CURRENT_DATE + ($${idx}::int * INTERVAL '1 day')`);
        where.push(`i.status <> 'списано'`);
        values.push(dueWithinDays);
        idx++;
      } else if (verificationStatus === 'valid') {
        where.push(`${nextDateSql} > CURRENT_DATE + ($${idx}::int * INTERVAL '1 day')`);
        where.push(`i.status <> 'списано'`);
        values.push(dueWithinDays);
        idx++;
      } else if (verificationStatus === 'no_verification') {
        where.push(`last_cal.calibration_date IS NULL`);
      } else {
        throw makeHttpError(`Недопустимый фильтр срока поверки: ${verificationStatus}`);
      }
    } else if (filters.dueWithinDays !== undefined) {
      where.push(`${nextDateSql} >= CURRENT_DATE`);
      where.push(`${nextDateSql} <= CURRENT_DATE + ($${idx}::int * INTERVAL '1 day')`);
      where.push(`i.status <> 'списано'`);
      values.push(dueWithinDays);
      idx++;
    }

    const sortMap = {
      name: 'n.name',
      tabNumber: 'i.tab_number',
      tab_number: 'i.tab_number',
      status: 'i.status',
      verifier: 'last_cal.calibrator',
      lastVerificationDate: 'last_cal.calibration_date',
      last_verification_date: 'last_cal.calibration_date',
      nextVerificationDate: nextDateSql,
      next_verification_date: nextDateSql,
    };
    const sortBy = sortMap[filters.sortBy] || sortMap[filters.sort_by] || sortMap.name;
    const sortDir = String(filters.sortDir || filters.sort_dir || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const result = await pool.query(`
      ${MeasuringInstrument.baseSelect()}
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY ${sortBy} ${sortDir} NULLS LAST, n.name NULLS LAST, i.tab_number
    `, values);

    return result.rows.map(normalizeInstrument);
  }

  static async getUpcoming(days = 30) {
    return MeasuringInstrument.getAll({
      verificationStatus: 'upcoming',
      dueWithinDays: parsePositiveInteger(days, 30),
      sortBy: 'nextVerificationDate',
      sortDir: 'asc',
    });
  }

  static async getById(id) {
    assertUuid(id);
    const result = await pool.query(`
      ${MeasuringInstrument.baseSelect()}
      WHERE n.node_id = $1
      LIMIT 1
    `, [id]);

    return normalizeInstrument(result.rows[0]);
  }

  static async getCurrentNode(client, nodeId) {
    assertUuid(nodeId, 'nodeId');
    const result = await client.query(`
      SELECT *
      FROM equipment.nodes
      WHERE node_id = $1
      LIMIT 1
    `, [nodeId]);

    return result.rows[0] || null;
  }

  static async getCurrentInstrument(client, nodeId) {
    assertUuid(nodeId, 'nodeId');
    const result = await client.query(`
      SELECT *
      FROM equipment.instruments_history
      WHERE node_id = $1 AND valid_to IS NULL
      LIMIT 1
    `, [nodeId]);

    return result.rows[0] || null;
  }

  static async resolveNodeTypeId(client, data, currentNode = null) {
    const explicit = data.node_type_id || data.nodeTypeId || data.typeId;
    if (explicit) return explicit;

    const typeName = data.node_type_name || data.nodeTypeName || data.typeName;
    if (typeName) {
      const byName = await client.query(`
        SELECT node_type_id
        FROM equipment.node_types
        WHERE name = $1
        LIMIT 1
      `, [typeName]);
      if (byName.rows[0]) return byName.rows[0].node_type_id;
    }

    if (currentNode?.node_type_id) return currentNode.node_type_id;

    throw makeHttpError('Укажите вид узла для создания СИ');
  }

  static async resolveSubsystemId(client, data, currentNode = null) {
    const explicit = data.subsystem_id || data.subsystemId || data.subsys_id;
    if (explicit) return explicit;

    if (data.subsystem_name || data.subsystemName) {
      const byName = await client.query(`
        SELECT subsys_id
        FROM equipment.subsystems
        WHERE name = $1
        LIMIT 1
      `, [data.subsystem_name || data.subsystemName]);
      if (byName.rows[0]) return byName.rows[0].subsys_id;
    }

    if (currentNode?.subsystem_id) return currentNode.subsystem_id;

    throw makeHttpError('Укажите подсистему для создания СИ');
  }

  static async buildNodeValues(client, nodeId, data, currentNode = null, userId = null) {
    const nodeTypeId = await MeasuringInstrument.resolveNodeTypeId(client, data, currentNode);
    const subsystemId = await MeasuringInstrument.resolveSubsystemId(client, data, currentNode);

    return {
      node_id: nodeId,
      node_type_id: nodeTypeId,
      name: valueOrFallback(data.name, currentNode?.name || ''),
      manufacturer: valueOrFallback(data.manufacturer, currentNode?.manufacturer || ''),
      model: valueOrFallback(data.model, currentNode?.model || ''),
      manufactured_date: normalizeDate(valueOrFallback(data.manufactured_date, valueOrFallback(data.productionDate, currentNode?.manufactured_date))),
      serial_number: valueOrFallback(data.serial_number, valueOrFallback(data.serialNumber, currentNode?.serial_number || null)),
      inventory_number: valueOrFallback(data.inventory_number, valueOrFallback(data.inventoryNumber, currentNode?.inventory_number || null)),
      registration_number: valueOrFallback(data.registration_number, valueOrFallback(data.registrationNumber, currentNode?.registration_number || null)),
      status: valueOrFallback(data.nodeStatus, currentNode?.status || 'исправен'),
      commission_date: normalizeDate(valueOrFallback(data.commission_date, currentNode?.commission_date || null)),
      operation_mode: valueOrFallback(data.operation_mode, currentNode?.operation_mode || null),
      decommission_date: normalizeDate(valueOrFallback(data.decommission_date, currentNode?.decommission_date || null)),
      write_off_date: normalizeDate(valueOrFallback(data.write_off_date, currentNode?.write_off_date || null)),
      location: valueOrFallback(data.location, currentNode?.location || ''),
      parameters: valueOrFallback(data.parameters, valueOrFallback(data.mainParams, currentNode?.parameters || {})),
      note: valueOrFallback(data.note, valueOrFallback(data.notes, currentNode?.note || null)),
      installed_in_node: valueOrFallback(data.installed_in_node, valueOrFallback(data.parentId, currentNode?.installed_in_node || null)),
      subsystem_id: subsystemId,
      created_by_user: userId || null,
    };
  }

  static async insertNodeHistory(client, values) {
    await client.query(`
      INSERT INTO equipment.nodes_history (
        node_id,
        node_type_id,
        name,
        manufacturer,
        model,
        manufactured_date,
        serial_number,
        inventory_number,
        registration_number,
        status,
        commission_date,
        operation_mode,
        decommission_date,
        write_off_date,
        location,
        parameters,
        note,
        installed_in_node,
        subsystem_id,
        valid_from,
        created_by_user
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19,
        CURRENT_TIMESTAMP, $20
      )
    `, [
      values.node_id,
      values.node_type_id,
      values.name,
      values.manufacturer,
      values.model,
      values.manufactured_date,
      values.serial_number,
      values.inventory_number,
      values.registration_number,
      values.status,
      values.commission_date,
      values.operation_mode,
      values.decommission_date,
      values.write_off_date,
      values.location,
      values.parameters,
      values.note,
      values.installed_in_node,
      values.subsystem_id,
      values.created_by_user,
    ]);
  }

  static async replaceNodeHistory(client, nodeId, data, userId) {
    const currentNode = await MeasuringInstrument.getCurrentNode(client, nodeId);
    if (!currentNode) throw makeHttpError('Узел для СИ не найден', 404);

    const values = await MeasuringInstrument.buildNodeValues(client, nodeId, data, currentNode, userId);

    await client.query(`
      UPDATE equipment.nodes_history
      SET valid_to = CURRENT_TIMESTAMP
      WHERE node_id = $1 AND valid_to IS NULL
    `, [nodeId]);

    await MeasuringInstrument.insertNodeHistory(client, values);
  }

  static async replaceInstrumentHistory(client, nodeId, data, currentInstrument = null, userId = null) {
    const instrument = currentInstrument || await MeasuringInstrument.getCurrentInstrument(client, nodeId);
    if (!instrument) throw makeHttpError('СИ не найдено', 404);

    const tabNumber = valueOrFallback(data.tab_number, valueOrFallback(data.tabNumber, instrument.tab_number));
    const calibrationInterval = valueOrFallback(data.calibration_interval, valueOrFallback(data.verificationInterval, instrument.calibration_interval));
    const status = normalizeStatus(valueOrFallback(data.status, instrument.status), instrument.status);

    await client.query(`
      UPDATE equipment.instruments_history
      SET valid_to = CURRENT_TIMESTAMP
      WHERE node_id = $1 AND valid_to IS NULL
    `, [nodeId]);

    await client.query(`
      INSERT INTO equipment.instruments_history (
        node_id,
        tab_number,
        calibration_interval,
        status,
        valid_from,
        created_by_user
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
    `, [
      nodeId,
      tabNumber,
      calibrationInterval || 1,
      status,
      userId || null,
    ]);
  }

  static assertInstrumentIsActive(instrument) {
    if (!instrument) throw makeHttpError('СИ не найдено', 404);
    if (instrument.status === 'списано') {
      throw makeHttpError('Операция недоступна для списанного СИ', 409);
    }
  }

  static async addCalibration(client, nodeId, data, userId = null) {
    validateVerificationInput(data, { create: true });
    const calibrationDate = normalizeDate(data.calibrationDate || data.receiptDate || data.lastVerificationDate || data.transferDate);
    if (!calibrationDate) return null;

    const calibrator = data.calibrator || data.verifier || 'Не указан';
    const result = normalizeResult(data.result);

    const inserted = await client.query(`
      INSERT INTO equipment.calibration_history (
        history_id,
        node_id,
        calibration_date,
        calibrator,
        certificate_number,
        result,
        notes,
        performed_by_user
      ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7)
      RETURNING
        history_id AS "id",
        node_id AS "siId",
        calibration_date AS "calibrationDate",
        calibrator AS "verifier",
        certificate_number AS "certificateNumber",
        result,
        notes
    `, [
      nodeId,
      calibrationDate,
      calibrator,
      data.certificateNumber || data.certificate_number || null,
      result,
      serializeVerificationNotes({
        ...data,
        receiptDate: data.receiptDate || calibrationDate,
        transferDate: data.transferDate || calibrationDate,
      }),
      userId || null,
    ]);

    return normalizeVerification(inserted.rows[0], data.verificationInterval);
  }

  static async create(data, userId = null) {
    validateInstrumentInput(data, { create: true });
    const client = await pool.connect();
    let nodeId = data.nodeId || data.node_id;
    if (nodeId) assertUuid(nodeId, 'nodeId');
    else nodeId = uuidv4();

    try {
      await client.query('BEGIN');

      let currentNode = await MeasuringInstrument.getCurrentNode(client, nodeId);
      if (!currentNode) {
        nodeId = nodeId || uuidv4();
        const nodeValues = await MeasuringInstrument.buildNodeValues(client, nodeId, data, null, userId);
        await MeasuringInstrument.insertNodeHistory(client, nodeValues);
      } else if (hasAny(data, [
        'name', 'manufacturer', 'model', 'productionDate', 'manufactured_date',
        'serialNumber', 'serial_number', 'inventoryNumber', 'inventory_number',
        'registrationNumber', 'registration_number', 'location', 'mainParams',
        'parameters', 'notes', 'note', 'typeId', 'typeName', 'nodeTypeId',
        'subsystemId', 'subsystem_id',
      ])) {
        await MeasuringInstrument.replaceNodeHistory(client, nodeId, data, userId);
        currentNode = await MeasuringInstrument.getCurrentNode(client, nodeId);
      }

      const existingInstrument = await MeasuringInstrument.getCurrentInstrument(client, nodeId);
      if (existingInstrument) {
        throw makeHttpError('Для этого узла уже заведено СИ', 409);
      }

      await client.query(`
        INSERT INTO equipment.instruments_history (
          node_id,
          tab_number,
          calibration_interval,
          status,
          valid_from,
          created_by_user
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
      `, [
        nodeId,
        getTabNumber(data),
        getCalibrationInterval(data),
        normalizeStatus(data.status),
        userId || null,
      ]);

      await MeasuringInstrument.addCalibration(client, nodeId, data, userId);

      await client.query('COMMIT');
      return await MeasuringInstrument.getById(nodeId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async update(id, data, userId = null) {
    assertUuid(id);
    validateInstrumentInput(data);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const currentNode = await MeasuringInstrument.getCurrentNode(client, id);
      const currentInstrument = await MeasuringInstrument.getCurrentInstrument(client, id);

      if (!currentNode || !currentInstrument) {
        await client.query('ROLLBACK');
        return null;
      }
      MeasuringInstrument.assertInstrumentIsActive(currentInstrument);

      if (hasAny(data, [
        'name', 'manufacturer', 'model', 'productionDate', 'manufactured_date',
        'serialNumber', 'serial_number', 'inventoryNumber', 'inventory_number',
        'registrationNumber', 'registration_number', 'location', 'mainParams',
        'parameters', 'notes', 'note', 'typeId', 'typeName', 'nodeTypeId',
        'subsystemId', 'subsystem_id', 'nodeStatus',
      ])) {
        await MeasuringInstrument.replaceNodeHistory(client, id, data, userId);
      }

      if (hasAny(data, ['tabNumber', 'tab_number', 'verificationInterval', 'calibration_interval', 'status'])) {
        await MeasuringInstrument.replaceInstrumentHistory(client, id, data, currentInstrument, userId);
      }

      const lastCalibration = await client.query(`
        SELECT calibration_date
        FROM equipment.calibration_history
        WHERE node_id = $1
        ORDER BY calibration_date DESC, performed_at DESC
        LIMIT 1
      `, [id]);
      const requestedDate = normalizeDate(data.calibrationDate || data.receiptDate || data.lastVerificationDate);
      const currentDate = normalizeDate(lastCalibration.rows[0]?.calibration_date);
      if (requestedDate && requestedDate !== currentDate) {
        await MeasuringInstrument.addCalibration(client, id, data, userId);
      }

      await client.query('COMMIT');
      return await MeasuringInstrument.getById(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async writeOff(id, userId = null) {
    assertUuid(id);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const currentInstrument = await MeasuringInstrument.getCurrentInstrument(client, id);
      if (!currentInstrument) {
        await client.query('ROLLBACK');
        return null;
      }
      if (currentInstrument.status === 'списано') {
        await client.query('ROLLBACK');
        return await MeasuringInstrument.getById(id);
      }

      await MeasuringInstrument.replaceInstrumentHistory(client, id, { status: 'списано' }, currentInstrument, userId);

      const currentNode = await MeasuringInstrument.getCurrentNode(client, id);
      if (currentNode) {
        await MeasuringInstrument.replaceNodeHistory(client, id, {
          nodeStatus: 'списан',
          write_off_date: new Date().toISOString().slice(0, 10),
        }, userId);
      }

      await client.query('COMMIT');
      return await MeasuringInstrument.getById(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async getVerifications(instrumentId) {
    assertUuid(instrumentId, 'instrumentId');
    const instrument = await MeasuringInstrument.getById(instrumentId);
    if (!instrument) return [];

    const result = await pool.query(`
      SELECT
        ch.history_id AS "id",
        ch.node_id AS "siId",
        ch.calibration_date AS "calibrationDate",
        (ch.calibration_date + ($2::numeric * INTERVAL '1 year'))::date AS "nextCalibrationDate",
        ch.calibrator AS "verifier",
        ch.certificate_number AS "certificateNumber",
        ch.result,
        ch.notes
      FROM equipment.calibration_history ch
      WHERE ch.node_id = $1
      ORDER BY ch.calibration_date DESC, ch.performed_at DESC
    `, [instrumentId, instrument.verificationInterval || 1]);

    return result.rows.map((row) => normalizeVerification(row, instrument.verificationInterval));
  }

  static async addVerification(instrumentId, data, userId = null) {
    assertUuid(instrumentId, 'instrumentId');
    validateVerificationInput(data, { create: true });
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const instrument = await MeasuringInstrument.getCurrentInstrument(client, instrumentId);
      MeasuringInstrument.assertInstrumentIsActive(instrument);

      const verification = await MeasuringInstrument.addCalibration(client, instrumentId, {
        ...data,
        verificationInterval: instrument.calibration_interval,
      }, userId);
      if (!verification) throw makeHttpError('Укажите дату поверки');

      if (normalizeResult(data.result) === 'годен' && instrument.status !== 'в эксплуатации') {
        await MeasuringInstrument.replaceInstrumentHistory(
          client,
          instrumentId,
          { status: 'в эксплуатации' },
          instrument,
          userId
        );
      }

      await client.query('COMMIT');
      return verification;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async updateVerification(instrumentId, verificationId, data, userId = null) {
    assertUuid(instrumentId, 'instrumentId');
    assertUuid(verificationId, 'verificationId');
    validateVerificationInput(data);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const instrument = await MeasuringInstrument.getCurrentInstrument(client, instrumentId);
      MeasuringInstrument.assertInstrumentIsActive(instrument);

      const current = await client.query(`
        SELECT *
        FROM equipment.calibration_history
        WHERE history_id = $1 AND node_id = $2
        LIMIT 1
      `, [verificationId, instrumentId]);
      if (!current.rows[0]) throw makeHttpError('Поверка не найдена', 404);

      const oldNotes = parseVerificationNotes(current.rows[0].notes, current.rows[0].calibration_date);
      const receiptDate = normalizeDate(data.receiptDate || data.calibrationDate || current.rows[0].calibration_date);
      const transferDate = normalizeDate(data.transferDate || oldNotes.transferDate || receiptDate);
      const result = normalizeResult(data.result || current.rows[0].result);

      const updated = await client.query(`
        UPDATE equipment.calibration_history
        SET
          calibration_date = $1,
          calibrator = $2,
          certificate_number = $3,
          result = $4,
          notes = $5,
          performed_by_user = COALESCE($6, performed_by_user),
          performed_at = CURRENT_TIMESTAMP
        WHERE history_id = $7 AND node_id = $8
        RETURNING
          history_id AS "id",
          node_id AS "siId",
          calibration_date AS "calibrationDate",
          calibrator AS "verifier",
          certificate_number AS "certificateNumber",
          result,
          notes
      `, [
        receiptDate,
        data.verifier || data.calibrator || current.rows[0].calibrator,
        data.certificateNumber || data.certificate_number || current.rows[0].certificate_number || null,
        result,
        serializeVerificationNotes({
          transferDate,
          receiptDate,
          notes: data.notes ?? data.note ?? oldNotes.notes,
        }),
        userId || null,
        verificationId,
        instrumentId,
      ]);

      if (result === 'годен' && instrument.status !== 'в эксплуатации') {
        await MeasuringInstrument.replaceInstrumentHistory(
          client,
          instrumentId,
          { status: 'в эксплуатации' },
          instrument,
          userId
        );
      }

      await client.query('COMMIT');
      return normalizeVerification(updated.rows[0], instrument.calibration_interval);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = MeasuringInstrument;
