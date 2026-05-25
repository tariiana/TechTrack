const { pool } = require('../config/db');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function truncate(value, maxLength) {
  if (value === null || value === undefined) return null;
  const text = String(value);
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function normalizeUuid(value) {
  if (!value) return null;
  const text = Array.isArray(value) ? value[0] : String(value);
  return UUID_RE.test(text) ? text : null;
}

function getRequestUserId(req) {
  return req.user?.user_id || req.user?.id || normalizeUuid(req.headers['x-user-id']);
}

function getRequestEntityId(req) {
  return normalizeUuid(
    req.params.id
      || req.params.nodeId
      || req.params.planId
      || req.params.taskId
      || req.params.objectId
      || req.params.childId
      || req.params.parentId
      || req.params.verificationId
  );
}

function findEntityId(payload) {
  if (!payload || typeof payload !== 'object') return null;

  const direct = payload.node_id
    || payload.node_type_id
    || payload.subsys_id
    || payload.resource_id
    || payload.user_id
    || payload.id;
  if (direct) return normalizeUuid(direct);

  if (payload.data && typeof payload.data === 'object') {
    return findEntityId(payload.data);
  }

  return null;
}

async function auditLog({
  userId = null,
  action,
  entityType,
  entityId = null,
  ipAddress = null,
  userAgent = null,
}) {
  try {
    await pool.query(`
      INSERT INTO equipment.audit_log (
        log_id,
        user_id,
        action,
        entity_type,
        entity_id,
        ip_address,
        user_agent,
        performed_at
      )
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `, [
      normalizeUuid(userId),
      truncate(action, 100),
      truncate(entityType, 50),
      normalizeUuid(entityId),
      ipAddress || null,
      userAgent || null,
    ]);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

function auditMiddleware(entityType) {
  return (req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    let responsePayload = null;
    const originalJson = res.json.bind(res);
    res.json = (payload) => {
      responsePayload = payload;
      return originalJson(payload);
    };

    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;

      auditLog({
        userId: getRequestUserId(req),
        action: `${req.method} ${req.baseUrl}${req.route?.path || req.path}`,
        entityType,
        entityId: getRequestEntityId(req) || findEntityId(responsePayload),
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null,
      });
    });

    return next();
  };
}

module.exports = {
  auditLog,
  auditMiddleware,
};
