const express = require('express');
const Review = require('../models/Review');
const Console = require('../models/Console');
const Rental = require('../models/Rental');

const router = express.Router();

/**
 * Получить отзывы консоли
 */
router.get('/console/:consoleId', async (req, res) => {
  try {
    const { consoleId } = req.params;
    const { limit = 10, page = 1 } = req.query;

    const skip = (page - 1) * limit;

    const reviews = await Review.find({
      consoleId,
      status: 'approved',
    })
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Review.countDocuments({
      consoleId,
      status: 'approved',
    });

    // Получаем среднюю оценку
    const avgRating = await Review.aggregate([
      { $match: { consoleId: require('mongoose').Types.ObjectId(consoleId) } },
      { $group: { _id: null, average: { $avg: '$rating' } } },
    ]);

    res.json({
      reviews,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      averageRating: avgRating[0]?.average || 0,
    });
  } catch (error) {
    console.error('Ошибка при получении отзывов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Создать отзыв
 */
router.post('/', async (req, res) => {
  try {
    const { userId, consoleId, rentalId, rating, title, comment } = req.body;

    if (!userId || !consoleId || !rating || !title) {
      return res.status(400).json({ error: 'Необходимы все поля' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Рейтинг должен быть от 1 до 5' });
    }

    // Проверяем, арендовал ли пользователь эту консоль
    const rental = await Rental.findOne({
      userId,
      consoleId,
      status: 'completed',
    });

    const review = new Review({
      userId,
      consoleId,
      rentalId: rentalId || rental?._id,
      rating,
      title,
      comment,
      verified: !!rental,
    });

    await review.save();

    // Обновляем средний рейтинг консоли
    const avgRating = await Review.aggregate([
      { $match: { consoleId: require('mongoose').Types.ObjectId(consoleId), verified: true } },
      { $group: { _id: null, average: { $avg: '$rating' } } },
    ]);

    await Console.findByIdAndUpdate(
      consoleId,
      { averageRating: avgRating[0]?.average || 0 }
    );

    res.status(201).json(review);
  } catch (error) {
    console.error('Ошибка при создании отзыва:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Одобрить отзыв (админ)
 */
router.patch('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findByIdAndUpdate(
      id,
      { status: 'approved' },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ error: 'Отзыв не найден' });
    }

    res.json({ message: 'Отзыв одобрен', review });
  } catch (error) {
    console.error('Ошибка при одобрении отзыва:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Отклонить отзыв (админ)
 */
router.patch('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findByIdAndUpdate(
      id,
      { status: 'rejected' },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ error: 'Отзыв не найден' });
    }

    res.json({ message: 'Отзыв отклонен', review });
  } catch (error) {
    console.error('Ошибка при отклонении отзыва:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получить все ожидающие отзывы (админ)
 */
router.get('/pending/all', async (req, res) => {
  try {
    const reviews = await Review.find({ status: 'pending' })
      .populate('userId', 'firstName lastName')
      .populate('consoleId', 'name')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('Ошибка при получении ожидающих отзывов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
