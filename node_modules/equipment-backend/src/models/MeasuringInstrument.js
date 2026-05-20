const pool = require('../config/db');

class MeasuringInstrument {
  // Получение списка с фильтрацией (поиск и статус)
  static async getAll(filters = {}) {
    let sql = `
    SELECT 
      instrument_id as id,
      name,
      manufacturer,
      model,
      serial_number as "serialNumber",
      inventory_number as "inventoryNumber",
      tab_number as "tabNumber",
      status,
      calibration_date as "lastVerificationDate",
      next_calibration_date as "nextVerificationDate",
      calibration_interval as "verificationInterval",
      location,
      parameters,
      note
    FROM equipment.measuring_instruments
    WHERE 1=1
  `;
    const values = [];
    let idx = 1;

    if (filters.search) {
      sql += ` AND (name ILIKE $${idx} OR tab_number ILIKE $${idx})`;
      values.push(`%${filters.search}%`);
      idx++;
    }
    if (filters.status && filters.status !== '') {
      sql += ` AND status = $${idx}`;
      values.push(filters.status);
      idx++;
    }
    sql += ` ORDER BY name`;
    const result = await pool.query(sql, values);
    return result.rows;
  }

  static async getById(id) {
    const result = await pool.query(
      `SELECT 
        instrument_id as id,
        name,
        manufacturer,
        model,
        serial_number as "serialNumber",
        inventory_number as "inventoryNumber",
        tab_number as "tabNumber",
        status,
        calibration_date as "lastVerificationDate",
        next_calibration_date as "nextVerificationDate",
        calibration_interval as "verificationInterval",
        location,
        parameters,
        note
       FROM equipment.measuring_instruments
       WHERE instrument_id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async create(data) {
    const { name, manufacturer, model, serialNumber, inventoryNumber, tabNumber,
            status, lastVerificationDate, verificationInterval, location, parameters, note } = data;
    const result = await pool.query(
      `INSERT INTO equipment.measuring_instruments
       (instrument_id, name, manufacturer, model, serial_number, inventory_number,
        tab_number, status, calibration_date, calibration_interval, location, parameters, note)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING 
        instrument_id as id,
        name,
        manufacturer,
        model,
        serial_number as "serialNumber",
        inventory_number as "inventoryNumber",
        tab_number as "tabNumber",
        status,
        calibration_date as "lastVerificationDate",
        next_calibration_date as "nextVerificationDate",
        calibration_interval as "verificationInterval",
        location,
        parameters,
        note`,
      [name, manufacturer, model, serialNumber || null, inventoryNumber || null,
       tabNumber, status || 'в эксплуатации', lastVerificationDate || null,
       verificationInterval || 1, location, parameters || {}, note || null]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let idx = 1;
    const allowed = ['name', 'manufacturer', 'model', 'serial_number', 'inventory_number',
                     'tab_number', 'status', 'calibration_date', 'calibration_interval',
                     'location', 'parameters', 'note'];
    for (const field of allowed) {
      if (data[fieldMapping(field)] !== undefined) {
        fields.push(`${field} = $${idx}`);
        values.push(data[fieldMapping(field)]);
        idx++;
      }
    }
    if (fields.length === 0) return null;
    values.push(id);
    const query = `UPDATE equipment.measuring_instruments
                   SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                   WHERE instrument_id = $${idx}
                   RETURNING 
                    instrument_id as id,
                    name,
                    manufacturer,
                    model,
                    serial_number as "serialNumber",
                    inventory_number as "inventoryNumber",
                    tab_number as "tabNumber",
                    status,
                    calibration_date as "lastVerificationDate",
                    next_calibration_date as "nextVerificationDate",
                    calibration_interval as "verificationInterval",
                    location,
                    parameters,
                    note`;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async writeOff(id) {
    const result = await pool.query(
      `UPDATE equipment.measuring_instruments
       SET status = 'списано', updated_at = CURRENT_TIMESTAMP
       WHERE instrument_id = $1
       RETURNING 
        instrument_id as id,
        name,
        status,
        next_calibration_date as "nextVerificationDate"`,
      [id]
    );
    return result.rows[0];
  }

  static async getVerifications(instrumentId) {
    const result = await pool.query(
      `SELECT 
        history_id as id,
        calibration_date as "calibrationDate",
        next_calibration_date as "nextCalibrationDate",
        calibrator,
        certificate_number as "certificateNumber",
        result,
        notes
       FROM equipment.calibration_history
       WHERE instrument_id = $1
       ORDER BY calibration_date DESC`,
      [instrumentId]
    );
    return result.rows;
  }

  static async addVerification(instrumentId, data) {
    const { calibrationDate, calibrator, certificateNumber, result, notes } = data;
    const res = await pool.query(
      `INSERT INTO equipment.calibration_history
       (history_id, instrument_id, calibration_date, calibrator, certificate_number, result, notes, performed_by_user)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7)
       RETURNING 
        history_id as id,
        calibration_date as "calibrationDate",
        calibrator,
        certificate_number as "certificateNumber",
        result,
        notes`,
      [instrumentId, calibrationDate, calibrator, certificateNumber || null, result || 'годен', notes || null, null]
    );
    // Триггер в БД сам обновит поле next_calibration_date в таблице measuring_instruments,
    // поэтому дополнительных действий не требуется.
    return res.rows[0];
  }
}

// Вспомогательная функция для маппинга camelCase -> snake_case
function fieldMapping(camel) {
  const map = {
    serialNumber: 'serial_number',
    inventoryNumber: 'inventory_number',
    tabNumber: 'tab_number',
    lastVerificationDate: 'calibration_date',
    verificationInterval: 'calibration_interval'
  };
  return map[camel] || camel;
}

module.exports = MeasuringInstrument;