const Resource = require('../models/Resource');
const ResponseFormatter = require('../utils/responseFormatter');

async function getAll(req, res, next) {
  try {
    const { node_id } = req.query;
    const resources = await Resource.getAll({ node_id });
    res.json(ResponseFormatter.success(resources));
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const resource = await Resource.getById(id);
    if (!resource) return res.status(404).json(ResponseFormatter.error('Ресурс не найден', 404));
    res.json(ResponseFormatter.success(resource));
  } catch (err) { next(err); }
}

async function upsert(req, res, next) {
  try {
    const { nodeId } = req.params;
    const result = await Resource.upsert(nodeId, req.body, null);
    res.json(ResponseFormatter.success(result, 'Ресурс сохранён'));
  } catch (err) { next(err); }
}

async function deleteResource(req, res, next) {
  try {
    const { nodeId } = req.params;
    await Resource.delete(nodeId, null);
    res.json(ResponseFormatter.noContent('Ресурс удалён'));
  } catch (err) { next(err); }
}

async function calculate(req, res, next) {
  try {
    const { nodeId } = req.params;
    const { work_hours_per_year } = req.body;
    const result = await Resource.calculate(nodeId, work_hours_per_year);
    res.json(ResponseFormatter.success(result));
  } catch (err) { next(err); }
}

module.exports = {
  getAll,
  getById,
  upsert,
  delete: deleteResource,
  calculate,
};