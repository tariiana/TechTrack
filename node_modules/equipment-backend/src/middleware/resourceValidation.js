const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

const RESOURCE_FIELDS = new Set([
  'node_id',
  'name',
  'mark',
  'type',
  'production_date',
  'registration_date',
  'registration_number',
  'last_service_date',
  'service_life',
  'time_to_service',
  'initial_resource',
  'remaining_resource',
  'installed_in',
  'location',
  'note',
  'resource_params',
]);

const NUMERIC_FIELDS = new Set([
  'service_life',
  'time_to_service',
  'initial_resource',
  'remaining_resource',
]);

const DATE_FIELDS = new Set([
  'production_date',
  'registration_date',
  'last_service_date',
]);

const BLOCKED_PARAM_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isBlank(value) {
  return value === null || value === undefined || value === '';
}

function isIsoDate(value) {
  if (isBlank(value)) return true;
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime());
}

function isNumericValue(value) {
  if (isBlank(value)) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  return /^-?\d+([.,]\d+)?\s*%?$/.test(String(value).trim());
}

function collectParamErrors(value, path, errors) {
  if (!isPlainObject(value)) {
    errors.push(`${path} должен быть объектом`);
    return;
  }

  for (const [key, paramValue] of Object.entries(value)) {
    if (!key || BLOCKED_PARAM_KEYS.has(key)) {
      errors.push(`${path}.${key || '<empty>'} недопустимый ключ`);
      continue;
    }

    if (key.length > 80) {
      errors.push(`${path}.${key} слишком длинный ключ`);
    }

    if (paramValue === undefined) {
      errors.push(`${path}.${key} не должен быть undefined`);
    }
  }
}

function validateUuidParam(name) {
  return (req, res, next) => {
    const value = req.params[name];
    if (!UUID_RE.test(String(value || ''))) {
      return res.status(400).json({ success: false, status: 400, error: `Некорректный ${name}` });
    }
    return next();
  };
}

function validateResourcePayload(req, res, next) {
  const data = req.body || {};
  const errors = [];

  if (!isPlainObject(data)) {
    return res.status(400).json({ success: false, status: 400, error: 'Тело запроса должно быть объектом' });
  }

  for (const key of Object.keys(data)) {
    if (!RESOURCE_FIELDS.has(key)) {
      errors.push(`Поле "${key}" не поддерживается`);
    }
  }

  if (data.node_id !== undefined && String(data.node_id) !== String(req.params.nodeId)) {
    errors.push('node_id в теле запроса должен совпадать с nodeId в URL');
  }

  for (const key of DATE_FIELDS) {
    if (data[key] !== undefined && !isIsoDate(data[key])) {
      errors.push(`Поле "${key}" должно быть датой в формате YYYY-MM-DD`);
    }
  }

  for (const key of NUMERIC_FIELDS) {
    if (data[key] !== undefined && !isNumericValue(data[key])) {
      errors.push(`Поле "${key}" должно быть числом`);
    }
  }

  if (data.resource_params !== undefined) {
    collectParamErrors(data.resource_params, 'resource_params', errors);

    if (Array.isArray(data.resource_params?.measurements)) {
      for (const [index, measurement] of data.resource_params.measurements.entries()) {
        validateMeasurementShape(measurement, `resource_params.measurements[${index}]`, errors, false);
      }
    }
  }

  if (errors.length) {
    return res.status(400).json({ success: false, status: 400, error: 'Ошибка валидации', details: errors });
  }

  return next();
}

function validateMeasurementShape(measurement, path, errors, requireDate) {
  if (!isPlainObject(measurement)) {
    errors.push(`${path} должно быть объектом`);
    return;
  }

  const allowed = new Set(['id', 'measurement_date', 'parameters', 'note', 'created_at']);
  for (const key of Object.keys(measurement)) {
    if (!allowed.has(key)) errors.push(`${path}.${key} не поддерживается`);
  }

  if (requireDate && isBlank(measurement.measurement_date)) {
    errors.push(`${path}.measurement_date обязательна`);
  }

  if (measurement.measurement_date !== undefined && !isIsoDate(measurement.measurement_date)) {
    errors.push(`${path}.measurement_date должна быть датой в формате YYYY-MM-DD`);
  }

  if (measurement.parameters !== undefined) {
    collectParamErrors(measurement.parameters, `${path}.parameters`, errors);
  }
}

function validateMeasurementPayload(req, res, next) {
  const errors = [];
  validateMeasurementShape(req.body || {}, 'measurement', errors, req.method === 'POST');

  if (errors.length) {
    return res.status(400).json({ success: false, status: 400, error: 'Ошибка валидации', details: errors });
  }

  return next();
}

function validateCalculatePayload(req, res, next) {
  const value = req.body?.work_hours_per_year;
  if (value !== undefined && !isNumericValue(value)) {
    return res.status(400).json({
      success: false,
      status: 400,
      error: 'Поле "work_hours_per_year" должно быть числом',
    });
  }

  return next();
}

module.exports = {
  validateUuidParam,
  validateResourcePayload,
  validateMeasurementPayload,
  validateCalculatePayload,
};
