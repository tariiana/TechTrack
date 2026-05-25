const router = require('express').Router();
const resourceController = require('../controllers/resourceController');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

router.use(authMiddleware);

router.get('/', checkPermission(['resource:view']), resourceController.getAll);
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
