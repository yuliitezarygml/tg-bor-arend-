#!/bin/bash

# Console Rental System - Installation Script

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  🎮 Console Rental System - Setup         ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен! Пожалуйста установите Node.js с https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js найден"

# Проверка MongoDB
echo ""
echo "Проверка MongoDB..."
sleep 2

# Установка backend зависимостей
echo ""
echo "📦 Установка зависимостей Backend..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Ошибка при установке backend зависимостей"
    exit 1
fi
cd ..

# Установка admin-panel зависимостей
echo ""
echo "📦 Установка зависимостей Admin Panel..."
cd admin-panel
npm install
if [ $? -ne 0 ]; then
    echo "❌ Ошибка при установке admin-panel зависимостей"
    exit 1
fi
cd ..

echo ""
echo "✅ Установка завершена!"
echo ""
echo "📝 Следующие шаги:"
echo ""
echo "1. Создайте файл .env в папке backend:"
echo "   cp backend/.env.example backend/.env"
echo ""
echo "2. Заполните переменные в backend/.env:"
echo "   - MONGODB_URI=mongodb://localhost:27017/console-rental"
echo "   - PORT=5000"
echo "   - BOT_TOKEN=your_telegram_bot_token"
echo "   - ADMIN_CHAT_ID=your_admin_chat_id"
echo ""
echo "3. Запустите MongoDB (если установлена локально):"
echo "   mongod"
echo ""
echo "4. В новом терминале запустите Backend:"
echo "   cd backend && npm start"
echo ""
echo "5. В новом терминале запустите Admin Panel:"
echo "   cd admin-panel && npm start"
echo ""
echo "6. Откройте браузер и перейдите на http://localhost:3000"
echo ""
echo "🎮 Готово! Система готова к использованию!"
echo ""
