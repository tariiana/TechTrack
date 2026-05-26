# Production Deployment Plan

Документ описывает перенос TechTrack на сервер заказчика без запуска в режиме разработки.

## 1. Что должно быть на сервере

- Linux-сервер, желательно Ubuntu Server 22.04/24.04.
- Node.js версии, совместимой с проектом: `20.19+` или `22.12+`.
- PostgreSQL.
- Nginx.
- Домен или IP-адрес заказчика.
- SSH-доступ.

## 2. Схема запуска

Nginx принимает внешние запросы:

- `/` отдает собранный frontend из `frontend/dist`.
- `/api/*` проксирует на backend `http://127.0.0.1:3000/api/*`.
- `/health` проксирует на backend health-check.

Backend запускается как постоянный процесс через PM2.

## 3. Переменные окружения

Реальные `.env` файлы не нужно хранить в git.

Шаблоны:

- `backend/.env.example`
- `frontend/.env.example`

На сервере создать `backend/.env` по шаблону и заполнить реальные значения:

```env
NODE_ENV=production
PORT=3000

DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password

JWT_SECRET=replace-with-long-random-secret
JWT_EXPIRES_IN=8h
BCRYPT_ROUNDS=10

CORS_ORIGIN=https://your-domain.example
```

Для frontend перед production-сборкой обычно достаточно:

```env
VITE_API_URL=/api
```

## 4. База данных

Backend сейчас создает только схему `equipment`, но не создает все таблицы приложения.

Перед переносом нужно подготовить один из вариантов:

- дамп текущей рабочей PostgreSQL-базы;
- SQL-файл полной схемы;
- набор миграций в `database/migrations`.

Пример дампа:

```bash
pg_dump -h SOURCE_HOST -U SOURCE_USER -d SOURCE_DB -Fc -f techtrack.dump
```

Пример восстановления:

```bash
pg_restore -h TARGET_HOST -U TARGET_USER -d TARGET_DB techtrack.dump
```

## 5. Backend

Установка production-зависимостей:

```bash
cd /var/www/techtrack/backend
npm ci --omit=dev
```

Проверка ручного запуска:

```bash
node server.js
```

Health-check:

```bash
curl http://127.0.0.1:3000/health
```

## 6. PM2

В проект добавлен `ecosystem.config.cjs`.

Запуск backend:

```bash
cd /var/www/techtrack
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Проверка:

```bash
pm2 status
pm2 logs techtrack-backend
```

Перезапуск после изменения `.env` или кода:

```bash
pm2 restart techtrack-backend
```

## 7. Nginx

Пример конфига лежит в:

```text
deploy/nginx.techtrack.example.conf
```

На сервере его нужно скопировать в `/etc/nginx/sites-available/techtrack`, заменить `your-domain.example` и пути под реальный сервер, затем включить:

```bash
sudo ln -s /etc/nginx/sites-available/techtrack /etc/nginx/sites-enabled/techtrack
sudo nginx -t
sudo systemctl reload nginx
```

## 8. HTTPS

Если используется домен, подключить сертификат:

```bash
sudo certbot --nginx -d your-domain.example
```

После HTTPS убедиться, что `CORS_ORIGIN` в `backend/.env` совпадает с реальным публичным адресом.

## 9. Проверка после переноса

- Главная страница открывается.
- При обновлении вложенных страниц frontend не получает 404.
- `/health` возвращает `status: OK`.
- Авторизация работает.
- Запросы из браузера идут на `/api`, а не на localhost.
- В консоли браузера нет CORS-ошибок.
- `pm2 status` показывает `techtrack-backend` в статусе `online`.

## 10. Резервные копии

Минимум: ежедневный `pg_dump` и хранение нескольких последних копий.

Пример:

```bash
pg_dump -U TARGET_USER -d TARGET_DB -Fc -f /backups/techtrack_$(date +%F).dump
```

Не хранить production-дампы с данными заказчика в git.
