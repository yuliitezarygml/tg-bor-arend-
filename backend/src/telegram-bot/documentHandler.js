const User = require('../models/User');
const path = require('path');
const fs = require('fs').promises;
const { verifyPassportPhoto, verifyAllDocuments, generateVerificationReport } = require('../utils/documentVerification');

const PASSPORT_DIR = path.join(__dirname, '../../uploads/passports');

// Создаем папку для паспортов
async function ensurePassportDir() {
  try {
    await fs.mkdir(PASSPORT_DIR, { recursive: true });
  } catch (error) {
    console.error('Ошибка создания папки паспортов:', error);
  }
}

ensurePassportDir();

/**
 * Сохранение фото документа
 */
async function savePhotoDocument(bot, fileId, userId, documentType) {
  try {
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

    // Скачиваем файл
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();

    // Сохраняем файл
    const fileName = `${userId}_${documentType}.jpg`;
    const filePath = path.join(PASSPORT_DIR, fileName);

    await fs.writeFile(filePath, Buffer.from(buffer));

    console.log(`✅ Документ сохранен: ${fileName}`);
    return `/uploads/passports/${fileName}`;
  } catch (error) {
    console.error('Ошибка сохранения документа:', error);
    throw error;
  }
}

/**
 * Обработчик фото документов
 */
async function handlePhotoDocument(bot, msg) {
  const userId = msg.from.id.toString();
  const photo = msg.photo[msg.photo.length - 1]; // Наибольшее разрешение

  try {
    const user = await User.findOne({ telegramId: userId });

    if (!user || user.registrationStep !== 'completed') {
      await bot.sendMessage(
        msg.chat.id,
        '❌ Сначала завершите регистрацию, используя /start'
      );
      return;
    }

    // Определяем какой документ загружается
    let documentType = '';
    let nextStep = '';
    let message = '';

    if (user.verificationStep === 'none' || user.verificationStep === 'passport_front') {
      documentType = 'passport_front';
      nextStep = 'passport_back';
      message =
        '✅ <b>Фото лицевой стороны паспорта сохранено!</b>\n\n' +
        '<b>Шаг 2 из 3:</b> Теперь отправьте фото <b>ОБРАТНОЙ</b> стороны паспорта\n\n' +
        '⚠️ <b>Требования к фото:</b>\n' +
        '• Четкое изображение без бликов\n' +
        '• Все данные должны быть читаемыми\n' +
        '• Фото целиком, без обрезанных краев\n\n' +
        '📷 Отправьте фото как обычное изображение';
    } else if (user.verificationStep === 'passport_back') {
      documentType = 'passport_back';
      nextStep = 'selfie';
      message =
        '✅ <b>Фото обратной стороны паспорта сохранено!</b>\n\n' +
        '<b>Шаг 3 из 3:</b> Теперь отправьте <b>СЕЛФИ с паспортом</b>\n\n' +
        '⚠️ <b>Требования к селфи:</b>\n' +
        '• Ваше лицо и паспорт должны быть четко видны\n' +
        '• Держите паспорт открытым на странице с фото\n' +
        '• Хорошее освещение\n' +
        '• Смотрите в камеру\n\n' +
        '📷 Отправьте селфи как обычное изображение';
    } else if (user.verificationStep === 'selfie') {
      documentType = 'selfie';
      nextStep = 'completed';
      message =
        '✅ <b>Селфи с паспортом сохранено!</b>\n\n' +
        '🎉 <b>Верификация документов завершена!</b>\n\n' +
        'Теперь вы можете арендовать консоли!';
    } else {
      await bot.sendMessage(
        msg.chat.id,
        '✅ Вы уже прошли верификацию!'
      );
      return;
    }

    // Сохраняем фото
    const photoPath = await savePhotoDocument(bot, photo.file_id, userId, documentType);

    // 🔍 АВТОМАТИЧЕСКАЯ ПРОВЕРКА ДОКУМЕНТА
    let verificationPassed = true;
    let verificationMessage = '';
    
    try {
      const verificationResult = await verifyPassportPhoto(photoPath, documentType);
      
      if (!verificationResult.passed) {
        verificationPassed = false;
        verificationMessage = 
          '❌ <b>Фото не прошло автоматическую проверку</b>\n\n' +
          '<b>Обнаруженные проблемы:</b>\n';
        
        if (!verificationResult.quality.passed) {
          verificationMessage += `• Качество изображения: ${verificationResult.quality.message}\n`;
        }
        if (!verificationResult.text.passed) {
          verificationMessage += `• Распознавание текста: ${verificationResult.text.message}\n`;
        }
        if (!verificationResult.face.passed) {
          verificationMessage += `• Обнаружение лица: ${verificationResult.face.message}\n`;
        }
        
        verificationMessage += 
          '\n<b>Пожалуйста, загрузите фото повторно:</b>\n' +
          '• Убедитесь в хорошем освещении\n' +
          '• Сфотографируйте документ четко и полностью\n' +
          '• Избегайте бликов и размытия\n' +
          '• Разрешение должно быть не менее 800x600\n\n' +
          '📷 Отправьте новое фото';
        
        await bot.sendMessage(msg.chat.id, verificationMessage, { parse_mode: 'HTML' });
        return; // Прерываем процесс, не сохраняем в БД
      }
    } catch (error) {
      console.error('Ошибка проверки документа:', error);
      // Продолжаем даже если проверка не удалась (для отказоустойчивости)
    }

    // Обновляем пользователя только если проверка пройдена
    const updateData = {
      verificationStep: nextStep,
    };

    if (documentType === 'passport_front') {
      updateData.passportFrontPhoto = photoPath;
    } else if (documentType === 'passport_back') {
      updateData.passportBackPhoto = photoPath;
    } else if (documentType === 'selfie') {
      updateData.selfiePhoto = photoPath;
      updateData.verifiedAt = new Date();
    }

    await User.findOneAndUpdate({ telegramId: userId }, updateData);

    await bot.sendMessage(msg.chat.id, message, { parse_mode: 'HTML' });

    if (nextStep === 'completed') {
      // 🔍 ПОЛНАЯ ПРОВЕРКА ВСЕХ ДОКУМЕНТОВ
      try {
        const updatedUser = await User.findOne({ telegramId: userId });
        const fullVerificationResult = await verifyAllDocuments(
          userId,
          updatedUser.passportFrontPhoto,
          updatedUser.passportBackPhoto,
          updatedUser.selfiePhoto
        );
        
        // Определяем статус на основе уверенности
        let verificationStatus = 'manual_review'; // по умолчанию
        if (fullVerificationResult.overallConfidence >= 80) {
          verificationStatus = 'auto_approved';
        } else if (fullVerificationResult.overallConfidence < 40) {
          verificationStatus = 'rejected';
        }
        
        // Сохраняем результаты в базу данных
        await User.findOneAndUpdate(
          { telegramId: userId },
          {
            verificationResults: fullVerificationResult,
            verificationConfidence: fullVerificationResult.overallConfidence,
            verificationStatus: verificationStatus,
          }
        );
        
        // Генерируем отчет для администратора
        const verificationReport = generateVerificationReport(fullVerificationResult);
        
        // Уведомление администратору с результатами проверки
        const adminChatId = process.env.ADMIN_CHAT_ID;
        if (adminChatId) {
          const confidenceEmoji = fullVerificationResult.overallConfidence >= 80 ? '✅' : 
                                 fullVerificationResult.overallConfidence >= 60 ? '⚠️' : '❌';
          
          const statusText = verificationStatus === 'auto_approved' ? '✅ АВТОМАТИЧЕСКИ ОДОБРЕНО' :
                           verificationStatus === 'rejected' ? '❌ РЕКОМЕНДУЕТСЯ ОТКЛОНИТЬ' :
                           '⚠️ ТРЕБУЕТСЯ РУЧНАЯ ПРОВЕРКА';
          
          const adminMessage = 
            `${confidenceEmoji} <b>ВЕРИФИКАЦИЯ ДОКУМЕНТОВ</b>\n\n` +
            `👤 ${updatedUser.firstName} ${updatedUser.lastName}\n` +
            `📱 ${updatedUser.phoneNumber}\n` +
            `🆔 ID: <code>${userId}</code>\n\n` +
            `<b>🎯 Статус: ${statusText}</b>\n\n` +
            `<b>📊 Результаты автоматической проверки:</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            verificationReport +
            `\n━━━━━━━━━━━━━━━━━━━━\n\n` +
            `<b>📁 Сохраненные документы:</b>\n` +
            `• Паспорт (лицо): ${updatedUser.passportFrontPhoto}\n` +
            `• Паспорт (оборот): ${updatedUser.passportBackPhoto}\n` +
            `• Селфи: ${updatedUser.selfiePhoto}\n\n` +
            `⏰ ${new Date().toLocaleString('ru-RU')}`;
          
          try {
            await bot.sendMessage(adminChatId, adminMessage, { parse_mode: 'HTML' });
          } catch (err) {
            console.error('Ошибка отправки уведомления администратору:', err);
          }
        }
        
        // Информируем пользователя о результатах
        if (verificationStatus === 'rejected') {
          await bot.sendMessage(
            msg.chat.id,
            '❌ <b>Документы не прошли проверку</b>\n\n' +
            'К сожалению, загруженные документы не соответствуют требованиям.\n\n' +
            'Пожалуйста, обратитесь к администратору для решения этого вопроса.',
            { parse_mode: 'HTML' }
          );
        } else if (verificationStatus === 'manual_review') {
          await bot.sendMessage(
            msg.chat.id,
            '⚠️ <b>Внимание!</b>\n\n' +
            'Ваши документы приняты, но требуют дополнительной проверки администратором.\n\n' +
            'Это может занять некоторое время. Мы уведомим вас, когда проверка будет завершена.',
            { parse_mode: 'HTML' }
          );
        }
      } catch (verifyError) {
        console.error('Ошибка полной проверки документов:', verifyError);
        // Продолжаем даже при ошибке проверки
      }
      
      const { getMainKeyboard } = require('./keyboards');
      await bot.sendMessage(
        msg.chat.id,
        '🎮 Используйте кнопки меню для аренды консолей!',
        getMainKeyboard()
      );
    }
  } catch (error) {
    console.error('Ошибка обработки фото документа:', error);
    await bot.sendMessage(
      msg.chat.id,
      '❌ Ошибка при сохранении фото. Попробуйте еще раз.'
    );
  }
}

/**
 * Проверка документов пользователя
 */
async function checkUserDocuments(userId) {
  try {
    const user = await User.findOne({ telegramId: userId });

    if (!user) return { verified: false, missing: ['all'] };

    const missing = [];

    if (!user.passportFrontPhoto) missing.push('passport_front');
    if (!user.passportBackPhoto) missing.push('passport_back');
    if (!user.selfiePhoto) missing.push('selfie');

    return {
      verified: user.verificationStep === 'completed',
      missing,
      step: user.verificationStep,
    };
  } catch (error) {
    console.error('Ошибка проверки документов:', error);
    return { verified: false, missing: ['all'] };
  }
}

/**
 * Запросить документы у пользователя
 */
async function requestDocuments(ctx) {
  const user = await require('../models/User').findOne({ 
    telegramId: ctx.from.id.toString() 
  });

  if (!user) {
    await ctx.reply('❌ Пользователь не найден. Используйте /start');
    return;
  }

  // Устанавливаем начальный шаг верификации
  user.verificationStep = 'passport_front';
  await user.save();

  await ctx.reply(
    '📋 <b>Верификация документов</b>\n\n' +
      'Для аренды консолей необходимо пройти верификацию паспорта.\n\n' +
      '<b>Шаг 1 из 3:</b> Отправьте фото <b>ЛИЦЕВОЙ</b> стороны паспорта\n\n' +
      '⚠️ <b>Требования к фото:</b>\n' +
      '• Четкое изображение без бликов\n' +
      '• Все данные должны быть читаемыми\n' +
      '• Фото целиком, без обрезанных краев\n\n' +
      '� Отправьте фото как обычное изображение',
    { parse_mode: 'HTML' }
  );
}

module.exports = {
  handlePhotoDocument,
  checkUserDocuments,
  requestDocuments,
  savePhotoDocument,
};
