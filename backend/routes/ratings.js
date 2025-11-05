const express = require('express');
const router = express.Router();
const Rating = require('../models/Rating');
const User = require('../models/User');
const History = require('../models/History');
const logger = require('../utils/logger');

// Функция для отправки уведомления администратору в Telegram
async function notifyAdminTelegram(ratingData) {
  try {
    // Ищем админов в БД
    const admins = await User.find({ role: 'admin' }); // Если такое поле есть
    if (admins.length === 0) return;

    const { bot } = require('../telegram/bot');
    const adminMessage = `
⭐ <b>Новый рейтинг на одобрение!</b>

👤 От: ${ratingData.ratedBy?.firstName} ${ratingData.ratedBy?.lastName}
👤 Для: ${ratingData.ratedUser?.firstName} ${ratingData.ratedUser?.lastName}
⭐ Оценка: ${'⭐'.repeat(ratingData.rating)}${' ☆'.repeat(5 - ratingData.rating)}
📂 Категория: ${
      ratingData.category === 'speed' ? 'Скорость' :
      ratingData.category === 'quality' ? 'Качество' :
      ratingData.category === 'communication' ? 'Общение' :
      'Общая оценка'
    }

💬 Комментарий: ${ratingData.comment || 'Нет'}
🔗 ID: ${ratingData._id}

⚠️ Требуется одобрение через админ-панель: /ratings
    `;

    for (const admin of admins) {
      if (admin.telegramId) {
        try {
          await bot.telegram.sendMessage(
            admin.telegramId,
            adminMessage,
            { parse_mode: 'HTML' }
          );
        } catch (err) {
          logger.error('Error sending Telegram notification', {
            adminId: admin._id,
            error: err.message
          });
        }
      }
    }
  } catch (error) {
    logger.error('Error notifying admin via Telegram', { error: error.message });
  }
}

// Получить все рейтинги пользователя
router.get('/user/:userId', async (req, res) => {
  try {
    logger.debug('GET /ratings/user/:userId - fetching user ratings', {
      userId: req.params.userId
    });

    const ratings = await Rating.find({
      ratedUser: req.params.userId,
      status: 'approved'
    })
      .populate('ratedBy', 'firstName lastName telegramId')
      .sort({ createdAt: -1 });

    logger.success('GET /ratings/user/:userId - ratings retrieved', {
      userId: req.params.userId,
      count: ratings.length
    });

    res.json(ratings);
  } catch (error) {
    logger.error('GET /ratings/user/:userId - error', {
      userId: req.params.userId,
      error: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

// Получить ожидающие одобрения рейтинги (для админа)
router.get('/pending', async (req, res) => {
  try {
    logger.debug('GET /ratings/pending - fetching pending ratings');

    const ratings = await Rating.getPendingRatings();

    logger.success('GET /ratings/pending - pending ratings retrieved', {
      count: ratings.length
    });

    res.json(ratings);
  } catch (error) {
    logger.error('GET /ratings/pending - error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Создать рейтинг
router.post('/', async (req, res) => {
  try {
    const { ratedBy, ratedUser, rentalId, rating, comment, category } = req.body;

    logger.info('POST /ratings - creating rating', {
      ratedBy,
      ratedUser,
      rentalId,
      rating,
      category
    });

    // Проверка диапазона рейтинга
    if (rating < 1 || rating > 5) {
      logger.warn('POST /ratings - invalid rating value', { rating });
      return res.status(400).json({ error: 'Рейтинг должен быть от 1 до 5' });
    }

    // Проверка дубликата
    const existingRating = await Rating.findOne({
      ratedBy,
      ratedUser,
      rentalId
    });

    if (existingRating) {
      logger.warn('POST /ratings - duplicate rating', {
        ratedBy,
        ratedUser,
        rentalId
      });
      return res.status(400).json({ error: 'Вы уже оценили этого пользователя по этой аренде' });
    }

    const newRating = new Rating({
      ratedBy,
      ratedUser,
      rentalId,
      rating,
      comment,
      category,
      status: 'pending'
    });

    await newRating.save();

    logger.success('POST /ratings - rating created', {
      ratingId: newRating._id,
      ratedBy,
      ratedUser,
      rating
    });

    // Отправляем уведомление администратору
    const ratingWithPopulated = await newRating.populate('ratedBy', 'firstName lastName');
    await ratingWithPopulated.populate('ratedUser', 'firstName lastName');
    await notifyAdminTelegram(ratingWithPopulated);

    // Записываем в историю
    await History.create({
      action: 'create',
      type: 'rating',
      itemId: newRating._id,
      itemName: `Рейтинг ${rating}⭐`,
      description: `Пользователь ${ratedBy} оценил ${ratedUser} на ${rating} звёзд`,
      changes: { rating, category }
    });

    res.status(201).json(newRating);
  } catch (error) {
    logger.error('POST /ratings - error creating rating', {
      error: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

// Одобрить рейтинг (админ)
router.put('/:id/approve', async (req, res) => {
  try {
    logger.info('PUT /ratings/:id/approve - approving rating', {
      ratingId: req.params.id
    });

    const rating = await Rating.findById(req.params.id);

    if (!rating) {
      logger.warn('PUT /ratings/:id/approve - rating not found', {
        ratingId: req.params.id
      });
      return res.status(404).json({ error: 'Рейтинг не найден' });
    }

    rating.status = 'approved';
    await rating.save();

    // Обновляем средний рейтинг пользователя
    const avgRating = await Rating.getAverageRating(rating.ratedUser);
    const updatedUser = await User.findByIdAndUpdate(rating.ratedUser, {
      averageRating: avgRating.averageRating || 0,
      ratingsCount: avgRating.count || 0
    }, { new: true });

    logger.success('PUT /ratings/:id/approve - rating approved', {
      ratingId: req.params.id,
      ratedUser: rating.ratedUser,
      newAverageRating: avgRating.averageRating
    });

    // Отправляем уведомление пользователю в Telegram
    if (updatedUser.telegramId) {
      try {
        const { bot } = require('../telegram/bot');
        const userMessage = `
✅ <b>Ваш рейтинг одобрен!</b>

⭐ Вы получили оценку: ${'⭐'.repeat(rating.rating)}${' ☆'.repeat(5 - rating.rating)}
📊 Ваш средний рейтинг: ${avgRating.averageRating.toFixed(1)}/5 (${avgRating.count} оценок)

Спасибо за использование нашего сервиса! 🎮
        `;
        await bot.telegram.sendMessage(updatedUser.telegramId, userMessage, {
          parse_mode: 'HTML'
        });
      } catch (err) {
        logger.error('Error sending Telegram notification to user', {
          userId: updatedUser._id,
          error: err.message
        });
      }
    }

    res.json(rating);
  } catch (error) {
    logger.error('PUT /ratings/:id/approve - error', {
      ratingId: req.params.id,
      error: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

// Отклонить рейтинг (админ)
router.put('/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;

    logger.info('PUT /ratings/:id/reject - rejecting rating', {
      ratingId: req.params.id,
      reason
    });

    const rating = await Rating.findById(req.params.id);

    if (!rating) {
      logger.warn('PUT /ratings/:id/reject - rating not found', {
        ratingId: req.params.id
      });
      return res.status(404).json({ error: 'Рейтинг не найден' });
    }

    rating.status = 'rejected';
    rating.rejectionReason = reason;
    await rating.save();

    logger.success('PUT /ratings/:id/reject - rating rejected', {
      ratingId: req.params.id,
      reason
    });

    res.json(rating);
  } catch (error) {
    logger.error('PUT /ratings/:id/reject - error', {
      ratingId: req.params.id,
      error: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

// Удалить рейтинг
router.delete('/:id', async (req, res) => {
  try {
    logger.info('DELETE /ratings/:id - deleting rating', {
      ratingId: req.params.id
    });

    const rating = await Rating.findByIdAndDelete(req.params.id);

    if (!rating) {
      logger.warn('DELETE /ratings/:id - rating not found', {
        ratingId: req.params.id
      });
      return res.status(404).json({ error: 'Рейтинг не найден' });
    }

    logger.success('DELETE /ratings/:id - rating deleted', {
      ratingId: req.params.id
    });

    res.json({ success: true, message: 'Рейтинг удалён' });
  } catch (error) {
    logger.error('DELETE /ratings/:id - error', {
      ratingId: req.params.id,
      error: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
