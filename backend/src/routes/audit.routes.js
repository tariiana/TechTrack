const router = require('express').Router();
const auditController = require('../controllers/auditController');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

// Журнал аудита доступен только пользователям с правом audit:view.
router.use(authMiddleware);

router.get('/', checkPermission(['audit:view']), auditController.getAll);
router.get('/:entityType/:entityId', checkPermission(['audit:view']), auditController.getByEntity);

module.exports = router;
