const router = require('express').Router();
const subsystemController = require('../controllers/subsystemController');

router.get('/', subsystemController.getAll);
router.get('/tree', subsystemController.getTree);
router.get('/:id/nodes', subsystemController.getNodes);
router.get('/:id', subsystemController.getById);
router.post('/', subsystemController.create);
router.put('/:id', subsystemController.update);
router.delete('/:id', subsystemController.delete);

module.exports = router;
