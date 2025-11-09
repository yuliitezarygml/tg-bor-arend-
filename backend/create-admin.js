const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const Admin = require('./src/models/Admin');

const createAdmin = async () => {
  try {
    // Подключаемся к БД
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Подключено к MongoDB');

    // Проверяем есть ли уже админ
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('⚠️ Админ "admin" уже существует');
      
      // Обновляем пароль
      existingAdmin.password = 'admin123';
      existingAdmin.isActive = true;
      await existingAdmin.save();
      console.log('✅ Пароль обновлён: admin123');
      
      await mongoose.disconnect();
      return;
    }

    // Создаём админа (пароль будет хеширован в pre save hook)
    const admin = new Admin({
      username: 'admin',
      password: 'admin123',
      email: 'admin@ps4rental.com',
      role: 'superadmin',
      isActive: true,
    });

    await admin.save();
    console.log('✅ Админ создан успешно!');
    console.log('   Username: admin');
    console.log('   Password: admin123');

    // Закрываем подключение
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
};

createAdmin();
