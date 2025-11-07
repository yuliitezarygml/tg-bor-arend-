const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const userController = require('../controllers/userController');

// Конфигурация multer для загрузки фото пользователей
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/users'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// GET всех пользователей
router.get('/', userController.getAllUsers);

// GET пользователя
router.get('/:id', userController.getUser);

// GET пользователя по Telegram ID
router.get('/telegram/:telegramId', userController.getUserByTelegramId);

// PUT обновить пользователя
router.put('/:id', upload.single('photo'), userController.updateUser);

module.exports = router;
