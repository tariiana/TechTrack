const roles = {
  admin: ['*'],
  operator: ['instrument:view', 'instrument:create', 'instrument:update', 'instrument:delete', 'verification:create'],
  observer: ['instrument:view']
};

function checkPermission(required) {
  return (req, res, next) => {
    const userRole = req.user?.role_name;
    if (!userRole) return res.status(401).json({ error: 'Не авторизован' });
    if (userRole === 'admin') return next();
    const allowed = roles[userRole] || [];
    const has = required.some(p => allowed.includes(p) || allowed.includes('*'));
    if (!has) return res.status(403).json({ error: 'Недостаточно прав' });
    next();
  };
}

module.exports = { checkPermission };