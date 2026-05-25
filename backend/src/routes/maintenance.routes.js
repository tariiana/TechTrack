const router = require('express').Router();
const maintenanceController = require('../controllers/maintenanceController');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

router.use(authMiddleware);

router.get('/plans', checkPermission(['maintenance:view']), maintenanceController.getAllPlans);
router.get('/plans/:id', checkPermission(['maintenance:view']), maintenanceController.getPlanById);
router.post('/plans', checkPermission(['maintenance:create']), maintenanceController.createPlan);
router.put('/plans/:id', checkPermission(['maintenance:update']), maintenanceController.updatePlan);
router.delete('/plans/:id', checkPermission(['maintenance:delete']), maintenanceController.deletePlan);
router.post('/plans/generate', checkPermission(['maintenance:create']), maintenanceController.generatePlan);

router.post('/tasks', checkPermission(['maintenance:create']), maintenanceController.createTask);
router.put('/tasks/:id', checkPermission(['maintenance:update']), maintenanceController.updateTask);
router.delete('/tasks/:id', checkPermission(['maintenance:delete']), maintenanceController.deleteTask);
router.post('/tasks/:id/complete', checkPermission(['maintenance:update']), maintenanceController.completeTask);

router.get('/nodes', checkPermission(['maintenance:view']), maintenanceController.getEquipmentNodes);

module.exports = router;
