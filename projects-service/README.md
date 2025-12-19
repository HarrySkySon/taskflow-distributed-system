# Projects Service

Мікросервіс для управління проєктами в системі TaskFlow.

## Функціональність

- CRUD операції для проєктів
- Управління учасниками проєкту
- Фільтрація проєктів за власником та статусом
- Пагінація результатів

## Технології

- Node.js + TypeScript
- Express.js
- PostgreSQL
- Docker

## Структура бази даних

### Таблиця projects
- id (SERIAL PRIMARY KEY)
- name (VARCHAR)
- description (TEXT)
- owner_id (INTEGER)
- status (VARCHAR)
- start_date, end_date, deadline (DATE)
- priority (VARCHAR)
- created_at, updated_at (TIMESTAMP)

### Таблиця project_members
- id (SERIAL PRIMARY KEY)
- project_id (INTEGER, FK)
- user_id (INTEGER)
- role (VARCHAR)
- joined_at (TIMESTAMP)

## API Endpoints

### Проєкти
- `GET /api/projects` - Отримати список проєктів
- `GET /api/projects/:id` - Отримати проєкт за ID
- `POST /api/projects` - Створити новий проєкт
- `PUT /api/projects/:id` - Оновити проєкт
- `DELETE /api/projects/:id` - Видалити проєкт

### Учасники проєкту
- `POST /api/projects/:id/members` - Додати учасника
- `DELETE /api/projects/:id/members/:user_id` - Видалити учасника

### Інше
- `GET /health` - Перевірка стану сервісу

## Запуск

### Використання Docker Compose
```bash
docker-compose up -d
```

### Локальний запуск
```bash
# Встановити залежності
npm install

# Створити .env файл
cp .env.example .env

# Запустити в режимі розробки
npm run dev

# Зібрати проєкт
npm run build

# Запустити в production режимі
npm start
```

## Змінні середовища

- `PORT` - Порт сервісу (за замовчуванням: 4002)
- `DB_HOST` - Хост PostgreSQL
- `DB_PORT` - Порт PostgreSQL (за замовчуванням: 5432)
- `DB_NAME` - Назва бази даних
- `DB_USER` - Користувач БД
- `DB_PASSWORD` - Пароль БД
- `NODE_ENV` - Середовище (development/production)

## Приклади запитів

### Створити проєкт
```bash
curl -X POST http://localhost:4002/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Project",
    "description": "Project description",
    "owner_id": 1,
    "priority": "high",
    "deadline": "2025-12-31"
  }'
```

### Отримати всі проєкти
```bash
curl http://localhost:4002/api/projects
```

### Отримати проєкт з учасниками
```bash
curl http://localhost:4002/api/projects/1?include_members=true
```

### Оновити проєкт
```bash
curl -X PUT http://localhost:4002/api/projects/1 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "end_date": "2025-12-18"
  }'
```

### Видалити проєкт
```bash
curl -X DELETE http://localhost:4002/api/projects/1
```
