require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { pool, initDatabase } = require('./src/config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Безопасность
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Логирование
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => req.method === 'OPTIONS',
  message: { error: 'Слишком много запросов, попробуйте позже' },
});
app.use('/api/', limiter);

// Парсинг JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware для установки user_id в контекст БД
app.use(async (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (userId) {
        try {
            await pool.query(`SELECT set_config('myapp.current_user_id', $1, true)`, [userId]);
        } catch (e) {
            console.error("Ошибка установки user_id в БД", e);
        }
    }
    next();
});

// Маршруты API
//app.use('/api', require('./src/routes/index'));
app.use('/api/auth', require('./src/routes/auth.routes'));
// Маршрут для СИ (средств измерений)
app.use('/api/instruments', require('./src/routes/instruments.routes'));
// Маршрут для Обслуживания
app.use('/api/maintenance', require('./src/routes/maintenance.routes'));

app.use('/api/nodes', require('./src/routes/nodes.routes'));
app.use('/api/subsystems', require('./src/routes/subsystems.routes'));
app.use('/api/node-types', require('./src/routes/nodeTypes.routes'));
app.use('/api/resources', require('./src/routes/resources.routes'));
app.use('/api/users', require('./src/routes/users.routes'));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
app.get('/test', (req, res) => {
    res.json({ message: 'Backend is working!' });
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Маршрут не найден' });
});

// Обработка ошибок (исправленная версия)
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    const status = err.status || err.statusCode || (err.code === '22P02' ? 400 : 500);
    const message = status >= 500 ? 'Внутренняя ошибка сервера' : err.message;
    res.status(status).json({ success: false, status, error: message });
});

// Запуск сервера
async function start() {
    try {
        await initDatabase();
        await pool.query('SELECT 1');
        console.log('✅ Database connected successfully');
        
        app.listen(PORT, () => {
            console.log(`🚀 Сервер запущен на порту ${PORT}`);
            console.log(`📍 Health: http://localhost:${PORT}/health`);
            console.log(`📍 API: http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

start();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await pool.end();
    process.exit(0);
});
