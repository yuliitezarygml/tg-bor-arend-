const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const User = require('../models/User');
const logger = require('../utils/logger');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Хранилище для временных данных пользователя
const userContexts = {};

// Команда /start
bot.command('start', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  
  logger.info('Telegram /start command', {
    telegramId,
    username: ctx.from.username,
    firstName: ctx.from.first_name,
    lastName: ctx.from.last_name
  });
  
  try {
    // Проверить, есть ли уже такой пользователь
    let user = await User.findOne({ telegramId });
    
    if (!user) {
      logger.debug('New user detected, requesting registration', { telegramId });
      // Просим имя пользователя
      userContexts[telegramId] = { step: 'waiting_firstname' };
      await ctx.reply(
        '👋 Добро пожаловать в аренду консолей!\n\n' +
        '📝 Пожалуйста, введите ваше имя:'
      );
    } else {
      logger.debug('Existing user found, showing main menu', { telegramId, userId: user._id });
      // Пользователь уже зарегистрирован
      await showMainMenu(ctx, user);
    }
  } catch (err) {
    logger.error('Error in /start command', { telegramId, error: err.message });
    await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
  }
});

// Обработчик текстовых сообщений
bot.on('text', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const text = ctx.message.text;

  logger.debug('Text message received', { telegramId, text, step: userContexts[telegramId]?.step });

  try {
    if (userContexts[telegramId]) {
      const step = userContexts[telegramId].step;

      if (step === 'waiting_firstname') {
        logger.info('User registering - provided first name', { telegramId, firstName: text });
        // Сохраняем имя
        userContexts[telegramId].firstName = text;
        userContexts[telegramId].step = 'waiting_lastname';
        await ctx.reply('📝 Теперь введите вашу фамилию:');
        return;
      }

      if (step === 'waiting_lastname') {
        // Сохраняем фамилию и создаем пользователя
        const firstName = userContexts[telegramId].firstName;
        const lastName = text;

        logger.info('User registering - provided last name', {
          telegramId,
          firstName,
          lastName
        });

        const newUser = new User({
          firstName,
          lastName,
          telegramId,
          telegramUsername: ctx.from.username
        });

        await newUser.save();
        logger.success('User registration completed', {
          telegramId,
          userId: newUser._id,
          fullName: `${firstName} ${lastName}`
        });

        delete userContexts[telegramId];

        await ctx.reply(
          `✅ Спасибо, ${firstName} ${lastName}!\n` +
          '🎮 Вы успешно зарегистрированы!'
        );

        await showMainMenu(ctx, newUser);
        return;
      }

      if (step === 'choosing_days') {
        const days = parseInt(text);
        if (isNaN(days) || days < 1) {
          logger.warn('Invalid days input', { telegramId, input: text });
          await ctx.reply('❌ Пожалуйста, введите корректное количество дней.');
          return;
        }

        const consoleId = userContexts[telegramId].consoleId;
        const user = await User.findOne({ telegramId });

        logger.info('Creating rental from Telegram', {
          telegramId,
          userId: user._id,
          consoleId,
          days
        });

        try {
          const response = await axios.post(`${process.env.API_URL || 'http://localhost:5000'}/api/rentals`, {
            userId: user._id,
            consoleId,
            days
          });

          const rental = response.data;
          logger.success('Rental created via Telegram', {
            rentalId: rental._id,
            userId: user._id,
            consoleId,
            days,
            totalPrice: rental.totalPrice
          });

          await ctx.reply(
            `✅ Аренда успешно создана!\n\n` +
            `💰 Сумма: ${rental.totalPrice}₽\n` +
            `📅 Дней: ${days}\n` +
            `🎮 ID аренды: ${rental._id}`
          );

          delete userContexts[telegramId];
          await showMainMenu(ctx, user);
        } catch (err) {
          logger.error('Error creating rental from Telegram', {
            telegramId,
            userId: user._id,
            consoleId,
            days,
            error: err.message
          });
          await ctx.reply('❌ Ошибка при создании аренды. Консоль может быть недоступна.');
        }
        return;
      }
    }

    // Если нет контекста, показываем меню
    const user = await User.findOne({ telegramId });
    if (user) {
      await showMainMenu(ctx, user);
    }
  } catch (err) {
    logger.error('Error processing text message', { telegramId, error: err.message });
    await ctx.reply('❌ Произошла ошибка.');
  }
});

// Обработчик кнопок callback
bot.action('view_consoles', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  logger.info('User viewing available consoles', { telegramId });

  try {
    await ctx.answerCbQuery();

    const response = await axios.get(`${process.env.API_URL || 'http://localhost:5000'}/api/consoles/available`);
    const consoles = response.data;

    logger.debug('Consoles retrieved', { telegramId, count: consoles.length });

    if (consoles.length === 0) {
      logger.warn('No consoles available', { telegramId });
      await ctx.reply('😔 К сожалению, все консоли сейчас недоступны.');
      return;
    }

    let message = '🎮 Доступные консоли:\n\n';

    const keyboard = [];
    consoles.forEach((console, index) => {
      message += `${index + 1}. ${console.name} (${console.model})\n`;
      message += `   💰 ${console.pricePerDay}₽/день\n`;
      message += `   📝 ${console.description || 'Нет описания'}\n\n`;

      keyboard.push([Markup.button.callback(`${console.name}`, `rent_${console._id}`)]);
    });

    await ctx.reply(message, Markup.inlineKeyboard(keyboard));
  } catch (err) {
    logger.error('Error fetching consoles', { telegramId, error: err.message });
    await ctx.reply('❌ Ошибка при загрузке консолей.');
  }
});

// Обработчик выбора консоли для аренды
bot.action(/^rent_/, async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const consoleId = ctx.match.input.replace('rent_', '');

  logger.info('User selected console for rental', { telegramId, consoleId });

  try {
    await ctx.answerCbQuery();

    const response = await axios.get(
      `${process.env.API_URL || 'http://localhost:5000'}/api/consoles/${consoleId}`
    );
    const console = response.data;

    userContexts[telegramId] = {
      step: 'choosing_days',
      consoleId
    };

    logger.debug('Console details retrieved', { telegramId, consoleId, consoleName: console.name });

    await ctx.reply(
      `✅ Вы выбрали: ${console.name}\n\n` +
      `💰 Цена: ${console.pricePerDay}₽ за день\n` +
      `📝 Описание: ${console.description || 'Нет описания'}\n\n` +
      '📅 На сколько дней вы хотите арендовать? (введите число)'
    );
  } catch (err) {
    logger.error('Error selecting console for rental', { telegramId, consoleId, error: err.message });
    await ctx.reply('❌ Ошибка.');
  }
});

// Обработчик кнопки "Мои аренды"
bot.action('my_rentals', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  logger.info('User viewing their rentals', { telegramId });

  try {
    await ctx.answerCbQuery();

    const user = await User.findOne({ telegramId });

    if (!user) {
      logger.warn('User not found when viewing rentals', { telegramId });
      await ctx.reply('❌ Пользователь не найден.');
      return;
    }

    const response = await axios.get(
      `${process.env.API_URL || 'http://localhost:5000'}/api/rentals/user/${user._id}`
    );
    const rentals = response.data;

    logger.debug('User rentals retrieved', { telegramId, userId: user._id, count: rentals.length });

    if (rentals.length === 0) {
      logger.warn('User has no rentals', { telegramId, userId: user._id });
      await ctx.reply('📭 У вас нет активных аренд.');
      return;
    }

    let message = '📋 Ваши аренды:\n\n';

    rentals.forEach((rental, index) => {
      const console = rental.consoleId;
      const startDate = new Date(rental.startDate).toLocaleDateString('ru-RU');
      const endDate = new Date(rental.endDate).toLocaleDateString('ru-RU');

      message += `${index + 1}. ${console.name}\n`;
      message += `   📅 ${startDate} - ${endDate}\n`;
      message += `   💰 ${rental.totalPrice}₽\n`;
      message += `   ⏳ Статус: ${rental.status === 'active' ? '🟢 Активна' : '✅ Завершена'}\n\n`;
    });

    logger.success('User rentals displayed', { telegramId, userId: user._id, count: rentals.length });

    await ctx.reply(message);
  } catch (err) {
    logger.error('Error fetching user rentals', { telegramId, error: err.message });
    await ctx.reply('❌ Ошибка при загрузке аренд.');
  }
});

// Главное меню
async function showMainMenu(ctx, user) {
  await ctx.reply(
    `👋 Привет, ${user.firstName}!\n\n` +
    '🎮 Добро пожаловать в систему аренды консолей!',
    Markup.inlineKeyboard([
      [Markup.button.callback('🎮 Просмотреть консоли', 'view_consoles')],
      [Markup.button.callback('📋 Мои аренды', 'my_rentals')]
    ])
  );
}

// Функция для запуска бота
function startTelegramBot() {
  bot.launch();
  logger.success('Telegram bot started');

  process.once('SIGINT', () => {
    logger.info('Telegram bot shutting down (SIGINT)');
    bot.stop('SIGINT');
  });
  process.once('SIGTERM', () => {
    logger.info('Telegram bot shutting down (SIGTERM)');
    bot.stop('SIGTERM');
  });
}

module.exports = { startTelegramBot, bot };
