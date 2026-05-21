const router = require('express').Router();
//const { authMiddleware } = require('../middleware/auth');
//const { checkPermission } = require('../middleware/rbac');
const instrumentController = require('../controllers/instrumentController');

// Все маршруты требуют аутентификации
//router.use(authMiddleware);

/*router.get('/', checkPermission(['instrument:view']), instrumentController.getAll);
router.get('/:id', checkPermission(['instrument:view']), instrumentController.getById);
router.post('/', checkPermission(['instrument:create']), instrumentController.create);
router.put('/:id', checkPermission(['instrument:update']), instrumentController.update);
router.delete('/:id/write-off', checkPermission(['instrument:delete']), instrumentController.writeOff);
router.get('/:id/verifications', checkPermission(['instrument:view']), instrumentController.getVerifications);
router.post('/:id/verifications', checkPermission(['verification:create']), instrumentController.addVerification);
*/
router.get('/', instrumentController.getAll);
router.get('/:id', instrumentController.getById);
router.post('/', instrumentController.create);
router.put('/:id', instrumentController.update);
router.delete('/:id/write-off', instrumentController.writeOff);
router.get('/:id/verifications', instrumentController.getVerifications);
router.post('/:id/verifications', instrumentController.addVerification);
router.put('/:id/verifications/:verificationId', instrumentController.updateVerification);

module.exports = router;
