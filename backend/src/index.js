require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Импортируем роуты
const authRoutes = require('./routes/auth');
const consoleRoutes = require('./routes/consoles');
const rentalRoutes = require('./routes/rentals');
const userRoutes = require('./routes/users');
const penaltyRoutes = require('./routes/penalties');
const notificationRoutes = require('./routes/notifications');
const logsRoutes = require('./routes/logs');
const analyticsRoutes = require('./routes/analytics');
const reservationRoutes = require('./routes/reservations');
const reviewRoutes = require('./routes/reviews');
const categoriesRoutes = require('./routes/categories');
const exportsRoutes = require('./routes/exports');

// Импортируем планировщик
const SchedulerService = require('./services/schedulerService');

// Импортируем middleware
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 5000;

// Подключаемся к БД
connectDB();

// Инициализируем планировщик задач
SchedulerService.initialize();

// Middleware
app.use(cors());
app.use(express.json());
app.use(generalLimiter); // Rate limiting для всех запросов
app.use('/uploads', express.static('uploads')); // Статические файлы

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend работает' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/consoles', consoleRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/users', userRoutes);
app.use('/api/penalties', penaltyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/export', exportsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Ошибка:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`Backend запущен на http://localhost:${PORT}`);
});
