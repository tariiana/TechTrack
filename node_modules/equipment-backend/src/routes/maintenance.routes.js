const router = require('express').Router();
const maintenanceController = require('../controllers/maintenanceController');
/*const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');*/

// Все маршруты требуют аутентификации
//router.use(authMiddleware);

// Планы
/*router.get('/plans', checkPermission(['maintenance:view']), maintenanceController.getAllPlans);
router.get('/plans/:id', checkPermission(['maintenance:view']), maintenanceController.getPlanById);
router.post('/plans', checkPermission(['maintenance:create']), maintenanceController.createPlan);
router.put('/plans/:id', checkPermission(['maintenance:update']), maintenanceController.updatePlan);
router.delete('/plans/:id', checkPermission(['maintenance:delete']), maintenanceController.deletePlan);

// Генерация плана
router.post('/plans/generate', checkPermission(['maintenance:create']), maintenanceController.generatePlan);

// Задачи
router.post('/tasks', checkPermission(['maintenance:create']), maintenanceController.createTask);
router.put('/tasks/:id', checkPermission(['maintenance:update']), maintenanceController.updateTask);
router.delete('/tasks/:id', checkPermission(['maintenance:delete']), maintenanceController.deleteTask);
router.post('/tasks/:id/complete', checkPermission(['maintenance:update']), maintenanceController.completeTask);

// Вспомогательный маршрут для получения списка оборудования (для формы задач)
router.get('/nodes', checkPermission(['maintenance:view']), maintenanceController.getEquipmentNodes);
*/

//Для теста
// Планы
router.get('/plans', maintenanceController.getAllPlans);
router.get('/plans/:id', maintenanceController.getPlanById);
router.post('/plans', maintenanceController.createPlan);
router.put('/plans/:id', maintenanceController.updatePlan);
router.delete('/plans/:id', maintenanceController.deletePlan);

// Генерация плана
router.post('/plans/generate', maintenanceController.generatePlan);

// Задачи
router.post('/tasks', maintenanceController.createTask);
router.put('/tasks/:id', maintenanceController.updateTask);
router.delete('/tasks/:id', maintenanceController.deleteTask);
router.post('/tasks/:id/complete', maintenanceController.completeTask);

// Вспомогательный маршрут для получения списка оборудования (для формы задач)
router.get('/nodes', maintenanceController.getEquipmentNodes);

module.exports = router;