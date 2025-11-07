@echo off
REM Console Rental System - Installation Script

echo.
echo ╔════════════════════════════════════════════╗
echo ║  🎮 Console Rental System - Setup         ║
echo ╚════════════════════════════════════════════╝
echo.

REM Проверка Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js не установлен! Пожалуйста установите Node.js с https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js найден

REM Проверка MongoDB
echo.
echo Проверка MongoDB...
timeout /t 2 /nobreak

REM Установка backend зависимостей
echo.
echo 📦 Установка зависимостей Backend...
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Ошибка при установке backend зависимостей
    pause
    exit /b 1
)
cd ..

REM Установка admin-panel зависимостей
echo.
echo 📦 Установка зависимостей Admin Panel...
cd admin-panel
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Ошибка при установке admin-panel зависимостей
    pause
    exit /b 1
)
cd ..

echo.
echo ✅ Установка завершена!
echo.
echo 📝 Следующие шаги:
echo.
echo 1. Создайте файл .env в папке backend:
echo    cp backend\.env.example backend\.env
echo.
echo 2. Заполните переменные в backend\.env:
echo    - MONGODB_URI=mongodb://localhost:27017/console-rental
echo    - PORT=5000
echo    - BOT_TOKEN=your_telegram_bot_token
echo    - ADMIN_CHAT_ID=your_admin_chat_id
echo.
echo 3. Запустите MongoDB (если установлена локально):
echo    mongod
echo.
echo 4. В новом терминале запустите Backend:
echo    cd backend
echo    npm start
echo.
echo 5. В новом терминале запустите Admin Panel:
echo    cd admin-panel
echo    npm start
echo.
echo 6. Откройте браузер и перейдите на http://localhost:3000
echo.
echo 🎮 Готово! Система готова к использованию!
echo.
pause
