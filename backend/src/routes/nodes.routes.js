const router = require('express').Router();
const nodeController = require('../controllers/nodeController');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const { auditMiddleware } = require('../utils/auditLogger');
const {
  validateUuidParam,
  validateNodePayload,
} = require('../middleware/nodeValidation');

router.use(authMiddleware);
router.use(auditMiddleware('node'));

router.get('/', checkPermission(['node:view']), nodeController.getAll);
router.get('/tree', checkPermission(['node:view']), nodeController.getTree);
router.get('/:id/installable-children', checkPermission(['node:view']), validateUuidParam('id'), nodeController.getInstallableChildren);
router.get('/:id/composition-history', checkPermission(['node:view']), validateUuidParam('id'), nodeController.getCompositionHistory);
router.get('/:id', checkPermission(['node:view']), validateUuidParam('id'), nodeController.getById);
router.get('/:id/children', checkPermission(['node:view']), validateUuidParam('id'), nodeController.getChildren);
router.get('/:id/movement-history', checkPermission(['node:view']), validateUuidParam('id'), nodeController.getMovementHistory);
router.post('/', checkPermission(['node:create']), validateNodePayload(), nodeController.create);
router.put('/:id', checkPermission(['node:update']), validateUuidParam('id'), validateNodePayload({ partial: true }), nodeController.update);
router.delete('/:id/write-off', checkPermission(['node:delete']), validateUuidParam('id'), nodeController.writeOff);
router.post('/:parentId/install/:childId', checkPermission(['node:update']), validateUuidParam('parentId'), validateUuidParam('childId'), nodeController.install);
router.delete('/:childId/uninstall', checkPermission(['node:update']), validateUuidParam('childId'), nodeController.uninstall);

module.exports = router;
