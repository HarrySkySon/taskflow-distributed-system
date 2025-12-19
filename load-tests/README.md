# Навантажувальне тестування з k6

## Встановлення k6

### Windows (через Chocolatey)
```bash
choco install k6
```

### Windows (через winget)
```bash
winget install k6 --source winget
```

### Windows (ручне встановлення)
1. Завантажте k6 з https://github.com/grafana/k6/releases
2. Розпакуйте архів
3. Додайте шлях до k6.exe у змінну PATH

### Linux
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### macOS
```bash
brew install k6
```

## Підготовка до тестування

1. Переконайтесь, що Docker-контейнери запущені:
```bash
docker-compose up -d
```

2. Перевірте, що сервіси доступні:
```bash
curl http://localhost:4002/health
```

## Типи тестів

### 1. Smoke Test (Швидка перевірка)
Мінімальне навантаження для перевірки базової функціональності.

```bash
k6 run smoke-test.js
```

**Параметри:**
- 1 віртуальний користувач
- Тривалість: 30 секунд
- Мета: перевірка базової працездатності

### 2. Load Test (Навантажувальний тест)
Тест із поступовим збільшенням навантаження для перевірки продуктивності системи.

```bash
k6 run projects-load-test.js
```

**Параметри:**
- Розігрів: 10 користувачів (30 сек)
- Збільшення: 50 користувачів (1 хв)
- Пік: 100 користувачів (2 хв)
- Зниження: 50 користувачів (1 хв)
- Завершення: 0 користувачів (30 сек)

### 3. Стрес-тест (за бажанням)
Для запуску з більшою кількістю користувачів:

```bash
k6 run --vus 200 --duration 5m projects-load-test.js
```

## Налаштування параметрів

### Зміна цільового URL
```bash
k6 run -e BASE_URL=http://localhost:4002 projects-load-test.js
```

### Збереження результатів у JSON
```bash
k6 run --out json=results.json projects-load-test.js
```

### Збереження результатів у CSV
```bash
k6 run --summary-export=summary.json projects-load-test.js
```

## Інтерпретація результатів

### Ключові метрики:

1. **http_req_duration** - час відгуку HTTP-запитів
   - p(95) < 500ms - 95% запитів мають виконуватись швидше 500мс

2. **http_req_failed** - відсоток невдалих запитів
   - rate < 0.05 - менше 5% помилок

3. **iterations** - кількість виконаних ітерацій тестової функції

4. **vus** - кількість активних віртуальних користувачів

5. **http_reqs** - загальна кількість HTTP-запитів

### Приклад успішного результату:
```
✓ health check status is 200
✓ get all projects status is 200
✓ create project status is 201
✓ http_req_duration..............: avg=245ms  p(95)=450ms
✓ http_req_failed................: 2.34%
```

### Приклад проблемного результату:
```
✗ http_req_duration..............: avg=1.2s   p(95)=2.5s
✗ http_req_failed................: 12.5%
```

## Сценарії тестування

### Базовий сценарій (Smoke Test):
1. Перевірка /health
2. Отримання списку проектів (GET /api/projects)
3. Створення проекту (POST /api/projects)
4. Видалення проекту (DELETE /api/projects/:id)

### Повний сценарій (Load Test):
1. Перевірка /health
2. Отримання списку проектів (GET /api/projects)
3. Створення проекту (POST /api/projects)
4. Отримання проекту за ID (GET /api/projects/:id)
5. Оновлення проекту (PUT /api/projects/:id)
6. Видалення проекту (DELETE /api/projects/:id)

## Моніторинг під час тестування

Під час виконання тестів можна моніторити:

### Docker контейнери:
```bash
docker stats
```

### Логи сервісу:
```bash
docker logs -f projects-service
```

### Логи RabbitMQ:
```bash
docker logs -f rabbitmq
```

### RabbitMQ Management UI:
Відкрийте http://localhost:15672 (логін/пароль: guest/guest)

## Поради для тестування

1. **Завжди починайте зі Smoke Test** - переконайтесь, що базовий функціонал працює
2. **Очищайте БД перед великими тестами** - для консистентних результатів
3. **Моніторте ресурси** - використовуйте `docker stats` для перегляду споживання ресурсів
4. **Зберігайте результати** - для порівняння до та після оптимізацій
5. **Запускайте тести кілька разів** - для отримання середніх значень

## Очікувані результати

Для системи з поточною конфігурацією (обмеження ресурсів у docker-compose.yml):
- **Smoke Test**: повинен проходити без помилок
- **Load Test (до 50 користувачів)**: < 5% помилок, p(95) < 500ms
- **Load Test (100 користувачів)**: можливе збільшення часу відгуку через обмеження ресурсів

## Troubleshooting

### Помилка: "connection refused"
```bash
# Перевірте, чи запущені контейнери
docker-compose ps
```

### Велика кількість помилок
```bash
# Збільште ресурси для контейнерів у docker-compose.yml
# або зменшіть навантаження у тесті
```

### k6 не знайдено
```bash
# Перевірте встановлення
k6 version
```
