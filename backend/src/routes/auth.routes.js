const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key';

router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    const result = await pool.query(
      `SELECT u.user_id, u.login, u.password_hash, u.is_active, r.name as role_name
       FROM equipment.users u
       JOIN equipment.roles r ON u.role_id = r.role_id
       WHERE u.login = $1`,
      [login]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Неверный логин или пароль' });
    if (!user.is_active) return res.status(403).json({ error: 'Пользователь заблокирован' });

    let isValid = false;
    // Если пароль в БД начинается с $2, это bcrypt хеш
    if (user.password_hash && user.password_hash.startsWith('$2')) {
      isValid = await bcrypt.compare(password, user.password_hash);
    } else {
      // Для тестов, если пароль в БД хранится в открытом виде
      isValid = (password === user.password_hash);
    }

    if (!isValid) return res.status(401).json({ error: 'Неверный логин или пароль' });

    const token = jwt.sign(
      { userId: user.user_id, login: user.login, role: user.role_name },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ success: true, token, user: { id: user.user_id, login: user.login, role: user.role_name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;