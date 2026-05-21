const NodeType = require('../models/NodeType');
const ResponseFormatter = require('../utils/responseFormatter');

async function getAll(req, res, next) {
  try {
    const types = await NodeType.getAll();
    res.json(types);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const type = await NodeType.getById(req.params.id);
    if (!type) return res.status(404).json(ResponseFormatter.error('Вид узла не найден', 404));
    res.json(type);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const newType = await NodeType.create(req.body, null);
    res.status(201).json(ResponseFormatter.created(newType, 'Вид узла создан'));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    await NodeType.update(req.params.id, req.body, null);
    res.json(ResponseFormatter.success(null, 'Вид узла обновлён'));
  } catch (err) { next(err); }
}

async function deleteType(req, res, next) {
  try {
    await NodeType.delete(req.params.id);
    res.json(ResponseFormatter.noContent('Вид узла удалён'));
  } catch (err) { next(err); }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deleteType,
};
