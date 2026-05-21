const router = require('express').Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

router.use(authMiddleware);
router.use(checkPermission(['user:admin']));

router.get('/', userController.getAll);
router.get('/roles', userController.getRoles);
router.get('/:id', userController.getById);
router.post('/', userController.create);
router.put('/:id', userController.update);
router.delete('/:id', userController.delete);

module.exports = router;
