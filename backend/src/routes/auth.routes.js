const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { auditLog } = require('../utils/auditLogger');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key';
const TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

function toPublicUser(user) {
  return {
    id: user.user_id,
    user_id: user.user_id,
    login: user.login,
    full_name: user.full_name,
    role: user.role_name,
    role_name: user.role_name,
  };
}

router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body || {};
    const ipAddress = req.ip || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    if (!login || !password) {
      await auditLog({
        action: 'LOGIN_FAILED',
        entityType: 'auth',
        ipAddress,
        userAgent,
      });
      return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    const result = await pool.query(
      `SELECT u.user_id, u.login, u.password_hash, u.full_name, u.is_active, r.name AS role_name
       FROM equipment.users u
       JOIN equipment.roles r ON u.role_id = r.role_id
       WHERE u.login = $1`,
      [login]
    );

    const user = result.rows[0];
    if (!user) {
      await auditLog({
        action: 'LOGIN_FAILED',
        entityType: 'auth',
        ipAddress,
        userAgent,
      });
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    if (!user.is_active) {
      await auditLog({
        userId: user.user_id,
        action: 'LOGIN_BLOCKED',
        entityType: 'auth',
        ipAddress,
        userAgent,
      });
      return res.status(403).json({ error: 'Пользователь заблокирован' });
    }

    const isValidPassword = user.password_hash?.startsWith('$2')
      ? await bcrypt.compare(password, user.password_hash)
      : password === user.password_hash;

    if (!isValidPassword) {
      await auditLog({
        userId: user.user_id,
        action: 'LOGIN_FAILED',
        entityType: 'auth',
        ipAddress,
        userAgent,
      });
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const token = jwt.sign(
      {
        userId: user.user_id,
        user_id: user.user_id,
        login: user.login,
        full_name: user.full_name,
        role: user.role_name,
        role_name: user.role_name,
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRES_IN }
    );

    await auditLog({
      userId: user.user_id,
      action: 'LOGIN_SUCCESS',
      entityType: 'auth',
      ipAddress,
      userAgent,
    });

    return res.json({
      success: true,
      token,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  return res.json({
    success: true,
    user: toPublicUser(req.user),
  });
});

module.exports = router;
