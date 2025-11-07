const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const consoleController = require('../controllers/consoleController');

// Конфигурация multer для загрузки фото консолей
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/consoles'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// GET все консоли
router.get('/', consoleController.getAllConsoles);

// GET одну консоль
router.get('/:id', consoleController.getConsole);

// POST новую консоль
router.post('/', upload.single('image'), consoleController.createConsole);

// PUT обновить консоль
router.put('/:id', upload.single('image'), consoleController.updateConsole);

// DELETE удалить консоль
router.delete('/:id', consoleController.deleteConsole);

module.exports = router;
