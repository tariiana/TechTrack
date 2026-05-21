const roles = {
  admin: ['*'],
  operator: [
    'node:view',
    'node:create',
    'node:update',
    'node:delete',
    'nodeType:view',
    'subsystem:view',
    'subsystem:create',
    'subsystem:update',
    'subsystem:delete',
    'instrument:view',
    'instrument:create',
    'instrument:update',
    'instrument:delete',
    'verification:create',
    'verification:update',
    'resource:view',
    'resource:create',
    'resource:update',
    'resource:delete',
    'resource:calculate',
    'maintenance:view',
    'maintenance:create',
    'maintenance:update',
    'maintenance:delete',
  ],
  observer: [
    'node:view',
    'nodeType:view',
    'subsystem:view',
    'instrument:view',
    'resource:view',
    'maintenance:view',
  ],
};

function checkPermission(required) {
  return (req, res, next) => {
    const userRole = req.user?.role_name || req.user?.role;

    if (!userRole) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    if (userRole === 'admin') {
      return next();
    }

    const allowed = roles[userRole] || [];
    const hasPermission = required.some((permission) => (
      allowed.includes(permission) || allowed.includes('*')
    ));

    if (!hasPermission) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    return next();
  };
}

module.exports = { checkPermission };
