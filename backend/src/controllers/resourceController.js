const Resource = require('../models/Resource');
const ResponseFormatter = require('../utils/responseFormatter');

function getRequestUserId(req) {
  return req.headers['x-user-id'] || req.user?.user_id || null;
}

async function getAll(req, res, next) {
  try {
    const { node_id, search } = req.query;
    const resources = await Resource.getAll({ node_id, search });
    res.json(ResponseFormatter.success(resources));
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const resource = await Resource.getById(req.params.id);
    if (!resource) {
      return res.status(404).json(ResponseFormatter.error('Resource not found', 404));
    }
    res.json(ResponseFormatter.success(resource));
  } catch (err) {
    next(err);
  }
}

async function upsert(req, res, next) {
  try {
    const result = await Resource.upsert(req.params.nodeId, req.body, getRequestUserId(req));
    res.json(ResponseFormatter.success(result, 'Resource saved'));
  } catch (err) {
    next(err);
  }
}

async function deleteResource(req, res, next) {
  try {
    const result = await Resource.delete(req.params.nodeId, getRequestUserId(req));
    if (!result.success) {
      return res.status(404).json(ResponseFormatter.error('Resource not found', 404));
    }
    res.json(ResponseFormatter.noContent('Resource deleted'));
  } catch (err) {
    next(err);
  }
}

async function calculate(req, res, next) {
  try {
    const { work_hours_per_year } = req.body;
    const result = await Resource.calculate(req.params.nodeId, work_hours_per_year);
    res.json(ResponseFormatter.success(result));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getById,
  upsert,
  delete: deleteResource,
  calculate,
};
