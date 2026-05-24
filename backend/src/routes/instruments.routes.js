const router = require('express').Router();
const instrumentController = require('../controllers/instrumentController');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const { auditMiddleware } = require('../utils/auditLogger');

router.use(authMiddleware);
router.use(auditMiddleware('instrument'));

router.get('/', checkPermission(['instrument:view']), instrumentController.getAll);
router.get('/upcoming', checkPermission(['instrument:view']), instrumentController.getUpcoming);
router.get('/:id', checkPermission(['instrument:view']), instrumentController.getById);
router.post('/', checkPermission(['instrument:create']), instrumentController.create);
router.put('/:id', checkPermission(['instrument:update']), instrumentController.update);
router.delete('/:id/write-off', checkPermission(['instrument:delete']), instrumentController.writeOff);
router.get('/:id/verifications', checkPermission(['instrument:view']), instrumentController.getVerifications);
router.post('/:id/verifications', checkPermission(['verification:create']), instrumentController.addVerification);
router.put('/:id/verifications/:verificationId', checkPermission(['verification:update']), instrumentController.updateVerification);

module.exports = router;
