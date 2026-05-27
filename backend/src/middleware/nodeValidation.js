const { validate: isUuid } = require('uuid');

// Допускаются как нормальные русские статусы, так и унаследованные строки,
// которые уже могли попасть в БД из-за проблем с кодировкой.
const NODE_STATUSES = new Set([
  'получен',
  'исправен',
  'неисправен',
  'в ремонте',
  'на поверке',
  'законсервирован',
  'списан',
  'РїРѕР»СѓС‡РµРЅ',
  'РёСЃРїСЂР°РІРµРЅ',
  'РЅРµРёСЃРїСЂР°РІРµРЅ',
  'РІ СЂРµРјРѕРЅС‚Рµ',
  'РЅР° РїРѕРІРµСЂРєРµ',
  'Р·Р°РєРѕРЅСЃРµСЂРІРёСЂРѕРІР°РЅ',
  'СЃРїРёСЃР°РЅ',
]);

const BLOCKED_PARAM_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function sendValidationError(res, errors) {
  return res.status(400).json({
    success: false,
    status: 400,
    error: 'Ошибка валидации',
    details: errors,
  });
}

function validateUuidParam(paramName) {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!isUuid(value)) {
      return sendValidationError(res, [`Некорректный UUID в параметре ${paramName}`]);
    }
    return next();
  };
}

function validateOptionalUuid(value, field, errors) {
  if (value !== undefined && value !== null && value !== '' && !isUuid(value)) {
    errors.push(`${field} должен быть корректным UUID`);
  }
}

function validateDate(value, field, errors) {
  if (value === undefined || value === null || value === '') return;
  const time = Date.parse(value);
  if (Number.isNaN(time)) errors.push(`${field} должен быть корректной датой`);
}

function validateParameters(value, field, errors) {
  // parameters хранится как JSONB, поэтому проверяем только форму объекта и
  // опасные ключи, не ограничивая предметные параметры.
  if (value === undefined || value === null) return;
  if (typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${field} должен быть объектом JSON`);
    return;
  }
  for (const key of Object.keys(value)) {
    if (!key || BLOCKED_PARAM_KEYS.has(key)) {
      errors.push(`${field} содержит недопустимый ключ "${key}"`);
    }
  }
}

function validateNodePayload({ partial = false } = {}) {
  // partial=true используется при PATCH/PUT, где можно прислать только часть полей.
  return (req, res, next) => {
    const data = req.body || {};
    const errors = [];

    if (!partial || Object.prototype.hasOwnProperty.call(data, 'name')) {
      if (!data.name || !String(data.name).trim()) errors.push('Введите наименование узла');
    }

    if (!partial || Object.prototype.hasOwnProperty.call(data, 'manufacturer')) {
      if (!data.manufacturer || !String(data.manufacturer).trim()) errors.push('Введите производителя');
    }

    if (!partial || Object.prototype.hasOwnProperty.call(data, 'model')) {
      if (!data.model || !String(data.model).trim()) errors.push('Введите марку/модель');
    }

    if (!partial || Object.prototype.hasOwnProperty.call(data, 'location')) {
      if (!data.location || !String(data.location).trim()) errors.push('Введите размещение узла');
    }

    if (!partial || Object.prototype.hasOwnProperty.call(data, 'status')) {
      if (!data.status || !NODE_STATUSES.has(data.status)) errors.push('Некорректное состояние узла');
    }

    if (!partial || Object.prototype.hasOwnProperty.call(data, 'subsystem_id')) {
      validateOptionalUuid(data.subsystem_id || data.subsys_id, 'subsystem_id', errors);
    }

    validateOptionalUuid(data.node_type_id || data.nodeTypeId, 'node_type_id', errors);
    validateOptionalUuid(data.installed_in_node, 'installed_in_node', errors);
    validateDate(data.manufactured_date, 'manufactured_date', errors);
    validateDate(data.commission_date, 'commission_date', errors);
    validateDate(data.decommission_date, 'decommission_date', errors);
    validateDate(data.write_off_date, 'write_off_date', errors);
    validateParameters(data.parameters, 'parameters', errors);

    if (data.operation_mode !== undefined && data.operation_mode !== null && data.operation_mode !== '') {
      const number = Number(data.operation_mode);
      if (!Number.isFinite(number) || number < 0) errors.push('operation_mode должен быть неотрицательным числом');
    }

    return errors.length ? sendValidationError(res, errors) : next();
  };
}

function validateNodeTypePayload({ partial = false } = {}) {
  // Тип узла может задавать список допустимых дочерних типов.
  return (req, res, next) => {
    const data = req.body || {};
    const errors = [];

    if (!partial || Object.prototype.hasOwnProperty.call(data, 'name')) {
      if (!data.name || !String(data.name).trim()) errors.push('Введите наименование вида узла');
    }

    validateParameters(data.parameters, 'parameters', errors);
    validateOptionalUuid(data.parent_node_type_id, 'parent_node_type_id', errors);

    if (data.allowed_child_types !== undefined && data.allowed_child_types !== null) {
      if (!Array.isArray(data.allowed_child_types)) {
        errors.push('allowed_child_types должен быть массивом UUID');
      } else if (data.allowed_child_types.some((id) => !isUuid(id))) {
        errors.push('Все allowed_child_types должны быть корректными UUID');
      }
    }

    return errors.length ? sendValidationError(res, errors) : next();
  };
}

module.exports = {
  validateUuidParam,
  validateNodePayload,
  validateNodeTypePayload,
};
