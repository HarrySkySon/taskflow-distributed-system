@echo off
REM Скрипт для автоматичного запуску навантажувальних тестів
echo ========================================
echo   Навантажувальне тестування k6
echo ========================================
echo.

REM Перевірка наявності k6
where k6 >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] k6 не знайдено!
    echo.
    echo Встановіть k6 одним із способів:
    echo   - choco install k6
    echo   - winget install k6
    echo   - або завантажте з https://github.com/grafana/k6/releases
    echo.
    pause
    exit /b 1
)

echo [OK] k6 знайдено
echo.

REM Перевірка наявності Docker
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Docker не знайдено!
    echo Встановіть Docker Desktop для Windows
    echo.
    pause
    exit /b 1
)

echo [OK] Docker знайдено
echo.

REM Перехід до кореневої директорії проекту
cd ..

REM Перевірка чи запущені контейнери
echo Перевірка статусу Docker контейнерів...
docker compose ps

echo.
echo Запускаємо Docker контейнери (якщо не запущені)...
docker compose up -d

echo.
echo Очікування готовності сервісів (30 секунд)...
timeout /t 30 /nobreak >nul

echo.
echo ========================================
echo   1. Smoke Test (Базова перевірка)
echo ========================================
echo.
cd load-tests
k6 run smoke-test.js

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Smoke test не пройдено!
    echo Перевірте логи сервісів: docker compose logs
    pause
    exit /b 1
)

echo.
echo [OK] Smoke test пройдено успішно!
echo.
echo ========================================
echo   2. Load Test (Навантажувальний тест)
echo ========================================
echo.

REM Запит користувача чи продовжувати
set /p continue="Продовжити з повним навантажувальним тестом? (Y/N): "
if /i not "%continue%"=="Y" (
    echo Тестування завершено
    pause
    exit /b 0
)

echo.
echo Запуск навантажувального тесту...
echo Це може зайняти до 5 хвилин...
echo.

k6 run --out json=results.json projects-load-test.js

if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Навантажувальний тест завершився з помилками
) else (
    echo.
    echo [OK] Навантажувальний тест завершено
)

echo.
echo ========================================
echo   Результати тестування
echo ========================================
echo.
echo Результати збережено у файл: results.json
echo.
echo Для перегляду детальних метрик відкрийте:
echo - RabbitMQ Management UI: http://localhost:15672
echo - Docker stats: docker stats
echo.

pause
