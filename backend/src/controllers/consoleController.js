const Console = require('../models/Console');
const fs = require('fs');
const path = require('path');

// Получить все консоли
exports.getAllConsoles = async (req, res) => {
  try {
    const consoles = await Console.find();
    res.json(consoles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Получить одну консоль
exports.getConsole = async (req, res) => {
  try {
    const console = await Console.findById(req.params.id);
    if (!console) {
      return res.status(404).json({ message: 'Консоль не найдена' });
    }
    res.json(console);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Создать консоль
exports.createConsole = async (req, res) => {
  const { name, model, game, rentalPrice, description, location } = req.body;

  const newConsole = new Console({
    name,
    model,
    game,
    rentalPrice,
    description,
    location,
    image: req.file ? `/uploads/consoles/${req.file.filename}` : null,
  });

  try {
    const savedConsole = await newConsole.save();
    res.status(201).json(savedConsole);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Обновить консоль
exports.updateConsole = async (req, res) => {
  try {
    const console = await Console.findById(req.params.id);
    if (!console) {
      return res.status(404).json({ message: 'Консоль не найдена' });
    }

    if (req.body.name) console.name = req.body.name;
    if (req.body.model) console.model = req.body.model;
    if (req.body.game) console.game = req.body.game;
    if (req.body.rentalPrice) console.rentalPrice = req.body.rentalPrice;
    if (req.body.description) console.description = req.body.description;
    if (req.body.location) console.location = req.body.location;
    if (req.body.status) console.status = req.body.status;

    if (req.file) {
      // Удалить старое изображение
      if (console.image) {
        const oldImagePath = path.join(
          __dirname,
          '../../',
          console.image
        );
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      console.image = `/uploads/consoles/${req.file.filename}`;
    }

    const updatedConsole = await console.save();
    res.json(updatedConsole);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Удалить консоль
exports.deleteConsole = async (req, res) => {
  try {
    const console = await Console.findById(req.params.id);
    if (!console) {
      return res.status(404).json({ message: 'Консоль не найдена' });
    }

    // Удалить изображение
    if (console.image) {
      const imagePath = path.join(__dirname, '../../', console.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Console.findByIdAndDelete(req.params.id);
    res.json({ message: 'Консоль удалена' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
