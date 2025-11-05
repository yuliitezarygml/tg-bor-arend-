const express = require('express');
const router = express.Router();
const Rental = require('../models/Rental');
const Console = require('../models/Console');
const logger = require('../utils/logger');

// Получить все аренды
router.get('/', async (req, res) => {
  try {
    logger.debug('GET /rentals - fetching all rentals');
    
    const rentals = await Rental.find()
      .populate('userId')
      .populate('consoleId');
    
    logger.success('GET /rentals - all rentals retrieved', { count: rentals.length });
    res.json(rentals);
  } catch (err) {
    logger.error('GET /rentals - error fetching rentals', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Получить активные аренды пользователя
router.get('/user/:userId', async (req, res) => {
  try {
    logger.debug('GET /rentals/user/:userId - fetching user rentals', { userId: req.params.userId });
    
    const rentals = await Rental.find({ userId: req.params.userId })
      .populate('consoleId');
    
    logger.success('GET /rentals/user/:userId - user rentals retrieved', {
      userId: req.params.userId,
      count: rentals.length
    });
    res.json(rentals);
  } catch (err) {
    logger.error('GET /rentals/user/:userId - error fetching user rentals', {
      userId: req.params.userId,
      error: err.message
    });
    res.status(500).json({ error: err.message });
  }
});

// Создать аренду
router.post('/', async (req, res) => {
  try {
    const { userId, consoleId, days } = req.body;
    
    logger.info('POST /rentals - creating new rental', { userId, consoleId, days });
    
    // Получить информацию о консоли
    const console = await Console.findById(consoleId);
    if (!console) {
      logger.warn('POST /rentals - console not found', { consoleId });
      return res.status(404).json({ error: 'Консоль не найдена' });
    }
    
    // Проверить доступность
    if (console.status !== 'available') {
      logger.warn('POST /rentals - console not available', {
        consoleId,
        currentStatus: console.status
      });
      return res.status(400).json({ error: 'Консоль недоступна' });
    }
    
    // Рассчитать цену
    const totalPrice = console.pricePerDay * days;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    
    logger.debug('POST /rentals - price calculated', {
      consoleId,
      pricePerDay: console.pricePerDay,
      days,
      totalPrice
    });
    
    // Создать аренду
    const rental = new Rental({
      userId,
      consoleId,
      days,
      totalPrice,
      endDate,
      status: 'active'
    });
    
    await rental.save();
    
    logger.info('POST /rentals - rental saved to database', {
      rentalId: rental._id,
      userId,
      consoleId,
      totalPrice
    });
    
    // Обновить статус консоли
    console.status = 'rented';
    await console.save();
    
    logger.success('POST /rentals - rental created successfully', {
      rentalId: rental._id,
      userId,
      consoleId,
      consoleName: console.name,
      days,
      totalPrice
    });
    
    res.status(201).json(rental);
  } catch (err) {
    logger.error('POST /rentals - error creating rental', {
      userId: req.body.userId,
      consoleId: req.body.consoleId,
      days: req.body.days,
      error: err.message
    });
    res.status(500).json({ error: err.message });
  }
});

// Завершить аренду
router.put('/:id/complete', async (req, res) => {
  try {
    logger.info('PUT /rentals/:id/complete - completing rental', { rentalId: req.params.id });
    
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      logger.warn('PUT /rentals/:id/complete - rental not found', { rentalId: req.params.id });
      return res.status(404).json({ error: 'Аренда не найдена' });
    }
    
    rental.status = 'completed';
    await rental.save();
    
    logger.debug('PUT /rentals/:id/complete - rental status updated', {
      rentalId: req.params.id,
      newStatus: 'completed'
    });
    
    // Обновить статус консоли
    const console = await Console.findById(rental.consoleId);
    console.status = 'available';
    await console.save();
    
    logger.success('PUT /rentals/:id/complete - rental completed successfully', {
      rentalId: req.params.id,
      consoleId: rental.consoleId,
      consoleName: console.name,
      userId: rental.userId
    });
    
    res.json(rental);
  } catch (err) {
    logger.error('PUT /rentals/:id/complete - error completing rental', {
      rentalId: req.params.id,
      error: err.message
    });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
