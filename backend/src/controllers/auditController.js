const AuditLog = require('../models/AuditLog');
const ResponseFormatter = require('../utils/responseFormatter');

async function getAll(req, res, next) {
  try {
    const logs = await AuditLog.getAll(req.query);
    res.json(ResponseFormatter.success(logs));
  } catch (err) {
    next(err);
  }
}

async function getByEntity(req, res, next) {
  try {
    const logs = await AuditLog.getByEntity(
      req.params.entityType,
      req.params.entityId,
      req.query.limit
    );
    res.json(ResponseFormatter.success(logs));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getByEntity,
};
