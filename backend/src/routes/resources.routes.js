const router = require('express').Router();
const resourceController = require('../controllers/resourceController');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

// Ресурсы привязаны к nodeId, поэтому создание и обновление используют URL
// /:nodeId, а не отдельный resource_id.
router.use(authMiddleware);

router.get('/', checkPermission(['resource:view']), resourceController.getAll);
// Алиас для фронтенда: превращает nodeId из URL в обычный фильтр node_id.
router.get('/by-node/:nodeId', checkPermission(['resource:view']), (req, res, next) => {
  req.query.node_id = req.params.nodeId;
  return resourceController.getAll(req, res, next);
});
router.get('/:id', checkPermission(['resource:view']), resourceController.getById);
router.post('/:nodeId', checkPermission(['resource:create', 'resource:update']), resourceController.upsert);
router.put('/:nodeId', checkPermission(['resource:create', 'resource:update']), resourceController.upsert);
router.delete('/:nodeId', checkPermission(['resource:delete']), resourceController.delete);
router.post('/:nodeId/calculate', checkPermission(['resource:calculate']), resourceController.calculate);

module.exports = router;
