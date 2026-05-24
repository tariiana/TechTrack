const router = require('express').Router();
const nodeTypeController = require('../controllers/nodeTypeController');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const { auditMiddleware } = require('../utils/auditLogger');
const {
  validateUuidParam,
  validateNodeTypePayload,
} = require('../middleware/nodeValidation');

router.use(authMiddleware);
router.use(auditMiddleware('node_type'));

router.get('/', checkPermission(['nodeType:view']), nodeTypeController.getAll);
router.get('/:id/template', checkPermission(['nodeType:view']), validateUuidParam('id'), nodeTypeController.getTemplate);
router.get('/:id', checkPermission(['nodeType:view']), validateUuidParam('id'), nodeTypeController.getById);
router.post('/', checkPermission(['nodeType:create']), validateNodeTypePayload(), nodeTypeController.create);
router.put('/:id', checkPermission(['nodeType:update']), validateUuidParam('id'), validateNodeTypePayload({ partial: true }), nodeTypeController.update);
router.delete('/:id', checkPermission(['nodeType:delete']), validateUuidParam('id'), nodeTypeController.delete);

module.exports = router;
