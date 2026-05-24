const Resource = require('../models/Resource');
const ResponseFormatter = require('../utils/responseFormatter');
const { auditLog } = require('../utils/auditLogger');

function getRequestUserId(req) {
  return req.user?.user_id || req.user?.id || null;
}

function getAuditContext(req) {
  return {
    userId: getRequestUserId(req),
    ipAddress: req.ip || req.socket.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null,
  };
}

function sendError(res, err, next) {
  if (err?.status) {
    return res.status(err.status).json(ResponseFormatter.error(err.message, err.status));
  }
  return next(err);
}

async function writeAudit(req, action, entityId) {
  const context = getAuditContext(req);
  await auditLog({
    ...context,
    action,
    entityType: 'resource',
    entityId,
  });
}

async function getAll(req, res, next) {
  try {
    const { node_id, search } = req.query;
    const resources = await Resource.getAll({ node_id, search });
    res.json(ResponseFormatter.success(resources));
  } catch (err) {
    sendError(res, err, next);
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
    sendError(res, err, next);
  }
}

async function upsert(req, res, next) {
  try {
    const oldResource = await Resource.getById(req.params.nodeId);
    const result = await Resource.upsert(req.params.nodeId, req.body, getRequestUserId(req));
    await writeAudit(req, oldResource ? 'UPDATE_RESOURCE' : 'CREATE_RESOURCE', result.resource_id);
    if (result.created) {
      return res.status(201).json(ResponseFormatter.created(result, 'Ресурс создан'));
    }
    return res.json(ResponseFormatter.success(result, 'Ресурс сохранен'));
  } catch (err) {
    sendError(res, err, next);
  }
}

async function deleteResource(req, res, next) {
  try {
    const oldResource = await Resource.getById(req.params.nodeId);
    if (!oldResource) {
      return res.status(404).json(ResponseFormatter.error('Ресурс не найден', 404));
    }

    const result = await Resource.delete(req.params.nodeId);
    if (!result.success) {
      return res.status(404).json(ResponseFormatter.error('Ресурс не найден', 404));
    }

    await writeAudit(req, 'DELETE_RESOURCE', req.params.nodeId);
    return res.status(204).send();
  } catch (err) {
    return sendError(res, err, next);
  }
}

async function calculate(req, res, next) {
  try {
    const { work_hours_per_year } = req.body;
    const result = await Resource.calculate(req.params.nodeId, work_hours_per_year);
    res.json(ResponseFormatter.success(result));
  } catch (err) {
    sendError(res, err, next);
  }
}

async function getMeasurements(req, res, next) {
  try {
    const measurements = await Resource.getMeasurements(req.params.nodeId);
    res.json(ResponseFormatter.success(measurements));
  } catch (err) {
    sendError(res, err, next);
  }
}

async function createMeasurement(req, res, next) {
  try {
    const measurement = await Resource.createMeasurement(req.params.nodeId, req.body, getRequestUserId(req));
    await writeAudit(req, 'CREATE_RESOURCE_MEASUREMENT', req.params.nodeId);
    res.status(201).json(ResponseFormatter.created(measurement, 'Измерение добавлено'));
  } catch (err) {
    sendError(res, err, next);
  }
}

async function updateMeasurement(req, res, next) {
  try {
    const measurement = await Resource.updateMeasurement(
      req.params.nodeId,
      req.params.measurementId,
      req.body,
      getRequestUserId(req)
    );
    await writeAudit(req, 'UPDATE_RESOURCE_MEASUREMENT', req.params.nodeId);
    res.json(ResponseFormatter.success(measurement, 'Измерение обновлено'));
  } catch (err) {
    sendError(res, err, next);
  }
}

async function deleteMeasurement(req, res, next) {
  try {
    await Resource.deleteMeasurement(req.params.nodeId, req.params.measurementId, getRequestUserId(req));
    await writeAudit(req, 'DELETE_RESOURCE_MEASUREMENT', req.params.nodeId);
    return res.status(204).send();
  } catch (err) {
    return sendError(res, err, next);
  }
}

module.exports = {
  getAll,
  getById,
  upsert,
  delete: deleteResource,
  calculate,
  getMeasurements,
  createMeasurement,
  updateMeasurement,
  deleteMeasurement,
};
