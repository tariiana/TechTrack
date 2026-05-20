const router = require('express').Router();
const nodeTypeController = require('../controllers/nodeTypeController');
//const { authMiddleware } = require('../middleware/auth');
//const { checkPermission } = require('../middleware/rbac');

//router.use(authMiddleware);

/*router.get('/', checkPermission(['nodeType:view']), nodeTypeController.getAll);
router.get('/:id', checkPermission(['nodeType:view']), nodeTypeController.getById);
router.post('/', checkPermission(['nodeType:create']), nodeTypeController.create);
router.put('/:id', checkPermission(['nodeType:update']), nodeTypeController.update);
router.delete('/:id', checkPermission(['nodeType:delete']), nodeTypeController.delete);
*/

//заглушки
router.get('/', nodeTypeController.getAll);
router.get('/:id', nodeTypeController.getById);
router.post('/', nodeTypeController.create);
router.put('/:id', nodeTypeController.update);
router.delete('/:id', nodeTypeController.delete);


module.exports = router;