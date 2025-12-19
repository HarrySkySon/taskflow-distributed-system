# Лабораторна робота №7 - Гід по розгортанню
## Оркестрація мікросервісів з Docker Compose

---

## Зміст

1. [Огляд системи](#огляд-системи)
2. [Передумови](#передумови)
3. [Архітектура](#архітектура)
4. [Покращення у ЛР7](#покращення-у-лр7)
5. [Інструкція з розгортання](#інструкція-з-розгортання)
6. [Тестування системи](#тестування-системи)
7. [Моніторинг та діагностика](#моніторинг-та-діагностика)
8. [Керування оркестрацією](#керування-оркестрацією)

---

## Огляд системи

**TaskFlow Project Management System** - розподілена система управління проектами, яка складається з 4 мікросервісів, оркестрованих через Docker Compose.

### Компоненти системи:

| Сервіс | Технологія | Порт | Призначення |
|--------|-----------|------|-------------|
| **projects-db** | PostgreSQL 16 | 5432 | База даних проектів |
| **rabbitmq** | RabbitMQ 3.12 | 5672, 15672 | Брокер повідомлень |
| **projects-service** | Node.js + TypeScript | 4002 | REST API для проектів |
| **notifications-service** | Node.js + TypeScript | 4004 | Обробка сповіщень |

---

## Передумови

### Програмне забезпечення:

```bash
# 1. Docker Engine
docker --version
# Очікується: Docker version 24.0+ або новіше

# 2. Docker Compose
docker compose version
# Очікується: Docker Compose version v2.20+ або новіше
```

### Системні вимоги:

- **CPU**: Мінімум 2 ядра (рекомендовано 4)
- **RAM**: Мінімум 4 GB (рекомендовано 8 GB)
- **Диск**: Мінімум 5 GB вільного місця
- **Порти**: 4002, 4004, 5432, 5672, 15672 мають бути вільні

### Перевірка доступності портів:

```bash
# Windows
netstat -an | findstr "4002 4004 5432 5672 15672"

# Linux/macOS
netstat -tuln | grep -E "4002|4004|5432|5672|15672"

# Порти повинні бути вільні (не повинно бути виводу)
```

---

## Архітектура

### Діаграма взаємодії:

```
┌──────────────────────────────────────────────────────────────────┐
│                     Docker Network: taskflow-network              │
│                                                                    │
│  ┌─────────────┐         ┌──────────────┐         ┌─────────────┐│
│  │ projects-db │◄────────│   projects   │         │notifications││
│  │             │  DB     │   -service   │         │  -service   ││
│  │ PostgreSQL  │  Query  │              │         │             ││
│  │   :5432     │         │    :4002     │         │    :4004    ││
│  └─────────────┘         └──────┬───────┘         └──────▲──────┘│
│                                  │                        │       │
│                                  │  Publish Events        │       │
│                                  │  (AMQP)                │       │
│                                  ▼                        │       │
│                          ┌──────────────┐                 │       │
│                          │   RabbitMQ   │─────────────────┘       │
│                          │              │  Consume Events         │
│                          │ :5672 :15672 │    (AMQP)               │
│                          └──────────────┘                         │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘

External Access:
  └─► REST API: http://localhost:4002/api/projects
  └─► Health Check: http://localhost:4002/health
  └─► RabbitMQ UI: http://localhost:15672
  └─► Notifications: http://localhost:4004/health
```

### Потік даних:

1. **Клієнт** → REST запит → **Projects Service** (port 4002)
2. **Projects Service** → SQL запит → **PostgreSQL** (port 5432)
3. **Projects Service** → Публікація події → **RabbitMQ** (port 5672)
4. **RabbitMQ** → Доставка події → **Notifications Service** (port 4004)
5. **Notifications Service** → Обробка та логування сповіщення

---

## Покращення у ЛР7

### 1. Health Checks для Application Services

**Що додано:**
```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:4002/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

**Переваги:**
- Автоматична перевірка стану сервісу
- Запобігання запитам до нездорових контейнерів
- Правильна послідовність запуску через `depends_on: condition: service_healthy`

### 2. Restart Policies

**Що додано:**
```yaml
restart: unless-stopped
```

**Поведінка:**
- Контейнер перезапускається при краші
- НЕ перезапускається, якщо був зупинений вручну
- Перезапускається після reboot системи (якщо не був зупинений)

### 3. Resource Limits

**Додано для кожного сервісу:**

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'      # Максимум CPU
      memory: 512M     # Максимум RAM
    reservations:
      cpus: '0.5'      # Гарантована CPU
      memory: 256M     # Гарантована RAM
```

**Ресурси по сервісах:**

| Сервіс | CPU Limit | Memory Limit | CPU Reserved | Memory Reserved |
|--------|-----------|--------------|--------------|-----------------|
| projects-db | 1.0 | 512M | 0.5 | 256M |
| rabbitmq | 1.0 | 512M | 0.5 | 256M |
| projects-service | 0.5 | 256M | 0.25 | 128M |
| notifications-service | 0.5 | 256M | 0.25 | 128M |
| **TOTAL** | **3.0** | **1.5G** | **1.5** | **768M** |

---

## Інструкція з розгортання

### Крок 1: Клонування репозиторію

```bash
# Перейти в робочу директорію
cd "C:\Users\123_4\Documents\Deutschland\Bewerbung\Вступ до ВУЗ\КНУБА навчання\Архітектура розподілених програмних систем_Мазуренко Р_ІСП"

# Перевірити структуру проекту
ls -la
```

### Крок 2: Перевірка docker-compose.yml

```bash
# Валідація синтаксису
docker compose config

# Якщо все ОК, побачите повний YAML з розгорнутими змінними
```

### Крок 3: Побудова образів

```bash
# Побудувати всі образи з нуля
docker compose build --no-cache

# Або побудувати окремий сервіс
docker compose build projects-service
docker compose build notifications-service
```

**Очікуваний результат:**
```
[+] Building 45.2s (25/25) FINISHED
 => [projects-service internal] load build definition
 => [projects-service] building...
 => [notifications-service internal] load build definition
 => [notifications-service] building...
✔ Successfully built projects-service
✔ Successfully built notifications-service
```

### Крок 4: Запуск системи

```bash
# Запустити всі сервіси в detached mode
docker compose up -d

# Або з реалтайм логами
docker compose up

# Або з rebuild
docker compose up --build -d
```

**Очікуваний вивід:**
```
[+] Running 6/6
 ✔ Network taskflow-network           Created
 ✔ Volume "projects_db_data"          Created
 ✔ Volume "rabbitmq_data"             Created
 ✔ Container projects-db              Healthy
 ✔ Container rabbitmq                 Healthy
 ✔ Container projects-service         Started
 ✔ Container notifications-service    Started
```

### Крок 5: Перевірка статусу

```bash
# Переглянути статус всіх контейнерів
docker compose ps

# Очікуваний результат:
# NAME                    STATUS              PORTS
# projects-db             Up (healthy)        0.0.0.0:5432->5432/tcp
# rabbitmq                Up (healthy)        0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
# projects-service        Up (healthy)        0.0.0.0:4002->4002/tcp
# notifications-service   Up (healthy)        0.0.0.0:4004->4004/tcp
```

---

## Тестування системи

### Тест 1: Health Checks

**Перевірка всіх health endpoints:**

```bash
# Projects Service
curl http://localhost:4002/health

# Очікувана відповідь:
# {
#   "success": true,
#   "message": "Projects Service is running",
#   "timestamp": "2024-01-15T10:30:00.000Z"
# }

# Notifications Service
curl http://localhost:4004/health

# Очікувана відповідь:
# {
#   "success": true,
#   "message": "Notifications Service is running",
#   "timestamp": "2024-01-15T10:30:00.000Z"
# }
```

### Тест 2: Створення проекту (Event Flow)

**Створити новий проект:**

```bash
curl -X POST http://localhost:4002/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ЛР7 Тестовий Проект",
    "description": "Тестування оркестрації мікросервісів",
    "owner_id": 1,
    "priority": "high",
    "status": "planning"
  }'
```

**Очікувана відповідь:**
```json
{
  "success": true,
  "message": "Project created successfully",
  "data": {
    "id": 1,
    "name": "ЛР7 Тестовий Проект",
    "description": "Тестування оркестрації мікросервісів",
    "owner_id": 1,
    "priority": "high",
    "status": "planning",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Перевірити логи Notifications Service:**
```bash
docker compose logs notifications-service --tail 20

# Має містити:
# 📩 Event received: project.created
# 📧 NEW NOTIFICATION
# ========================================
# Project: ЛР7 Тестовий Проект
# Description: Тестування оркестрації мікросервісів
# ...
```

### Тест 3: Оновлення проекту

```bash
curl -X PUT http://localhost:4002/api/projects/1 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active",
    "priority": "critical"
  }'
```

### Тест 4: Отримання всіх проектів

```bash
curl http://localhost:4002/api/projects
```

### Тест 5: Видалення проекту

```bash
curl -X DELETE http://localhost:4002/api/projects/1
```

---

## Моніторинг та діагностика

### 1. Логи контейнерів

```bash
# Всі логи в реальному часі
docker compose logs -f

# Логи конкретного сервісу
docker compose logs -f projects-service
docker compose logs -f notifications-service
docker compose logs -f rabbitmq

# Останні 50 рядків
docker compose logs --tail 50 projects-service
```

### 2. RabbitMQ Management UI

**URL:** http://localhost:15672
**Credentials:** guest / guest

**Що перевіряти:**
- **Queues** → `project_events` → Ready messages (має бути 0)
- **Connections** → 2 активні з'єднання (Projects + Notifications)
- **Consumers** → 1 consumer на черзі `project_events`
- **Message rates** → Графіки publish/deliver

### 3. Resource Usage

```bash
# Використання ресурсів контейнерами
docker stats

# Очікуваний вивід:
# CONTAINER            CPU %    MEM USAGE / LIMIT    MEM %    NET I/O
# projects-service     0.5%     120M / 256M         46.88%   1.2kB / 850B
# notifications-svc    0.3%     100M / 256M         39.06%   850B / 1.2kB
# rabbitmq             1.2%     200M / 512M         39.06%   5kB / 3kB
# projects-db          0.8%     150M / 512M         29.30%   2kB / 1.5kB
```

### 4. Health Status

```bash
# Перевірити стан здоров'я
docker compose ps --format json | jq -r '.[] | "\(.Name): \(.Health)"'

# Очікуваний результат:
# projects-db: healthy
# rabbitmq: healthy
# projects-service: healthy
# notifications-service: healthy
```

### 5. Network Inspection

```bash
# Інспектувати мережу
docker network inspect taskflow-network

# Перевірити підключені контейнери
docker network inspect taskflow-network | jq '.[0].Containers | keys'
```

---

## Керування оркестрацією

### Основні команди

```bash
# Старт
docker compose up -d

# Стоп
docker compose stop

# Restart
docker compose restart

# Down (видалення контейнерів, але збереження volumes)
docker compose down

# Down з видаленням volumes (⚠️ Втрата даних!)
docker compose down -v

# Rebuild та restart
docker compose up --build -d
```

### Керування окремими сервісами

```bash
# Перезапустити Projects Service
docker compose restart projects-service

# Переглянути логи RabbitMQ
docker compose logs rabbitmq

# Зупинити Notifications Service
docker compose stop notifications-service

# Запустити Notifications Service
docker compose start notifications-service

# Пере-build Projects Service
docker compose up -d --build projects-service
```

### Масштабування (Horizontal Scaling)

```bash
# Запустити 3 інстанси Notifications Service
docker compose up -d --scale notifications-service=3

# Перевірити
docker compose ps notifications-service

# ПРИМІТКА: Для повного масштабування потрібно:
# 1. Видалити container_name
# 2. Налаштувати load balancer
# 3. Використати динамічні порти
```

### Cleanup

```bash
# Видалити зупинені контейнери
docker compose rm -f

# Видалити невикористовувані образи
docker image prune -a

# Видалити невикористовувані volumes
docker volume prune

# Повний cleanup (⚠️ Видалить ВСІ Docker об'єкти)
docker system prune -a --volumes
```

---

## Troubleshooting

### Проблема 1: Порт вже зайнятий

**Симптоми:**
```
Error: bind: address already in use
```

**Рішення:**
```bash
# Знайти процес на порту 4002
netstat -ano | findstr :4002

# Вбити процес (Windows)
taskkill /PID <PID> /F

# Linux/macOS
lsof -ti:4002 | xargs kill -9
```

### Проблема 2: Service unhealthy

**Симптоми:**
```
Container projects-service is unhealthy
```

**Рішення:**
```bash
# 1. Перевірити логи
docker compose logs projects-service

# 2. Перевірити health check вручну
docker exec projects-service wget --spider http://localhost:4002/health

# 3. Збільшити start_period в docker-compose.yml якщо сервіс стартує повільно
```

### Проблема 3: RabbitMQ connection refused

**Симптоми:**
```
RabbitMQ connection failed. Retrying...
```

**Рішення:**
```bash
# 1. Перевірити чи RabbitMQ healthy
docker compose ps rabbitmq

# 2. Перевірити логи RabbitMQ
docker compose logs rabbitmq

# 3. Restart RabbitMQ
docker compose restart rabbitmq

# 4. Перевірити чи всі сервіси на одній мережі
docker network inspect taskflow-network
```

---

## Висновок

Система оркестрації Docker Compose для ЛР7 надає:

✅ **Автоматичний запуск** 4 взаємопов'язаних мікросервісів
✅ **Health checks** для всіх компонентів
✅ **Автоматичний restart** при збоях
✅ **Resource limits** для стабільності
✅ **Ізольована мережа** для безпеки
✅ **Persistent storage** для даних
✅ **Service discovery** через DNS
✅ **Dependency management** з правильною послідовністю запуску

---

**Виконано:** 2024-01-15
**Лабораторна робота №7:** Оркестрація мікросервісів
