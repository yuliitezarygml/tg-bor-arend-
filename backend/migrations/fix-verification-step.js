// Скрипт для миграции: установка verificationStep для существующих пользователей
// Запустить: node migrations/fix-verification-step.js

const mongoose = require('mongoose');
const User = require('../src/models/User');

async function fixVerificationStep() {
  try {
    // Подключаемся к MongoDB
    await mongoose.connect('mongodb://localhost:27017/console-rental');
    console.log('✅ Подключено к MongoDB');

    // Обновляем всех пользователей, у которых verificationStep не установлен
    const result = await User.updateMany(
      {
        $or: [
          { verificationStep: { $exists: false } },
          { verificationStep: null },
          { verificationStep: '' }
        ]
      },
      {
        $set: { verificationStep: 'none' }
      }
    );

    console.log(`✅ Обновлено пользователей: ${result.modifiedCount}`);

    // Проверяем результат
    const users = await User.find({});
    console.log('\n📊 Статистика пользователей:');
    
    const stats = {
      none: 0,
      passport_front: 0,
      passport_back: 0,
      selfie: 0,
      completed: 0
    };

    users.forEach(user => {
      const step = user.verificationStep || 'none';
      stats[step] = (stats[step] || 0) + 1;
    });

    console.log('none (не верифицирован):', stats.none);
    console.log('passport_front:', stats.passport_front);
    console.log('passport_back:', stats.passport_back);
    console.log('selfie:', stats.selfie);
    console.log('completed (верифицирован):', stats.completed);

    await mongoose.disconnect();
    console.log('\n✅ Миграция завершена');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    process.exit(1);
  }
}

fixVerificationStep();
