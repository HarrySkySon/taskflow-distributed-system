#!/bin/bash

# Скрипт для автоматичного запуску навантажувальних тестів
echo "========================================"
echo "  Навантажувальне тестування k6"
echo "========================================"
echo

# Перевірка наявності k6
if ! command -v k6 &> /dev/null; then
    echo "[ERROR] k6 не знайдено!"
    echo
    echo "Встановіть k6:"
    echo "  macOS: brew install k6"
    echo "  Linux: sudo apt-get install k6"
    echo "  або завантажте з https://github.com/grafana/k6/releases"
    echo
    exit 1
fi

echo "[OK] k6 знайдено"
echo

# Перевірка наявності Docker
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker не знайдено!"
    echo "Встановіть Docker"
    echo
    exit 1
fi

echo "[OK] Docker знайдено"
echo

# Перехід до кореневої директорії проекту
cd "$(dirname "$0")/.."

# Перевірка чи запущені контейнери
echo "Перевірка статусу Docker контейнерів..."
docker compose ps

echo
echo "Запускаємо Docker контейнери (якщо не запущені)..."
docker compose up -d

echo
echo "Очікування готовності сервісів (30 секунд)..."
sleep 30

echo
echo "========================================"
echo "  1. Smoke Test (Базова перевірка)"
echo "========================================"
echo
cd load-tests
k6 run smoke-test.js

if [ $? -ne 0 ]; then
    echo
    echo "[ERROR] Smoke test не пройдено!"
    echo "Перевірте логи сервісів: docker compose logs"
    exit 1
fi

echo
echo "[OK] Smoke test пройдено успішно!"
echo
echo "========================================"
echo "  2. Load Test (Навантажувальний тест)"
echo "========================================"
echo

# Запит користувача чи продовжувати
read -p "Продовжити з повним навантажувальним тестом? (Y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Тестування завершено"
    exit 0
fi

echo
echo "Запуск навантажувального тесту..."
echo "Це може зайняти до 5 хвилин..."
echo

k6 run --out json=results.json projects-load-test.js

if [ $? -ne 0 ]; then
    echo
    echo "[WARNING] Навантажувальний тест завершився з помилками"
else
    echo
    echo "[OK] Навантажувальний тест завершено"
fi

echo
echo "========================================"
echo "  Результати тестування"
echo "========================================"
echo
echo "Результати збережено у файл: results.json"
echo
echo "Для перегляду детальних метрик відкрийте:"
echo "- RabbitMQ Management UI: http://localhost:15672"
echo "- Docker stats: docker stats"
echo
