const router = require('express').Router();
const nodeTypeController = require('../controllers/nodeTypeController');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

router.use(authMiddleware);

router.get('/', checkPermission(['nodeType:view']), nodeTypeController.getAll);
router.get('/:id', checkPermission(['nodeType:view']), nodeTypeController.getById);
router.post('/', checkPermission(['nodeType:create']), nodeTypeController.create);
router.put('/:id', checkPermission(['nodeType:update']), nodeTypeController.update);
router.delete('/:id', checkPermission(['nodeType:delete']), nodeTypeController.delete);

module.exports = router;
