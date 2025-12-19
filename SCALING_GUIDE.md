# Посібник з горизонтального масштабування

## Огляд архітектури масштабування

Система тепер підтримує горизонтальне масштабування з наступними компонентами:

```
                    ┌─────────────┐
                    │   Клієнти   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    Nginx    │ (Load Balancer)
                    │   (Port 80) │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
  ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
  │ Projects  │     │ Projects  │     │ Projects  │
  │ Service-1 │     │ Service-2 │     │ Service-3 │
  └─────┬─────┘     └─────┬─────┘     └─────┬─────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
  ┌─────▼──────┐    ┌─────▼─────┐     ┌─────▼─────────┐
  │ PostgreSQL │    │ RabbitMQ  │     │ Notifications │
  │     DB     │    │           │     │    Service    │
  └────────────┘    └───────────┘     └───────────────┘
```

## Ключові компоненти

### 1. Nginx Load Balancer
- **Роль**: Розподіляє вхідні запити між репліками projects-service
- **Стратегія**: least_conn (найменше активних з'єднань)
- **Порт**: 80 (HTTP)
- **Health checks**: Автоматична перевірка доступності бекендів

### 2. Projects Service (множинні репліки)
- **За замовчуванням**: 3 репліки
- **Можливість масштабування**: від 1 до N реплік
- **Внутрішній порт**: 4002
- **Доступ**: Тільки через Nginx (не експортується назовні)

### 3. Shared Resources
- **PostgreSQL**: Спільна БД для всіх реплік
- **RabbitMQ**: Спільна черга повідомлень
- **Notifications Service**: Споживач подій

## Способи масштабування

### Варіант 1: Docker Compose (рекомендовано)

#### Запуск з 3 репліками (за замовчуванням):
```bash
docker compose up -d
```

#### Масштабування до N реплік:
```bash
# Масштабування до 5 реплік
docker compose up -d --scale projects-service=5

# Масштабування до 2 реплік
docker compose up -d --scale projects-service=2

# Масштабування до 1 репліки
docker compose up -d --scale projects-service=1
```

#### Перевірка стану реплік:
```bash
docker compose ps projects-service
```

Очікуваний вивід:
```
NAME                              IMAGE                        STATUS
app-projects-service-1            app-projects-service         Up 2 minutes (healthy)
app-projects-service-2            app-projects-service         Up 2 minutes (healthy)
app-projects-service-3            app-projects-service         Up 2 minutes (healthy)
```

### Варіант 2: Docker Swarm (для продакшну)

#### Ініціалізація Swarm:
```bash
docker swarm init
```

#### Розгортання стеку:
```bash
docker stack deploy -c docker-compose.yml -c docker-compose.scale.yml taskflow
```

#### Масштабування в Swarm:
```bash
# Масштабування до 5 реплік
docker service scale taskflow_projects-service=5

# Перегляд стану сервісів
docker service ls

# Детальна інформація про репліки
docker service ps taskflow_projects-service
```

#### Зупинка стеку:
```bash
docker stack rm taskflow
```

## Скрипти для автоматизації

### Windows (scale.bat)

```batch
@echo off
if "%1"=="" (
    echo Usage: scale.bat [replicas_count]
    echo Example: scale.bat 5
    exit /b 1
)

echo Scaling projects-service to %1 replicas...
docker compose up -d --scale projects-service=%1
docker compose ps projects-service
```

### Linux/macOS (scale.sh)

```bash
#!/bin/bash
if [ -z "$1" ]; then
    echo "Usage: ./scale.sh [replicas_count]"
    echo "Example: ./scale.sh 5"
    exit 1
fi

echo "Scaling projects-service to $1 replicas..."
docker compose up -d --scale projects-service=$1
docker compose ps projects-service
```

## Моніторинг масштабування

### 1. Перевірка балансування навантаження

```bash
# Надіслати кілька запитів і перевірити розподіл
for i in {1..10}; do
  curl -s http://localhost/health | jq .
  sleep 0.5
done
```

### 2. Логи всіх реплік

```bash
# Логи всіх реплік projects-service
docker compose logs -f projects-service

# Логи конкретної репліки
docker logs -f app-projects-service-1
```

### 3. Статистика використання ресурсів

```bash
# Ресурси для всіх контейнерів
docker stats

# Фільтрація по projects-service
docker stats $(docker ps --filter name=projects-service -q)
```

### 4. Nginx статистика

```bash
# Статус активних з'єднань
curl http://localhost/nginx-status
```

Приклад виводу:
```
Active connections: 15
server accepts handled requests
 124 124 456
Reading: 0 Writing: 3 Waiting: 12
```

## Тестування масштабування

### Сценарій 1: Базовий тест з 1 реплікою

```bash
# 1. Запустити з 1 реплікою
docker compose up -d --scale projects-service=1

# 2. Запустити навантажувальний тест
cd load-tests
k6 run projects-load-test.js

# 3. Зафіксувати результати (p95, помилки, пропускна здатність)
```

### Сценарій 2: Тест з 3 репліками

```bash
# 1. Масштабувати до 3 реплік
docker compose up -d --scale projects-service=3

# 2. Дочекатись стабілізації (30 сек)
sleep 30

# 3. Запустити той самий тест
k6 run projects-load-test.js

# 4. Порівняти результати з 1 реплікою
```

### Сценарій 3: Стрес-тест з 5 репліками

```bash
# 1. Масштабувати до 5 реплік
docker compose up -d --scale projects-service=5

# 2. Запустити стрес-тест
k6 run --vus 200 --duration 5m projects-load-test.js
```

## Очікувані покращення

### Порівняння продуктивності

| Метрика                | 1 репліка | 3 репліки | 5 реплік |
|------------------------|-----------|-----------|----------|
| p(95) час відгуку      | 890ms     | ~450ms    | ~350ms   |
| Помилки (%)            | 2.16%     | ~0.5%     | ~0.2%    |
| Пропускна здатність    | 41 req/s  | ~120 req/s| ~200 req/s|
| CPU (avg per replica)  | 45%       | ~25%      | ~18%     |
| Memory (avg per replica)| 187MB     | ~150MB    | ~130MB   |

### Графік масштабування (приблизно)

```
Пропускна здатність vs Кількість реплік

250 req/s │                              ╭─────
          │                        ╭─────╯
200 req/s │                  ╭─────╯
          │            ╭─────╯
150 req/s │      ╭─────╯
          │╭─────╯
100 req/s ├╯
          │
 50 req/s │
          │
   0 req/s└────┬────┬────┬────┬────┬────┬────
             1    2    3    4    5    6    7
                  Кількість реплік
```

## Переваги горизонтального масштабування

### 1. Висока доступність (High Availability)
- Якщо одна репліка падає, інші продовжують працювати
- Nginx автоматично виключає недоступні бекенди
- Zero-downtime deployments

### 2. Кращa продуктивність
- Розподіл навантаження між репліками
- Зменшення часу відгуку
- Збільшення пропускної здатності

### 3. Гнучкість
- Швидке масштабування вгору при збільшенні навантаження
- Масштабування вниз для економії ресурсів
- Автоматичне масштабування (з Kubernetes)

### 4. Стійкість до навантаження
- Система витримує більше одночасних користувачів
- Graceful degradation під навантаженням

## Обмеження та міркування

### 1. Shared State
- **PostgreSQL**: Спільна БД - потенційне вузьке місце
- **Рішення**: Connection pooling, read replicas, sharding

### 2. Session Management
- Поточна система stateless (не зберігає сесії)
- Якщо потрібні сесії - використовувати Redis

### 3. Ресурси
- Кожна репліка споживає CPU/Memory
- Потрібно достатньо ресурсів на хост-машині

### 4. RabbitMQ
- Одна черга для всіх реплік - нормально
- Кожна репліка публікує події
- Один Notifications Service споживає

## Стратегії балансування

### 1. Round Robin (за замовчуванням)
```nginx
upstream projects_backend {
    server projects-service:4002;
}
```
- Запити розподіляються по черзі
- Найпростіший метод

### 2. Least Connections (поточна)
```nginx
upstream projects_backend {
    least_conn;
    server projects-service:4002;
}
```
- Запити йдуть на сервер з найменшою кількістю з'єднань
- Краще для довгих запитів

### 3. IP Hash
```nginx
upstream projects_backend {
    ip_hash;
    server projects-service:4002;
}
```
- Клієнт завжди потрапляє на той самий сервер
- Корисно для stateful додатків

### 4. Weighted
```nginx
upstream projects_backend {
    server projects-service-1:4002 weight=3;
    server projects-service-2:4002 weight=1;
}
```
- Розподіл з вагами (потужніші сервери отримують більше)

## Troubleshooting

### Проблема: Репліки не стартують

```bash
# Перевірити логи
docker compose logs projects-service

# Перевірити здоров'я БД
docker compose ps projects-db

# Перевірити RabbitMQ
docker compose ps rabbitmq
```

### Проблема: Nginx не бачить бекенди

```bash
# Перевірити мережу
docker network inspect app_taskflow-network

# Перевірити логи Nginx
docker compose logs nginx

# Перевірити конфігурацію
docker exec nginx-lb nginx -t
```

### Проблема: Нерівномірний розподіл навантаження

```bash
# Перевірити активні з'єднання для кожної репліки
for container in $(docker ps --filter name=projects-service -q); do
  echo "Container: $container"
  docker exec $container netstat -an | grep :4002 | grep ESTABLISHED | wc -l
done
```

## Наступні кроки для покращення

1. **Auto-scaling**: Інтеграція з Kubernetes HPA
2. **Metrics**: Prometheus + Grafana для моніторингу
3. **Tracing**: Додати distributed tracing (Jaeger/Zipkin)
4. **DB Scaling**: Read replicas для PostgreSQL
5. **Caching**: Redis для кешування GET запитів
6. **Service Mesh**: Istio/Linkerd для advanced routing

## Висновок

Горизонтальне масштабування дозволяє системі:
- ✅ Обробляти більше користувачів
- ✅ Бути більш надійною (HA)
- ✅ Швидше відповідати на запити
- ✅ Гнучко адаптуватись до навантаження

Рекомендації:
- **Development**: 1-2 репліки
- **Staging**: 2-3 репліки
- **Production**: 3-5+ реплік (залежно від навантаження)
