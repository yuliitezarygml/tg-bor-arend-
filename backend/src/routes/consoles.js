const express = require('express');
const Console = require('../models/Console');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const QRCodeService = require('../services/qrService');

const router = express.Router();

// Получить все консоли
router.get('/', async (req, res) => {
  try {
    const consoles = await Console.find();
    res.json(consoles);
  } catch (error) {
    console.error('Ошибка при получении консолей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить консоль по ID
router.get('/:id', async (req, res) => {
  try {
    const console = await Console.findById(req.params.id);

    if (!console) {
      return res.status(404).json({ error: 'Консоль не найдена' });
    }

    res.json(console);
  } catch (error) {
    console.error('Ошибка при получении консоли:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать новую консоль
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { serialNumber, pricePerDay, description, condition } = req.body;

    if (!serialNumber || !pricePerDay) {
      return res.status(400).json({ error: 'Необходимо указать serialNumber и pricePerDay' });
    }

    const existingConsole = await Console.findOne({ serialNumber });

    if (existingConsole) {
      return res.status(400).json({ error: 'Консоль с таким серийным номером уже существует' });
    }

    const newConsole = new Console({
      serialNumber,
      pricePerDay,
      description,
      condition,
    });

    await newConsole.save();

    res.status(201).json(newConsole);
  } catch (error) {
    console.error('Ошибка при создании консоли:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить консоль
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { status, pricePerDay, description, condition } = req.body;

    const console = await Console.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status,
          pricePerDay,
          description,
          condition,
        },
      },
      { new: true }
    );

    if (!console) {
      return res.status(404).json({ error: 'Консоль не найдена' });
    }

    res.json(console);
  } catch (error) {
    console.error('Ошибка при обновлении консоли:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить консоль
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const console = await Console.findByIdAndDelete(req.params.id);

    if (!console) {
      return res.status(404).json({ error: 'Консоль не найдена' });
    }

    res.json({ message: 'Консоль удалена' });
  } catch (error) {
    console.error('Ошибка при удалении консоли:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить доступные консоли
router.get('/available/list', async (req, res) => {
  try {
    const consoles = await Console.find({ status: 'available' });
    res.json(consoles);
  } catch (error) {
    console.error('Ошибка при получении доступных консолей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Загрузить фото консоли
router.post('/:id/upload-images', authMiddleware, upload.array('consoleImages', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Файлы не загружены' });
    }

    const console = await Console.findById(req.params.id);
    if (!console) {
      return res.status(404).json({ error: 'Консоль не найдена' });
    }

    const imagePaths = req.files.map((file) => `/uploads/consoles/${file.filename}`);

    if (!console.images) {
      console.images = [];
    }

    console.images.push(...imagePaths);
    await console.save();

    res.json({
      success: true,
      message: 'Фото успешно загружены',
      images: console.images,
    });
  } catch (error) {
    console.error('Ошибка при загрузке фото:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить фото консоли
router.delete('/:id/images/:imageName', authMiddleware, async (req, res) => {
  try {
    const console = await Console.findById(req.params.id);
    if (!console) {
      return res.status(404).json({ error: 'Консоль не найдена' });
    }

    const imageToRemove = `/uploads/consoles/${req.params.imageName}`;
    console.images = console.images.filter((img) => img !== imageToRemove);

    await console.save();

    res.json({
      success: true,
      message: 'Фото удалено',
      images: console.images,
    });
  } catch (error) {
    console.error('Ошибка при удалении фото:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить QR-код консоли
router.get('/:id/qr-code', async (req, res) => {
  try {
    const qrCode = await QRCodeService.getQRCode(req.params.id);

    res.json({
      success: true,
      qrCode,
    });
  } catch (error) {
    console.error('Ошибка при получении QR-кода:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Сгенерировать QR-код консоли
router.post('/:id/generate-qr', authMiddleware, async (req, res) => {
  try {
    const qrCode = await QRCodeService.regenerateQRCode(req.params.id);

    res.json({
      success: true,
      message: 'QR-код сгенерирован',
      qrCode,
    });
  } catch (error) {
    console.error('Ошибка при генерации QR-кода:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Сгенерировать QR-коды для всех консолей без QR
router.post('/generate-qr/all', authMiddleware, async (req, res) => {
  try {
    const result = await QRCodeService.generateQRCodesForAll();

    res.json({
      success: true,
      message: 'QR-коды сгенерированы',
      ...result,
    });
  } catch (error) {
    console.error('Ошибка при генерации QR-кодов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
