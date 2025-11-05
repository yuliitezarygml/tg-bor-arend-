const mongoose = require('mongoose');
require('dotenv').config();

const Console = require('../models/Console');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/console-rental');

    // Очистить коллекцию
    await Console.deleteMany({});

    // Добавить консоли
    const consoles = [
      {
        name: 'PlayStation 5',
        model: 'PS5 Standard',
        type: 'PlayStation',
        pricePerDay: 500,
        description: 'Последнее поколение Sony с отличной библиотекой игр',
        serialNumber: 'PS5-001'
      },
      {
        name: 'Xbox Series X',
        model: 'Xbox Series X',
        type: 'Xbox',
        pricePerDay: 550,
        description: 'Мощная консоль Microsoft с Game Pass',
        serialNumber: 'XBOX-001'
      },
      {
        name: 'Nintendo Switch',
        model: 'Nintendo Switch OLED',
        type: 'Nintendo',
        pricePerDay: 350,
        description: 'Портативная консоль для игр на ходу',
        serialNumber: 'NSW-001'
      },
      {
        name: 'PlayStation 4',
        model: 'PS4 Pro',
        type: 'PlayStation',
        pricePerDay: 350,
        description: 'Мощная версия PS4 с красивой графикой',
        serialNumber: 'PS4-001'
      },
      {
        name: 'Steam Deck',
        model: 'Steam Deck 512GB',
        type: 'Handheld',
        pricePerDay: 400,
        description: 'Портативный ПК для игр в библиотеке Steam',
        serialNumber: 'STEAM-001'
      }
    ];

    await Console.insertMany(consoles);
    console.log('✅ Консоли успешно добавлены в БД!');

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Ошибка при seeding:', err);
    process.exit(1);
  }
}

seed();
