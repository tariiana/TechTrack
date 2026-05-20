const router = require('express').Router();
const subsystemController = require('../controllers/subsystemController');
//const { authMiddleware } = require('../middleware/auth');
//const { checkPermission } = require('../middleware/rbac');

//router.use(authMiddleware);

/*router.get('/', checkPermission(['subsystem:view']), subsystemController.getAll);
router.get('/tree', checkPermission(['subsystem:view']), subsystemController.getTree);
router.get('/:id', checkPermission(['subsystem:view']), subsystemController.getById);
router.post('/', checkPermission(['subsystem:create']), subsystemController.create);
router.put('/:id', checkPermission(['subsystem:update']), subsystemController.update);
router.delete('/:id', checkPermission(['subsystem:delete']), subsystemController.delete);
*/

//заглушки
router.get('/', subsystemController.getAll);
router.get('/tree', subsystemController.getTree);
router.get('/:id', subsystemController.getById);
router.post('/', subsystemController.create);
router.put('/:id', subsystemController.update);
router.delete('/:id', subsystemController.delete);

module.exports = router;