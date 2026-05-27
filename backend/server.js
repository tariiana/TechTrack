require('dotenv').config();
// Главная точка входа бэкенда: собирает Express-приложение, подключает
// глобальные middleware, регистрирует API-маршруты и запускает сервер.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { pool, initDatabase } = require('./src/config/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

// Безопасность
// Helmet выставляет базовые HTTP-заголовки безопасности для всех ответов.
app.use(helmet());

// CORS
// CORS управляется переменной окружения, чтобы один и тот же код работал
// локально и за production-доменом.
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Логирование
// Morgan пишет access-log: метод, URL, статус и время ответа.
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => req.method === 'OPTIONS',
  message: { error: 'Слишком много запросов, попробуйте позже' },
});
// Ограничиваем частоту API-запросов, но пропускаем preflight OPTIONS.
app.use('/api/', limiter);

// Парсинг JSON
// Ограничение 10mb нужно для JSON-полей с параметрами и историей измерений.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware для установки user_id в контекст БД
app.use(async (req, res, next) => {
    // Прокидываем пользователя в контекст PostgreSQL: триггеры истории читают
    // myapp.current_user_id и могут записать, кто сделал изменение.
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
// API средств измерений.
app.use('/api/instruments', require('./src/routes/instruments.routes'));
// API планов и задач технического обслуживания.
app.use('/api/maintenance', require('./src/routes/maintenance.routes'));

app.use('/api/nodes', require('./src/routes/nodes.routes'));
app.use('/api/subsystems', require('./src/routes/subsystems.routes'));
app.use('/api/node-types', require('./src/routes/nodeTypes.routes'));
app.use('/api/resources', require('./src/routes/resources.routes'));
app.use('/api/users', require('./src/routes/users.routes'));

// Health check без авторизации: используется мониторингом и деплоем.
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
app.get('/test', (req, res) => {
    res.json({ message: 'Backend is working!' });
});

// Все неизвестные URL завершаем единым JSON-ответом.
// Обработка 404
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Маршрут не найден' });
});

// Последний middleware ловит ошибки, которые контроллеры передали через next().
// Обработка ошибок (исправленная версия)
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Перед приемом трафика проверяем инициализацию схемы и соединение с БД.
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

async function shutdown(signal) {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    await pool.end();
    process.exit(0);
}

// Корректно закрываем пул подключений при остановке процесса.
// Graceful shutdown
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
