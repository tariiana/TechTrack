const router = require('express').Router();
const subsystemController = require('../controllers/subsystemController');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

// Все маршруты подсистем закрыты авторизацией; права проверяются точечно на
// чтение, создание, обновление и удаление.
router.use(authMiddleware);

// Важно: специальные пути объявлены до '/:id', иначе Express принял бы их за id.
router.get('/', checkPermission(['subsystem:view']), subsystemController.getAll);
router.get('/tree', checkPermission(['subsystem:view']), subsystemController.getTree);
router.get('/content/search', checkPermission(['subsystem:view']), subsystemController.searchContent);
router.patch(
  '/content/:type/:objectId/move',
  checkPermission(['subsystem:update']),
  subsystemController.moveContent
);
router.delete(
  '/content/:type/:objectId',
  checkPermission(['subsystem:update']),
  subsystemController.removeContent
);
router.get('/:id/content', checkPermission(['subsystem:view']), subsystemController.getContent);
router.post('/:id/content', checkPermission(['subsystem:update']), subsystemController.addContent);
router.get('/:id/nodes', checkPermission(['subsystem:view']), subsystemController.getNodes);
router.get('/:id', checkPermission(['subsystem:view']), subsystemController.getById);
router.post('/', checkPermission(['subsystem:create']), subsystemController.create);
router.put('/:id', checkPermission(['subsystem:update']), subsystemController.update);
router.delete('/:id', checkPermission(['subsystem:delete']), subsystemController.delete);

module.exports = router;
