# Інструкція з тестування міжсервісної взаємодії (ЛР6)

## Огляд системи

Система складається з двох мікросервісів, які взаємодіють через RabbitMQ:

- **Projects Service** (Порт 4002) - публікує події при створенні/оновленні/видаленні проектів
- **Notifications Service** (Порт 4004) - підписується на події та обробляє їх
- **RabbitMQ** (Порти 5672, 15672) - брокер повідомлень

## Архітектура взаємодії

```
┌─────────────────┐         ┌─────────────┐         ┌──────────────────────┐
│ Projects Service│─────────▶│   RabbitMQ  │─────────▶│ Notifications Service│
│    (Publisher)  │  Events  │   (Broker)  │ Events  │     (Consumer)       │
└─────────────────┘         └─────────────┘         └──────────────────────┘
```

### Події, що публікуються:

1. **project.created** - при створенні нового проекту
2. **project.updated** - при оновленні проекту
3. **project.deleted** - при видаленні проекту

## Варіант 1: Тестування з Docker Compose (Рекомендовано)

### Крок 1: Запуск всіх сервісів

```bash
docker compose up --build
```

Ця команда запустить:
- PostgreSQL database (порт 5432)
- RabbitMQ (порти 5672, 15672)
- Projects Service (порт 4002)
- Notifications Service (порт 4004)

### Крок 2: Перевірка статусу сервісів

```bash
# Перевірити статус Projects Service
curl http://localhost:4002/health

# Перевірити статус Notifications Service
curl http://localhost:4004/health
```

### Крок 3: Доступ до RabbitMQ Management UI

Відкрийте браузер: http://localhost:15672

- **Username:** guest
- **Password:** guest

Тут можна відслідковувати:
- Черги повідомлень
- З'єднання
- Канали
- Статистику повідомлень

## Варіант 2: Локальний запуск (без Docker)

### Передумови

1. **PostgreSQL** має бути запущений локально
2. **RabbitMQ** має бути встановлений і запущений
3. **Node.js 20+** встановлений

### Крок 1: Налаштування бази даних

```sql
-- Створити базу даних
CREATE DATABASE projects_db;

-- Підключитися до бази
\c projects_db

-- Таблиці будуть створені автоматично при запуску сервісу
```

### Крок 2: Запуск RabbitMQ

```bash
# Для Windows (якщо встановлено через installer)
rabbitmq-server

# Для macOS (через Homebrew)
brew services start rabbitmq

# Для Linux
sudo systemctl start rabbitmq-server
```

### Крок 3: Налаштування змінних середовища

#### Projects Service (.env)

Створіть файл `projects-service/.env`:

```env
PORT=4002
DB_HOST=localhost
DB_PORT=5432
DB_NAME=projects_db
DB_USER=postgres
DB_PASSWORD=postgres
RABBITMQ_URL=amqp://guest:guest@localhost:5672
QUEUE_NAME=project_events
NODE_ENV=development
```

#### Notifications Service (.env)

Створіть файл `notifications-service/.env`:

```env
PORT=4004
RABBITMQ_URL=amqp://guest:guest@localhost:5672
QUEUE_NAME=project_events
NODE_ENV=development
```

### Крок 4: Запуск сервісів

#### Термінал 1: Projects Service

```bash
cd projects-service
npm install
npm run dev
```

#### Термінал 2: Notifications Service

```bash
cd notifications-service
npm install
npm run dev
```

## Тестові сценарії

### Тест 1: Створення проекту

#### Запит:

```bash
curl -X POST http://localhost:4002/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Проект тестування ЛР6",
    "description": "Тестування міжсервісної взаємодії",
    "owner_id": 1,
    "priority": "high",
    "start_date": "2024-01-15",
    "deadline": "2024-03-15"
  }'
```

#### Очікуваний результат:

**Projects Service (консоль):**
```
📤 Event published: project.created {
  id: 1,
  name: 'Проект тестування ЛР6',
  owner_id: 1,
  ...
}
```

**Notifications Service (консоль):**
```
📩 Event received: project.created
📧 NEW NOTIFICATION
========================================
Project: Проект тестування ЛР6
Description: Тестування міжсервісної взаємодії
Owner ID: 1
Priority: high
Start Date: 2024-01-15
Deadline: 2024-03-15
========================================
```

### Тест 2: Оновлення проекту

#### Запит:

```bash
curl -X PUT http://localhost:4002/api/projects/1 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active",
    "priority": "critical"
  }'
```

#### Очікуваний результат:

**Projects Service (консоль):**
```
📤 Event published: project.updated {
  id: 1,
  name: 'Проект тестування ЛР6',
  status: 'active',
  priority: 'critical',
  ...
}
```

**Notifications Service (консоль):**
```
📩 Event received: project.updated
🔄 PROJECT UPDATE NOTIFICATION
========================================
Project: Проект тестування ЛР6
Status: active
Priority: critical
Updated: [timestamp]
========================================
```

### Тест 3: Видалення проекту

#### Запит:

```bash
curl -X DELETE http://localhost:4002/api/projects/1
```

#### Очікуваний результат:

**Projects Service (консоль):**
```
📤 Event published: project.deleted {
  id: 1,
  name: 'Проект тестування ЛР6'
}
```

**Notifications Service (консоль):**
```
📩 Event received: project.deleted
🗑️  PROJECT DELETION NOTIFICATION
========================================
Project ID: 1
Project Name: Проект тестування ЛР6
Deleted at: [timestamp]
========================================
```

## Перевірка в RabbitMQ Management UI

1. Відкрийте http://localhost:15672
2. Перейдіть до вкладки **Queues**
3. Знайдіть чергу `project_events`
4. Перевірте:
   - **Ready**: кількість необроблених повідомлень (має бути 0)
   - **Total**: загальна кількість оброблених повідомлень
   - **Message rate**: швидкість обробки повідомлень

5. Натисніть на чергу `project_events` для детальної інформації:
   - **Consumers**: має бути 1 (Notifications Service)
   - **Bindings**: прив'язки до exchange

## Тестування через Postman

### Імпорт колекції

Створіть нову колекцію в Postman з наступними запитами:

#### 1. Health Check - Projects Service
- **Method**: GET
- **URL**: http://localhost:4002/health

#### 2. Health Check - Notifications Service
- **Method**: GET
- **URL**: http://localhost:4004/health

#### 3. Create Project
- **Method**: POST
- **URL**: http://localhost:4002/api/projects
- **Headers**: Content-Type: application/json
- **Body** (JSON):
```json
{
  "name": "Test Project",
  "description": "Testing inter-service communication",
  "owner_id": 1,
  "priority": "medium"
}
```

#### 4. Get All Projects
- **Method**: GET
- **URL**: http://localhost:4002/api/projects

#### 5. Update Project
- **Method**: PUT
- **URL**: http://localhost:4002/api/projects/{{project_id}}
- **Headers**: Content-Type: application/json
- **Body** (JSON):
```json
{
  "status": "active",
  "priority": "high"
}
```

#### 6. Delete Project
- **Method**: DELETE
- **URL**: http://localhost:4002/api/projects/{{project_id}}

## Діагностика проблем

### Проблема 1: RabbitMQ connection failed

**Симптоми:**
```
RabbitMQ connection failed. Retrying... (4 left)
```

**Рішення:**
1. Перевірити, чи запущений RabbitMQ: `systemctl status rabbitmq-server` (Linux) або Task Manager (Windows)
2. Перевірити порт 5672: `netstat -an | grep 5672`
3. Перевірити credentials в .env файлах

### Проблема 2: Event не доходить до Notifications Service

**Симптоми:**
- Projects Service публікує події
- Notifications Service не виводить повідомлень

**Рішення:**
1. Перевірити, чи підключений consumer в RabbitMQ Management UI
2. Перевірити ім'я черги (має бути однакове: `project_events`)
3. Перевірити логи Notifications Service на помилки

### Проблема 3: Database connection error

**Симптоми:**
```
Failed to connect to database
```

**Рішення:**
1. Перевірити, чи запущений PostgreSQL
2. Перевірити credentials в .env
3. Створити базу даних: `CREATE DATABASE projects_db;`

## Очікувані результати для звіту

### Скріншоти для включення в звіт:

1. ✅ Логи Projects Service з публікацією події
2. ✅ Логи Notifications Service з обробкою події
3. ✅ RabbitMQ Management UI з чергою `project_events`
4. ✅ Postman запит CREATE project з відповіддю
5. ✅ Docker Compose вивід з запуском всіх сервісів
6. ✅ Database з створеним проектом

### Метрики для аналізу:

- Час доставки повідомлення (latency)
- Кількість успішно оброблених подій
- Кількість помилок (має бути 0)
- Використання пам'яті сервісів
- CPU utilization

## Висновки

Після успішного проходження всіх тестів ви підтвердите:

1. ✅ Асинхронну міжсервісну взаємодію через RabbitMQ
2. ✅ Надійну доставку повідомлень (persistent messages, durable queues)
3. ✅ Обробку трьох типів подій (created, updated, deleted)
4. ✅ Graceful degradation (сервіси працюють навіть якщо RabbitMQ недоступний)
5. ✅ Правильну обробку помилок та retry logic

## Додаткові команди

### Перегляд логів Docker

```bash
# Всі сервіси
docker compose logs -f

# Тільки Projects Service
docker compose logs -f projects-service

# Тільки Notifications Service
docker compose logs -f notifications-service

# Тільки RabbitMQ
docker compose logs -f rabbitmq
```

### Зупинка сервісів

```bash
# Зупинити всі сервіси
docker compose down

# Зупинити і видалити volumes (включно з базою даних)
docker compose down -v
```

### Перезапуск окремого сервісу

```bash
docker compose restart projects-service
docker compose restart notifications-service
```
