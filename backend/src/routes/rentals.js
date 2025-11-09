const express = require('express');
const axios = require('axios');
const Rental = require('../models/Rental');
const Console = require('../models/Console');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Функция для отправки уведомления в Telegram
async function sendTelegramNotification(telegramId, message) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN не установлен');
      return;
    }

    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: telegramId,
      text: message,
      parse_mode: 'HTML'
    });
    
    console.log(`✅ Уведомление отправлено пользователю ${telegramId}`);
  } catch (error) {
    console.error('Ошибка отправки уведомления в Telegram:', error.message);
  }
}

// Получить все аренды
router.get('/', authMiddleware, async (req, res) => {
  try {
    const rentals = await Rental.find()
      .populate('consoleId')
      .populate('userId')
      .sort({ createdAt: -1 });

    res.json(rentals);
  } catch (error) {
    console.error('Ошибка при получении аренд:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить активные аренды
router.get('/active/list', authMiddleware, async (req, res) => {
  try {
    const rentals = await Rental.find({ status: 'active' })
      .populate('consoleId')
      .populate('userId');

    res.json(rentals);
  } catch (error) {
    console.error('Ошибка при получении активных аренд:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать новую аренду
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { consoleId, userId, startDate, endDate, deposit, notes } = req.body;

    if (!consoleId || !userId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Необходимы все обязательные поля' });
    }

    const gameConsole = await Console.findById(consoleId);
    if (!gameConsole) {
      return res.status(404).json({ error: 'Консоль не найдена' });
    }

    const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    const totalPrice = days * gameConsole.pricePerDay;

    const newRental = new Rental({
      consoleId,
      userId,
      startDate,
      endDate,
      totalPrice,
      deposit: deposit || 0,
      notes,
    });

    await newRental.save();

    // Обновляем статус консоли
    gameConsole.status = 'rented';
    await gameConsole.save();

    // Обновляем данные пользователя
    const user = await User.findById(userId);
    if (user) {
      user.totalRentals += 1;
      user.totalSpent += totalPrice;
      await user.save();
    }

    const rental = await newRental.populate(['consoleId', 'userId']);

    // Отправляем уведомление пользователю о новой аренде
    if (rental.userId && rental.userId.telegramId) {
      const startDateStr = new Date(startDate).toLocaleDateString('ru-RU');
      const endDateStr = new Date(endDate).toLocaleDateString('ru-RU');
      const notificationMessage = 
        `<b>✅ Новая аренда создана!</b>\n\n` +
        `🎮 Консоль: <b>${rental.consoleId.name}</b>\n` +
        `📅 Начало: ${startDateStr}\n` +
        `📅 Конец: ${endDateStr}\n` +
        `💰 Стоимость: ${totalPrice}₽\n` +
        `🔒 Залог: ${deposit || 0}₽\n\n` +
        `Приятной игры! 🎉`;
      
      await sendTelegramNotification(rental.userId.telegramId, notificationMessage);
    }

    res.status(201).json(rental);
  } catch (error) {
    console.error('Ошибка при создании аренды:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Завершить аренду
router.put('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { depositReturned } = req.body;

    const rental = await Rental.findById(req.params.id)
      .populate('consoleId')
      .populate('userId');

    if (!rental) {
      return res.status(404).json({ error: 'Аренда не найдена' });
    }

    rental.status = 'completed';
    rental.depositReturned = depositReturned || false;
    await rental.save();

    // Обновляем статус консоли
    const gameConsole = await Console.findById(rental.consoleId);
    if (gameConsole) {
      gameConsole.status = 'available';
      await gameConsole.save();
    }

    // Отправляем уведомление пользователю
    if (rental.userId && rental.userId.telegramId) {
      console.log('📤 Отправка уведомления пользователю:', rental.userId.telegramId);
      const depositText = depositReturned ? 'возвращён ✅' : 'не возвращён ❌';
      const notificationMessage = 
        `<b>🎮 Аренда завершена</b>\n\n` +
        `Консоль: <b>${rental.consoleId.name}</b>\n` +
        `Стоимость: ${rental.totalPrice}₽\n` +
        `Залог (${rental.deposit}₽): ${depositText}\n\n` +
        `Спасибо за использование нашего сервиса! 🙏`;
      
      await sendTelegramNotification(rental.userId.telegramId, notificationMessage);
    } else {
      console.log('⚠️ Не удалось отправить уведомление. userId:', rental.userId?._id, 'telegramId:', rental.userId?.telegramId);
    }

    res.json(rental);
  } catch (error) {
    console.error('Ошибка при завершении аренды:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Отменить аренду
router.put('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id)
      .populate('consoleId')
      .populate('userId');

    if (!rental) {
      return res.status(404).json({ error: 'Аренда не найдена' });
    }

    rental.status = 'cancelled';
    await rental.save();

    // Обновляем статус консоли
    const gameConsole = await Console.findById(rental.consoleId);
    if (gameConsole) {
      gameConsole.status = 'available';
      await gameConsole.save();
    }

    // Отправляем уведомление пользователю
    if (rental.userId && rental.userId.telegramId) {
      const notificationMessage = 
        `<b>❌ Аренда отменена</b>\n\n` +
        `Консоль: <b>${rental.consoleId.name}</b>\n` +
        `Стоимость: ${rental.totalPrice}₽\n` +
        `Залог: ${rental.deposit}₽\n\n` +
        `Ваша аренда была отменена администратором.\n` +
        `По вопросам обращайтесь в поддержку.`;
      
      await sendTelegramNotification(rental.userId.telegramId, notificationMessage);
    }

    res.json(rental);
  } catch (error) {
    console.error('Ошибка при отмене аренды:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
