# TaskFlow - Distributed Project Management System

> Мікросервісна система управління проектами з підтримкою масштабування, моніторингу та асинхронної комунікації

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-brightgreen)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org/)

## 📋 Зміст

- [Про проект](#про-проект)
- [Архітектура](#архітектура)
- [Технологічний стек](#технологічний-стек)
- [Швидкий старт](#швидкий-старт)
- [Структура проекту](#структура-проекту)
- [Документація](#документація)
- [Моніторинг](#моніторинг)
- [Тестування](#тестування)
- [Масштабування](#масштабування)
- [Ліцензія](#ліцензія)

## 🎯 Про проект

TaskFlow - це розподілена система управління проектами, побудована на мікросервісній архітектурі. Проект демонструє практичне застосування сучасних технологій та патернів розподілених систем.

### Основні можливості

- ✅ **CRUD операції** для проектів та учасників
- ✅ **Асинхронна обробка** подій через RabbitMQ
- ✅ **Горизонтальне масштабування** з автоматичним балансуванням навантаження
- ✅ **Моніторинг у реальному часі** (Prometheus + Grafana)
- ✅ **Централізоване логування** (Loki + Promtail)
- ✅ **Навантажувальне тестування** (k6)
- ✅ **Docker containerization** для всіх компонентів
- ✅ **Health checks** та автоматичне відновлення

### Ключові досягнення

- 🚀 **Продуктивність**: 124 req/s при 3 репліках (+200% від базової)
- ⚡ **Час відгуку**: p(95) = 420ms під навантаженням 100 користувачів
- 🎯 **Надійність**: 99.2% успішних операцій
- 📈 **Масштабованість**: Підтримка до 5+ реплік

## 🏗️ Архітектура

### High-Level Architecture

```
┌──────────────┐
│   Клієнти    │
└──────┬───────┘
       │
┌──────▼───────────┐
│  Nginx (LB)      │ ← Load Balancer (порт 80)
│  least_conn      │
└──────┬───────────┘
       │
       ├────────────┬────────────┬────────────┐
       │            │            │            │
┌──────▼──────┐ ┌──▼───────┐ ┌─▼──────────┐ │
│ Projects-1  │ │Projects-2│ │ Projects-3 │...
│ Service     │ │ Service  │ │ Service    │
│ (Node.js)   │ │          │ │            │
└──────┬──────┘ └────┬─────┘ └─────┬──────┘
       │             │              │
       └─────────────┼──────────────┘
                     │
       ┌─────────────┼─────────────────────┐
       │             │                     │
┌──────▼──────┐ ┌───▼──────────┐ ┌────────▼──────────┐
│ PostgreSQL  │ │  RabbitMQ    │ │  Notifications    │
│     DB      │ │   Broker     │ │     Service       │
└─────────────┘ └──────────────┘ └───────────────────┘
                     │
       ┌─────────────┴─────────────┐
       │                           │
┌──────▼──────┐          ┌─────────▼────────┐
│ Prometheus  │          │     Grafana      │
│  + Loki     │          │   Dashboards     │
└─────────────┘          └──────────────────┘
```

### Компоненти системи

#### Мікросервіси:
1. **Projects Service** - Управління проектами (REST API)
2. **Notifications Service** - Обробка сповіщень (Event Consumer)

#### Інфраструктура:
3. **Nginx** - Load Balancer та Reverse Proxy
4. **PostgreSQL** - Реляційна база даних
5. **RabbitMQ** - Message Broker для асинхронної комунікації

#### Моніторинг:
6. **Prometheus** - Збір метрик
7. **Grafana** - Візуалізація метрик
8. **Loki** - Централізовані логи
9. **Promtail** - Агрегація логів

## 🛠️ Технологічний стек

### Backend
- **Node.js** 20.x - Runtime environment
- **TypeScript** 5.3 - Type-safe JavaScript
- **Express** 4.18 - Web framework
- **PostgreSQL** 16 - Реляційна БД
- **node-postgres (pg)** - PostgreSQL клієнт

### Messaging & Events
- **RabbitMQ** 3.12 - Message broker
- **amqplib** - RabbitMQ client для Node.js

### DevOps & Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Оркестрація контейнерів
- **Nginx** 1.25 - Load balancer

### Monitoring & Observability
- **Prometheus** - Metrics collection
- **Grafana** - Data visualization
- **Loki** - Log aggregation
- **Promtail** - Log shipping

### Testing
- **k6** - Load testing tool

## 🚀 Швидкий старт

### Передумови

Переконайтеся, що встановлено:
- [Docker](https://www.docker.com/) (v20.10+)
- [Docker Compose](https://docs.docker.com/compose/) (v2.0+)
- [Node.js](https://nodejs.org/) (v20.x) - для локальної розробки
- [k6](https://k6.io/) - для тестування (опціонально)

### Запуск системи

#### 1. Клонування репозиторію
```bash
git clone https://github.com/username/taskflow-distributed-system.git
cd taskflow-distributed-system
```

#### 2. Налаштування змінних середовища
```bash
cp .env.example .env
# Відредагуйте .env за потреби
```

#### 3. Запуск всіх сервісів
```bash
# Запуск з 3 репліками projects-service (рекомендовано)
docker compose up -d

# Або з кастомною кількістю реплік
docker compose up -d --scale projects-service=5
```

#### 4. Перевірка статусу
```bash
# Перевірка всіх контейнерів
docker compose ps

# Перевірка health checks
curl http://localhost/health
```

#### 5. Доступ до сервісів

| Сервіс | URL | Опис |
|--------|-----|------|
| Projects API | http://localhost/api/projects | REST API |
| Grafana | http://localhost:3000 | Дашборди (admin/admin) |
| Prometheus | http://localhost:9090 | Метрики |
| RabbitMQ Management | http://localhost:15672 | Черги (guest/guest) |
| Nginx Status | http://localhost/nginx-status | Статус LB |

### Приклади використання API

#### Створити проект
```bash
curl -X POST http://localhost/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Project",
    "description": "Project description",
    "status": "active",
    "start_date": "2025-01-01",
    "end_date": "2025-12-31"
  }'
```

#### Отримати всі проекти
```bash
curl http://localhost/api/projects
```

#### Отримати проект за ID
```bash
curl http://localhost/api/projects/1
```

## 📂 Структура проекту

```
taskflow-distributed-system/
├── projects-service/          # Основний сервіс управління проектами
│   ├── src/
│   │   ├── controllers/       # HTTP контролери
│   │   ├── services/          # Бізнес логіка
│   │   ├── routes/            # API роути
│   │   ├── models/            # Моделі даних
│   │   ├── config/            # Конфігурація
│   │   └── utils/             # Утиліти (eventPublisher, DB)
│   ├── Dockerfile
│   └── package.json
│
├── notifications-service/     # Сервіс сповіщень
│   ├── src/
│   │   ├── consumers/         # RabbitMQ consumers
│   │   ├── services/          # Обробка подій
│   │   └── app.ts
│   ├── Dockerfile
│   └── package.json
│
├── nginx/                     # Конфігурація Nginx
│   └── nginx.conf             # Load balancer config
│
├── monitoring/                # Моніторинг інфраструктура
│   ├── prometheus/
│   ├── grafana/
│   ├── loki/
│   └── promtail/
│
├── load-tests/                # k6 навантажувальні тести
│   ├── smoke-test.js          # Швидка перевірка
│   ├── projects-load-test.js  # Повний тест
│   └── README.md
│
├── docs/                      # Додаткова документація
│   ├── КУРСОВА_РОБОТА.md      # Курсова робота
│   ├── ARCHITECTURE.md        # Архітектура (буде додано)
│   └── API.md                 # API специфікація (буде додано)
│
├── scripts/                   # Скрипти автоматизації
│   ├── scale.sh               # Масштабування (Linux/macOS)
│   └── scale.bat              # Масштабування (Windows)
│
├── docker-compose.yml         # Основна конфігурація
├── docker-compose.scale.yml   # Конфігурація масштабування
├── .env.example               # Приклад змінних середовища
├── .gitignore
└── README.md                  # Цей файл
```

## 📚 Документація

### Основна документація
- [Курсова робота](./docs/КУРСОВА_РОБОТА.md) - Повний звіт по проекту
- [Посібник з масштабування](./SCALING_GUIDE.md) - Горизонтальне масштабування
- [Посібник з тестування](./load-tests/README.md) - Навантажувальні тести
- [Посібник з deployment](./LAB7_DEPLOYMENT_GUIDE.md) - Розгортання системи

### Лабораторні роботи
- [ЛР1 - Аналіз вимог](./ЛР1_Звіт_Аналіз_вимог.md)
- [ЛР6 - REST/gRPC/Async](./LAB6_REPORT.md)
- [ЛР7 - Оркестрація](./LAB7_REPORT.md)
- [ЛР8 - Моніторинг](./LAB8_REPORT.md)
- [ЛР9 - Тестування та масштабування](./ЛР9_ЗВІТ.md)

## 📊 Моніторинг

### Grafana Dashboards

Після запуску системи, відкрийте Grafana: http://localhost:3000

**Credentials:**
- Username: `admin`
- Password: `admin`

**Доступні дашборди:**
- **System Overview** - Загальні метрики системи
- **Services Health** - Здоров'я мікросервісів
- **Nginx Metrics** - Статистика load balancer
- **RabbitMQ Monitoring** - Черги та повідомлення
- **PostgreSQL Metrics** - БД метрики

### Prometheus

Прямий доступ до метрик: http://localhost:9090

**Корисні запити:**
```promql
# CPU використання по сервісах
rate(container_cpu_usage_seconds_total[5m])

# Пам'ять по сервісах
container_memory_usage_bytes

# HTTP request rate
rate(http_requests_total[1m])

# HTTP response time (p95)
histogram_quantile(0.95, http_request_duration_seconds_bucket)
```

## 🧪 Тестування

### Навантажувальне тестування з k6

#### Smoke Test (швидка перевірка)
```bash
cd load-tests
k6 run smoke-test.js
```

#### Load Test (повний тест)
```bash
k6 run projects-load-test.js
```

#### Стрес-тест
```bash
k6 run --vus 200 --duration 10m projects-load-test.js
```

### Очікувані результати

При 3 репліках projects-service:
- **Пропускна здатність**: ~124 req/s
- **p(95) час відгуку**: ~420ms
- **Рівень помилок**: <1%
- **Успішність операцій**: >99%

Детальніше: [EXPECTED_RESULTS.md](./load-tests/EXPECTED_RESULTS.md)

## ⚖️ Масштабування

### Горизонтальне масштабування

#### Docker Compose
```bash
# Масштабування до 5 реплік
docker compose up -d --scale projects-service=5

# Перевірка статусу
docker compose ps projects-service
```

#### Використання скриптів
```bash
# Windows
scale.bat 5

# Linux/macOS
./scale.sh 5
```

### Моніторинг балансування навантаження

```bash
# Nginx статус
curl http://localhost/nginx-status

# Логи всіх реплік
docker compose logs -f projects-service

# Статистика ресурсів
docker stats
```

### Порівняння продуктивності

| Метрика | 1 репліка | 3 репліки | Покращення |
|---------|-----------|-----------|------------|
| Throughput | 41 req/s | 124 req/s | **+200%** |
| p(95) latency | 890ms | 420ms | **-53%** |
| Error rate | 2.16% | 0.8% | **-63%** |

Детальніше: [SCALING_GUIDE.md](./SCALING_GUIDE.md)

## 🔧 Розробка

### Локальний запуск (без Docker)

#### Projects Service
```bash
cd projects-service
npm install
npm run dev  # Запуск на порту 4002
```

#### Notifications Service
```bash
cd notifications-service
npm install
npm run dev  # Запуск на порту 4004
```

### Build
```bash
# Build всіх сервісів
docker compose build

# Build конкретного сервісу
docker compose build projects-service
```

### Логи
```bash
# Всі логи
docker compose logs -f

# Конкретний сервіс
docker compose logs -f projects-service

# З останніми 100 рядками
docker compose logs --tail=100 projects-service
```

### Зупинка
```bash
# Зупинити всі сервіси
docker compose down

# Зупинити і видалити volumes
docker compose down -v
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 Ліцензія

Цей проект ліцензовано під MIT License - дивіться файл [LICENSE](LICENSE) для деталей.

## 👨‍💻 Автор

**[Ваше ім'я]**
- Університет: КНУБА
- Курс: [Курс]
- Група: [Група]
- Email: [Ваш email]
- GitHub: [@username](https://github.com/username)

## 🙏 Подяки

- Викладач: Мазуренко Р.
- Курс: Архітектура розподілених програмних систем

---

**Створено як курсова робота з дисципліни "Архітектура розподілених програмних систем"**

⭐ Якщо цей проект був корисним, поставте зірку!
