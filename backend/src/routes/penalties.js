const express = require('express');
const Penalty = require('../models/Penalty');
const Rental = require('../models/Rental');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const NotificationService = require('../services/notificationService');
const Log = require('../models/Log');

const router = express.Router();

/**
 * Получить все штрафы (только админ)
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, userId, type } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (userId) filter.userId = userId;
    if (type) filter.type = type;

    const penalties = await Penalty.find(filter)
      .populate('userId', 'firstName lastName telegramId')
      .populate('rentalId')
      .populate('consoleId', 'name serialNumber')
      .populate('createdBy', 'username')
      .populate('approvedBy', 'username')
      .sort({ createdAt: -1 });

    res.json(penalties);
  } catch (error) {
    console.error('Ошибка при получении штрафов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получить штрафы пользователя
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const filter = { userId };
    if (status) filter.status = status;

    const penalties = await Penalty.find(filter)
      .populate('rentalId')
      .populate('consoleId', 'name')
      .sort({ createdAt: -1 });

    const totalAmount = penalties.reduce((sum, p) => {
      if (['pending', 'approved'].includes(p.status)) {
        return sum + p.amount;
      }
      return sum;
    }, 0);

    res.json({ penalties, totalPending: totalAmount });
  } catch (error) {
    console.error('Ошибка при получении штрафов пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Создать новый штраф (админ)
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { userId, rentalId, consoleId, type, description, amount, evidence } = req.body;

    if (!userId || !consoleId || !type || !amount) {
      return res.status(400).json({ error: 'Необходимы поля: userId, consoleId, type, amount' });
    }

    // Если rentalId предоставлен, проверяем уникальность штрафа
    if (rentalId) {
      const existingPenalty = await Penalty.findOne({
        rentalId,
        type,
        status: { $in: ['pending', 'approved'] },
      });

      if (existingPenalty) {
        return res.status(400).json({ error: 'Штраф за эту аренду уже существует' });
      }
    }

    const penalty = new Penalty({
      userId,
      rentalId: rentalId || null,
      consoleId,
      type,
      description: description || 'Штраф наложен администратором',
      amount,
      createdBy: req.user.id,
      evidence: evidence || {},
    });

    await penalty.save();

    // Логируем действие
    await Log.create({
      adminId: req.user.id,
      action: 'create_penalty',
      targetModel: 'Penalty',
      targetId: penalty._id,
      changes: penalty.toObject(),
      ipAddress: req.ip,
    });

    // Отправляем уведомление
    await NotificationService.sendPenaltyNotification(penalty);

    res.status(201).json(penalty);
  } catch (error) {
    console.error('Ошибка при создании штрафа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получить штраф по ID
 */
router.get('/:id', async (req, res) => {
  try {
    const penalty = await Penalty.findById(req.params.id)
      .populate('userId')
      .populate('rentalId')
      .populate('consoleId')
      .populate('createdBy', 'username')
      .populate('approvedBy', 'username');

    if (!penalty) {
      return res.status(404).json({ error: 'Штраф не найден' });
    }

    res.json(penalty);
  } catch (error) {
    console.error('Ошибка при получении штрафа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Одобрить штраф (админ)
 */
router.patch('/:id/approve', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const penalty = await Penalty.findById(id);

    if (!penalty) {
      return res.status(404).json({ error: 'Штраф не найден' });
    }

    if (penalty.status !== 'pending') {
      return res.status(400).json({ error: 'Штраф уже обработан' });
    }

    penalty.status = 'approved';
    penalty.approvedBy = req.user.id;
    penalty.approvedAt = new Date();

    await penalty.save();

    // Логируем действие
    await Log.create({
      adminId: req.user.id,
      action: 'approve_penalty',
      targetModel: 'Penalty',
      targetId: penalty._id,
      changes: { status: 'pending', newStatus: 'approved' },
      ipAddress: req.ip,
    });

    res.json({ message: 'Штраф одобрен', penalty });
  } catch (error) {
    console.error('Ошибка при одобрении штрафа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Отклонить/Аннулировать штраф (админ)
 */
router.patch('/:id/waive', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const penalty = await Penalty.findById(id);

    if (!penalty) {
      return res.status(404).json({ error: 'Штраф не найден' });
    }

    if (['paid', 'waived'].includes(penalty.status)) {
      return res.status(400).json({ error: 'Штраф уже обработан' });
    }

    penalty.status = 'waived';
    penalty.approvedBy = req.user.id;
    penalty.approvedAt = new Date();

    await penalty.save();

    // Логируем действие
    await Log.create({
      adminId: req.user.id,
      action: 'update_penalty',
      targetModel: 'Penalty',
      targetId: penalty._id,
      changes: { 
        status: penalty.status,
        reason: reason || 'Штраф аннулирован'
      },
      ipAddress: req.ip,
    });

    // Отправляем уведомление пользователю об аннулировании
    const user = await User.findById(penalty.userId);
    if (user) {
      await NotificationService.sendNotification(
        penalty.userId,
        'penalty_notice',
        '✅ Штраф аннулирован',
        `Штраф в размере ${penalty.amount} руб. был аннулирован.\n\nПричина: ${reason || 'Администратор аннулировал штраф'}`,
        { sendTelegram: true }
      );
    }

    res.json({ message: 'Штраф аннулирован', penalty });
  } catch (error) {
    console.error('Ошибка при аннулировании штрафа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Отметить штраф как оплаченный
 */
router.patch('/:id/mark-paid', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const penalty = await Penalty.findById(id);

    if (!penalty) {
      return res.status(404).json({ error: 'Штраф не найден' });
    }

    if (penalty.status === 'waived') {
      return res.status(400).json({ error: 'Аннулированный штраф нельзя отметить как оплаченный' });
    }

    penalty.status = 'paid';
    penalty.paidAt = new Date();

    await penalty.save();

    // Логируем действие
    await Log.create({
      adminId: req.user.id,
      action: 'update_penalty',
      targetModel: 'Penalty',
      targetId: penalty._id,
      changes: { status: 'pending', newStatus: 'paid' },
      ipAddress: req.ip,
    });

    res.json({ message: 'Штраф отмечен как оплаченный', penalty });
  } catch (error) {
    console.error('Ошибка при отметке штрафа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Обновить статус штрафа (админ)
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Необходимо указать статус' });
    }

    const validStatuses = ['pending', 'approved', 'paid', 'waived', 'disputed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Недопустимый статус. Допустимые: ${validStatuses.join(', ')}` });
    }

    const penalty = await Penalty.findById(id);

    if (!penalty) {
      return res.status(404).json({ error: 'Штраф не найден' });
    }

    const oldStatus = penalty.status;
    penalty.status = status;
    penalty.approvedBy = req.user.id;
    penalty.approvedAt = new Date();

    if (status === 'paid') {
      penalty.paidAt = new Date();
    }

    await penalty.save();

    // Логируем действие
    await Log.create({
      adminId: req.user.id,
      action: 'update_penalty',
      targetModel: 'Penalty',
      targetId: penalty._id,
      changes: { oldStatus, newStatus: status, reason: reason || '' },
      ipAddress: req.ip,
    });

    // Отправляем уведомление пользователю
    const statusMessages = {
      'approved': '✅ Штраф одобрен',
      'paid': '💳 Штраф отмечен как оплаченный',
      'waived': '✅ Штраф аннулирован',
      'disputed': '🔄 Штраф оспорен'
    };

    if (['approved', 'paid', 'waived', 'disputed'].includes(status)) {
      await NotificationService.sendNotification(
        penalty.userId,
        'penalty_notice',
        statusMessages[status],
        `Штраф в размере ${penalty.amount}L был ${status === 'approved' ? 'одобрен' : status === 'paid' ? 'оплачен' : status === 'waived' ? 'аннулирован' : 'оспорен'}.\n\n${reason ? 'Причина: ' + reason : ''}`,
        { sendTelegram: true }
      );
    }

    res.json({ message: `Статус штрафа изменен на ${status}`, penalty });
  } catch (error) {
    console.error('Ошибка при обновлении штрафа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получить статистику по штрафам
 */
router.get('/stats/overview', authMiddleware, async (req, res) => {
  try {
    const totalPenalties = await Penalty.countDocuments();
    const pendingPenalties = await Penalty.countDocuments({ status: 'pending' });
    const approvedPenalties = await Penalty.countDocuments({ status: 'approved' });
    const paidPenalties = await Penalty.countDocuments({ status: 'paid' });
    const waivedPenalties = await Penalty.countDocuments({ status: 'waived' });

    const totalAmount = await Penalty.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const paidAmount = await Penalty.aggregate([
      {
        $match: { status: 'paid' },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    res.json({
      totalPenalties,
      pendingPenalties,
      approvedPenalties,
      paidPenalties,
      waivedPenalties,
      totalAmount: totalAmount[0]?.total || 0,
      paidAmount: paidAmount[0]?.total || 0,
    });
  } catch (error) {
    console.error('Ошибка при получении статистики:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
