#!/bin/bash

# Скрипт для масштабування Projects Service

if [ -z "$1" ]; then
    echo "========================================"
    echo "  Масштабування Projects Service"
    echo "========================================"
    echo
    echo "Використання: ./scale.sh [кількість_реплік]"
    echo
    echo "Приклади:"
    echo "  ./scale.sh 1    - Запустити 1 репліку"
    echo "  ./scale.sh 3    - Запустити 3 репліки (рекомендовано)"
    echo "  ./scale.sh 5    - Запустити 5 реплік"
    echo
    echo "Поточний стан:"
    docker compose ps projects-service 2>/dev/null || echo "Сервіс не запущено"
    exit 1
fi

echo "========================================"
echo "  Масштабування до $1 реплік"
echo "========================================"
echo

# Перевірка наявності Docker
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker не знайдено!"
    exit 1
fi

echo "[1/3] Зупинка існуючих реплік..."
docker compose stop projects-service

echo
echo "[2/3] Запуск $1 реплік projects-service..."
docker compose up -d --scale projects-service=$1 --no-recreate

echo
echo "[3/3] Очікування готовності сервісів (15 секунд)..."
sleep 15

echo
echo "========================================"
echo "  Статус реплік"
echo "========================================"
echo
docker compose ps projects-service

echo
echo "========================================"
echo "  Статистика використання ресурсів"
echo "========================================"
echo
echo "Для перегляду в реальному часі: docker stats"
echo "Для логів: docker compose logs -f projects-service"
echo "Для статусу Nginx: curl http://localhost/nginx-status"
echo
