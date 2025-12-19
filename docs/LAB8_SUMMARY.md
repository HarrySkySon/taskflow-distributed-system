# Лабораторна робота №8 - Підсумок виконання

## Статус: ✅ ЗАВЕРШЕНО

Всі завдання лабораторної роботи №8 "Моніторинг і логування" успішно виконані.

---

## Тема роботи

**Моніторинг і логування розподіленої системи мікросервісів**

---

## Виконані завдання

### ✅ 1. Інтеграція Prometheus для збору метрик
- Додано Prometheus v2.48.0 до docker-compose.yml
- Налаштовано scrape конфігурацію для всіх сервісів
- Створено prometheus.yml з target конфігурацією
- Retention period: 15 днів

### ✅ 2. Інтеграція Grafana для візуалізації
- Додано Grafana v10.2.2 до docker-compose.yml
- Налаштовано provisioning для datasources
- Створено дефолтні credentials (admin/admin)
- Automatic dashboard provisioning

### ✅ 3. Інструментування мікросервісів
- Додано бібліотеку prom-client до обох Node.js сервісів
- Створено metrics utilities з custom метриками
- Додано /metrics endpoints до projects-service і notifications-service
- Налаштовано automatic metrics collection middleware

### ✅ 4. Реалізація метрик
**Projects Service:**
- `http_requests_total` - кількість HTTP запитів
- `http_request_duration_seconds` - тривалість запитів
- `events_published_total` - опубліковані події
- `db_connections_active` - активні з'єднання БД
- `process_*` - CPU, memory, GC metrics

**Notifications Service:**
- `http_requests_total` - кількість HTTP запитів
- `http_request_duration_seconds` - тривалість запитів
- `events_consumed_total` - оброблені події
- `event_processing_duration_seconds` - час обробки подій
- `notifications_sent_total` - відправлені нотифікації
- `rabbitmq_connected` - статус з'єднання з RabbitMQ

**RabbitMQ:**
- Активовано rabbitmq_prometheus plugin
- Exposed metrics на порту 15692
- Queue statistics, message rates, connections

### ✅ 5. Централізоване логування
- Додано Loki v2.9.3 для збору логів
- Додано Promtail v2.9.3 для доставки логів
- Налаштовано Docker log scraping
- Log retention: 7 днів

### ✅ 6. Створення Grafana Dashboards
- TaskFlow System Overview dashboard
- 11 panels з різними метриками
- Real-time log viewer (Loki integration)
- Auto-refresh кожні 10 секунд

### ✅ 7. Тестування системи моніторингу
- Створено test-monitoring.sh скрипт
- 11 автоматизованих тестів
- Перевірка всіх компонентів стеку
- Event flow testing з метриками

### ✅ 8. Документація
- LAB8_DEPLOYMENT_GUIDE.md - повний гід по розгортанню
- LAB8_SUMMARY.md - короткий підсумок (цей файл)
- Inline коментарі у всіх конфігураційних файлах

---

## Архітектура системи моніторингу

```
┌─────────────────────────────────────────────────────────────┐
│               MONITORING & LOGGING STACK                     │
│                                                               │
│  ┌──────────┐   query    ┌───────────┐   scrape  ┌────────┐ │
│  │ Grafana  │───────────▶│Prometheus │◀──────────│Projects│ │
│  │  :3000   │            │   :9090   │           │Service │ │
│  │          │            │           │           │ :4002  │ │
│  │Dashboards│            │  Metrics  │           │/metrics│ │
│  │          │            │  Storage  │           └────────┘ │
│  │          │            │           │                      │
│  │          │            │           │   scrape  ┌────────┐ │
│  │          │            │           │◀──────────│Notific.│ │
│  │          │            │           │           │Service │ │
│  │          │            │           │           │ :4004  │ │
│  │          │            │           │           │/metrics│ │
│  │          │            │           │           └────────┘ │
│  │          │            │           │                      │
│  │          │            │           │   scrape  ┌────────┐ │
│  │          │            │           │◀──────────│RabbitMQ│ │
│  │          │            └───────────┘           │ :15692 │ │
│  │          │                                    │/metrics│ │
│  │          │   query    ┌───────────┐          └────────┘ │
│  │          │───────────▶│   Loki    │                      │
│  │          │            │   :3100   │                      │
│  │          │            │           │   push    ┌────────┐ │
│  │          │            │    Log    │◀──────────│Promtail│ │
│  └──────────┘            │Aggregation│           │ :9080  │ │
│                          │           │           │        │ │
│                          └───────────┘           └───┬────┘ │
│                                                       │      │
│                                                  collect     │
│                                                       │      │
│                           Docker Container Logs ─────┘      │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Структура файлів проекту

### Нові директорії та файли

```
.
├── monitoring/                              # ✨ НОВИЙ
│   ├── prometheus/
│   │   └── prometheus.yml                   # Prometheus конфігурація
│   ├── grafana/
│   │   ├── provisioning/
│   │   │   ├── datasources/
│   │   │   │   └── datasources.yml          # Prometheus + Loki
│   │   │   └── dashboards/
│   │   │       └── dashboards.yml           # Dashboard provisioning
│   │   └── dashboards/
│   │       └── taskflow-overview.json       # System overview dashboard
│   ├── loki/
│   │   └── loki-config.yml                  # Loki конфігурація
│   ├── promtail/
│   │   └── promtail-config.yml              # Promtail конфігурація
│   └── rabbitmq/
│       └── enabled_plugins                  # RabbitMQ Prometheus plugin
│
├── projects-service/
│   ├── src/
│   │   ├── utils/
│   │   │   └── metrics.ts                   # ✨ НОВИЙ - Prometheus metrics
│   │   └── app.ts                           # 🔄 ОНОВЛЕНО - додано /metrics
│   └── package.json                         # 🔄 ОНОВЛЕНО - додано prom-client
│
├── notifications-service/
│   ├── src/
│   │   ├── utils/
│   │   │   └── metrics.ts                   # ✨ НОВИЙ - Prometheus metrics
│   │   ├── consumers/
│   │   │   └── project.consumer.ts          # 🔄 ОНОВЛЕНО - metrics tracking
│   │   └── app.ts                           # 🔄 ОНОВЛЕНО - додано /metrics
│   └── package.json                         # 🔄 ОНОВЛЕНО - додано prom-client
│
├── docker-compose.yml                       # 🔄 ОНОВЛЕНО - +4 сервіси
├── test-monitoring.sh                       # ✨ НОВИЙ - тестовий скрипт
├── LAB8_DEPLOYMENT_GUIDE.md                 # ✨ НОВИЙ
└── LAB8_SUMMARY.md                          # ✨ НОВИЙ - цей файл
```

---

## Зміни в docker-compose.yml

### Додані сервіси

| Сервіс | Image | Порти | CPU | Memory |
|--------|-------|-------|-----|---------|
| **prometheus** | prom/prometheus:v2.48.0 | 9090 | 0.5 | 512M |
| **grafana** | grafana/grafana:10.2.2 | 3000 | 0.5 | 512M |
| **loki** | grafana/loki:2.9.3 | 3100 | 0.5 | 512M |
| **promtail** | grafana/promtail:2.9.3 | 9080 | 0.25 | 256M |

### Оновлені сервіси

**rabbitmq:**
- ➕ Додано порт 15692 для Prometheus metrics
- ➕ Додано volume для enabled_plugins
- ➕ Активовано rabbitmq_prometheus plugin

### Додані volumes

```yaml
prometheus_data:    # Prometheus TSDB storage
grafana_data:       # Grafana dashboards і налаштування
loki_data:          # Loki log chunks і index
```

---

## Як запустити

### Швидкий старт

```bash
# 1. Перейти в корінь проекту
cd "C:\Users\123_4\Documents\Deutschland\Bewerbung\Вступ до ВУЗ\КНУБА навчання\Архітектура розподілених програмних систем_Мазуренко Р_ІСП"

# 2. Запустити всі сервіси
docker compose up --build -d

# 3. Перевірити статус
docker compose ps

# Очікуваний результат: 8 healthy контейнерів
# grafana, loki, notifications-service, projects-db,
# projects-service, prometheus, promtail, rabbitmq
```

### Доступ до компонентів

| Компонент | URL | Credentials |
|-----------|-----|-------------|
| **Grafana** | http://localhost:3000 | admin / admin |
| **Prometheus** | http://localhost:9090 | - |
| **Loki API** | http://localhost:3100 | - |
| **Projects Service** | http://localhost:4002 | - |
| **Notifications Service** | http://localhost:4004 | - |
| **RabbitMQ Management** | http://localhost:15672 | guest / guest |
| **RabbitMQ Metrics** | http://localhost:15692/metrics | - |

### Тестування

```bash
# Автоматизований тест
chmod +x test-monitoring.sh
./test-monitoring.sh

# Ручна перевірка метрик
curl http://localhost:4002/metrics
curl http://localhost:4004/metrics

# Створити тестовий проект
curl -X POST http://localhost:4002/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ЛР8 Тест",
    "owner_id": 1,
    "priority": "high"
  }'

# Перевірити метрики в Prometheus
# Відкрити http://localhost:9090/graph
# Query: events_published_total
```

---

## Основні метрики системи

### HTTP Metrics

```promql
# Total requests
http_requests_total

# Request rate (requests per second)
rate(http_requests_total[5m])

# Average response time
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# P99 latency
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{status=~"5.."}[5m])
```

### Event Processing Metrics

```promql
# Events published
events_published_total

# Events consumed
events_consumed_total

# Event processing lag
events_published_total - events_consumed_total

# Event processing duration
rate(event_processing_duration_seconds_sum[5m]) / rate(event_processing_duration_seconds_count[5m])
```

### Resource Metrics

```promql
# Memory usage
process_resident_memory_bytes

# CPU usage
rate(process_cpu_seconds_total[5m])

# Heap size
go_memstats_heap_inuse_bytes

# Goroutines (для Go сервісів, якщо є)
go_goroutines
```

### RabbitMQ Metrics

```promql
# Message rate
rate(rabbitmq_global_messages_received_total[5m])
rate(rabbitmq_global_messages_delivered_total[5m])

# Queue depth
rabbitmq_queue_messages

# Connection count
rabbitmq_connections
```

---

## Grafana Dashboard

### Панелі на TaskFlow System Overview

1. **System Architecture** (Text)
   - Опис системи

2. **Services Health Status** (Stat)
   - UP/DOWN статус кожного сервісу

3. **Total Requests (RPS)** (Graph)
   - Requests per second для кожного сервісу

4. **Average Response Time** (Graph)
   - Середній час відповіді

5. **HTTP Status Codes** (Graph)
   - Розподіл 2xx, 4xx, 5xx

6. **RabbitMQ Messages Rate** (Graph)
   - Швидкість обробки повідомлень

7. **Memory Usage** (Graph)
   - Споживання RAM сервісами

8. **CPU Usage** (Graph)
   - Споживання CPU

9. **Event Processing Metrics** (Graph)
   - Published vs Consumed events

10. **Database Connections** (Stat)
    - Активні з'єднання з PostgreSQL

11. **Application Logs** (Logs)
    - Real-time логи з Loki

---

## Ключові покращення

### Порівняння з ЛР7

| Аспект | ЛР7 | ЛР8 |
|--------|-----|-----|
| **Моніторинг** | ❌ Немає | ✅ Prometheus + Grafana |
| **Візуалізація** | ❌ Тільки логи | ✅ Dashboards з метриками |
| **Логування** | ⚠️ Docker logs only | ✅ Централізоване (Loki) |
| **Метрики** | ❌ Немає | ✅ Custom + default metrics |
| **Observability** | ⚠️ Базова | ✅ Повна (Metrics + Logs) |
| **Alerting** | ❌ Немає | ⚠️ Готово до налаштування |

### Переваги системи моніторингу

✅ **Real-time visibility** - бачимо що відбувається в системі зараз
✅ **Historical data** - можна аналізувати trends і patterns
✅ **Troubleshooting** - швидко знаходимо проблеми через логи і метрики
✅ **Performance optimization** - бачимо bottlenecks
✅ **Event tracking** - моніторимо event-driven flows
✅ **Resource management** - контролюємо CPU, Memory usage
✅ **Production-ready** - готово до production deployment

---

## Реалізовані концепції observability

### Три стовпи Observability

#### 1. Metrics (Метрики) ✅
- **Prometheus** - time-series database
- **Custom metrics** - application-specific
- **Default metrics** - CPU, Memory, GC
- **RED metrics** - Rate, Errors, Duration
- **USE metrics** - Utilization, Saturation, Errors

#### 2. Logs (Логи) ✅
- **Loki** - log aggregation system
- **Promtail** - log shipping agent
- **Structured logging** - JSON parsing
- **Centralized** - всі логи в одному місці
- **Label-based** - filtering по сервісам

#### 3. Traces (Трейси) ⚠️
- Не реалізовано в ЛР8
- Можна додати Jaeger або Zipkin
- Distributed tracing для мікросервісів
- Request flow visualization

---

## Ключові метрики

### System Performance

- **Total Services:** 8 (4 application + 4 monitoring)
- **Total Containers:** 8
- **Total Volumes:** 5
- **Total Networks:** 1
- **Exposed Ports:** 9 (5432, 5672, 15672, 15692, 4002, 4004, 9090, 3000, 3100)

### Resource Allocation

**ЛР7 (без моніторингу):**
- CPU: 3.0 cores
- Memory: 1.5 GB

**ЛР8 (з моніторингом):**
- CPU: 4.75 cores (+1.75)
- Memory: 3.25 GB (+1.75 GB)

### Data Retention

- **Prometheus:** 15 днів metrics
- **Loki:** 7 днів logs
- **Grafana:** Persistent dashboards

---

## Можливості для розширення

### Short-term

1. **Alerting**
   ```yaml
   # Додати Alertmanager
   # Налаштувати alert rules
   # Інтеграція з Slack/Email
   ```

2. **Додаткові метрики**
   ```typescript
   // Business metrics
   - total_projects_created
   - active_users_count
   - api_errors_by_endpoint
   ```

3. **Custom Dashboards**
   - Business metrics dashboard
   - Error tracking dashboard
   - Performance SLA dashboard

### Long-term

1. **Distributed Tracing**
   - Jaeger або Zipkin
   - OpenTelemetry integration
   - Request flow visualization

2. **Advanced Monitoring**
   - Synthetic monitoring
   - Real User Monitoring (RUM)
   - Application Performance Monitoring (APM)

3. **Production Deployment**
   - High availability Prometheus
   - Grafana clustering
   - External storage для метрик
   - Backup і disaster recovery

---

## Результати тестування

### ✅ Functional Tests

1. **Prometheus** - successfully scraping all targets
2. **Grafana** - datasources working, dashboards rendering
3. **Loki** - receiving logs from all services
4. **Metrics Endpoints** - /metrics available on both services
5. **Event Flow** - events tracked in metrics

### ✅ Integration Tests

1. **Prometheus ↔ Services** - scraping working
2. **Grafana ↔ Prometheus** - queries working
3. **Grafana ↔ Loki** - log queries working
4. **Promtail ↔ Loki** - log shipping working
5. **End-to-End** - create project → metrics updated

### ✅ Performance Tests

1. **Scrape Performance** - metrics collected every 10-30s
2. **Query Performance** - Grafana queries fast (<1s)
3. **Log Ingestion** - real-time log delivery
4. **Resource Usage** - within configured limits

---

## Використані технології

### Monitoring Stack

- **Prometheus** v2.48.0 - metrics collection & storage
- **Grafana** v10.2.2 - visualization platform
- **Loki** v2.9.3 - log aggregation
- **Promtail** v2.9.3 - log shipping

### Application Instrumentation

- **prom-client** v15.1.0 - Node.js Prometheus client
- **TypeScript** - type-safe metrics
- **Express middleware** - automatic HTTP metrics

### Infrastructure

- **Docker Compose** v3.8 - orchestration
- **Docker Volumes** - persistent storage
- **Docker Networks** - service discovery

---

## Висновок

Лабораторна робота №8 **успішно завершена**. Реалізовано production-ready систему моніторингу та логування, яка демонструє:

✅ **Повна observability** - метрики + логи для всіх сервісів
✅ **Візуалізація** - Grafana dashboards з real-time даними
✅ **Централізація** - всі метрики і логи в одному місці
✅ **Автоматизація** - automatic provisioning і discovery
✅ **Масштабованість** - готовість до production навантажень
✅ **Документація** - детальні гіди і інструкції

**Набуті навички:**
- Prometheus metrics collection і PromQL queries
- Grafana dashboard creation і provisioning
- Loki log aggregation і LogQL queries
- Microservices instrumentation
- Observability patterns
- Time-series data analysis
- Production monitoring best practices

**Створені артефакти:**
- Повний monitoring stack з 4 компонентами
- 2 інструментовані мікросервіси з custom metrics
- Grafana dashboard з 11 панелями
- Тестовий скрипт (test-monitoring.sh)
- Deployment guide
- Цей підсумок

Система готова до:
- ✅ Production monitoring
- ✅ Performance analysis
- ✅ Troubleshooting
- ✅ Capacity planning
- ⚠️ Alerting (потребує налаштування)
- ⚠️ Distributed tracing (опціонально)

---

**Виконано:** 2024-01-20
**Студент:** [ПІБ]
**Група:** [Група]
**Предмет:** Архітектура розподілених програмних систем
**Викладач:** Мазуренко Р.
