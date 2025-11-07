const { Markup } = require('telegraf');
const User = require('../models/User');
const Rental = require('../models/Rental');
const RatingTransaction = require('../models/RatingTransaction');
const { calculateUserFinalRating, getUserStatusBenefits } = require('../utils/ratingSystem');

/**
 * Показать профиль пользователя
 */
async function showUserProfile(ctx) {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id.toString() });

    if (!user) {
      await ctx.reply('❌ Пользователь не найден. Используйте /start для регистрации.');
      return;
    }

    // Получить статистику аренд
    const totalRentals = await Rental.countDocuments({ 
      userId: user._id,
      status: { $in: ['completed', 'active'] }
    });
    
    const activeRentals = await Rental.countDocuments({ 
      userId: user._id,
      status: 'active'
    });

    // Пересчитать рейтинг
    await calculateUserFinalRating(user._id);
    
    // Обновить данные пользователя
    const updatedUser = await User.findById(user._id);
    
    const benefits = getUserStatusBenefits(updatedUser.ratingStatus);

    let message = `👤 <b>Личный кабинет</b>\n\n`;
    message += `📝 <b>Имя:</b> ${updatedUser.firstName} ${updatedUser.lastName}\n`;
    message += `📞 <b>Телефон:</b> ${updatedUser.phoneNumber}\n`;
    
    if (updatedUser.username) {
      message += `👤 <b>Username:</b> @${updatedUser.username}\n`;
    }
    
    message += `\n⭐ <b>РЕЙТИНГ</b>\n`;
    message += `🎯 <b>Общий рейтинг:</b> ${updatedUser.ratingScore}/100\n`;
    message += `📊 <b>Дисциплина:</b> ${updatedUser.disciplineScore}/100\n`;
    message += `💎 <b>Лояльность:</b> ${updatedUser.loyaltyScore}/100\n`;
    
    const statusEmoji = {
      premium: '👑',
      regular: '⭐',
      risk: '⚠️'
    };
    
    const statusText = {
      premium: 'ПРЕМИУМ',
      regular: 'ОБЫЧНЫЙ',
      risk: 'РИСК'
    };
    
    message += `\n${statusEmoji[updatedUser.ratingStatus]} <b>Статус:</b> ${statusText[updatedUser.ratingStatus]}\n`;
    
    if (benefits.discountPercent > 0) {
      message += `🎁 <b>Скидка:</b> ${benefits.discountPercent}%\n`;
    }
    
    if (benefits.prioritySupport) {
      message += `⚡ <b>Приоритетная поддержка</b>\n`;
    }
    
    if (benefits.autoApproval) {
      message += `✅ <b>Автоматическое одобрение аренд</b>\n`;
    }

    message += `\n📊 <b>СТАТИСТИКА</b>\n`;
    message += `📦 <b>Всего аренд:</b> ${totalRentals}\n`;
    message += `🔄 <b>Активных:</b> ${activeRentals}\n`;
    message += `💰 <b>Потрачено:</b> ${updatedUser.totalSpent || 0} MDL\n`;
    
    if (updatedUser.loyaltyBonus > 0) {
      message += `🎁 <b>Бонусы:</b> ${updatedUser.loyaltyBonus} MDL\n`;
    }

    message += `\n📅 <b>Дата регистрации:</b> ${new Date(updatedUser.createdAt).toLocaleDateString('ru-RU')}\n`;

    // Проверка верификации
    message += `\n`;
    if (updatedUser.verificationStep === 'completed') {
      message += `✅ <b>Паспорт верифицирован</b>\n`;
      message += `📅 <b>Верифицирован:</b> ${new Date(updatedUser.verifiedAt).toLocaleDateString('ru-RU')}\n`;
    } else if (updatedUser.verificationStep && updatedUser.verificationStep !== 'none') {
      const stepNames = {
        'passport_front': 'Ожидается фото лицевой стороны паспорта',
        'passport_back': 'Ожидается фото обратной стороны паспорта',
        'selfie': 'Ожидается селфи с паспортом'
      };
      message += `⏳ <b>Верификация в процессе</b>\n`;
      message += `📝 ${stepNames[updatedUser.verificationStep] || 'Неизвестный шаг'}\n`;
    } else {
      message += `⚠️ <b>Паспорт не верифицирован</b>\n`;
      message += `💡 Верификация требуется для аренды консолей\n`;
    }

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📜 История рейтинга', 'rating_history')],
      [Markup.button.callback('📋 История аренд', 'rental_history')],
      updatedUser.verificationStep !== 'completed' 
        ? [Markup.button.callback('✅ Верифицировать паспорт', 'verify_passport')]
        : []
    ].filter(row => row.length > 0));

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...keyboard
    });
  } catch (error) {
    console.error('❌ Ошибка при загрузке профиля:', error);
    await ctx.reply('Произошла ошибка при загрузке профиля.');
  }
}

/**
 * Показать историю изменений рейтинга
 */
async function showRatingHistory(ctx) {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id.toString() });

    if (!user) {
      await ctx.answerCbQuery('❌ Пользователь не найден');
      return;
    }

    const transactions = await RatingTransaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('rentalId');

    if (transactions.length === 0) {
      await ctx.reply('📜 История рейтинга пуста.');
      await ctx.answerCbQuery();
      return;
    }

    let message = '📜 <b>История изменений рейтинга:</b>\n\n';

    const typeEmoji = {
      rental_completed: '✅',
      late_return: '⏰',
      perfect_condition: '💎',
      damaged_item: '🔧',
      rule_violation: '⚠️',
      loyalty_bonus: '🎁',
      manual_adjustment: '👤'
    };

    const typeText = {
      rental_completed: 'Аренда завершена',
      late_return: 'Поздний возврат',
      perfect_condition: 'Идеальное состояние',
      damaged_item: 'Повреждение',
      rule_violation: 'Нарушение правил',
      loyalty_bonus: 'Бонус лояльности',
      manual_adjustment: 'Ручная корректировка'
    };

    transactions.forEach((tx, index) => {
      const emoji = typeEmoji[tx.transactionType] || '📊';
      const text = typeText[tx.transactionType] || tx.transactionType;
      
      message += `${index + 1}. ${emoji} ${text}\n`;
      
      if (tx.disciplineChange !== 0) {
        const sign = tx.disciplineChange > 0 ? '+' : '';
        message += `   Дисциплина: ${sign}${tx.disciplineChange}\n`;
      }
      
      if (tx.loyaltyChange !== 0) {
        const sign = tx.loyaltyChange > 0 ? '+' : '';
        message += `   Лояльность: ${sign}${tx.loyaltyChange}\n`;
      }
      
      if (tx.comment) {
        message += `   💬 ${tx.comment}\n`;
      }
      
      message += `   📅 ${new Date(tx.createdAt).toLocaleDateString('ru-RU')} ${new Date(tx.createdAt).toLocaleTimeString('ru-RU')}\n\n`;
    });

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[
        Markup.button.callback('◀️ Назад в кабинет', 'show_profile')
      ]])
    });

    await ctx.answerCbQuery();
  } catch (error) {
    console.error('❌ Ошибка при загрузке истории рейтинга:', error);
    await ctx.answerCbQuery('❌ Ошибка при загрузке');
  }
}

/**
 * Показать историю аренд
 */
async function showRentalHistory(ctx) {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id.toString() });

    if (!user) {
      await ctx.answerCbQuery('❌ Пользователь не найден');
      return;
    }

    const rentals = await Rental.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('consoleId');

    if (rentals.length === 0) {
      await ctx.reply('📋 История аренд пуста.');
      await ctx.answerCbQuery();
      return;
    }

    let message = '📋 <b>История аренд:</b>\n\n';

    const statusEmoji = {
      pending: '⏳',
      approved: '✅',
      rejected: '❌',
      active: '🔄',
      completed: '🏁',
      cancelled: '🚫'
    };

    const statusText = {
      pending: 'Ожидает',
      approved: 'Одобрена',
      rejected: 'Отклонена',
      active: 'Активна',
      completed: 'Завершена',
      cancelled: 'Отменена'
    };

    rentals.forEach((rental, index) => {
      const emoji = statusEmoji[rental.status] || '📦';
      const status = statusText[rental.status] || rental.status;
      
      message += `${index + 1}. ${emoji} ${rental.consoleId?.name || 'Консоль'}\n`;
      message += `   Статус: ${status}\n`;
      
      if (rental.selectedHours) {
        message += `   Часов: ${rental.selectedHours}\n`;
      }
      
      if (rental.totalPrice) {
        message += `   Стоимость: ${rental.totalPrice} MDL\n`;
      }
      
      if (rental.returnCondition) {
        const conditionText = {
          perfect: '💎 Идеальное',
          good: '✅ Хорошее',
          damaged: '⚠️ Повреждено',
          broken: '❌ Сломано'
        };
        message += `   Возврат: ${conditionText[rental.returnCondition] || rental.returnCondition}\n`;
      }
      
      message += `   📅 ${new Date(rental.createdAt).toLocaleDateString('ru-RU')}\n\n`;
    });

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[
        Markup.button.callback('◀️ Назад в кабинет', 'show_profile')
      ]])
    });

    await ctx.answerCbQuery();
  } catch (error) {
    console.error('❌ Ошибка при загрузке истории аренд:', error);
    await ctx.answerCbQuery('❌ Ошибка при загрузке');
  }
}

module.exports = {
  showUserProfile,
  showRatingHistory,
  showRentalHistory
};
