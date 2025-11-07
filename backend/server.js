require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Импорт роутов
const consoleRoutes = require('./src/routes/consoles');
const userRoutes = require('./src/routes/users');
const rentalRoutes = require('./src/routes/rentals');

// Импорт Telegram бота
const { initBot } = require('./src/telegram-bot/bot');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Асинхронная функция для инициализации
async function startServer() {
  try {
    // Подключение к MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB подключена');

    // Инициализация Telegram бота
    const bot = initBot(
      process.env.BOT_TOKEN,
      process.env.ADMIN_CHAT_ID
    );
    
    await bot.launch();
    console.log('✅ Telegram бот запущен');
    
    // Graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));

  } catch (error) {
    console.error('❌ Ошибка при запуске:', error);
    process.exit(1);
  }
}

startServer();

// API Роуты
app.use('/api/consoles', consoleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rentals', rentalRoutes);

// Проверка здоровья сервера
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Сервер работает' });
});

// Проверка статуса Face-API и системы верификации
app.get('/api/health/verification', async (req, res) => {
  try {
    const { checkFaceApiStatus } = require('./src/utils/documentVerification');
    const status = await checkFaceApiStatus();
    
    res.json({
      status: 'OK',
      verification: {
        faceApiAvailable: status.available,
        modelsLoaded: status.modelsLoaded,
        activeChecks: status.checks,
        mode: status.checks.faceDetection ? 'full' : 'basic'
      },
      message: status.checks.faceDetection 
        ? 'Полная проверка активна (качество + OCR + лица + сравнение)'
        : 'Базовая проверка активна (качество + OCR)'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      error: error.message 
    });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║  🎮 Console Rental Backend               ║
║  Сервер запущен на: http://localhost:${PORT}  ║
║  MongoDB: ${process.env.MONGODB_URI}       ║
╚══════════════════════════════════════════╝
  `);
});
