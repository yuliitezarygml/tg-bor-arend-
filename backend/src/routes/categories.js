const express = require('express');
const Category = require('../models/Category');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * Получить все категории
 */
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    console.error('Ошибка при получении категорий:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получить категорию по ID
 */
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    res.json(category);
  } catch (error) {
    console.error('Ошибка при получении категории:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Создать категорию (админ)
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, icon, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Имя категории обязательно' });
    }

    const slug = name.toLowerCase().replace(/\s+/g, '-');

    const category = new Category({
      name,
      slug,
      description,
      icon,
      color,
    });

    await category.save();

    res.status(201).json(category);
  } catch (error) {
    console.error('Ошибка при создании категории:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Обновить категорию (админ)
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color } = req.body;

    const category = await Category.findByIdAndUpdate(
      id,
      { name, description, icon, color },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    res.json(category);
  } catch (error) {
    console.error('Ошибка при обновлении категории:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Удалить категорию (админ)
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    res.json({ message: 'Категория удалена' });
  } catch (error) {
    console.error('Ошибка при удалении категории:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
