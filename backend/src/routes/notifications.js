const express = require('express');
const Notification = require('../models/Notification');
const NotificationService = require('../services/notificationService');

const router = express.Router();

/**
 * Получить все уведомления пользователя
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;

    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Notification.countDocuments({ userId });
    const unread = await Notification.countDocuments({ userId, isRead: false });

    res.json({
      notifications,
      total,
      unread,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Ошибка при получении уведомлений:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получить непрочитанные уведомления
 */
router.get('/user/:userId/unread', async (req, res) => {
  try {
    const { userId } = req.params;

    const notifications = await Notification.find({
      userId,
      isRead: false,
    }).sort({ createdAt: -1 });

    res.json({
      unreadCount: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error('Ошибка при получении непрочитанных уведомлений:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Отметить уведомление как прочитанное
 */
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await NotificationService.markAsRead(id);

    if (!notification) {
      return res.status(404).json({ error: 'Уведомление не найдено' });
    }

    res.json({ message: 'Уведомление отмечено как прочитанное', notification });
  } catch (error) {
    console.error('Ошибка при отметке уведомления:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Отметить все уведомления как прочитанные
 */
router.patch('/user/:userId/read-all', async (req, res) => {
  try {
    const { userId } = req.params;

    await NotificationService.markAllAsRead(userId);

    res.json({ message: 'Все уведомления отмечены как прочитанные' });
  } catch (error) {
    console.error('Ошибка при отметке всех уведомлений:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Удалить уведомление
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({ error: 'Уведомление не найдено' });
    }

    res.json({ message: 'Уведомление удалено' });
  } catch (error) {
    console.error('Ошибка при удалении уведомления:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Удалить все уведомления пользователя
 */
router.delete('/user/:userId/all', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await Notification.deleteMany({ userId });

    res.json({
      message: `Удалено ${result.deletedCount} уведомлений`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Ошибка при удалении всех уведомлений:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получить уведомление по ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({ error: 'Уведомление не найдено' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Ошибка при получении уведомления:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * ============= АДМИН ENDPOINTS =============
 */

/**
 * Получить все уведомления (для админа)
 */
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const query = type ? { type } : {};

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(notifications);
  } catch (error) {
    console.error('Ошибка загрузки уведомлений:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Отправить уведомление для всех/пользователей
 */
router.post('/send', async (req, res) => {
  try {
    const { title, message, type, recipientType } = req.body;

    if (!title || !message || !type) {
      return res.status(400).json({ error: 'Заполните обязательные поля' });
    }

    let recipientCount = 0;

    if (recipientType === 'all') {
      // Отправить всем пользователям
      const User = require('../models/User');
      const users = await User.find().select('_id');
      recipientCount = users.length;

      const notifications = users.map(user => ({
        userId: user._id,
        title,
        message,
        type,
        isRead: false,
        recipientType: 'all'
      }));

      await Notification.insertMany(notifications);
    } else {
      // Отправить только активным пользователям
      const User = require('../models/User');
      const users = await User.find({ isActive: true }).select('_id');
      recipientCount = users.length;

      const notifications = users.map(user => ({
        userId: user._id,
        title,
        message,
        type,
        isRead: false,
        recipientType: 'users'
      }));

      await Notification.insertMany(notifications);
    }

    // Сохранить уведомление администратора
    const adminNotif = new Notification({
      adminNotification: true,
      title,
      message,
      type,
      recipientCount,
      recipientType,
      createdAt: new Date()
    });

    await adminNotif.save();

    res.json({ 
      success: true, 
      message: `Уведомление отправлено ${recipientCount} пользователям`,
      notification: adminNotif 
    });
  } catch (error) {
    console.error('Ошибка отправки уведомления:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Удалить уведомление
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({ error: 'Уведомление не найдено' });
    }

    res.json({ success: true, message: 'Уведомление удалено' });
  } catch (error) {
    console.error('Ошибка удаления уведомления:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
