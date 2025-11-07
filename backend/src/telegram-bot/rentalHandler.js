const { Markup } = require('telegraf');
const User = require('../models/User');
const Console = require('../models/Console');
const Rental = require('../models/Rental');
const Reservation = require('../models/Reservation');
const { createTempReservation, removeTempReservation, isConsoleReserved } = require('../utils/reservationSystem');
const { getDiscountForConsole, calculateDiscountedPrice } = require('../utils/discountSystem');

/**
 * Начать процесс аренды консоли
 */
async function startRentalProcess(ctx, consoleId) {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id.toString() });

    if (!user) {
      await ctx.answerCbQuery('❌ Пользователь не найден');
      return;
    }

    // Проверить, верифицирован ли пользователь
    if (user.verificationStep !== 'completed') {
      await ctx.reply(
        '⚠️ Для аренды консолей необходимо пройти верификацию паспорта.\n\nНажмите кнопку ниже, чтобы начать процесс верификации.',
        Markup.inlineKeyboard([[
          Markup.button.callback('✅ Верифицировать паспорт', 'verify_passport')
        ]])
      );
      await ctx.answerCbQuery();
      return;
    }

    const console = await Console.findById(consoleId);

    if (!console || console.status !== 'available') {
      await ctx.answerCbQuery('❌ Консоль недоступна');
      return;
    }

    // Проверить, не зарезервирована ли консоль другим пользователем
    const reserved = await isConsoleReserved(consoleId, user._id.toString());
    
    if (reserved) {
      await ctx.reply('⚠️ Эта консоль уже зарезервирована другим пользователем. Попробуйте позже.');
      await ctx.answerCbQuery();
      return;
    }

    // Создать временную резервацию на 30 минут
    await createTempReservation(user._id, consoleId, 30);

    // Показать выбор количества часов
    await showHourSelection(ctx, consoleId);
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('❌ Ошибка при начале аренды:', error);
    await ctx.answerCbQuery('❌ Ошибка при начале аренды');
  }
}

/**
 * Показать выбор количества часов аренды
 */
async function showHourSelection(ctx, consoleId) {
  try {
    const console = await Console.findById(consoleId);
    const discount = await getDiscountForConsole(consoleId);

    let message = `🎮 <b>${console.name}</b>\n\n`;
    message += `⏰ <b>Выберите количество часов аренды:</b>\n\n`;

    const hourOptions = [1, 2, 3, 4, 6, 8, 12, 24];
    const buttons = [];

    for (const hours of hourOptions) {
      let price = console.rentalPrice * hours;
      
      if (discount && hours >= (discount.minHours || 1)) {
        price = calculateDiscountedPrice(price, discount);
      }

      message += `${hours}ч → ${price} MDL\n`;
      
      buttons.push([
        Markup.button.callback(`⏰ ${hours} час${hours > 1 ? 'а' : ''} - ${price} MDL`, `select_hours_${consoleId}_${hours}`)
      ]);
    }

    if (discount) {
      message += `\n🎁 Скидка ${discount.discountPercent}% активна!`;
    }

    buttons.push([
      Markup.button.callback('❌ Отмена', 'cancel_rental')
    ]);

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons)
    });
  } catch (error) {
    console.error('❌ Ошибка при выборе часов:', error);
    await ctx.reply('Произошла ошибка.');
  }
}

/**
 * Обработать выбор количества часов
 */
async function handleHourSelection(ctx, consoleId, hours) {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id.toString() });
    
    if (!user) {
      await ctx.answerCbQuery('❌ Пользователь не найден');
      return;
    }

    const console = await Console.findById(consoleId);
    const discount = await getDiscountForConsole(consoleId);

    let totalPrice = console.rentalPrice * hours;
    
    if (discount && hours >= (discount.minHours || 1)) {
      totalPrice = calculateDiscountedPrice(totalPrice, discount);
    }

    // Применить бонусы лояльности
    if (user.loyaltyBonus > 0) {
      const bonusToUse = Math.min(user.loyaltyBonus, totalPrice * 0.1); // максимум 10% от суммы
      totalPrice -= bonusToUse;
    }

    // Сохранить данные в сессии или создать заявку
    ctx.session = ctx.session || {};
    ctx.session.rentalData = {
      consoleId,
      hours,
      totalPrice
    };

    let message = `📋 <b>Подтверждение аренды</b>\n\n`;
    message += `🎮 <b>Консоль:</b> ${console.name}\n`;
    message += `⏰ <b>Часов:</b> ${hours}\n`;
    message += `💰 <b>Итоговая стоимость:</b> ${totalPrice} MDL\n\n`;
    message += `📍 Пожалуйста, поделитесь своей геолокацией для доставки консоли:`;

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...Markup.keyboard([
        [Markup.button.locationRequest('📍 Отправить геолокацию')],
        ['❌ Отмена']
      ]).resize()
    });

    await ctx.answerCbQuery();
  } catch (error) {
    console.error('❌ Ошибка при обработке выбора часов:', error);
    await ctx.answerCbQuery('❌ Ошибка');
  }
}

/**
 * Обработать получение геолокации
 */
async function handleLocation(ctx) {
  try {
    const location = ctx.message.location;
    const user = await User.findOne({ telegramId: ctx.from.id.toString() });

    if (!user) {
      await ctx.reply('❌ Пользователь не найден.');
      return;
    }

    if (!ctx.session || !ctx.session.rentalData) {
      await ctx.reply('⚠️ Сессия истекла. Пожалуйста, начните процесс аренды заново.');
      return;
    }

    const { consoleId, hours, totalPrice } = ctx.session.rentalData;
    const console = await Console.findById(consoleId);

    // Создать заявку на аренду
    const rental = new Rental({
      userId: user._id,
      consoleId: consoleId,
      rentalDate: new Date(),
      selectedHours: hours,
      expectedCost: totalPrice,
      totalPrice: totalPrice,
      status: 'pending',
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        address: `${location.latitude}, ${location.longitude}`
      }
    });

    await rental.save();

    // Удалить временную резервацию
    await removeTempReservation(user._id, consoleId);

    // Очистить сессию
    delete ctx.session.rentalData;

    let message = `✅ <b>Заявка на аренду отправлена!</b>\n\n`;
    message += `🎮 <b>Консоль:</b> ${console.name}\n`;
    message += `⏰ <b>Часов:</b> ${hours}\n`;
    message += `💰 <b>Стоимость:</b> ${totalPrice} MDL\n`;
    message += `📍 <b>Геолокация:</b> Получена\n\n`;
    message += `⏳ Ожидайте подтверждения от администратора.`;

    const { getMainKeyboard } = require('./keyboards');

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...getMainKeyboard()
    });

    // Отправить уведомление администратору
    const NotificationService = require('./notifications');
    const { getBot } = require('./bot');
    const bot = getBot();
    const notifications = new NotificationService(bot, process.env.ADMIN_CHAT_ID);
    await notifications.notifyNewRental(user, console, rental);

  } catch (error) {
    console.error('❌ Ошибка при обработке геолокации:', error);
    await ctx.reply('Произошла ошибка при создании заявки.');
  }
}

/**
 * Отменить процесс аренды
 */
async function cancelRental(ctx) {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id.toString() });
    
    if (user && ctx.session && ctx.session.rentalData) {
      // Удалить резервацию
      await removeTempReservation(user._id, ctx.session.rentalData.consoleId);
      delete ctx.session.rentalData;
    }

    await ctx.reply('❌ Процесс аренды отменен.', require('./keyboards').getMainKeyboard());
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('❌ Ошибка при отмене аренды:', error);
    await ctx.answerCbQuery('❌ Ошибка');
  }
}

/**
 * Завершить активную аренду (/end)
 */
async function endActiveRental(ctx) {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id.toString() });

    if (!user) {
      await ctx.reply('❌ Пользователь не найден.');
      return;
    }

    const activeRental = await Rental.findOne({
      userId: user._id,
      status: 'active'
    }).populate('consoleId');

    if (!activeRental) {
      await ctx.reply('У вас нет активных аренд.');
      return;
    }

    let message = `🏁 <b>Завершение аренды</b>\n\n`;
    message += `🎮 <b>Консоль:</b> ${activeRental.consoleId.name}\n`;
    message += `⏰ <b>Начало:</b> ${new Date(activeRental.startTime).toLocaleString('ru-RU')}\n\n`;
    message += `❓ <b>Оцените состояние консоли при возврате:</b>`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('💎 Идеальное', `rate_condition_${activeRental._id}_perfect`)],
      [Markup.button.callback('✅ Хорошее', `rate_condition_${activeRental._id}_good`)],
      [Markup.button.callback('⚠️ Есть повреждения', `rate_condition_${activeRental._id}_damaged`)],
      [Markup.button.callback('❌ Отмена', 'cancel_end_rental')]
    ]);

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...keyboard
    });
  } catch (error) {
    console.error('❌ Ошибка при завершении аренды:', error);
    await ctx.reply('Произошла ошибка.');
  }
}

/**
 * Обработать оценку состояния консоли
 */
async function handleConditionRating(ctx, rentalId, condition) {
  try {
    const rental = await Rental.findById(rentalId).populate('consoleId');

    if (!rental) {
      await ctx.answerCbQuery('❌ Аренда не найдена');
      return;
    }

    // Обновить статус аренды
    rental.status = 'completed';
    rental.endTime = new Date();
    rental.returnCondition = condition;
    rental.completedAt = new Date();

    // Проверить своевременность возврата
    if (rental.expectedEndTime) {
      rental.returnedOnTime = rental.endTime <= rental.expectedEndTime;
    }

    // Определить соблюдение правил на основе состояния
    if (condition === 'perfect' || condition === 'good') {
      rental.ruleCompliance = 'no_violations';
    } else if (condition === 'damaged') {
      rental.ruleCompliance = 'minor_violations';
    } else {
      rental.ruleCompliance = 'major_violations';
    }

    await rental.save();

    // Обновить статус консоли
    await Console.findByIdAndUpdate(rental.consoleId._id, {
      status: 'available'
    });

    // Обновить рейтинг пользователя
    const { updateRatingOnRentalCompletion } = require('../utils/ratingSystem');
    await updateRatingOnRentalCompletion(rental._id);

    const conditionText = {
      perfect: '💎 Идеальное',
      good: '✅ Хорошее',
      damaged: '⚠️ Есть повреждения',
      broken: '❌ Сломано'
    };

    let message = `✅ <b>Аренда завершена!</b>\n\n`;
    message += `🎮 <b>Консоль:</b> ${rental.consoleId.name}\n`;
    message += `📊 <b>Состояние:</b> ${conditionText[condition]}\n`;
    message += `💰 <b>Стоимость:</b> ${rental.totalPrice} MDL\n\n`;
    message += `⭐ Ваш рейтинг обновлен!\n\n`;
    message += `Спасибо за использование нашего сервиса! 🎮`;

    const { getMainKeyboard } = require('./keyboards');

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...getMainKeyboard()
    });

    await ctx.answerCbQuery('✅ Аренда завершена');
  } catch (error) {
    console.error('❌ Ошибка при оценке состояния:', error);
    await ctx.answerCbQuery('❌ Ошибка');
  }
}

module.exports = {
  startRentalProcess,
  showHourSelection,
  handleHourSelection,
  handleLocation,
  cancelRental,
  endActiveRental,
  handleConditionRating
};
