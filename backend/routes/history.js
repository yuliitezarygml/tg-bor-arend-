const express = require('express');
const router = express.Router();
const History = require('../models/History');
const Console = require('../models/Console');
const Rental = require('../models/Rental');
const logger = require('../utils/logger');

// Получить всю историю
router.get('/', async (req, res) => {
  try {
    logger.debug('GET /history - fetching all history records');
    
    const history = await History.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    
    logger.success('GET /history - history records retrieved', { count: history.length });
    res.json(history);
  } catch (error) {
    logger.error('GET /history - error fetching history', { error: error.message });
    res.status(500).json({ error: 'Ошибка при получении истории' });
  }
});

// Получить историю по типу
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    logger.debug('GET /history/type/:type - fetching history by type', { type });
    
    const history = await History.find({ type })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    logger.success('GET /history/type/:type - history records retrieved', {
      type,
      count: history.length
    });
    res.json(history);
  } catch (error) {
    logger.error('GET /history/type/:type - error fetching history', {
      type: req.params.type,
      error: error.message
    });
    res.status(500).json({ error: 'Ошибка при получении истории' });
  }
});

// Откатить изменение
router.post('/:id/revert', async (req, res) => {
  try {
    const { id } = req.params;
    logger.info('POST /history/:id/revert - reverting history record', { historyId: id });
    
    const history = await History.findById(id);

    if (!history) {
      logger.warn('POST /history/:id/revert - history record not found', { historyId: id });
      return res.status(404).json({ error: 'История не найдена' });
    }

    if (history.action === 'update' && history.oldData) {
      logger.debug('POST /history/:id/revert - reverting update action', {
        historyId: id,
        type: history.type,
        itemId: history.itemId
      });

      // Откатить обновление
      if (history.type === 'console') {
        await Console.findByIdAndUpdate(history.itemId, history.oldData);
      } else if (history.type === 'rental') {
        await Rental.findByIdAndUpdate(history.itemId, history.oldData);
      }

      // Записать откат в историю
      await History.create({
        action: 'update',
        type: history.type,
        itemId: history.itemId,
        itemName: history.itemName,
        description: 'Откат предыдущего изменения',
        changes: { reverted: true, originalId: id }
      });

      logger.success('POST /history/:id/revert - update reverted successfully', {
        historyId: id,
        type: history.type,
        itemId: history.itemId
      });

      res.json({ success: true, message: 'Изменение успешно отменено' });
    } else if (history.action === 'delete' && history.oldData) {
      logger.debug('POST /history/:id/revert - reverting delete action (restore)', {
        historyId: id,
        type: history.type,
        itemId: history.itemId
      });

      // Восстановить удалённый объект
      if (history.type === 'console') {
        await Console.create(history.oldData);
      } else if (history.type === 'rental') {
        await Rental.create(history.oldData);
      }

      // Записать восстановление в историю
      await History.create({
        action: 'create',
        type: history.type,
        itemId: history.itemId,
        itemName: history.itemName,
        description: 'Восстановление удалённого объекта',
        changes: { restored: true, originalId: id }
      });

      logger.success('POST /history/:id/revert - object restored successfully', {
        historyId: id,
        type: history.type,
        itemId: history.itemId
      });

      res.json({ success: true, message: 'Объект успешно восстановлен' });
    } else {
      logger.warn('POST /history/:id/revert - action cannot be reverted', {
        historyId: id,
        action: history.action
      });
      res.status(400).json({ error: 'Это действие не может быть отменено' });
    }
  } catch (error) {
    logger.error('POST /history/:id/revert - error reverting history', {
      historyId: req.params.id,
      error: error.message
    });
    res.status(500).json({ error: 'Ошибка при откате' });
  }
});

// Сохранить событие в историю (вспомогательный метод)
router.post('/log', async (req, res) => {
  try {
    logger.info('POST /history/log - recording history event', {
      action: req.body.action,
      type: req.body.type,
      itemName: req.body.itemName
    });
    
    const history = await History.create(req.body);
    
    logger.success('POST /history/log - history event recorded', {
      historyId: history._id,
      action: history.action,
      type: history.type
    });
    
    res.json(history);
  } catch (error) {
    logger.error('POST /history/log - error recording history event', {
      action: req.body.action,
      type: req.body.type,
      error: error.message
    });
    res.status(500).json({ error: 'Ошибка при сохранении истории' });
  }
});

module.exports = router;
