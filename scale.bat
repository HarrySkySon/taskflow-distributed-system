@echo off
REM Скрипт для масштабування Projects Service

if "%1"=="" (
    echo ========================================
    echo   Масштабування Projects Service
    echo ========================================
    echo.
    echo Використання: scale.bat [кількість_реплік]
    echo.
    echo Приклади:
    echo   scale.bat 1    - Запустити 1 репліку
    echo   scale.bat 3    - Запустити 3 репліки (рекомендовано)
    echo   scale.bat 5    - Запустити 5 реплік
    echo.
    echo Поточний стан:
    docker compose ps projects-service 2>nul
    exit /b 1
)

echo ========================================
echo   Масштабування до %1 реплік
echo ========================================
echo.

REM Перевірка наявності Docker
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Docker не знайдено!
    exit /b 1
)

echo [1/3] Зупинка існуючих реплік...
docker compose stop projects-service

echo.
echo [2/3] Запуск %1 реплік projects-service...
docker compose up -d --scale projects-service=%1 --no-recreate

echo.
echo [3/3] Очікування готовності сервісів (15 секунд)...
timeout /t 15 /nobreak >nul

echo.
echo ========================================
echo   Статус реплік
echo ========================================
echo.
docker compose ps projects-service

echo.
echo ========================================
echo   Статистика використання ресурсів
echo ========================================
echo.
echo Для перегляду в реальному часі: docker stats
echo Для логів: docker compose logs -f projects-service
echo Для статусу Nginx: curl http://localhost/nginx-status
echo.

pause
