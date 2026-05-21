const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key';
const TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

function generateToken(user) {
  return jwt.sign(
    {
      userId: user.user_id,
      user_id: user.user_id,
      login: user.login,
      full_name: user.full_name,
      role: user.role || user.role_name,
      role_name: user.role_name || user.role,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );
}

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId || decoded.user_id;

    if (!userId) {
      return res.status(403).json({ error: 'Недействительный токен' });
    }

    const result = await pool.query(
      `SELECT u.user_id, u.login, u.full_name, r.name AS role_name
       FROM equipment.users u
       JOIN equipment.roles r ON u.role_id = r.role_id
       WHERE u.user_id = $1 AND u.is_active = true`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    req.user = result.rows[0];
    await pool.query(`SELECT set_config('myapp.current_user_id', $1, true)`, [req.user.user_id]);
    return next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Недействительный токен' });
    }

    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Токен истёк' });
    }

    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Ошибка авторизации' });
  }
}

module.exports = { authMiddleware, generateToken };
