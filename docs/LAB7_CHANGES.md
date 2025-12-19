# ЛР7 - Зміни у docker-compose.yml

## Підсумок змін

Цей документ показує **що саме було додано/змінено** в docker-compose.yml для Лабораторної роботи №7.

---

## 1. Projects-DB (PostgreSQL)

### ❌ ЛР6 (Було)

```yaml
projects-db:
  image: postgres:16-alpine
  container_name: projects-db
  environment:
    POSTGRES_DB: projects_db
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
  ports:
    - "5432:5432"
  volumes:
    - projects_db_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres"]
    interval: 10s
    timeout: 5s
    retries: 5
  networks:
    - taskflow-network
```

### ✅ ЛР7 (Стало)

```yaml
projects-db:
  image: postgres:16-alpine
  container_name: projects-db
  environment:
    POSTGRES_DB: projects_db
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
  ports:
    - "5432:5432"
  volumes:
    - projects_db_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres"]
    interval: 10s
    timeout: 5s
    retries: 5
  networks:
    - taskflow-network
  restart: unless-stopped                    # ✨ ДОДАНО
  deploy:                                    # ✨ ДОДАНО
    resources:
      limits:
        cpus: '1.0'
        memory: 512M
      reservations:
        cpus: '0.5'
        memory: 256M
```

### Зміни:
- ✨ **Додано** `restart: unless-stopped`
- ✨ **Додано** `deploy.resources` з CPU та Memory limits

---

## 2. RabbitMQ

### ❌ ЛР6 (Було)

```yaml
rabbitmq:
  image: rabbitmq:3.12-management-alpine
  container_name: rabbitmq
  ports:
    - "5672:5672"
    - "15672:15672"
  environment:
    RABBITMQ_DEFAULT_USER: guest
    RABBITMQ_DEFAULT_PASS: guest
  volumes:
    - rabbitmq_data:/var/lib/rabbitmq
  healthcheck:
    test: ["CMD", "rabbitmq-diagnostics", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
  networks:
    - taskflow-network
```

### ✅ ЛР7 (Стало)

```yaml
rabbitmq:
  image: rabbitmq:3.12-management-alpine
  container_name: rabbitmq
  ports:
    - "5672:5672"
    - "15672:15672"
  environment:
    RABBITMQ_DEFAULT_USER: guest
    RABBITMQ_DEFAULT_PASS: guest
  volumes:
    - rabbitmq_data:/var/lib/rabbitmq
  healthcheck:
    test: ["CMD", "rabbitmq-diagnostics", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
  networks:
    - taskflow-network
  restart: unless-stopped                    # ✨ ДОДАНО
  deploy:                                    # ✨ ДОДАНО
    resources:
      limits:
        cpus: '1.0'
        memory: 512M
      reservations:
        cpus: '0.5'
        memory: 256M
```

### Зміни:
- ✨ **Додано** `restart: unless-stopped`
- ✨ **Додано** `deploy.resources` з CPU та Memory limits

---

## 3. Projects Service

### ❌ ЛР6 (Було)

```yaml
projects-service:
  build:
    context: ./projects-service
    dockerfile: Dockerfile
  container_name: projects-service
  environment:
    PORT: 4002
    DB_HOST: projects-db
    DB_PORT: 5432
    DB_NAME: projects_db
    DB_USER: postgres
    DB_PASSWORD: postgres
    RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672
    QUEUE_NAME: project_events
    NODE_ENV: production
  ports:
    - "4002:4002"
  depends_on:
    projects-db:
      condition: service_healthy
    rabbitmq:
      condition: service_healthy
  networks:
    - taskflow-network
  restart: unless-stopped
```

### ✅ ЛР7 (Стало)

```yaml
projects-service:
  build:
    context: ./projects-service
    dockerfile: Dockerfile
  container_name: projects-service
  environment:
    PORT: 4002
    DB_HOST: projects-db
    DB_PORT: 5432
    DB_NAME: projects_db
    DB_USER: postgres
    DB_PASSWORD: postgres
    RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672
    QUEUE_NAME: project_events
    NODE_ENV: production
  ports:
    - "4002:4002"
  depends_on:
    projects-db:
      condition: service_healthy
    rabbitmq:
      condition: service_healthy
  healthcheck:                               # ✨ ДОДАНО
    test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:4002/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
  networks:
    - taskflow-network
  restart: unless-stopped
  deploy:                                    # ✨ ДОДАНО
    resources:
      limits:
        cpus: '0.5'
        memory: 256M
      reservations:
        cpus: '0.25'
        memory: 128M
```

### Зміни:
- ✨ **Додано** `healthcheck` для HTTP endpoint
- ✨ **Додано** `deploy.resources` з CPU та Memory limits

---

## 4. Notifications Service

### ❌ ЛР6 (Було)

```yaml
notifications-service:
  build:
    context: ./notifications-service
    dockerfile: Dockerfile
  container_name: notifications-service
  environment:
    PORT: 4004
    RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672
    QUEUE_NAME: project_events
    NODE_ENV: production
  ports:
    - "4004:4004"
  depends_on:
    rabbitmq:
      condition: service_healthy
  networks:
    - taskflow-network
  restart: unless-stopped
```

### ✅ ЛР7 (Стало)

```yaml
notifications-service:
  build:
    context: ./notifications-service
    dockerfile: Dockerfile
  container_name: notifications-service
  environment:
    PORT: 4004
    RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672
    QUEUE_NAME: project_events
    NODE_ENV: production
  ports:
    - "4004:4004"
  depends_on:
    rabbitmq:
      condition: service_healthy
  healthcheck:                               # ✨ ДОДАНО
    test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:4004/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
  networks:
    - taskflow-network
  restart: unless-stopped
  deploy:                                    # ✨ ДОДАНО
    resources:
      limits:
        cpus: '0.5'
        memory: 256M
      reservations:
        cpus: '0.25'
        memory: 128M
```

### Зміни:
- ✨ **Додано** `healthcheck` для HTTP endpoint
- ✨ **Додано** `deploy.resources` з CPU та Memory limits

---

## Підсумок всіх змін

### Загальна статистика

| Компонент | ЛР6 | ЛР7 | Зміни |
|-----------|-----|-----|-------|
| **Health Checks** | 2 сервіси | 4 сервіси | +2 ✨ |
| **Restart Policies** | 2 сервіси | 4 сервіси | +2 ✨ |
| **Resource Limits** | 0 сервісів | 4 сервіси | +4 ✨ |
| **Додані параметри** | - | 18 нових рядків | +18 ✨ |

### Додані конфігурації

#### 1. Health Checks (2 нові)
```yaml
# Projects Service
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:4002/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s

# Notifications Service
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:4004/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

#### 2. Restart Policies (2 нові)
```yaml
# Projects-DB та RabbitMQ
restart: unless-stopped
```

#### 3. Resource Limits (4 нові секції)

**Infrastructure Services (БД + RabbitMQ):**
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 512M
    reservations:
      cpus: '0.5'
      memory: 256M
```

**Application Services (Projects + Notifications):**
```yaml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 256M
    reservations:
      cpus: '0.25'
      memory: 128M
```

---

## Порівняльна таблиця конфігурацій

| Параметр | projects-db | rabbitmq | projects-service | notifications-service |
|----------|-------------|----------|------------------|----------------------|
| **Health Check** | ✅ ЛР6 | ✅ ЛР6 | ✨ **ЛР7** | ✨ **ЛР7** |
| **Restart Policy** | ✨ **ЛР7** | ✨ **ЛР7** | ✅ ЛР6 | ✅ ЛР6 |
| **CPU Limit** | ✨ **ЛР7 (1.0)** | ✨ **ЛР7 (1.0)** | ✨ **ЛР7 (0.5)** | ✨ **ЛР7 (0.5)** |
| **Memory Limit** | ✨ **ЛР7 (512M)** | ✨ **ЛР7 (512M)** | ✨ **ЛР7 (256M)** | ✨ **ЛР7 (256M)** |
| **CPU Reserved** | ✨ **ЛР7 (0.5)** | ✨ **ЛР7 (0.5)** | ✨ **ЛР7 (0.25)** | ✨ **ЛР7 (0.25)** |
| **Memory Reserved** | ✨ **ЛР7 (256M)** | ✨ **ЛР7 (256M)** | ✨ **ЛР7 (128M)** | ✨ **ЛР7 (128M)** |

**Легенда:**
- ✅ ЛР6 - було реалізовано в ЛР6
- ✨ **ЛР7** - додано в ЛР7

---

## Обґрунтування змін

### 1. Чому додали Health Checks для Application Services?

**Проблема в ЛР6:**
- Projects Service та Notifications Service не мали health checks
- Docker не знав чи сервіс готовий приймати трафік
- `depends_on` не міг чекати поки application services стануть healthy

**Рішення в ЛР7:**
- Додано HTTP health checks на endpoints `/health`
- Налаштовано `start_period: 40s` для Node.js ініціалізації
- Тепер можна використовувати `condition: service_healthy` для цих сервісів

**Переваги:**
- ✅ Точне визначення готовності сервісу
- ✅ Можливість додати залежності від application services
- ✅ Автоматичний restart якщо health check fails

### 2. Чому додали Restart Policies для Infrastructure?

**Проблема в ЛР6:**
- projects-db та rabbitmq не мали restart policy
- При збої контейнер не перезапускався автоматично
- Потрібно було вручну запускати

**Рішення в ЛР7:**
- Додано `restart: unless-stopped` для всіх інфраструктурних сервісів
- Тепер всі 4 сервіси мають однакову restart policy

**Переваги:**
- ✅ Автоматичний перезапуск при збої
- ✅ Консистентна поведінка всіх сервісів
- ✅ Не перезапускається якщо зупинений вручну

### 3. Чому додали Resource Limits?

**Проблема в ЛР6:**
- Контейнери могли споживати необмежену кількість ресурсів
- Один контейнер міг захопити всі ресурси хоста
- Непередбачувана поведінка під навантаженням

**Рішення в ЛР7:**
- Налаштовано limits для CPU та Memory
- Налаштовано reservations для гарантованих ресурсів
- Різні ліміти для infrastructure (1.0/512M) та application (0.5/256M) services

**Переваги:**
- ✅ Запобігання resource starvation
- ✅ Передбачуване споживання ресурсів
- ✅ Краще планування capacity
- ✅ Isolation між контейнерами

---

## Візуалізація змін

### До (ЛР6)
```
┌─────────────┐
│ projects-db │
│             │
│ Health: ✅  │
│ Restart: ❌ │
│ Limits: ❌  │
└─────────────┘

┌─────────────┐
│  rabbitmq   │
│             │
│ Health: ✅  │
│ Restart: ❌ │
│ Limits: ❌  │
└─────────────┘

┌──────────────┐
│projects-svc  │
│              │
│ Health: ❌   │
│ Restart: ✅  │
│ Limits: ❌   │
└──────────────┘

┌──────────────┐
│notif-service │
│              │
│ Health: ❌   │
│ Restart: ✅  │
│ Limits: ❌   │
└──────────────┘
```

### Після (ЛР7)
```
┌─────────────┐
│ projects-db │
│             │
│ Health: ✅  │
│ Restart: ✅ │  ← ДОДАНО
│ Limits: ✅  │  ← ДОДАНО
└─────────────┘

┌─────────────┐
│  rabbitmq   │
│             │
│ Health: ✅  │
│ Restart: ✅ │  ← ДОДАНО
│ Limits: ✅  │  ← ДОДАНО
└─────────────┘

┌──────────────┐
│projects-svc  │
│              │
│ Health: ✅   │  ← ДОДАНО
│ Restart: ✅  │
│ Limits: ✅   │  ← ДОДАНО
└──────────────┘

┌──────────────┐
│notif-service │
│              │
│ Health: ✅   │  ← ДОДАНО
│ Restart: ✅  │
│ Limits: ✅   │  ← ДОДАНО
└──────────────┘
```

---

## Висновок

У ЛР7 було виконано **системну оптимізацію** docker-compose.yml:

✅ **+2 Health Checks** - тепер всі 4 сервіси моніторяться
✅ **+2 Restart Policies** - тепер всі 4 сервіси мають auto-restart
✅ **+4 Resource Limits** - тепер всі 4 сервіси мають обмеження ресурсів

**Результат:**
- Більш надійна система (self-healing)
- Передбачуване споживання ресурсів
- Production-ready конфігурація
- Кращий моніторинг стану сервісів

**Файл залишився:**
- Читабельним
- Зрозумілим
- Добре структурованим
- З коментарями

---

**Створено для ЛР7**
**Дата:** 2024-01-15
