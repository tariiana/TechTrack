const router = require('express').Router();
const resourceController = require('../controllers/resourceController');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const {
  validateUuidParam,
  validateResourcePayload,
  validateMeasurementPayload,
  validateCalculatePayload,
} = require('../middleware/resourceValidation');

router.use(authMiddleware);

router.get('/', checkPermission(['resource:view']), resourceController.getAll);
router.get('/by-node/:nodeId', checkPermission(['resource:view']), validateUuidParam('nodeId'), (req, res, next) => {
  req.query.node_id = req.params.nodeId;
  return resourceController.getAll(req, res, next);
});
router.get('/:nodeId/measurements', checkPermission(['resource:view']), validateUuidParam('nodeId'), resourceController.getMeasurements);
router.post('/:nodeId/measurements', checkPermission(['resource:create', 'resource:update']), validateUuidParam('nodeId'), validateMeasurementPayload, resourceController.createMeasurement);
router.put('/:nodeId/measurements/:measurementId', checkPermission(['resource:update']), validateUuidParam('nodeId'), validateMeasurementPayload, resourceController.updateMeasurement);
router.delete('/:nodeId/measurements/:measurementId', checkPermission(['resource:delete', 'resource:update']), validateUuidParam('nodeId'), resourceController.deleteMeasurement);
router.post('/:nodeId/calculate', checkPermission(['resource:calculate']), validateUuidParam('nodeId'), validateCalculatePayload, resourceController.calculate);
router.get('/:id', checkPermission(['resource:view']), validateUuidParam('id'), resourceController.getById);
router.post('/:nodeId', checkPermission(['resource:create', 'resource:update']), validateUuidParam('nodeId'), validateResourcePayload, resourceController.upsert);
router.put('/:nodeId', checkPermission(['resource:create', 'resource:update']), validateUuidParam('nodeId'), validateResourcePayload, resourceController.upsert);
router.delete('/:nodeId', checkPermission(['resource:delete']), validateUuidParam('nodeId'), resourceController.delete);

module.exports = router;
