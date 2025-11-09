const express = require('express');
const axios = require('axios');
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

// Получить всех пользователей
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Ошибка при получении пользователей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить пользователя по ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(user);
  } catch (error) {
    console.error('Ошибка при получении пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить пользователя по Telegram ID
router.get('/telegram/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const user = await User.findOne({ telegramId });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(user);
  } catch (error) {
    console.error('Ошибка при получении пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать или обновить пользователя по Telegram ID
router.post('/telegram/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { username, firstName, lastName, phoneNumber, email } = req.body;

    let user = await User.findOne({ telegramId });

    if (!user) {
      user = new User({
        telegramId,
        username,
        firstName,
        lastName,
        phoneNumber,
        email,
      });
    } else {
      // Обновляем данные если нужно
      if (username) user.username = username;
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (phoneNumber) user.phoneNumber = phoneNumber;
      if (email) user.email = email;
    }

    await user.save();

    res.json(user);
  } catch (error) {
    console.error('Ошибка при работе с пользователем:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить пользователя
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { isBlocked, phoneNumber, email } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          isBlocked,
          phoneNumber,
          email,
        },
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(user);
  } catch (error) {
    console.error('Ошибка при обновлении пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Заблокировать пользователя
router.put('/:id/block', authMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          isBlocked: true,
          blockReason: reason || 'Причина не указана',
          blockedAt: new Date()
        } 
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Отправляем уведомление пользователю
    if (user.telegramId) {
      const notificationMessage = 
        `<b>🚫 Ваш аккаунт заблокирован</b>\n\n` +
        `<b>Причина:</b> ${reason || 'Причина не указана'}\n\n` +
        `Для разблокировки обратитесь в службу поддержки.\n` +
        `📞 Контакты: @support`;
      
      await sendTelegramNotification(user.telegramId, notificationMessage);
    }

    res.json({ message: 'Пользователь заблокирован', user });
  } catch (error) {
    console.error('Ошибка при блокировке пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Разблокировать пользователя
router.put('/:id/unblock', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          isBlocked: false,
          blockReason: '',
          blockedAt: null
        } 
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Отправляем уведомление пользователю
    if (user.telegramId) {
      const notificationMessage = 
        `<b>✅ Ваш аккаунт разблокирован!</b>\n\n` +
        `Вы снова можете пользоваться нашим сервисом.\n` +
        `Спасибо за понимание! 🎮`;
      
      await sendTelegramNotification(user.telegramId, notificationMessage);
    }

    res.json({ message: 'Пользователь разблокирован', user });
  } catch (error) {
    console.error('Ошибка при разблокировке пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
