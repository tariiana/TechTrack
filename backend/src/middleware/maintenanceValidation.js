const ResponseFormatter = require('../utils/responseFormatter');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const ALLOWED_STATUSES = new Set([
  'pending',
  'in_progress',
  'completed',
  'not_completed',
  'canceled',
  'overdue',
  'ожидает',
  'в работе',
  'выполнено',
  'не выполнено',
  'отменено',
  'просрочено',
]);

const ALLOWED_SERVICE_TYPES = new Set([
  'плановое ТО',
  'плановое то',
  'плановое',
  'внеплановое ТО',
  'внеплановое то',
  'внеплановое',
  'капитальный ремонт',
  'аварийный ремонт',
  'текущий ремонт',
  'регламент',
  'диагностика',
  'модернизация',
]);

function trimString(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

function isValidDate(value) {
  if (value === null || value === undefined || value === '') return true;
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeBodyStrings(req, fields) {
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      req.body[field] = trimString(req.body[field]);
    }
  }
}

function sendValidationError(res, errors) {
  return res.status(400).json({
    ...ResponseFormatter.error('Ошибка валидации', 400),
    details: errors,
  });
}

function validateUuidParam(paramName) {
  return (req, res, next) => {
    if (!isUuid(req.params[paramName])) {
      return sendValidationError(res, [`Некорректный UUID в параметре ${paramName}`]);
    }
    return next();
  };
}

function validatePlanBody({ partial = false } = {}) {
  return (req, res, next) => {
    normalizeBodyStrings(req, ['name', 'start_date', 'end_date']);

    const errors = [];
    const { name, start_date, end_date } = req.body;

    if (!partial || Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      if (!name || typeof name !== 'string') {
        errors.push('Название плана обязательно');
      } else if (name.length > 250) {
        errors.push('Название плана не должно быть длиннее 250 символов');
      }
    }

    if (!partial || Object.prototype.hasOwnProperty.call(req.body, 'start_date')) {
      if (!start_date) {
        errors.push('Дата начала плана обязательна');
      } else if (!isValidDate(start_date)) {
        errors.push('Дата начала должна быть в формате YYYY-MM-DD');
      }
    }

    if (end_date !== undefined && end_date !== null && end_date !== '' && !isValidDate(end_date)) {
      errors.push('Дата окончания должна быть в формате YYYY-MM-DD');
    }

    if (isValidDate(start_date) && isValidDate(end_date) && start_date && end_date && start_date > end_date) {
      errors.push('Дата начала не может быть позже даты окончания');
    }

    if (end_date === '') req.body.end_date = null;

    return errors.length ? sendValidationError(res, errors) : next();
  };
}

function validateTaskBody({ partial = false } = {}) {
  return (req, res, next) => {
    normalizeBodyStrings(req, ['node_id', 'plan_id', 'service_type', 'status_name', 'completed_date', 'notes']);

    const errors = [];
    const {
      node_id,
      plan_id,
      service_type,
      status_name,
      completed_date,
      notes,
    } = req.body;

    if (!partial || Object.prototype.hasOwnProperty.call(req.body, 'node_id')) {
      if (!node_id) {
        errors.push('Оборудование обязательно');
      } else if (!isUuid(node_id)) {
        errors.push('node_id должен быть корректным UUID');
      }
    }

    if (plan_id !== undefined && plan_id !== null && plan_id !== '' && !isUuid(plan_id)) {
      errors.push('plan_id должен быть корректным UUID');
    }

    if (!partial || Object.prototype.hasOwnProperty.call(req.body, 'service_type')) {
      if (!service_type || typeof service_type !== 'string') {
        errors.push('Тип обслуживания обязателен');
      } else if (!ALLOWED_SERVICE_TYPES.has(service_type)) {
        errors.push('Неизвестный тип обслуживания');
      }
    }

    if (status_name !== undefined && status_name !== null && status_name !== '' && !ALLOWED_STATUSES.has(status_name)) {
      errors.push('Неизвестный статус обслуживания');
    }

    if (!isValidDate(completed_date)) {
      errors.push('Дата проведения ТО должна быть в формате YYYY-MM-DD');
    }

    if (notes !== undefined && notes !== null && typeof notes !== 'string') {
      errors.push('Примечание должно быть строкой');
    }

    if (plan_id === '') req.body.plan_id = null;
    if (completed_date === '') req.body.completed_date = null;

    return errors.length ? sendValidationError(res, errors) : next();
  };
}

function validateGeneratePlanBody(req, res, next) {
  normalizeBodyStrings(req, ['start_date', 'end_date', 'plan_id']);

  const errors = [];
  const { start_date, end_date, node_ids, plan_id } = req.body;

  if (!start_date) {
    errors.push('Дата начала плана обязательна');
  } else if (!isValidDate(start_date)) {
    errors.push('Дата начала должна быть в формате YYYY-MM-DD');
  }

  if (!end_date) {
    errors.push('Дата окончания плана обязательна');
  } else if (!isValidDate(end_date)) {
    errors.push('Дата окончания должна быть в формате YYYY-MM-DD');
  }

  if (isValidDate(start_date) && isValidDate(end_date) && start_date && end_date && start_date > end_date) {
    errors.push('Дата начала не может быть позже даты окончания');
  }

  if (plan_id !== undefined && plan_id !== null && plan_id !== '' && !isUuid(plan_id)) {
    errors.push('plan_id должен быть корректным UUID');
  }

  if (node_ids !== undefined && node_ids !== null) {
    if (!Array.isArray(node_ids)) {
      errors.push('node_ids должен быть массивом UUID');
    } else if (node_ids.some((id) => !isUuid(id))) {
      errors.push('Все значения node_ids должны быть корректными UUID');
    }
  }

  if (plan_id === '') req.body.plan_id = null;

  return errors.length ? sendValidationError(res, errors) : next();
}

module.exports = {
  validateGeneratePlanBody,
  validatePlanBody,
  validateTaskBody,
  validateUuidParam,
};
