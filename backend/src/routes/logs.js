const express = require('express');
const Log = require('../models/Log');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * Получить все логи (админ)
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { action, adminId, targetModel, startDate, endDate, limit = 50, page = 1 } = req.query;

    const filter = {};
    if (action) filter.action = action;
    if (adminId) filter.adminId = adminId;
    if (targetModel) filter.targetModel = targetModel;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const logs = await Log.find(filter)
      .populate('adminId', 'username email')
      .populate('targetId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Log.countDocuments(filter);

    res.json({
      logs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Ошибка при получении логов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получить логи администратора
 */
router.get('/admin/:adminId', authMiddleware, async (req, res) => {
  try {
    const { adminId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    const skip = (page - 1) * limit;

    const logs = await Log.find({ adminId })
      .populate('adminId', 'username email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Log.countDocuments({ adminId });

    res.json({
      logs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Ошибка при получении логов администратора:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получить статистику по действиям
 */
router.get('/stats/actions', authMiddleware, async (req, res) => {
  try {
    const stats = await Log.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    res.json(stats);
  } catch (error) {
    console.error('Ошибка при получении статистики:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получить статистику по целевым моделям
 */
router.get('/stats/targets', authMiddleware, async (req, res) => {
  try {
    const stats = await Log.aggregate([
      {
        $group: {
          _id: '$targetModel',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    res.json(stats);
  } catch (error) {
    console.error('Ошибка при получении статистики:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получить лог по ID
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const log = await Log.findById(id)
      .populate('adminId', 'username email')
      .populate('targetId');

    if (!log) {
      return res.status(404).json({ error: 'Лог не найден' });
    }

    res.json(log);
  } catch (error) {
    console.error('Ошибка при получении лога:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
