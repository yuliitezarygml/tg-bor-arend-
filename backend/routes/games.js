const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const History = require('../models/History');
const logger = require('../utils/logger');

// Получить все игры
router.get('/', async (req, res) => {
  try {
    logger.debug('GET /games - получение всех игр');
    const games = await Game.find().sort({ title: 1 });
    logger.success('GET /games - успешно', { count: games.length });
    res.json(games);
  } catch (error) {
    logger.error('GET /games - ошибка', { error: error.message });
    res.status(500).json({ error: 'Ошибка при получении игр' });
  }
});

// Получить игру по ID
router.get('/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ error: 'Игра не найдена' });
    }
    res.json(game);
  } catch (error) {
    console.error('Ошибка при получении игры:', error);
    res.status(500).json({ error: 'Ошибка при получении игры' });
  }
});

// Создать новую игру
router.post('/', async (req, res) => {
  try {
    logger.info('POST /games - создание новой игры', { title: req.body.title });
    const game = new Game(req.body);
    await game.save();

    // Логирование в историю
    await History.create({
      action: 'create',
      type: 'game',
      itemId: game._id,
      itemName: game.title,
      changes: req.body
    });

    logger.success('POST /games - игра создана', { id: game._id, title: game.title });
    res.status(201).json(game);
  } catch (error) {
    logger.error('POST /games - ошибка создания', { error: error.message, title: req.body.title });
    res.status(500).json({ error: 'Ошибка при создании игры' });
  }
});

// Обновить игру
router.put('/:id', async (req, res) => {
  try {
    const oldGame = await Game.findById(req.params.id);
    const game = await Game.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!game) {
      return res.status(404).json({ error: 'Игра не найдена' });
    }

    // Логирование в историю
    await History.create({
      action: 'update',
      type: 'game',
      itemId: game._id,
      itemName: game.title,
      changes: req.body,
      oldData: oldGame.toObject(),
      newData: game.toObject()
    });

    res.json(game);
  } catch (error) {
    console.error('Ошибка при обновлении игры:', error);
    res.status(500).json({ error: 'Ошибка при обновлении игры' });
  }
});

// Удалить игру
router.delete('/:id', async (req, res) => {
  try {
    const game = await Game.findByIdAndDelete(req.params.id);

    if (!game) {
      return res.status(404).json({ error: 'Игра не найдена' });
    }

    // Логирование в историю
    await History.create({
      action: 'delete',
      type: 'game',
      itemId: game._id,
      itemName: game.title,
      oldData: game.toObject()
    });

    res.json({ success: true, message: 'Игра удалена' });
  } catch (error) {
    console.error('Ошибка при удалении игры:', error);
    res.status(500).json({ error: 'Ошибка при удалении игры' });
  }
});

// Поиск по названию
router.get('/search/:query', async (req, res) => {
  try {
    const games = await Game.find({
      title: { $regex: req.params.query, $options: 'i' }
    });
    res.json(games);
  } catch (error) {
    console.error('Ошибка при поиске:', error);
    res.status(500).json({ error: 'Ошибка при поиске' });
  }
});

module.exports = router;
