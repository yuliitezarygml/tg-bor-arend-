const express = require('express');
const router = express.Router();
const Console = require('../models/Console');
const logger = require('../utils/logger');

// Получить все консоли
router.get('/', async (req, res) => {
  try {
    logger.debug('GET /consoles - получение всех консолей');
    const consoles = await Console.find();
    logger.success('GET /consoles - успешно загружено', { count: consoles.length });
    res.json(consoles);
  } catch (err) {
    logger.error('GET /consoles - ошибка', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Получить доступные консоли
router.get('/available', async (req, res) => {
  try {
    logger.debug('GET /consoles/available - получение доступных консолей');
    const consoles = await Console.find({ status: 'available' });
    logger.success('GET /consoles/available - успешно', { count: consoles.length });
    res.json(consoles);
  } catch (err) {
    logger.error('GET /consoles/available - ошибка', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Получить консоль по ID
router.get('/:id', async (req, res) => {
  try {
    const console = await Console.findById(req.params.id);
    if (!console) return res.status(404).json({ error: 'Консоль не найдена' });
    res.json(console);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Создать консоль (админ)
router.post('/', async (req, res) => {
  try {
    const newConsole = new Console(req.body);
    await newConsole.save();
    res.status(201).json(newConsole);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Обновить консоль (админ)
router.put('/:id', async (req, res) => {
  try {
    const console = await Console.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(console);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Удалить консоль (админ)
router.delete('/:id', async (req, res) => {
  try {
    await Console.findByIdAndDelete(req.params.id);
    res.json({ message: 'Консоль удалена' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
