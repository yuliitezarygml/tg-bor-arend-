const express = require('express');
const router = express.Router();
const Discount = require('../models/Discount');
const History = require('../models/History');
const logger = require('../utils/logger');

// Получить все скидки
router.get('/', async (req, res) => {
  try {
    logger.debug('GET /discounts - получение всех скидок');
    const discounts = await Discount.find()
      .populate('consoleId', 'name')
      .sort({ date: -1 });
    logger.success('GET /discounts - успешно', { count: discounts.length });
    res.json(discounts);
  } catch (error) {
    logger.error('GET /discounts - ошибка', { error: error.message });
    res.status(500).json({ error: 'Ошибка при получении скидок' });
  }
});

// Получить скидку для конкретной даты
router.get('/check/:date', async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const consoleId = req.query.consoleId || null;
    
    const discount = await Discount.getDiscountForDate(date, consoleId);
    
    if (discount) {
      res.json({ discount: discount.percentage, description: discount.description });
    } else {
      res.json({ discount: 0, description: 'Нет скидки' });
    }
  } catch (error) {
    console.error('Ошибка при проверке скидки:', error);
    res.status(500).json({ error: 'Ошибка при проверке скидки' });
  }
});

// Получить скидки на месяц
router.get('/month/:year/:month', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    const discounts = await Discount.find({
      date: { $gte: startDate, $lte: endDate }
    });
    
    res.json(discounts);
  } catch (error) {
    console.error('Ошибка при получении скидок на месяц:', error);
    res.status(500).json({ error: 'Ошибка при получении скидок на месяц' });
  }
});

// Создать скидку
router.post('/', async (req, res) => {
  try {
    logger.info('POST /discounts - создание новой скидки', { 
      date: req.body.date, 
      percentage: req.body.percentage 
    });
    
    const { date, percentage, description, consoleId, isGlobal } = req.body;
    
    if (!date || percentage === undefined) {
      logger.warn('POST /discounts - отсутствуют обязательные параметры');
      return res.status(400).json({ error: 'Дата и процент скидки обязательны' });
    }
    
    if (percentage < 0 || percentage > 100) {
      logger.warn('POST /discounts - неправильный процент', { percentage });
      return res.status(400).json({ error: 'Процент скидки должен быть от 0 до 100' });
    }
    
    const discount = new Discount({
      date: new Date(date),
      percentage,
      description,
      consoleId: consoleId || null,
      isGlobal: isGlobal !== false
    });
    
    await discount.save();
    
    // Логирование в историю
    await History.create({
      action: 'create',
      type: 'discount',
      itemId: discount._id,
      itemName: `Скидка ${percentage}% на ${new Date(date).toLocaleDateString('ru-RU')}`,
      changes: req.body
    });
    
    logger.success('POST /discounts - скидка создана', { 
      id: discount._id, 
      percentage, 
      date 
    });
    res.status(201).json(discount);
  } catch (error) {
    logger.error('POST /discounts - ошибка создания', { 
      error: error.message,
      date: req.body.date,
      percentage: req.body.percentage
    });
    res.status(500).json({ error: 'Ошибка при создании скидки' });
  }
});

// Обновить скидку
router.put('/:id', async (req, res) => {
  try {
    const oldDiscount = await Discount.findById(req.params.id);
    
    const discount = await Discount.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!discount) {
      return res.status(404).json({ error: 'Скидка не найдена' });
    }
    
    // Логирование в историю
    await History.create({
      action: 'update',
      type: 'discount',
      itemId: discount._id,
      itemName: `Скидка ${discount.percentage}% на ${new Date(discount.date).toLocaleDateString('ru-RU')}`,
      changes: req.body,
      oldData: oldDiscount.toObject(),
      newData: discount.toObject()
    });
    
    res.json(discount);
  } catch (error) {
    console.error('Ошибка при обновлении скидки:', error);
    res.status(500).json({ error: 'Ошибка при обновлении скидки' });
  }
});

// Удалить скидку
router.delete('/:id', async (req, res) => {
  try {
    const discount = await Discount.findByIdAndDelete(req.params.id);
    
    if (!discount) {
      return res.status(404).json({ error: 'Скидка не найдена' });
    }
    
    // Логирование в историю
    await History.create({
      action: 'delete',
      type: 'discount',
      itemId: discount._id,
      itemName: `Скидка ${discount.percentage}% на ${new Date(discount.date).toLocaleDateString('ru-RU')}`,
      oldData: discount.toObject()
    });
    
    res.json({ success: true, message: 'Скидка удалена' });
  } catch (error) {
    console.error('Ошибка при удалении скидки:', error);
    res.status(500).json({ error: 'Ошибка при удалении скидки' });
  }
});

module.exports = router;
