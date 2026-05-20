const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key';

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query(
      `SELECT u.user_id, u.login, r.name as role_name
       FROM equipment.users u
       JOIN equipment.roles r ON u.role_id = r.role_id
       WHERE u.user_id = $1 AND u.is_active = true`,
      [decoded.userId]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }
    req.user = result.rows[0];
    await pool.query(`SET myapp.current_user_id = '${req.user.user_id}'`);
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return res.status(403).json({ error: 'Недействительный токен' });
    if (err.name === 'TokenExpiredError') return res.status(403).json({ error: 'Токен истёк' });
    return res.status(500).json({ error: 'Ошибка авторизации' });
  }
}

module.exports = { authMiddleware };