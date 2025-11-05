const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { startTelegramBot } = require('./telegram/bot');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function(data) {
    const duration = Date.now() - start;
    const statusColor = res.statusCode < 400 ? '✓' : '✗';
    logger.info(`${statusColor} ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`, {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
    res.send = originalSend;
    return res.send(data);
  };

  next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/console-rental')
  .then(() => {
    logger.success('MongoDB подключена', {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/console-rental'
    });
  })
  .catch(err => {
    logger.error('Ошибка подключения MongoDB', { error: err.message });
  });

// Routes
app.use('/api/consoles', require('./routes/consoles'));
app.use('/api/rentals', require('./routes/rentals'));
app.use('/api/users', require('./routes/users'));
app.use('/api/games', require('./routes/games'));
app.use('/api/discounts', require('./routes/discounts'));
app.use('/api/history', require('./routes/history'));
app.use('/api/ratings', require('./routes/ratings'));

// Health check
app.get('/health', (req, res) => {
  logger.info('Health check запрос');
  res.json({ status: 'ok', message: 'Server is running', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Необработанная ошибка', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.success(`🚀 Server запущен на http://localhost:${PORT}`);
  logger.info('Запуск Telegram бота...');
  startTelegramBot();
});
