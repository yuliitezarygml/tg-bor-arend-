const express = require('express');
const Reservation = require('../models/Reservation');
const Console = require('../models/Console');
const Rental = require('../models/Rental');
const authMiddleware = require('../middleware/auth');
const NotificationService = require('../services/notificationService');

const router = express.Router();

/**
 * Получить все брони
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, userId, consoleId } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (userId) filter.userId = userId;
    if (consoleId) filter.consoleId = consoleId;

    const reservations = await Reservation.find(filter)
      .populate('userId', 'firstName lastName telegramId')
      .populate('consoleId', 'name serialNumber')
      .populate('confirmedBy', 'username')
      .sort({ createdAt: -1 });

    res.json(reservations);
  } catch (error) {
    console.error('Ошибка при получении броней:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получить брони пользователя
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const reservations = await Reservation.find({ userId })
      .populate('consoleId', 'name pricePerDay')
      .sort({ startDate: 1 });

    res.json(reservations);
  } catch (error) {
    console.error('Ошибка при получении броней пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Создать бронь
 */
router.post('/', async (req, res) => {
  try {
    const { userId, consoleId, startDate, endDate, notes } = req.body;

    if (!userId || !consoleId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Необходимы все поля' });
    }

    // Проверяем доступность консоли
    const existingReservation = await Reservation.findOne({
      consoleId,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { startDate: { $lt: endDate }, endDate: { $gt: startDate } }
      ],
    });

    if (existingReservation) {
      return res.status(400).json({ error: 'Консоль недоступна на эти даты' });
    }

    const reservation = new Reservation({
      userId,
      consoleId,
      startDate,
      endDate,
      notes,
    });

    await reservation.save();

    res.status(201).json(reservation);
  } catch (error) {
    console.error('Ошибка при создании брони:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Подтвердить бронь (админ)
 */
router.patch('/:id/confirm', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const reservation = await Reservation.findById(id);

    if (!reservation) {
      return res.status(404).json({ error: 'Бронь не найдена' });
    }

    if (reservation.status !== 'pending') {
      return res.status(400).json({ error: 'Бронь не может быть подтверждена' });
    }

    reservation.status = 'confirmed';
    reservation.confirmedBy = req.user.id;
    reservation.confirmedAt = new Date();

    await reservation.save();

    // Отправляем уведомление
    await NotificationService.sendNotification(
      reservation.userId,
      'status_update',
      '✅ Ваша бронь подтверждена',
      'Ваша бронь консоли подтверждена администратором. Приходите вовремя!',
      { sendTelegram: true }
    );

    res.json({ message: 'Бронь подтверждена', reservation });
  } catch (error) {
    console.error('Ошибка при подтверждении брони:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Отменить бронь
 */
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const reservation = await Reservation.findById(id);

    if (!reservation) {
      return res.status(404).json({ error: 'Бронь не найдена' });
    }

    reservation.status = 'cancelled';
    reservation.cancelledAt = new Date();
    reservation.cancelReason = reason || 'Отменено пользователем';

    await reservation.save();

    // Отправляем уведомление
    await NotificationService.sendNotification(
      reservation.userId,
      'status_update',
      '❌ Ваша бронь отменена',
      `Бронь отменена. Причина: ${reservation.cancelReason}`,
      { sendTelegram: true }
    );

    res.json({ message: 'Бронь отменена', reservation });
  } catch (error) {
    console.error('Ошибка при отмене брони:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получить доступные даты для консоли
 */
router.get('/console/:consoleId/availability', async (req, res) => {
  try {
    const { consoleId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Необходимо указать startDate и endDate' });
    }

    // Проверяем занятость в этот период
    const reservations = await Reservation.find({
      consoleId,
      status: { $in: ['confirmed', 'converted'] },
      $or: [
        { startDate: { $lt: endDate }, endDate: { $gt: startDate } }
      ],
    });

    const rentals = await Rental.find({
      consoleId,
      status: { $in: ['active', 'completed'] },
      $or: [
        { startDate: { $lt: endDate }, endDate: { $gt: startDate } }
      ],
    });

    const available = reservations.length === 0 && rentals.length === 0;

    res.json({
      consoleId,
      available,
      conflicts: [...reservations, ...rentals],
    });
  } catch (error) {
    console.error('Ошибка при проверке доступности:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
