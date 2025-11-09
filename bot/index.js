require('dotenv').config();
const { Telegraf } = require('telegraf');
const { session } = require('telegraf');
const axios = require('axios');
const mongoose = require('mongoose');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
let authToken = null;

// Подключение к БД
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ps4-rental', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Инициализируем сессии
bot.use(session());

// Функция для получения JWT токена
async function getAuthToken() {
  try {
    if (!authToken) {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD || 'admin123'
      });
      authToken = response.data.token;
      console.log('✅ Получен JWT токен для бота');
    }
    return authToken;
  } catch (error) {
    console.error('❌ Ошибка получения JWT токена:', error.message);
    throw error;
  }
}

// Создаём API клиент с автоматическим заголовком Authorization
const api = axios.create({
  baseURL: API_URL
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await getAuthToken();
    config.headers.Authorization = `Bearer ${token}`;
  } catch (error) {
    console.error('Не удалось добавить токен:', error.message);
  }
  return config;
});

// Главное меню
const mainMenuKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '📋 Доступные консоли' }],
      [{ text: '🎮 Мои аренды' }, { text: '👤 Профиль' }],
      [{ text: '❓ Помощь' }],
    ],
    resize_keyboard: true,
  },
};

// Меню регистрации профиля
const registrationMenuKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '📱 Ввести номер телефона' }],
      [{ text: '📧 Ввести email' }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  },
};

// Меню для поделиться номером телефона
const sharePhoneKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '📱 Поделиться номером', request_contact: true }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  },
};

// Меню для email
const emailKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '📧 Ввести email' }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  },
};

// Меню для заблокированных пользователей
const blockedMenuKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '📞 Связаться с поддержкой' }],
    ],
    resize_keyboard: true,
  },
};

// Функция для проверки регистрации пользователя
async function checkUserRegistered(ctx) {
  try {
    const userId = ctx.from.id;
    const response = await api.get(`/users/telegram/${userId}`).catch(() => null);
    
    if (!response?.data) {
      ctx.reply(
        `<b>⚠️ Вы не зарегистрированы</b>\n\n` +
        `Для начала работы с сервисом необходимо пройти регистрацию.\n` +
        `Введите ваш номер телефона в формате: +373-XX-XXX-XX\n\n` +
        `Например: +373-60-123-45`,
        { parse_mode: 'HTML' }
      );
      return false;
    }

    const user = response.data;

    // Проверяем наличие телефона и email
    if (!user.phoneNumber || !user.email) {
      const incompleteProfileMessage = 
        `<b>⚠️ Профиль не заполнен</b>\n\n` +
        `Для полного доступа необходимо указать:\n\n` +
        `${!user.phoneNumber ? '📱 <b>Номер телефона</b> - не указан\n' : '✅ <b>Номер телефона</b> - указан\n'}` +
        `${!user.email ? '📧 <b>Email</b> - не указан\n' : '✅ <b>Email</b> - указан\n'}` +
        `\n<b>Напишите:</b>\n` +
        `Номер: +373-60-123-45\n` +
        `Email: example@mail.com\n\n` +
        `Или обратитесь в поддержку @support`;
      
      ctx.reply(incompleteProfileMessage, { parse_mode: 'HTML' });
      return false;
    }

    return true;
  } catch (error) {
    ctx.reply('❌ Ошибка проверки регистрации. Попробуйте позже.');
    return false;
  }
}

// Функция для проверки блокировки пользователя
async function checkUserBlocked(ctx) {
  try {
    const userId = ctx.from.id;
    const response = await api.get(`/users/telegram/${userId}`);
    const user = response.data;
    
    if (user && user.isBlocked) {
      const blockMessage = 
        `<b>🚫 Ваш аккаунт заблокирован</b>\n\n` +
        `<b>Причина:</b> ${user.blockReason || 'Причина не указана'}\n\n` +
        `Для разблокировки обратитесь в службу поддержки.\n` +
        `📞 Контакты: @support`;
      
      ctx.reply(blockMessage, { 
        parse_mode: 'HTML',
        ...blockedMenuKeyboard
      });
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

// Команда /start
bot.start(async (ctx) => {
  const firstName = ctx.from.first_name || 'Пользователь';
  
  try {
    // Проверяем, есть ли пользователь в БД
    const userId = ctx.from.id;
    const userResponse = await api.get(`/users/telegram/${userId}`).catch(() => null);
    
    if (!userResponse?.data) {
      // ШАГ 1: Новый пользователь - запросить имя и фамилию
      ctx.reply(
        `👋 Привет, ${firstName}! 🎮\n\n` +
        `Добро пожаловать в сервис аренды PS4 консолей!\n\n` +
        `Для регистрации введите ваше полное имя и фамилию:\n\n` +
        `Например: Иван Петров`,
        { 
          reply_markup: {
            force_reply: true,
          }
        }
      );
      
      // Сохраняем состояние - ожидаем имя и фамилию
      ctx.session = ctx.session || {};
      ctx.session.registrationStep = 'name';
      return;
    }

    const user = userResponse.data;

    // Проверяем, завершена ли регистрация
    if (!user.phoneNumber || !user.email) {
      // Продолжаем регистрацию
      ctx.reply(
        `👋 Привет, ${firstName}! 🎮\n\n` +
        `Ваш профиль требует заполнения:`,
        sharePhoneKeyboard
      );
      return;
    }

    // Полная регистрация - показываем главное меню
    ctx.reply(
      `👋 Привет, ${firstName}! 🎮\n\nДобро пожаловать в сервис аренды PS4 консолей!\n\nВыберите действие:`,
      mainMenuKeyboard
    );
  } catch (error) {
    console.error('Ошибка при /start:', error);
    ctx.reply(
      `👋 Привет, ${firstName}! 🎮\n\nДобро пожаловать в сервис аренды PS4 консолей!\n\nВыберите действие:`,
      mainMenuKeyboard
    );
  }
});

// Команда /help
bot.help((ctx) => {
  ctx.reply(
    `<b>Справка по командам:</b>\n\n` +
    `📋 <b>Доступные консоли</b> - Посмотреть все доступные консоли в аренду\n` +
    `🎮 <b>Мои аренды</b> - Просмотр ваших текущих аренд\n` +
    `👤 <b>Профиль</b> - Информация о вашем профиле\n` +
    `❓ <b>Помощь</b> - Справка по боту\n\n` +
    `Для связи с поддержкой: @support`,
    { parse_mode: 'HTML' }
  );
});

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  const userId = ctx.from.id;

  try {
    // Инициализируем сессию
    ctx.session = ctx.session || {};

    // ШАГ 1: Ожидаем имя и фамилию (на первой регистрации)
    if (ctx.session.registrationStep === 'name' || ctx.message.reply_to_message?.text?.includes('введите ваше полное имя')) {
      const parts = text.trim().split(/\s+/);
      
      if (parts.length < 2) {
        ctx.reply('❌ Пожалуйста введите как минимум имя и фамилию (например: Иван Петров)');
        return;
      }

      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ');

      // Сохраняем в БД
      await api.post(`/users/telegram/${userId}`, {
        username: ctx.from.username,
        firstName: firstName,
        lastName: lastName,
      });

      ctx.session.registrationStep = 'phone';
      
      ctx.reply(
        `✅ Спасибо, ${firstName}!\n\n` +
        `Шаг 2️⃣ из 3️⃣\n\n` +
        `Теперь поделитесь вашим номером телефона:`,
        sharePhoneKeyboard
      );
      return;
    }

    // Обработка кнопок регистрации
    if (text === '📱 Ввести номер телефона') {
      ctx.reply('📱 Введите ваш номер телефона в формате: +373-XX-XXX-XX\n\nНапример: +373-60-123-45');
      return;
    }

    if (text === '📧 Ввести email') {
      ctx.reply('📧 Введите ваш email (например: user@gmail.com)');
      return;
    }

    // Проверяем регулярное выражение для телефона (+373-XXX-XXX-XX) или email
    const phoneRegex = /^\+373-\d{2}-\d{3}-\d{2}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    const isPhone = phoneRegex.test(text);
    const isEmail = emailRegex.test(text);

    if (isPhone || isEmail) {
      // Обновляем профиль пользователя
      const userData = {
        username: ctx.from.username,
      };

      if (isPhone) userData.phoneNumber = text;
      if (isEmail) userData.email = text;

      await api.post(`/users/telegram/${userId}`, userData);

      const successMsg = isPhone 
        ? `✅ Номер телефона ${text} сохранён!`
        : `✅ Email ${text} сохранён!`;
      
      ctx.reply(successMsg);

      // Проверяем, заполнены ли оба поля
      const userResponse = await api.get(`/users/telegram/${userId}`);
      const user = userResponse.data;

      if (user.phoneNumber && user.email) {
        // Регистрация завершена!
        ctx.reply(
          `🎉 Спасибо! Ваш профиль полностью заполнен!\n\n` +
          `Имя: ${user.firstName} ${user.lastName}\n` +
          `Телефон: ${user.phoneNumber}\n` +
          `Email: ${user.email}\n\n` +
          `Теперь вы можете пользоваться всеми функциями сервиса.`,
          mainMenuKeyboard
        );
        ctx.session.registrationStep = null;
      } else if (isPhone) {
        // После номера ждём email
        ctx.session.registrationStep = 'email';
        ctx.reply(
          `⏭️ Отлично!\n\n` +
          `Шаг 3️⃣ из 3️⃣\n\n` +
          `Введите ваш email:`,
          emailKeyboard
        );
      } else if (isEmail) {
        // После email проверяем, есть ли номер
        if (!user.phoneNumber) {
          ctx.session.registrationStep = 'phone';
          ctx.reply(
            `⏭️ Отлично!\n\n` +
            `Назад к шагу 2️⃣ из 3️⃣\n\n` +
            `Теперь поделитесь вашим номером телефона:`,
            sharePhoneKeyboard
          );
        } else {
          ctx.reply(
            `🎉 Спасибо! Ваш профиль полностью заполнен!\n\n` +
            `Имя: ${user.firstName} ${user.lastName}\n` +
            `Телефон: ${user.phoneNumber}\n` +
            `Email: ${user.email}\n\n` +
            `Теперь вы можете пользоваться всеми функциями сервиса.`,
            mainMenuKeyboard
          );
          ctx.session.registrationStep = null;
        }
      }
      return;
    }

    // Проверка на регистрацию (для всех кроме поддержки и контактной информации)
    if (text !== '📞 Связаться с поддержкой') {
      const isRegistered = await checkUserRegistered(ctx);
      if (!isRegistered) return;
    }

    // Проверка на блокировку
    if (text !== '📞 Связаться с поддержкой') {
      const isBlocked = await checkUserBlocked(ctx);
      if (isBlocked) return;
    }

    if (text === '📋 Доступные консоли') {
      await showAvailableConsoles(ctx);
    } else if (text === '🎮 Мои аренды') {
      await showMyRentals(ctx);
    } else if (text === '👤 Профиль') {
      await showUserProfile(ctx);
    } else if (text === '❓ Помощь') {
      ctx.reply(
        `<b>❓ Помощь</b>\n\n` +
        `<b>Как арендовать консоль?</b>\n` +
        `1. Выберите "Доступные консоли"\n` +
        `2. Укажите количество дней аренды\n` +
        `3. Подтвердите заказ\n\n` +
        `<b>Условия аренды:</b>\n` +
        `• Залог: 1000L\n` +
        `• Стоимость за день: 100L\n` +
        `• Минимум: 1 день\n\n` +
        `Вопросы? Напишите @support`,
        { parse_mode: 'HTML' }
      );
    } else if (text === '📞 Связаться с поддержкой') {
      ctx.reply(
        `<b>📞 Служба поддержки</b>\n\n` +
        `По всем вопросам обращайтесь:\n` +
        `• Telegram: @support\n` +
        `• Email: support@ps4rental.ru\n` +
        `• Телефон: +7 (900) 123-45-67\n\n` +
        `Мы работаем ежедневно с 9:00 до 21:00 🕐`,
        { parse_mode: 'HTML' }
      );
    } else {
      ctx.reply('Пожалуйста, используйте кнопки меню', mainMenuKeyboard);
    }
  } catch (error) {
    console.error('Ошибка обработки сообщения:', error);
    ctx.reply('Произошла ошибка. Попробуйте позже.');
  }
});

// Обработка нажатия на inline кнопки
bot.action(/rent_(.+)/, async (ctx) => {
  const consoleId = ctx.match[1];
  
  try {
    // Проверка регистрации
    const isRegistered = await checkUserRegistered(ctx);
    if (!isRegistered) {
      await ctx.answerCbQuery('❌ Вы не зарегистрированы', true);
      return;
    }

    // Проверка блокировки
    const isBlocked = await checkUserBlocked(ctx);
    if (isBlocked) {
      await ctx.answerCbQuery('❌ Ваш аккаунт заблокирован', true);
      return;
    }

    const response = await api.get(`/consoles/${consoleId}`);
    const console = response.data;
    
    await ctx.answerCbQuery();
    
    const message = 
      `<b>🎮 ${console.name}</b>\n\n` +
      `💰 Цена: ${console.pricePerDay}L/день\n` +
      `${getConditionText(console.condition)}\n` +
      `🔢 S/N: ${console.serialNumber}\n\n` +
      `<b>Выберите количество дней аренды:</b>`;
    
    const daysButtons = [
      [
        { text: '1 день', callback_data: `days_${consoleId}_1` },
        { text: '3 дня', callback_data: `days_${consoleId}_3` },
        { text: '7 дней', callback_data: `days_${consoleId}_7` }
      ],
      [
        { text: '14 дней', callback_data: `days_${consoleId}_14` },
        { text: '30 дней', callback_data: `days_${consoleId}_30` }
      ],
      [
        { text: '« Назад к списку', callback_data: 'back_to_list' }
      ]
    ];
    
    ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: daysButtons
      }
    });
  } catch (error) {
    console.error('Ошибка при выборе консоли:', error);
    await ctx.answerCbQuery('Ошибка загрузки консоли');
  }
});

// Обработка выбора количества дней
bot.action(/days_(.+)_(\d+)/, async (ctx) => {
  const consoleId = ctx.match[1];
  const days = parseInt(ctx.match[2]);
  
  try {
    // Проверка регистрации
    const isRegistered = await checkUserRegistered(ctx);
    if (!isRegistered) {
      await ctx.answerCbQuery('❌ Вы не зарегистрированы', true);
      return;
    }

    // Проверка блокировки
    const isBlocked = await checkUserBlocked(ctx);
    if (isBlocked) {
      await ctx.answerCbQuery('❌ Ваш аккаунт заблокирован', true);
      return;
    }

    const response = await api.get(`/consoles/${consoleId}`);
    const console = response.data;
    const totalPrice = console.pricePerDay * days;
    const deposit = 1000;
    
    await ctx.answerCbQuery();
    
    const message = 
      `<b>📋 Подтверждение заказа</b>\n\n` +
      `🎮 Консоль: <b>${console.name}</b>\n` +
      `📅 Количество дней: <b>${days}</b>\n` +
      `💰 Цена за день: ${console.pricePerDay}L\n` +
      `💵 Итого к оплате: <b>${totalPrice}L</b>\n` +
      `🔒 Залог: <b>${deposit}L</b>\n\n` +
      `<b>Общая сумма: ${totalPrice + deposit}L</b>\n\n` +
      `Подтвердите бронирование:`;
    
    const confirmButtons = [
      [
        { text: '✅ Подтвердить', callback_data: `confirm_${consoleId}_${days}` },
        { text: '❌ Отмена', callback_data: 'back_to_list' }
      ]
    ];
    
    ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: confirmButtons
      }
    });
  } catch (error) {
    console.error('Ошибка при расчёте цены:', error);
    await ctx.answerCbQuery('Ошибка расчёта');
  }
});

// Подтверждение бронирования
bot.action(/confirm_(.+)_(\d+)/, async (ctx) => {
  const consoleId = ctx.match[1];
  const days = parseInt(ctx.match[2]);
  
  try {
    // Проверка регистрации
    const isRegistered = await checkUserRegistered(ctx);
    if (!isRegistered) {
      await ctx.answerCbQuery('❌ Вы не зарегистрированы', true);
      return;
    }

    // Проверка блокировки
    const isBlocked = await checkUserBlocked(ctx);
    if (isBlocked) {
      await ctx.answerCbQuery('❌ Ваш аккаунт заблокирован', true);
      return;
    }

    const userId = ctx.from.id;
    
    // Получаем или создаём пользователя
    let userResponse;
    try {
      userResponse = await api.get(`/users/telegram/${userId}`);
    } catch (error) {
      // Если пользователь не найден, создаём его
      await registerUser(ctx.from);
      userResponse = await api.get(`/users/telegram/${userId}`);
    }
    
    const user = userResponse.data;
    const consoleResponse = await api.get(`/consoles/${consoleId}`);
    const console = consoleResponse.data;
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    
    const totalPrice = console.pricePerDay * days;
    const deposit = 1000;
    
    // Создаём аренду
    await api.post('/rentals', {
      consoleId: consoleId,
      userId: user._id,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalPrice: totalPrice,
      deposit: deposit,
      status: 'active'
    });
    
    await ctx.answerCbQuery('✅ Бронирование успешно!');
    
    const successMessage = 
      `<b>✅ Бронирование подтверждено!</b>\n\n` +
      `🎮 Консоль: <b>${console.name}</b>\n` +
      `📅 Срок аренды: <b>${days} дней</b>\n` +
      `📆 Начало: ${startDate.toLocaleDateString('ru-RU')}\n` +
      `📆 Конец: ${endDate.toLocaleDateString('ru-RU')}\n` +
      `💵 К оплате: <b>${totalPrice + deposit}L</b>\n\n` +
      `📍 Можете забрать консоль по адресу:\n` +
      `<i>г. Кишинёв, ул. Примерная, д. 1</i>\n\n` +
      `📞 Телефон: +373 (60) 123-45\n\n` +
      `Спасибо за заказ! 🎉`;
    
    ctx.editMessageText(successMessage, { parse_mode: 'HTML' });
    
    // Отправляем главное меню
    setTimeout(() => {
      ctx.reply('Выберите действие:', mainMenuKeyboard);
    }, 1000);
    
  } catch (error) {
    console.error('Ошибка при создании аренды:', error);
    await ctx.answerCbQuery('❌ Ошибка бронирования');
    ctx.reply('Произошла ошибка при бронировании. Попробуйте позже.');
  }
});

// Возврат к списку консолей
bot.action('back_to_list', async (ctx) => {
  try {
    // Проверка регистрации
    const isRegistered = await checkUserRegistered(ctx);
    if (!isRegistered) {
      await ctx.answerCbQuery('❌ Вы не зарегистрированы', true);
      return;
    }

    // Проверка блокировки
    const isBlocked = await checkUserBlocked(ctx);
    if (isBlocked) {
      await ctx.answerCbQuery('❌ Ваш аккаунт заблокирован', true);
      return;
    }

    await ctx.answerCbQuery();
    await showAvailableConsoles(ctx);
  } catch (error) {
    console.error('Ошибка при возврате к списку:', error);
    await ctx.answerCbQuery('Ошибка');
  }
});

// Показать доступные консоли
async function showAvailableConsoles(ctx) {
  try {
    // Проверка регистрации
    const isRegistered = await checkUserRegistered(ctx);
    if (!isRegistered) return;

    // Проверка блокировки
    const isBlocked = await checkUserBlocked(ctx);
    if (isBlocked) return;

    const response = await api.get('/consoles/available/list');
    const consoles = response.data;

    if (consoles.length === 0) {
      const noConsolesMsg = '❌ Нет доступных консолей. Попробуйте позже.';
      if (ctx.callbackQuery) {
        return ctx.editMessageText(noConsolesMsg);
      } else {
        return ctx.reply(noConsolesMsg);
      }
    }

    let message = '<b>📋 Доступные консоли:</b>\n\n';

    consoles.forEach((console, index) => {
      message += `${index + 1}. <b>${console.name}</b>\n`;
      message += `   💰 Цена: ${console.pricePerDay}L/день\n`;
      message += `   ${getConditionText(console.condition)}\n`;
      message += `   🔢 S/N: ${console.serialNumber}\n\n`;
    });

    message += '👇 Выберите консоль для аренды:';

    // Создаём inline кнопки для каждой консоли
    const buttons = consoles.map((console, index) => ([
      {
        text: `🎮 ${index + 1}. ${console.name} (${console.pricePerDay}L/день)`,
        callback_data: `rent_${console._id}`
      }
    ]));

    const options = { 
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: buttons
      }
    };

    if (ctx.callbackQuery) {
      ctx.editMessageText(message, options);
    } else {
      ctx.reply(message, options);
    }
  } catch (error) {
    console.error('Ошибка получения консолей:', error);
    if (ctx.callbackQuery) {
      ctx.editMessageText('Ошибка при получении списка консолей.');
    } else {
      ctx.reply('Ошибка при получении списка консолей.');
    }
  }
}

// Показать мои аренды
async function showMyRentals(ctx) {
  try {
    // Проверка регистрации
    const isRegistered = await checkUserRegistered(ctx);
    if (!isRegistered) return;

    // Проверка блокировки
    const isBlocked = await checkUserBlocked(ctx);
    if (isBlocked) return;

    const userId = ctx.from.id;
    const response = await api.get(`/users/telegram/${userId}`);
    const user = response.data;

    const rentalResponse = await api.get('/rentals/active/list');
    const rentals = rentalResponse.data.filter((r) => r.userId._id === user._id);

    if (rentals.length === 0) {
      return ctx.reply('📭 У вас нет активных аренд.');
    }

    let message = '<b>🎮 Ваши активные аренды:</b>\n\n';

    rentals.forEach((rental) => {
      const endDate = new Date(rental.endDate);
      const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));

      message += `<b>${rental.consoleId.name}</b>\n`;
      message += `💰 Цена: ${rental.totalPrice}L\n`;
      message += `📅 Осталось: ${daysLeft} дней\n`;
      message += `⏰ До: ${endDate.toLocaleDateString('ru-RU')}\n\n`;
    });

    ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Ошибка получения аренд:', error);
    ctx.reply('Ошибка при получении ваших аренд.');
  }
}

// Показать профиль
async function showUserProfile(ctx) {
  try {
    // Проверка регистрации
    const isRegistered = await checkUserRegistered(ctx);
    if (!isRegistered) return;

    // Проверка блокировки
    const isBlocked = await checkUserBlocked(ctx);
    if (isBlocked) return;

    const userId = ctx.from.id;
    const response = await api.get(`/users/telegram/${userId}`);
    const user = response.data;

    const message =
      `<b>👤 Ваш профиль</b>\n\n` +
      `<b>👤 Имя:</b> ${user.firstName} ${user.lastName || ''}\n` +
      `<b>👤 Никнейм:</b> @${user.username || 'не указан'}\n` +
      `<b>📱 Телефон:</b> ${user.phoneNumber || 'не указан'}\n` +
      `<b>📧 Email:</b> ${user.email || 'не указан'}\n\n` +
      `<b>Статистика:</b>\n` +
      `📊 Всего аренд: ${user.totalRentals}\n` +
      `💵 Потрачено: ${user.totalSpent}L\n` +
      `🚫 Статус: ${user.isBlocked ? 'Заблокирован' : 'Активен'}`;

    ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    ctx.reply('Ошибка при получении профиля.');
  }
}

// Регистрация пользователя
async function registerUser(telegramUser) {
  try {
    // Проверяем, не зарегистрирован ли пользователь уже
    const existingUser = await api.get(`/users/telegram/${telegramUser.id}`).catch(() => null);
    
    if (existingUser?.data) {
      // Пользователь уже зарегистрирован, не регистрируем заново
      return;
    }

    // Регистрируем нового пользователя
    await api.post(`/users/telegram/${telegramUser.id}`, {
      username: telegramUser.username,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
    });
  } catch (error) {
    console.error('Ошибка регистрации пользователя:', error.message);
  }
}

// Вспомогательная функция
function getConditionText(condition) {
  const conditions = {
    excellent: '⭐⭐⭐⭐⭐ Отличное',
    good: '⭐⭐⭐⭐ Хорошее',
    fair: '⭐⭐⭐ Среднее',
    poor: '⭐⭐ Плохое',
  };
  return conditions[condition] || 'Неизвестно';
}

// Команда для просмотра уведомлений
bot.command('notifications', async (ctx) => {
  try {
    const user = await api.get(`/users/telegram/${ctx.from.id}`);
    if (!user.data || !user.data._id) {
      return ctx.reply('❌ Пользователь не найден');
    }

    const response = await api.get(`/notifications/user/${user.data._id}?limit=5`);
    const notifications = response.data.notifications || [];
    const unreadCount = response.data.unread || 0;

    if (notifications.length === 0) {
      return ctx.reply('📭 У вас нет уведомлений');
    }

    let message = `📬 <b>Ваши уведомления</b> (${unreadCount} непрочитанных)\n\n`;
    
    notifications.forEach((notif, index) => {
      const status = notif.isRead ? '✓' : '●';
      const date = new Date(notif.createdAt).toLocaleDateString('ru-RU', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      message += `${status} <b>${index + 1}. ${notif.title}</b>\n`;
      message += `   ${date}\n`;
      message += `   ${notif.message.substring(0, 100)}...\n\n`;
    });

    ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Ошибка получения уведомлений:', error);
    ctx.reply('❌ Ошибка при получении уведомлений');
  }
});

// Команда для просмотра штрафов
bot.command('penalties', async (ctx) => {
  try {
    const user = await api.get(`/users/telegram/${ctx.from.id}`);
    if (!user.data || !user.data._id) {
      return ctx.reply('❌ Пользователь не найден');
    }

    const response = await api.get(`/penalties/user/${user.data._id}`);
    const penalties = response.data.penalties || [];
    const totalPending = response.data.totalPending || 0;

    if (penalties.length === 0) {
      return ctx.reply('✅ У вас нет штрафов');
    }

    let message = `⚠️ <b>Ваши штрафы</b>\n\n`;
    message += `💰 <b>К оплате:</b> ${totalPending} руб.\n\n`;

    penalties.forEach((penalty, index) => {
      let typeEmoji = '⚠️';
      if (penalty.type === 'late_return') typeEmoji = '⏰';
      if (penalty.type === 'damage') typeEmoji = '🔧';
      if (penalty.type === 'missing_item') typeEmoji = '❌';

      const statusEmoji = {
        pending: '⏳',
        approved: '👍',
        paid: '✅',
        waived: '✓',
      };

      message += `${typeEmoji} <b>${index + 1}. ${penalty.description}</b>\n`;
      message += `   Сумма: <b>${penalty.amount} руб.</b>\n`;
      message += `   Статус: ${statusEmoji[penalty.status] || '❓'} ${penalty.status}\n\n`;
    });

    ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Ошибка получения штрафов:', error);
    ctx.reply('❌ Ошибка при получении штрафов');
  }
});

// Обработка контакта (номер телефона)
bot.on('contact', async (ctx) => {
  try {
    const userId = ctx.from.id;
    const phone = ctx.message.contact.phone_number;

    // Форматируем номер в +373-XX-XXX-XX
    let formattedPhone = phone.replace(/\D/g, ''); // Убираем все не-цифры
    
    if (formattedPhone.startsWith('373')) {
      formattedPhone = '+' + formattedPhone;
    } else if (formattedPhone.startsWith('7')) {
      formattedPhone = '+' + formattedPhone;
    } else {
      formattedPhone = '+373' + formattedPhone;
    }

    // Пытаемся переформатировать в нужный вид
    const cleaned = formattedPhone.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      const lastDigits = cleaned.slice(-8);
      formattedPhone = `+373-${lastDigits.substring(0, 2)}-${lastDigits.substring(2, 5)}-${lastDigits.substring(5)}`;
    }

    // Сохраняем номер в БД
    ctx.session = ctx.session || {};
    await api.post(`/users/telegram/${userId}`, {
      username: ctx.from.username,
      phoneNumber: formattedPhone,
    });

    ctx.reply(`✅ Спасибо! Номер телефона ${formattedPhone} сохранён!`);

    // Проверяем статус регистрации
    const userResponse = await api.get(`/users/telegram/${userId}`);
    const user = userResponse.data;

    if (user.phoneNumber && user.email) {
      // Регистрация завершена
      ctx.reply(
        `🎉 Спасибо! Ваш профиль полностью заполнен!\n\n` +
        `Имя: ${user.firstName} ${user.lastName}\n` +
        `Телефон: ${user.phoneNumber}\n` +
        `Email: ${user.email}\n\n` +
        `Теперь вы можете пользоваться всеми функциями сервиса.`,
        mainMenuKeyboard
      );
      ctx.session.registrationStep = null;
    } else if (!user.email) {
      // Нужен email
      ctx.session.registrationStep = 'email';
      ctx.reply(
        `⏭️ Отлично!\n\n` +
        `Шаг 3️⃣ из 3️⃣\n\n` +
        `Введите ваш email:`,
        emailKeyboard
      );
    }
  } catch (error) {
    console.error('Ошибка при обработке контакта:', error);
    ctx.reply('❌ Ошибка при сохранении номера. Попробуйте позже.');
  }
});

// Запуск бота
bot.launch();

console.log('🤖 Telegram Bot запущен...');

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
