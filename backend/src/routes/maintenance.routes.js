const router = require('express').Router();
const maintenanceController = require('../controllers/maintenanceController');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const { auditMiddleware } = require('../utils/auditLogger');
const {
  validateGeneratePlanBody,
  validatePlanBody,
  validateTaskBody,
  validateUuidParam,
} = require('../middleware/maintenanceValidation');

router.use(authMiddleware);
router.use(auditMiddleware('maintenance'));

router.get('/plans', checkPermission(['maintenance:view']), maintenanceController.getAllPlans);
router.get('/plans/:id', validateUuidParam('id'), checkPermission(['maintenance:view']), maintenanceController.getPlanById);
router.post('/plans', validatePlanBody(), checkPermission(['maintenance:create']), maintenanceController.createPlan);
router.put('/plans/:id', validateUuidParam('id'), validatePlanBody(), checkPermission(['maintenance:update']), maintenanceController.updatePlan);
router.delete('/plans/:id', validateUuidParam('id'), checkPermission(['maintenance:delete']), maintenanceController.deletePlan);
router.post('/plans/generate', validateGeneratePlanBody, checkPermission(['maintenance:create']), maintenanceController.generatePlan);

router.post('/tasks', validateTaskBody(), checkPermission(['maintenance:create']), maintenanceController.createTask);
router.put('/tasks/:id', validateUuidParam('id'), validateTaskBody({ partial: true }), checkPermission(['maintenance:update']), maintenanceController.updateTask);
router.delete('/tasks/:id', validateUuidParam('id'), checkPermission(['maintenance:delete']), maintenanceController.deleteTask);
router.post('/tasks/:id/complete', validateUuidParam('id'), checkPermission(['maintenance:update']), maintenanceController.completeTask);

router.get('/nodes', checkPermission(['maintenance:view']), maintenanceController.getEquipmentNodes);

module.exports = router;
