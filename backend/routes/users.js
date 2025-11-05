const express = require('express');
const router = express.Router();
const User = require('../models/User');
const logger = require('../utils/logger');

// Получить всех пользователей (админ)
router.get('/', async (req, res) => {
  try {
    logger.debug('GET /users - fetching all users');
    
    const users = await User.find();
    
    logger.success('GET /users - all users retrieved', { count: users.length });
    res.json(users);
  } catch (err) {
    logger.error('GET /users - error fetching users', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Получить пользователя по Telegram ID
router.get('/telegram/:telegramId', async (req, res) => {
  try {
    logger.debug('GET /users/telegram/:telegramId - fetching user by telegram ID', {
      telegramId: req.params.telegramId
    });
    
    const user = await User.findOne({ telegramId: req.params.telegramId });
    if (!user) {
      logger.warn('GET /users/telegram/:telegramId - user not found', {
        telegramId: req.params.telegramId
      });
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    logger.success('GET /users/telegram/:telegramId - user retrieved', {
      telegramId: req.params.telegramId,
      userId: user._id,
      userName: `${user.firstName} ${user.lastName}`
    });
    res.json(user);
  } catch (err) {
    logger.error('GET /users/telegram/:telegramId - error fetching user', {
      telegramId: req.params.telegramId,
      error: err.message
    });
    res.status(500).json({ error: err.message });
  }
});

// Создать пользователя
router.post('/', async (req, res) => {
  try {
    logger.info('POST /users - creating new user', {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      telegramId: req.body.telegramId
    });
    
    const newUser = new User(req.body);
    await newUser.save();
    
    logger.success('POST /users - user created successfully', {
      userId: newUser._id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      telegramId: newUser.telegramId
    });
    
    res.status(201).json(newUser);
  } catch (err) {
    logger.error('POST /users - error creating user', {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      telegramId: req.body.telegramId,
      error: err.message
    });
    res.status(500).json({ error: err.message });
  }
});

// Обновить пользователя
router.put('/:id', async (req, res) => {
  try {
    logger.info('PUT /users/:id - updating user', { userId: req.params.id });
    
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    logger.success('PUT /users/:id - user updated successfully', {
      userId: req.params.id,
      firstName: user.firstName,
      lastName: user.lastName
    });
    
    res.json(user);
  } catch (err) {
    logger.error('PUT /users/:id - error updating user', {
      userId: req.params.id,
      error: err.message
    });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
