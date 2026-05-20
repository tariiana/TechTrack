const router = require('express').Router();
const nodeController = require('../controllers/nodeController');
//const { authMiddleware } = require('../middleware/auth');
//const { checkPermission } = require('../middleware/rbac');

//router.use(authMiddleware);

/*router.get('/', checkPermission(['node:view']), nodeController.getAll);
router.get('/tree', checkPermission(['node:view']), nodeController.getTree);
router.get('/:id', checkPermission(['node:view']), nodeController.getById);
router.get('/:id/children', checkPermission(['node:view']), nodeController.getChildren);
router.get('/:id/movement-history', checkPermission(['node:view']), nodeController.getMovementHistory);
router.post('/', checkPermission(['node:create']), nodeController.create);
router.put('/:id', checkPermission(['node:update']), nodeController.update);
router.delete('/:id/write-off', checkPermission(['node:delete']), nodeController.writeOff);
router.post('/:parentId/install/:childId', checkPermission(['node:update']), nodeController.install);
router.delete('/:childId/uninstall', checkPermission(['node:update']), nodeController.uninstall);
*/

//заглушка
router.get('/', nodeController.getAll);
router.get('/tree', nodeController.getTree);
router.get('/:id', nodeController.getById);
router.get('/:id/children', nodeController.getChildren);
router.get('/:id/movement-history', nodeController.getMovementHistory);
router.post('/', nodeController.create);
router.put('/:id', nodeController.update);
router.delete('/:id/write-off', nodeController.writeOff);
router.post('/:parentId/install/:childId', nodeController.install);
router.delete('/:childId/uninstall', nodeController.uninstall);

module.exports = router;