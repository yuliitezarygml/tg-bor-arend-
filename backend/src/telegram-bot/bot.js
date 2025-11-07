const { Telegraf, session, Markup } = require('telegraf');
const User = require('../models/User');
const Console = require('../models/Console');
const Rental = require('../models/Rental');
const NotificationService = require('./notifications');
const { getRegistrationKeyboard, getMainKeyboard, getVerificationKeyboard, getApproveKeyboard } = require('./keyboards');

// Импорт новых обработчиков
const documentHandler = require('./documentHandler');
const consoleHandler = require('./consoleHandler');
const profileHandler = require('./profileHandler');
const rentalHandler = require('./rentalHandler');
const purchaseHandler = require('./purchaseHandler');
const { cleanupExpiredReservations } = require('../utils/reservationSystem');

let bot = null;

const initBot = (token, adminChatId) => {
  bot = new Telegraf(token);
  const notifications = new NotificationService(bot, adminChatId);

  // Запустить очистку просроченных резерваций каждые 5 минут
  cleanupExpiredReservations();

  // Middleware
  bot.use(session());

  // Логирование всех сообщений для отладки
  bot.use(async (ctx, next) => {
    console.log('📨 Входящее обновление:', {
      type: ctx.updateType,
      text: ctx.message?.text,
      from: ctx.from?.first_name,
      timestamp: new Date().toLocaleTimeString()
    });
    return next();
  });

  // Глобальный обработчик ошибок
  bot.catch((err, ctx) => {
    console.error('❌ Ошибка в боте:', err);
    console.error('Контекст:', {
      updateType: ctx.updateType,
      text: ctx.message?.text,
      from: ctx.from?.first_name
    });
  });

  // Команда /start
  bot.start(async (ctx) => {
    console.log('🔵 Обработчик /start сработал для:', ctx.from?.first_name);
    const from = ctx.from;

    try {
      let user = await User.findOne({ telegramId: from.id.toString() });
      console.log('👤 Пользователь найден:', !!user);
      console.log('📊 Статус регистрации:', user?.registrationStep);

      if (!user) {
        // Новый пользователь - начать регистрацию
        user = new User({
          telegramId: from.id.toString(),
          firstName: '',
          lastName: '',
          username: from.username || '',
          registrationStep: 'name',
        });
        await user.save();
        console.log('➕ Новый пользователь создан');
      }

      // Отправить ответ в зависимости от статуса регистрации
      if (user.registrationStep === 'name') {
        const msg = `👋 Привет${user.firstName ? ', ' + user.firstName : ''}! Добро пожаловать!\n\n📝 Укажите ваше имя и фамилию (через пробел):\n\nНапример: <code>Иван Иванов</code>`;
        await ctx.reply(msg, { parse_mode: 'HTML' });
        console.log('✉️ Запрос имени отправлен');
      } else if (user.registrationStep === 'phone') {
        await ctx.reply(
          `📞 Поделитесь своим номером телефона:`,
          getRegistrationKeyboard()
        );
        console.log('✉️ Запрос телефона отправлен');
      } else if (user.registrationStep === 'completed') {
        // Пользователь уже зарегистрирован
        const msg = `👋 Добро пожаловать обратно, ${user.firstName}!`;
        await ctx.reply(msg, getMainKeyboard());
        console.log('✉️ Главное меню отправлено');
      }
    } catch (error) {
      console.error('❌ Ошибка в /start:', error);
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  });

  // Обработка контакта
  bot.on('contact', async (ctx) => {
    console.log('📱 Контакт получен');
    const contact = ctx.message.contact;
    const from = ctx.from;

    try {
      const user = await User.findOneAndUpdate(
        { telegramId: from.id.toString() },
        {
          phoneNumber: contact.phone_number,
          contactShared: true,
          registrationStep: 'completed',
        },
        { new: true }
      );

      console.log('✅ Номер телефона сохранен:', contact.phone_number);

      // Проверяем статус верификации
      if (user.verificationStep === 'none' || !user.verificationStep) {
        await ctx.reply(
          `✅ Спасибо! Регистрация завершена.\n\n` +
          `👤 ФИО: ${user.firstName} ${user.lastName}\n` +
          `📱 Телефон: ${contact.phone_number}\n\n` +
          `⚠️ Для аренды консолей необходимо пройти верификацию паспорта.\n\n` +
          `Нажмите кнопку ниже, чтобы начать процесс верификации:`,
          getVerificationKeyboard()
        );
      } else {
        await ctx.reply(
          `✅ Спасибо! Регистрация завершена.\n\n` +
          `👤 ФИО: ${user.firstName} ${user.lastName}\n` +
          `📱 Телефон: ${contact.phone_number}\n\n` +
          `Теперь вы можете арендовать консоли!`,
          getMainKeyboard()
        );
      }
      
      console.log('✉️ Сообщение о завершении регистрации отправлено');
    } catch (error) {
      console.error('❌ Ошибка при сохранении контакта:', error);
      await ctx.reply('Произошла ошибка при сохранении контакта.');
    }
  });

  // Обработка кнопок меню - ПЕРЕД bot.on('message')
  bot.hears('📋 Мои заявки', async (ctx) => {
    try {
      const userId = ctx.from.id.toString();
      const user = await User.findOne({ telegramId: userId });

      if (!user) {
        ctx.reply('Пользователь не найден.');
        return;
      }

      const rentals = await Rental.find({ userId: user._id }).populate(
        'consoleId'
      );

      if (rentals.length === 0) {
        ctx.reply('У вас нет заявок на аренду.');
        return;
      }

      let message = '<b>Ваши заявки:</b>\n\n';
      rentals.forEach((rental, index) => {
        const statusEmoji = {
          pending: '⏳',
          approved: '✅',
          rejected: '❌',
          completed: '🏁',
          active: '🔄',
          cancelled: '🚫'
        };

        message += `${index + 1}. ${statusEmoji[rental.status]} <b>${rental.consoleId.name}</b>\n`;
        message += `   Статус: ${rental.status}\n`;
        message += `   Дата: ${new Date(rental.rentalDate).toLocaleDateString(
          'uk-UA'
        )}\n\n`;
      });

      ctx.reply(message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Ошибка при получении заявок:', error);
      ctx.reply('Произошла ошибка при получении заявок.');
    }
  });

  bot.hears('🎮 Консоли', async (ctx) => {
    await consoleHandler.showConsoleList(ctx);
  });

  bot.hears('📝 Арендовать', async (ctx) => {
    await consoleHandler.showConsoleList(ctx);
  });

  bot.hears('💰 Купить', async (ctx) => {
    await consoleHandler.showConsolesForPurchase(ctx);
  });

  bot.hears('📊 Мой кабинет', async (ctx) => {
    await profileHandler.showUserProfile(ctx);
  });

  bot.hears('❓ Помощь', async (ctx) => {
    const helpText = `
� <b>Справка по использованию бота</b>

<b>🎮 Аренда консоли:</b>
1️⃣ Нажмите "📝 Арендовать" или "🎮 Консоли"
2️⃣ Выберите консоль из списка
3️⃣ Пройдите верификацию (если еще не прошли)
4️⃣ Выберите количество часов аренды
5️⃣ Отправьте геолокацию для доставки
6️⃣ Дождитесь подтверждения администратора

<b>✅ Верификация документов:</b>
Для аренды нужно пройти верификацию:
• Фото лицевой стороны паспорта
• Фото обратной стороны паспорта
• Селфи с паспортом

<b>⭐ Рейтинговая система:</b>
• 👑 Премиум (80-100): скидка 15%, приоритет
• ⭐ Обычный (50-79): скидка 5%
• ⚠️ Риск (0-49): без скидки

Рейтинг зависит от:
• Своевременности возврата
• Состояния консоли
• Соблюдения правил

<b>🏁 Завершение аренды:</b>
Используйте команду /end когда вернете консоль

<b>📊 Личный кабинет:</b>
Показывает ваш рейтинг, статистику и историю

<b>💰 Покупка консоли:</b>
Нажмите "💰 Купить" для просмотра консолей на продажу

<b>📞 Контакты:</b>
Если у вас есть вопросы, администратор свяжется с вами
`;
    
    await ctx.reply(helpText, { parse_mode: 'HTML' });
  });

  // Обработка кнопки "✅ Верифицировать паспорт"
  bot.hears('✅ Верифицировать паспорт', async (ctx) => {
    await documentHandler.requestDocuments(ctx);
  });

  // Обработка отмены
  bot.hears('❌ Отмена', async (ctx) => {
    const user = await User.findOne({ telegramId: ctx.from.id.toString() });
    
    if (user && ctx.session && ctx.session.rentalData) {
      // Удалить резервацию если есть
      const { removeTempReservation } = require('../utils/reservationSystem');
      await removeTempReservation(user._id, ctx.session.rentalData.consoleId);
      delete ctx.session.rentalData;
    }
    
    await ctx.reply('❌ Действие отменено.', getMainKeyboard());
  });

  // Команда /end - завершить активную аренду
  bot.command('end', async (ctx) => {
    await rentalHandler.endActiveRental(ctx);
  });

  // Обработка фотографий (паспорт, селфи)
  bot.on('photo', async (ctx) => {
    await documentHandler.handlePhotoDocument(bot, ctx.message);
  });

  // Обработка геолокации
  bot.on('location', async (ctx) => {
    await rentalHandler.handleLocation(ctx);
  });

  // Обработка обычных текстовых сообщений - ПОСЛЕ hears и других специфичных обработчиков
  bot.on('message', async (ctx) => {
    const from = ctx.from;
    const text = ctx.message.text;

    console.log('📝 Текстовое сообщение получено:', text);

    // Игнорировать команды (они обрабатываются выше)
    if (!text || text.startsWith('/')) {
      console.log('⏭️ Команда - пропускаю');
      return;
    }

    try {
      const user = await User.findOne({ telegramId: from.id.toString() });
      console.log('👤 Пользователь найден:', !!user);

      if (!user) {
        await ctx.reply('Пожалуйста, используйте /start для регистрации.');
        return;
      }

      console.log('📊 Статус пользователя:', user.registrationStep);

      // Если пользователь на шаге ввода имени
      if (user.registrationStep === 'name') {
        const nameParts = text.trim().split(/\s+/);
        
        if (nameParts.length < 2) {
          await ctx.reply('❌ Пожалуйста, введите имя и фамилию через пробел.\n\nНапример: <code>Иван Иванов</code>', { parse_mode: 'HTML' });
          console.log('❌ Неправильный формат имени');
          return;
        }

        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');

        await User.findByIdAndUpdate(user._id, {
          firstName,
          lastName,
          registrationStep: 'phone',
        });
        
        console.log('✅ Имя сохранено:', firstName, lastName);

        await ctx.reply(
          `✅ Спасибо, ${firstName}!\n\n📞 Теперь поделитесь своим номером телефона:`,
          getRegistrationKeyboard()
        );
        console.log('✉️ Запрос телефона отправлен');
      } else if (user.registrationStep === 'completed') {
        // Пользователь уже зарегистрирован, обработать команды
        await ctx.reply('Используйте кнопки меню ниже:', getMainKeyboard());
        console.log('✉️ Меню отправлено');
      }
    } catch (error) {
      console.error('❌ Ошибка при обработке текста:', error);
      await ctx.reply('Произошла ошибка.');
    }
  });

  // Action callbacks для консолей
  bot.action(/select_console_(.+)/, async (ctx) => {
    const consoleId = ctx.match[1];
    await consoleHandler.showConsoleDetails(ctx, consoleId);
  });

  bot.action('show_consoles', async (ctx) => {
    await ctx.deleteMessage();
    await consoleHandler.showConsoleList(ctx);
  });

  // Action callbacks для аренды
  bot.action(/rent_console_(.+)/, async (ctx) => {
    const consoleId = ctx.match[1];
    await rentalHandler.startRentalProcess(ctx, consoleId);
  });

  bot.action(/select_hours_(.+)_(.+)/, async (ctx) => {
    const consoleId = ctx.match[1];
    const hours = parseInt(ctx.match[2]);
    await rentalHandler.handleHourSelection(ctx, consoleId, hours);
  });

  bot.action('cancel_rental', async (ctx) => {
    await rentalHandler.cancelRental(ctx);
  });

  bot.action(/rate_condition_(.+)_(.+)/, async (ctx) => {
    const rentalId = ctx.match[1];
    const condition = ctx.match[2];
    await rentalHandler.handleConditionRating(ctx, rentalId, condition);
  });

  // Action callbacks для профиля
  bot.action('show_profile', async (ctx) => {
    await ctx.deleteMessage();
    await profileHandler.showUserProfile(ctx);
  });

  bot.action('rating_history', async (ctx) => {
    await profileHandler.showRatingHistory(ctx);
  });

  bot.action('rental_history', async (ctx) => {
    await profileHandler.showRentalHistory(ctx);
  });

  bot.action('verify_passport', async (ctx) => {
    await ctx.answerCbQuery();
    await documentHandler.requestDocuments(ctx);
  });

  // Action callbacks для покупки консолей
  bot.action(/purchase_console_(.+)/, async (ctx) => {
    const consoleId = ctx.match[1];
    await purchaseHandler.showPurchaseDetails(ctx, consoleId);
  });

  bot.action('show_purchase_consoles', async (ctx) => {
    await ctx.deleteMessage();
    await consoleHandler.showConsolesForPurchase(ctx);
  });

  bot.action(/contact_admin_purchase_(.+)/, async (ctx) => {
    const consoleId = ctx.match[1];
    await purchaseHandler.handleContactAdminForPurchase(ctx, consoleId);
  });

  // Action callbacks для административных действий
  bot.action(/approve_(.+)/, async (ctx) => {
    try {
      const rentalId = ctx.match[1];
      const rental = await Rental.findByIdAndUpdate(
        rentalId,
        { status: 'approved', notificationSentToUser: true },
        { new: true }
      )
        .populate('userId')
        .populate('consoleId');

      // Обновить статус консоли
      await Console.findByIdAndUpdate(rental.consoleId._id, {
        status: 'rented',
      });

      // Отправить уведомление пользователю
      await notifications.notifyApproved(rental.userId, rental.consoleId);

      ctx.editMessageText('✅ Заявка одобрена и пользователю отправлено уведомление.');
      ctx.answerCbQuery();
    } catch (error) {
      console.error('Ошибка при одобрении:', error);
      ctx.answerCbQuery('Ошибка при одобрении');
    }
  });

  bot.action(/reject_(.+)/, async (ctx) => {
    try {
      const rentalId = ctx.match[1];
      const rental = await Rental.findByIdAndUpdate(
        rentalId,
        { status: 'rejected', notificationSentToUser: true },
        { new: true }
      )
        .populate('userId')
        .populate('consoleId');

      // Обновить статус консоли
      await Console.findByIdAndUpdate(rental.consoleId._id, {
        status: 'available',
      });

      // Отправить уведомление пользователю
      await notifications.notifyRejected(
        rental.userId,
        rental.consoleId,
        'Консоль недоступна'
      );

      ctx.editMessageText('❌ Заявка отклонена и пользователю отправлено уведомление.');
      ctx.answerCbQuery();
    } catch (error) {
      console.error('Ошибка при отклонении:', error);
      ctx.answerCbQuery('Ошибка при отклонении');
    }
  });

  return bot;
};

const getBot = () => bot;

module.exports = {
  initBot,
  getBot,
};
