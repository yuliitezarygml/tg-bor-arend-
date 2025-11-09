const rateLimit = require('express-rate-limit');

// Общий limiter для всех запросов
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 1000, // максимум 1000 запросов за окно (для разработки)
  message: 'Слишком много запросов, попробуйте позже',
  standardHeaders: true,
  legacyHeaders: false,
});

// Более строгий limiter для логина
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // максимум 5 попыток
  message: 'Слишком много попыток входа, попробуйте позже',
  skipSuccessfulRequests: true, // Не учитывать успешные запросы
});

// Limiter для создания объектов
const createLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 10,
  message: 'Слишком много создано объектов, попробуйте позже',
});

// Limiter для обновлений
const updateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 20,
  message: 'Слишком много обновлений, попробуйте позже',
});

module.exports = {
  generalLimiter,
  loginLimiter,
  createLimiter,
  updateLimiter,
};
