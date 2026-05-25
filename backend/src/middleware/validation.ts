import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Валидаторы для различных сущностей
export const validateLogin = [
  body('login').notEmpty().withMessage('Логин обязателен'),
  body('password').notEmpty().withMessage('Пароль обязателен'),
  handleValidationErrors,
];

export const validateUser = [
  body('login').isLength({ min: 3, max: 100 }).withMessage('Логин должен быть от 3 до 100 символов'),
  body('password').isLength({ min: 3 }).withMessage('Пароль должен быть не менее 3 символов'),
  body('full_name').notEmpty().withMessage('ФИО обязательно'),
  body('role_id').isUUID().withMessage('Некорректный ID роли'),
  handleValidationErrors,
];

export const validateNode = [
  body('node_type_id').optional().isUUID(),
  body('name').notEmpty().withMessage('Наименование обязательно'),
  body('manufacturer').notEmpty().withMessage('Производитель обязателен'),
  body('model').notEmpty().withMessage('Марка обязательна'),
  body('status').isIn([
    'получен', 'исправен', 'неисправен', 'в ремонте', 
    'на поверке', 'законсервирован', 'списан'
  ]).withMessage('Некорректный статус'),
  body('location').notEmpty().withMessage('Размещение обязательно'),
  body('subsystem_id').isUUID().withMessage('Некорректный ID подсистемы'),
  body('installed_in_node').optional().isUUID(),
  handleValidationErrors,
];

export const validateSubsystem = [
  body('name').notEmpty().withMessage('Наименование обязательно'),
  body('location').notEmpty().withMessage('Расположение обязательно'),
  body('parent_id').optional().isUUID(),
  handleValidationErrors,
];

export const validateNodeType = [
  body('name').notEmpty().withMessage('Наименование обязательно'),
  body('parameters').optional().isObject(),
  body('allowed_child_types').optional().isArray(),
  handleValidationErrors,
];

export const validateMeasuringInstrument = [
  body('name').notEmpty().withMessage('Наименование обязательно'),
  body('manufacturer').notEmpty().withMessage('Производитель обязателен'),
  body('model').notEmpty().withMessage('Марка обязательна'),
  body('tab_number').notEmpty().withMessage('Табельный номер обязателен'),
  body('calibration_interval').isFloat({ min: 0.1 }).withMessage('Межповерочный интервал должен быть больше 0'),
  body('location').notEmpty().withMessage('Размещение обязательно'),
  handleValidationErrors,
];

export const validateCalibrationHistory = [
  body('calibration_date').isISO8601().withMessage('Некорректная дата поверки'),
  body('calibrator').notEmpty().withMessage('Поверитель обязателен'),
  body('result').isIn(['годен', 'не годен']).withMessage('Результат должен быть "годен" или "не годен"'),
  handleValidationErrors,
];

export const validateResource = [
  body('node_id').isUUID().withMessage('Некорректный ID узла'),
  body('registration_date').isISO8601().withMessage('Некорректная дата регистрации'),
  body('resource_params').optional().isObject(),
  handleValidationErrors,
];

export const validateMaintenancePlan = [
  body('name').notEmpty().withMessage('Название плана обязательно'),
  body('start_date').isISO8601().withMessage('Некорректная дата начала'),
  body('end_date').optional().isISO8601(),
  handleValidationErrors,
];

export const validateMaintenance = [
  body('node_id').isUUID().withMessage('Некорректный ID узла'),
  body('type_id').isInt({ min: 1, max: 4 }).withMessage('Некорректный тип ТО'),
  body('status_id').isInt({ min: 1, max: 4 }).withMessage('Некорректный статус'),
  handleValidationErrors,
];

export const validateIdParam = [
  param('id').isUUID().withMessage('Некорректный ID'),
  handleValidationErrors,
];