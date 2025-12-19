# ЛР8 - Зміни відносно ЛР7

## Підсумок змін

Цей документ показує **що саме було додано/змінено** для Лабораторної роботи №8 відносно ЛР7.

---

## Загальна статистика

| Аспект | ЛР7 | ЛР8 | Зміни |
|--------|-----|-----|-------|
| **Сервіси** | 4 | 8 | +4 ✨ |
| **Volumes** | 2 | 5 | +3 ✨ |
| **Ports** | 5 | 9 | +4 ✨ |
| **Конфігураційних файлів** | 1 | 8 | +7 ✨ |
| **Monitoring endpoints** | 0 | 3 | +3 ✨ |
| **Документація** | 5 файлів | 8 файлів | +3 ✨ |

---

## 1. Docker Compose - Додані сервіси

### ✨ Prometheus (НОВИЙ)

```yaml
prometheus:
  image: prom/prometheus:v2.48.0
  container_name: prometheus
  command:
    - '--config.file=/etc/prometheus/prometheus.yml'
    - '--storage.tsdb.path=/prometheus'
    - '--storage.tsdb.retention.time=15d'
    - '--web.console.libraries=/etc/prometheus/console_libraries'
    - '--web.console.templates=/etc/prometheus/consoles'
    - '--web.enable-lifecycle'
  ports:
    - "9090:9090"
  volumes:
    - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    - prometheus_data:/prometheus
  networks:
    - taskflow-network
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:9090/-/healthy"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 30s
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 512M
      reservations:
        cpus: '0.25'
        memory: 256M
```

**Призначення:** Збір та зберігання метрик
**Retention:** 15 днів
**Scrape interval:** 10-30 секунд

---

### ✨ Grafana (НОВИЙ)

```yaml
grafana:
  image: grafana/grafana:10.2.2
  container_name: grafana
  ports:
    - "3000:3000"
  environment:
    - GF_SECURITY_ADMIN_USER=admin
    - GF_SECURITY_ADMIN_PASSWORD=admin
    - GF_USERS_ALLOW_SIGN_UP=false
    - GF_SERVER_ROOT_URL=http://localhost:3000
    - GF_INSTALL_PLUGINS=
  volumes:
    - grafana_data:/var/lib/grafana
    - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
    - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards:ro
  networks:
    - taskflow-network
  depends_on:
    - prometheus
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 30s
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 512M
      reservations:
        cpus: '0.25'
        memory: 256M
```

**Призначення:** Візуалізація метрик та логів
**Credentials:** admin/admin
**Provisioning:** Автоматичне для datasources і dashboards

---

### ✨ Loki (НОВИЙ)

```yaml
loki:
  image: grafana/loki:2.9.3
  container_name: loki
  ports:
    - "3100:3100"
  command: -config.file=/etc/loki/local-config.yaml
  volumes:
    - ./monitoring/loki/loki-config.yml:/etc/loki/local-config.yaml:ro
    - loki_data:/loki
  networks:
    - taskflow-network
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3100/ready"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 30s
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 512M
      reservations:
        cpus: '0.25'
        memory: 256M
```

**Призначення:** Збір та зберігання логів
**Retention:** 7 днів (168 годин)
**Storage:** Локальний filesystem

---

### ✨ Promtail (НОВИЙ)

```yaml
promtail:
  image: grafana/promtail:2.9.3
  container_name: promtail
  command: -config.file=/etc/promtail/config.yml
  volumes:
    - ./monitoring/promtail/promtail-config.yml:/etc/promtail/config.yml:ro
    - /var/lib/docker/containers:/var/lib/docker/containers:ro
    - /var/run/docker.sock:/var/run/docker.sock
  networks:
    - taskflow-network
  depends_on:
    - loki
  restart: unless-stopped
  deploy:
    resources:
      limits:
        cpus: '0.25'
        memory: 256M
      reservations:
        cpus: '0.1'
        memory: 128M
```

**Призначення:** Збір та доставка логів до Loki
**Source:** Docker container logs

---

## 2. Оновлені сервіси

### 🔄 RabbitMQ - Prometheus Metrics

**ЛР7:**
```yaml
rabbitmq:
  ports:
    - "5672:5672"
    - "15672:15672"
  volumes:
    - rabbitmq_data:/var/lib/rabbitmq
```

**ЛР8:**
```yaml
rabbitmq:
  ports:
    - "5672:5672"
    - "15672:15672"
    - "15692:15692"                                    # ✨ ДОДАНО
  volumes:
    - rabbitmq_data:/var/lib/rabbitmq
    - ./monitoring/rabbitmq/enabled_plugins:/etc/rabbitmq/enabled_plugins:ro  # ✨ ДОДАНО
```

**Зміни:**
- ➕ Додано порт 15692 для Prometheus metrics
- ➕ Додано volume для enabled_plugins
- ➕ Активовано `rabbitmq_prometheus` plugin

---

### 🔄 Projects Service - Metrics Endpoint

**ЛР7:**
```typescript
// app.ts
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Projects Service is running',
    timestamp: new Date().toISOString()
  });
});
```

**ЛР8:**
```typescript
// app.ts
import { metricsMiddleware, getMetrics, getContentType } from './utils/metrics';

// Metrics middleware (before routes)
app.use(metricsMiddleware);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Projects Service is running',
    timestamp: new Date().toISOString()
  });
});

// Prometheus metrics endpoint ✨ ДОДАНО
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', getContentType());
    const metrics = await getMetrics();
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error collecting metrics');
  }
});
```

**Зміни:**
- ➕ Додано `/metrics` endpoint
- ➕ Додано metrics middleware
- ➕ Додано `utils/metrics.ts` з custom метриками
- ➕ Додано бібліотеку `prom-client` в package.json

**Метрики Projects Service:**
- `http_requests_total` - HTTP запити
- `http_request_duration_seconds` - тривалість запитів
- `events_published_total` - опубліковані події
- `db_connections_active` - з'єднання з БД
- `process_*` - CPU, Memory, GC

---

### 🔄 Notifications Service - Metrics Endpoint

**ЛР7:**
```typescript
// app.ts
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Notifications Service is running',
    timestamp: new Date().toISOString(),
  });
});
```

**ЛР8:**
```typescript
// app.ts
import { metricsMiddleware, getMetrics, getContentType } from './utils/metrics';

// Metrics middleware (before routes)
app.use(metricsMiddleware);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Notifications Service is running',
    timestamp: new Date().toISOString(),
  });
});

// Prometheus metrics endpoint ✨ ДОДАНО
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', getContentType());
    const metrics = await getMetrics();
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error collecting metrics');
  }
});
```

**Зміни:**
- ➕ Додано `/metrics` endpoint
- ➕ Додано metrics middleware
- ➕ Додано `utils/metrics.ts` з custom метриками
- ➕ Додано бібліотеку `prom-client` в package.json
- ➕ Оновлено `project.consumer.ts` для tracking metrics

**Метрики Notifications Service:**
- `http_requests_total` - HTTP запити
- `http_request_duration_seconds` - тривалість запитів
- `events_consumed_total` - оброблені події
- `event_processing_duration_seconds` - час обробки
- `notifications_sent_total` - відправлені нотифікації
- `rabbitmq_connected` - статус з'єднання

---

## 3. Нові конфігураційні файли

### monitoring/prometheus/prometheus.yml ✨

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'taskflow'
    environment: 'production'

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'projects-service'
    metrics_path: '/metrics'
    scrape_interval: 10s
    static_configs:
      - targets: ['projects-service:4002']

  - job_name: 'notifications-service'
    metrics_path: '/metrics'
    scrape_interval: 10s
    static_configs:
      - targets: ['notifications-service:4004']

  - job_name: 'rabbitmq'
    metrics_path: '/metrics'
    scrape_interval: 15s
    static_configs:
      - targets: ['rabbitmq:15692']
```

**Призначення:** Конфігурація scrape targets для Prometheus

---

### monitoring/loki/loki-config.yml ✨

```yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096
  log_level: info

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1

schema_config:
  configs:
    - from: 2023-01-01
      store: boltdb-shipper
      object_store: filesystem
      schema: v11

limits_config:
  retention_period: 168h  # 7 days
  ingestion_rate_mb: 16
  ingestion_burst_size_mb: 32
```

**Призначення:** Конфігурація Loki log aggregation

---

### monitoring/promtail/promtail-config.yml ✨

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s

    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'

      - source_labels: ['__meta_docker_container_label_com_docker_compose_service']
        target_label: 'service'

    pipeline_stages:
      - docker: {}
      - regex:
          expression: '(?P<level>DEBUG|INFO|WARN|WARNING|ERROR|FATAL)'
      - labels:
          level:
      # Drop healthcheck logs
      - match:
          selector: '{service=~"projects-service|notifications-service"}'
          stages:
            - drop:
                expression: ".*GET /health.*200.*"
```

**Призначення:** Конфігурація збору логів з Docker

---

### monitoring/grafana/provisioning/datasources/datasources.yml ✨

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
    version: 1

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: false
    editable: true
    version: 1
```

**Призначення:** Автоматичне provisioning datasources в Grafana

---

### monitoring/grafana/provisioning/dashboards/dashboards.yml ✨

```yaml
apiVersion: 1

providers:
  - name: 'TaskFlow Dashboards'
    orgId: 1
    folder: 'TaskFlow'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
```

**Призначення:** Автоматичне provisioning dashboards

---

### monitoring/grafana/dashboards/taskflow-overview.json ✨

Створено dashboard з 11 панелями:
1. System Architecture (text)
2. Services Health Status (stat)
3. Total Requests (RPS) (graph)
4. Average Response Time (graph)
5. HTTP Status Codes (graph)
6. RabbitMQ Messages Rate (graph)
7. Memory Usage (graph)
8. CPU Usage (graph)
9. Event Processing Metrics (graph)
10. Database Connections (stat)
11. Application Logs (logs)

**Призначення:** Головний dashboard для моніторингу TaskFlow

---

### monitoring/rabbitmq/enabled_plugins ✨

```erlang
[rabbitmq_management,rabbitmq_prometheus].
```

**Призначення:** Активація Prometheus plugin в RabbitMQ

---

## 4. Нові файли мікросервісів

### projects-service/src/utils/metrics.ts ✨

95 рядків коду з:
- Registry налаштування
- Default metrics collection
- 6 custom metrics (Counter, Histogram, Gauge)
- Metrics middleware
- Helper functions

**Метрики:**
```typescript
httpRequestsTotal: Counter
httpRequestDuration: Histogram
eventsPublishedTotal: Counter
dbConnectionsActive: Gauge
projectOperationsTotal: Counter
dbQueryDuration: Histogram
```

---

### notifications-service/src/utils/metrics.ts ✨

92 рядки коду з:
- Registry налаштування
- Default metrics collection
- 6 custom metrics
- Metrics middleware
- Helper functions

**Метрики:**
```typescript
httpRequestsTotal: Counter
httpRequestDuration: Histogram
eventsConsumedTotal: Counter
eventProcessingDuration: Histogram
notificationsSentTotal: Counter
rabbitmqConnected: Gauge
```

---

## 5. Новий тестовий скрипт

### test-monitoring.sh ✨

**Розмір:** 350+ рядків bash скрипту

**Тести (11 секцій):**
1. Docker Compose Status
2. Monitoring Components Health Check
3. Microservices Metrics Endpoints
4. Prometheus Scrape Targets
5. Prometheus Metrics Availability
6. Generate Metrics via API Requests
7. Grafana Datasources Configuration
8. Loki Log Aggregation
9. Event Flow Integration with Metrics
10. Resource Usage Check
11. Service-Specific Metrics Check

**Призначення:** Автоматизоване тестування всієї системи моніторингу

---

## 6. Нова документація

### LAB8_DEPLOYMENT_GUIDE.md ✨

**Розмір:** ~25 KB, 10 розділів

**Зміст:**
- Огляд системи моніторингу
- Передумови та системні вимоги
- Архітектура з діаграмами
- Покрокова інструкція розгортання
- Налаштування Grafana
- Тестування
- Troubleshooting (5 проблем + рішення)
- Корисні команди

---

### LAB8_SUMMARY.md ✨

**Розмір:** ~18 KB, кратний підсумок

**Зміст:**
- Виконані завдання (8 tasks)
- Архітектура системи
- Структура файлів
- Зміни в docker-compose.yml
- Швидкий старт
- Основні метрики
- Grafana dashboard panels
- Порівняння ЛР7 vs ЛР8

---

### LAB8_REPORT.md ✨

**Розмір:** ~64 KB, 1915 рядків

**Зміст:**
- Теоретичні основи (500+ рядків)
- Вимоги та архітектура (200+ рядків)
- Деталі реалізації (600+ рядків)
- Результати тестування (400+ рядків)
- Висновки (200+ рядків)

**Академічний звіт** для здачі лабораторної роботи

---

## 7. Додані volumes

### ЛР7:
```yaml
volumes:
  projects_db_data:
    driver: local
  rabbitmq_data:
    driver: local
```

### ЛР8:
```yaml
volumes:
  projects_db_data:
    driver: local
  rabbitmq_data:
    driver: local
  prometheus_data:      # ✨ ДОДАНО
    driver: local
  grafana_data:         # ✨ ДОДАНО
    driver: local
  loki_data:            # ✨ ДОДАНО
    driver: local
```

---

## 8. Оновлені package.json

### projects-service/package.json

**Додано:**
```json
"dependencies": {
  ...
  "prom-client": "^15.1.0"  // ✨ НОВИЙ
}
```

### notifications-service/package.json

**Додано:**
```json
"dependencies": {
  ...
  "prom-client": "^15.1.0"  // ✨ НОВИЙ
}
```

---

## Візуалізація змін

### До (ЛР7) - 4 сервіси

```
┌─────────────┐
│ projects-db │
│   :5432     │
│ Health: ✅  │
│ Restart: ✅ │
│ Limits: ✅  │
│ Metrics: ❌ │
└─────────────┘

┌─────────────┐
│  rabbitmq   │
│ :5672/15672 │
│ Health: ✅  │
│ Restart: ✅ │
│ Limits: ✅  │
│ Metrics: ❌ │
└─────────────┘

┌──────────────┐
│projects-svc  │
│    :4002     │
│ Health: ✅   │
│ Restart: ✅  │
│ Limits: ✅   │
│ Metrics: ❌  │
└──────────────┘

┌──────────────┐
│notif-service │
│    :4004     │
│ Health: ✅   │
│ Restart: ✅  │
│ Limits: ✅   │
│ Metrics: ❌  │
└──────────────┘
```

### Після (ЛР8) - 8 сервісів

```
Application Services:

┌─────────────┐
│ projects-db │
│   :5432     │
│ Health: ✅  │
│ Restart: ✅ │
│ Limits: ✅  │
│ Metrics: ❌ │
└─────────────┘

┌─────────────┐
│  rabbitmq   │
│:5672/15672/ │
│    15692    │
│ Health: ✅  │
│ Restart: ✅ │
│ Limits: ✅  │
│ Metrics: ✅ │ ← ДОДАНО
└─────────────┘

┌──────────────┐
│projects-svc  │
│    :4002     │
│ Health: ✅   │
│ Restart: ✅  │
│ Limits: ✅   │
│ Metrics: ✅  │ ← ДОДАНО (/metrics)
└──────────────┘

┌──────────────┐
│notif-service │
│    :4004     │
│ Health: ✅   │
│ Restart: ✅  │
│ Limits: ✅   │
│ Metrics: ✅  │ ← ДОДАНО (/metrics)
└──────────────┘

Monitoring Stack (NEW):

┌──────────────┐
│ prometheus   │ ← НОВИЙ
│    :9090     │
│ Health: ✅   │
│ Restart: ✅  │
│ Limits: ✅   │
│ Scraping: 4  │
└──────────────┘

┌──────────────┐
│   grafana    │ ← НОВИЙ
│    :3000     │
│ Health: ✅   │
│ Restart: ✅  │
│ Limits: ✅   │
│Dashboards: 1 │
└──────────────┘

┌──────────────┐
│     loki     │ ← НОВИЙ
│    :3100     │
│ Health: ✅   │
│ Restart: ✅  │
│ Limits: ✅   │
│  Logs: 7d    │
└──────────────┘

┌──────────────┐
│  promtail    │ ← НОВИЙ
│    :9080     │
│ Health: N/A  │
│ Restart: ✅  │
│ Limits: ✅   │
│  Shipper: ✅ │
└──────────────┘
```

---

## Підсумкова таблиця змін

### Сервіси

| Сервіс | ЛР7 | ЛР8 | Зміни |
|--------|-----|-----|-------|
| projects-db | ✅ | ✅ | - |
| rabbitmq | ✅ | ✅ | 🔄 +port +plugin |
| projects-service | ✅ | ✅ | 🔄 +metrics |
| notifications-service | ✅ | ✅ | 🔄 +metrics |
| **prometheus** | ❌ | ✅ | ✨ НОВИЙ |
| **grafana** | ❌ | ✅ | ✨ НОВИЙ |
| **loki** | ❌ | ✅ | ✨ НОВИЙ |
| **promtail** | ❌ | ✅ | ✨ НОВИЙ |
| **ЗАГАЛОМ** | **4** | **8** | **+4** |

### Файли

| Категорія | ЛР7 | ЛР8 | Додано |
|-----------|-----|-----|--------|
| Конфігураційні файли | 1 | 8 | +7 |
| Код мікросервісів | - | 2 metrics.ts | +2 |
| Тестові скрипти | 1 | 2 | +1 |
| Документація | 5 | 8 | +3 |
| **ЗАГАЛОМ** | **7** | **20** | **+13** |

### Resource Allocation

| Ресурс | ЛР7 | ЛР8 | Додано |
|--------|-----|-----|--------|
| CPU Limits | 3.0 cores | 4.75 cores | +1.75 |
| Memory Limits | 1.5 GB | 3.25 GB | +1.75 GB |
| CPU Reserved | 1.5 cores | 2.35 cores | +0.85 |
| Memory Reserved | 768 MB | 1.28 GB | +512 MB |

### Endpoints

| Endpoint | ЛР7 | ЛР8 |
|----------|-----|-----|
| http://localhost:4002/health | ✅ | ✅ |
| http://localhost:4002/metrics | ❌ | ✅ ✨ |
| http://localhost:4004/health | ✅ | ✅ |
| http://localhost:4004/metrics | ❌ | ✅ ✨ |
| http://localhost:15692/metrics | ❌ | ✅ ✨ |
| http://localhost:9090 | ❌ | ✅ ✨ |
| http://localhost:3000 | ❌ | ✅ ✨ |
| http://localhost:3100 | ❌ | ✅ ✨ |

---

## Висновок

У ЛР8 було виконано **системне розширення** функціональності:

✅ **+4 сервіси моніторингу** - Prometheus, Grafana, Loki, Promtail
✅ **+3 metrics endpoints** - projects-service, notifications-service, rabbitmq
✅ **+7 конфігураційних файлів** - повна настройка monitoring stack
✅ **+2 utilities** - metrics.ts для обох мікросервісів
✅ **+1 тестовий скрипт** - test-monitoring.sh з 11 тестами
✅ **+3 документи** - deployment guide, summary, report

**Результат:**
- Повна observability системи (метрики + логи)
- Production-ready моніторинг
- Автоматизоване тестування
- Комплексна документація

---

**Створено для ЛР8**
**Дата:** 2024-01-20
