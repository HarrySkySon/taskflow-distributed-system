# Лабораторна робота №8 - Гід по розгортанню

## Моніторинг і логування розподіленої системи TaskFlow

**Дата:** 2024-01-20
**Версія:** 1.0

---

## Зміст

1. [Огляд системи](#огляд-системи)
2. [Передумови](#передумови)
3. [Архітектура моніторингу](#архітектура-моніторингу)
4. [Крок 1: Підготовка](#крок-1-підготовка)
5. [Крок 2: Запуск системи](#крок-2-запуск-системи)
6. [Крок 3: Перевірка компонентів](#крок-3-перевірка-компонентів)
7. [Крок 4: Налаштування Grafana](#крок-4-налаштування-grafana)
8. [Крок 5: Тестування](#крок-5-тестування)
9. [Моніторинг та відлагодження](#моніторинг-та-відлагодження)
10. [Troubleshooting](#troubleshooting)

---

## Огляд системи

Лабораторна робота №8 додає до системи TaskFlow повноцінний **стек моніторингу та логування**:

### Компоненти моніторингу

| Компонент | Призначення | Порт | UI |
|-----------|-------------|------|-----|
| **Prometheus** | Збір метрик | 9090 | ✅ http://localhost:9090 |
| **Grafana** | Візуалізація | 3000 | ✅ http://localhost:3000 |
| **Loki** | Збір логів | 3100 | ❌ API only |
| **Promtail** | Доставка логів | 9080 | ❌ Agent |

### Існуючі сервіси з метриками

| Сервіс | Метрики | Health | Порт |
|--------|---------|--------|------|
| **projects-service** | ✅ /metrics | ✅ /health | 4002 |
| **notifications-service** | ✅ /metrics | ✅ /health | 4004 |
| **rabbitmq** | ✅ :15692/metrics | ✅ Built-in | 5672, 15672 |
| **projects-db** | ❌ (опціонально) | ✅ pg_isready | 5432 |

---

## Передумови

### Необхідне програмне забезпечення

```bash
# 1. Docker і Docker Compose
docker --version                 # ≥ 24.0.0
docker compose version           # ≥ 2.0.0

# 2. curl (для тестування)
curl --version

# 3. jq (для парсингу JSON, опціонально)
jq --version

# 4. Git Bash або WSL (для Windows)
```

### Системні вимоги

- **CPU:** 4+ cores (рекомендовано)
- **RAM:** 8+ GB (мінімум 6 GB)
- **Disk:** 10+ GB вільного місця
- **OS:** Windows 10/11, macOS, Linux

### Ресурси системи моніторингу

```yaml
Prometheus:    0.5 CPU, 512M RAM
Grafana:       0.5 CPU, 512M RAM
Loki:          0.5 CPU, 512M RAM
Promtail:      0.25 CPU, 256M RAM
─────────────────────────────────
Загалом:       1.75 CPU, 1.75 GB
```

**Загальні ресурси системи:** ~5 CPU cores, ~3.25 GB RAM

---

## Архітектура моніторингу

```
┌──────────────────────────────────────────────────────────────────┐
│                    MONITORING & LOGGING STACK                     │
│                                                                    │
│  ┌────────────┐         ┌────────────┐         ┌──────────────┐  │
│  │  Grafana   │────────▶│ Prometheus │◀────────│  Projects    │  │
│  │    :3000   │         │    :9090   │  scrape │  Service     │  │
│  │            │         │            │         │   :4002      │  │
│  │ Dashboards │         │  Metrics   │         │  /metrics    │  │
│  │            │         │   Storage  │         └──────────────┘  │
│  │            │         │            │                            │
│  │            │         │            │         ┌──────────────┐  │
│  │            │         │            │◀────────│Notifications │  │
│  │            │         │            │  scrape │   Service    │  │
│  │            │         │            │         │   :4004      │  │
│  │            │         │            │         │  /metrics    │  │
│  │            │         └────────────┘         └──────────────┘  │
│  │            │                                                   │
│  │            │         ┌────────────┐         ┌──────────────┐  │
│  │            │────────▶│    Loki    │◀────────│  Promtail    │  │
│  │            │  query  │   :3100    │  push   │    :9080     │  │
│  │            │         │            │         │              │  │
│  │            │         │    Log     │         │ Log Shipper  │  │
│  │            │         │ Aggregation│         │              │  │
│  └────────────┘         └────────────┘         └──────┬───────┘  │
│                                                        │          │
│                                                        │ collect  │
│                     Application Services               │          │
│  ┌────────────────────────────────────────────────────┼─────┐    │
│  │                                                     ▼     │    │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌────────────┐│    │
│  │  │PostgreSQL│  │ RabbitMQ │  │Projects │  │Notifications││    │
│  │  │   :5432  │  │:5672/15672│  │Service  │  │  Service   ││    │
│  │  └──────────┘  └──────────┘  └─────────┘  └────────────┘│    │
│  │                      Docker Logs                         │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### Потік даних

1. **Metrics Flow:**
   - Мікросервіси експортують метрики на `/metrics` endpoint
   - Prometheus скрейпить метрики кожні 10-30 секунд
   - Grafana запитує Prometheus для візуалізації

2. **Logs Flow:**
   - Docker контейнери пишуть логи в stdout/stderr
   - Promtail збирає логи з Docker
   - Promtail відправляє логи в Loki
   - Grafana запитує Loki для перегляду логів

---

## Крок 1: Підготовка

### 1.1 Клонування або перехід до проекту

```bash
cd "C:\Users\123_4\Documents\Deutschland\Bewerbung\Вступ до ВУЗ\КНУБА навчання\Архітектура розподілених програмних систем_Мазуренко Р_ІСП"
```

### 1.2 Перевірка структури файлів

```bash
# Основні файли
ls -la docker-compose.yml
ls -la test-monitoring.sh

# Конфігурація моніторингу
tree monitoring/
```

Очікувана структура:

```
monitoring/
├── prometheus/
│   └── prometheus.yml              # Конфігурація Prometheus
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── datasources.yml     # Prometheus + Loki
│   │   └── dashboards/
│   │       └── dashboards.yml      # Dashboard provisioning
│   └── dashboards/
│       └── taskflow-overview.json  # Головний dashboard
├── loki/
│   └── loki-config.yml             # Конфігурація Loki
├── promtail/
│   └── promtail-config.yml         # Конфігурація Promtail
└── rabbitmq/
    └── enabled_plugins             # RabbitMQ Prometheus plugin
```

### 1.3 Зупинка старих контейнерів (якщо є)

```bash
docker compose down
```

---

## Крок 2: Запуск системи

### 2.1 Побудова та запуск всіх сервісів

```bash
# Побудувати та запустити в detached mode
docker compose up --build -d

# Альтернативно, з логами (для дебагу)
docker compose up --build
```

### 2.2 Моніторинг запуску

В окремому терміналі:

```bash
# Переглянути логи всіх сервісів
docker compose logs -f

# Переглянути логи конкретного сервісу
docker compose logs -f prometheus
docker compose logs -f grafana
docker compose logs -f loki
```

### 2.3 Очікувана послідовність запуску

```
1. projects-db       ──▶ health check ✓ (~10s)
2. rabbitmq          ──▶ health check ✓ (~15s)
3. loki              ──▶ health check ✓ (~10s)
4. projects-service  ──▶ health check ✓ (~40s)
5. notifications     ──▶ health check ✓ (~40s)
6. prometheus        ──▶ health check ✓ (~30s)
7. grafana           ──▶ health check ✓ (~30s)
8. promtail          ──▶ running (~5s)

Загальний час: ~60-90 секунд
```

---

## Крок 3: Перевірка компонентів

### 3.1 Перевірка статусу всіх контейнерів

```bash
docker compose ps
```

Очікуваний результат (всі healthy):

```
NAME                    STATUS              PORTS
grafana                 Up (healthy)        0.0.0.0:3000->3000/tcp
loki                    Up (healthy)        0.0.0.0:3100->3100/tcp
notifications-service   Up (healthy)        0.0.0.0:4004->4004/tcp
projects-db             Up (healthy)        0.0.0.0:5432->5432/tcp
projects-service        Up (healthy)        0.0.0.0:4002->4002/tcp
prometheus              Up (healthy)        0.0.0.0:9090->9090/tcp
promtail                Up                  0.0.0.0:9080->9080/tcp
rabbitmq                Up (healthy)        0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp, 0.0.0.0:15692->15692/tcp
```

### 3.2 Тестування доступності компонентів

```bash
# Application Services
curl http://localhost:4002/health          # Projects Service
curl http://localhost:4004/health          # Notifications Service

# Metrics endpoints
curl http://localhost:4002/metrics         # Projects metrics
curl http://localhost:4004/metrics         # Notifications metrics

# Monitoring Stack
curl http://localhost:9090/-/healthy       # Prometheus health
curl http://localhost:3000/api/health      # Grafana health
curl http://localhost:3100/ready           # Loki ready

# RabbitMQ
curl http://localhost:15672/               # Management UI
curl http://localhost:15692/metrics        # Prometheus metrics
```

### 3.3 Перевірка Prometheus Targets

Відкрийте в браузері:

```
http://localhost:9090/targets
```

Всі targets повинні бути **UP** (зеленими):
- ✅ prometheus (self-monitoring)
- ✅ projects-service
- ✅ notifications-service
- ✅ rabbitmq

---

## Крок 4: Налаштування Grafana

### 4.1 Перший вхід

1. Відкрийте браузер: **http://localhost:3000**

2. Увійдіть з дефолтними credentials:
   - **Username:** `admin`
   - **Password:** `admin`

3. (Опціонально) Змініть пароль або пропустіть

### 4.2 Перевірка Datasources

1. Перейдіть: **Configuration** (⚙️) → **Data sources**

2. Повинні бути налаштовані 2 datasources:
   - ✅ **Prometheus** (default)
     - URL: `http://prometheus:9090`
     - Status: ✅ Working
   - ✅ **Loki**
     - URL: `http://loki:3100`
     - Status: ✅ Working

3. Натисніть **Test** на кожному для перевірки

### 4.3 Відкриття Dashboard

1. Перейдіть: **Dashboards** (📊) → **Browse**

2. Знайдіть папку **TaskFlow**

3. Відкрийте dashboard: **TaskFlow System Overview**

### 4.4 Що побачите на Dashboard

| Panel | Що показує |
|-------|------------|
| **Services Health Status** | UP/DOWN статус сервісів |
| **Total Requests (RPS)** | Кількість запитів за секунду |
| **Average Response Time** | Середній час відповіді |
| **HTTP Status Codes** | Розподіл 2xx, 4xx, 5xx |
| **RabbitMQ Messages Rate** | Швидкість обробки повідомлень |
| **Memory Usage** | Споживання пам'яті сервісами |
| **CPU Usage** | Споживання CPU |
| **Event Processing** | Published vs Consumed events |
| **Database Connections** | Активні з'єднання з БД |
| **Application Logs** | Логи в реальному часі з Loki |

---

## Крок 5: Тестування

### 5.1 Автоматизований тест

```bash
# Зробити скрипт виконуваним
chmod +x test-monitoring.sh

# Запустити тестовий скрипт
./test-monitoring.sh
```

Скрипт перевірить:
- ✅ Docker Compose status
- ✅ Monitoring components health
- ✅ Metrics endpoints
- ✅ Prometheus targets
- ✅ Prometheus queries
- ✅ Grafana datasources
- ✅ Loki log aggregation
- ✅ Event flow with metrics

### 5.2 Ручне тестування метрик

#### Test 1: Створити проект

```bash
curl -X POST http://localhost:4002/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ЛР8 Тестовий Проект",
    "description": "Перевірка моніторингу",
    "owner_id": 1,
    "priority": "high",
    "status": "planning"
  }'
```

#### Test 2: Перевірити метрики в Prometheus

Відкрийте Prometheus: **http://localhost:9090/graph**

Виконайте запити:

```promql
# HTTP запити
http_requests_total

# Events published
events_published_total{event_type="project.created"}

# Events consumed
events_consumed_total{event_type="project.created"}

# Memory usage
process_resident_memory_bytes

# Request duration p99
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

#### Test 3: Переглянути логи в Grafana

1. Перейдіть на dashboard **TaskFlow System Overview**

2. Скрольте до панелі **Application Logs**

3. Побачите логи в реальному часі від обох сервісів

4. Використайте фільтри:
   ```
   {service="projects-service"}
   {service="notifications-service"}
   {service="projects-service", level="ERROR"}
   ```

---

## Моніторинг та відлагодження

### Перегляд логів

```bash
# Всі сервіси
docker compose logs -f

# Конкретний сервіс
docker compose logs -f prometheus
docker compose logs -f grafana
docker compose logs -f projects-service

# Останні 100 рядків
docker compose logs --tail 100

# Логи з timestamp
docker compose logs -f -t
```

### Моніторинг ресурсів

```bash
# Real-time resource usage
docker stats

# Resource limits
docker compose config | grep -A 6 "deploy:"

# Disk usage
docker system df
```

### Інспекція контейнерів

```bash
# Зайти в контейнер
docker exec -it prometheus sh
docker exec -it grafana sh

# Перевірити мережу
docker network inspect taskflow-network

# Перевірити volumes
docker volume ls
docker volume inspect prometheus_data
```

### Prometheus Queries

```promql
# Service uptime
up

# Request rate
rate(http_requests_total[5m])

# Memory usage trend
rate(process_resident_memory_bytes[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Event processing lag
events_published_total - events_consumed_total
```

---

## Troubleshooting

### Проблема 1: Prometheus не скрейпить метрики

**Симптоми:**
- Targets показують DOWN
- Метрики не з'являються

**Діагностика:**
```bash
# Перевірити логи Prometheus
docker compose logs prometheus | grep -i error

# Перевірити доступність endpoints
curl http://localhost:4002/metrics
curl http://localhost:4004/metrics

# Перевірити конфігурацію
docker exec prometheus cat /etc/prometheus/prometheus.yml
```

**Рішення:**
```bash
# Перезапустити Prometheus
docker compose restart prometheus

# Перевірити network connectivity
docker exec prometheus wget -O- http://projects-service:4002/metrics
```

---

### Проблема 2: Grafana не може з'єднатися з Prometheus

**Симптоми:**
- Datasource shows error
- Panels показують "No data"

**Діагностика:**
```bash
# Перевірити логи Grafana
docker compose logs grafana

# Перевірити datasource конфігурацію
curl -u admin:admin http://localhost:3000/api/datasources
```

**Рішення:**
```bash
# Перезапустити Grafana
docker compose restart grafana

# Перевірити з контейнера Grafana
docker exec grafana wget -O- http://prometheus:9090/-/healthy
```

---

### Проблема 3: Loki не отримує логи

**Симптоми:**
- Немає логів у Grafana Logs panel
- Promtail показує помилки

**Діагностика:**
```bash
# Перевірити логи Promtail
docker compose logs promtail

# Перевірити логи Loki
docker compose logs loki

# Перевірити наявність логів
curl -s "http://localhost:3100/loki/api/v1/query?query={service=\"projects-service\"}&limit=10"
```

**Рішення:**
```bash
# Перезапустити Promtail
docker compose restart promtail

# Перевірити доступ до Docker socket
docker exec promtail ls -la /var/run/docker.sock
```

---

### Проблема 4: Високе споживання ресурсів

**Симптоми:**
- Система повільна
- Docker stats показує високе використання

**Діагностика:**
```bash
# Переглянути resource usage
docker stats --no-stream

# Переглянути налаштовані ліміти
docker compose config | grep -A 6 "resources:"
```

**Рішення:**
```bash
# Зменшити retention в Prometheus (в prometheus.yml)
# --storage.tsdb.retention.time=7d → 3d

# Зменшити retention в Loki (в loki-config.yml)
# retention_period: 168h → 72h

# Перебудувати з новою конфігурацією
docker compose down
docker compose up -d
```

---

### Проблема 5: RabbitMQ metrics не доступні

**Симптоми:**
- Port 15692 не відповідає
- Prometheus не може скрейпити RabbitMQ

**Діагностика:**
```bash
# Перевірити порти RabbitMQ
curl http://localhost:15672/         # Management UI
curl http://localhost:15692/metrics  # Prometheus endpoint

# Перевірити enabled plugins
docker exec rabbitmq rabbitmq-plugins list
```

**Рішення:**
```bash
# Перевірити наявність файлу enabled_plugins
cat monitoring/rabbitmq/enabled_plugins

# Переконатися що містить:
# [rabbitmq_management,rabbitmq_prometheus].

# Перезапустити RabbitMQ
docker compose restart rabbitmq
```

---

## Корисні команди

### Docker Compose

```bash
# Запуск
docker compose up -d                    # Detached mode
docker compose up --build -d            # Rebuild images

# Зупинка
docker compose stop                     # Зупинити (не видаляти)
docker compose down                     # Видалити контейнери
docker compose down -v                  # Видалити контейнери + volumes

# Перезапуск
docker compose restart                  # Всі сервіси
docker compose restart prometheus       # Один сервіс

# Масштабування (якщо потрібно)
docker compose up -d --scale projects-service=2
```

### Prometheus CLI

```bash
# Reload конфігурації (без перезапуску)
curl -X POST http://localhost:9090/-/reload

# Перевірити конфігурацію
docker exec prometheus promtool check config /etc/prometheus/prometheus.yml
```

### Grafana CLI

```bash
# Створити API key
docker exec grafana grafana-cli admin reset-admin-password newpassword

# Імпортувати dashboard
curl -X POST http://admin:admin@localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @monitoring/grafana/dashboards/taskflow-overview.json
```

---

## Висновок

Після завершення цього гіду у вас буде:

✅ Повноцінна система моніторингу з Prometheus
✅ Візуалізація в Grafana з готовими dashboard
✅ Централізоване логування через Loki
✅ Метрики від всіх мікросервісів
✅ Моніторинг event-driven архітектури
✅ Resource usage tracking

**Наступні кроки:**
1. Налаштуйте alerts в Prometheus/Grafana
2. Додайте custom метрики для вашого use case
3. Створіть додаткові дашборди
4. Налаштуйте retention policies
5. Інтегруйте з CI/CD pipeline

---

**Створено для ЛР8**
**Предмет:** Архітектура розподілених програмних систем
**Викладач:** Мазуренко Р.
