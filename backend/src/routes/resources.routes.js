const router = require('express').Router();
const resourceController = require('../controllers/resourceController');

router.get('/', resourceController.getAll);
router.get('/:id', resourceController.getById);
router.post('/:nodeId', resourceController.upsert);
router.delete('/:nodeId', resourceController.delete);
router.post('/:nodeId/calculate', resourceController.calculate);

module.exports = router;