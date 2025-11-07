const { Markup } = require('telegraf');
const User = require('../models/User');
const Console = require('../models/Console');

/**
 * Показать детали консоли для покупки
 */
async function showPurchaseDetails(ctx, consoleId) {
  try {
    const console = await Console.findById(consoleId);
    
    if (!console || !console.forSale) {
      await ctx.answerCbQuery('❌ Консоль недоступна для покупки');
      return;
    }

    let message = `💰 <b>Покупка консоли</b>\n\n`;
    message += `🎮 <b>${console.name}</b>\n`;
    message += `📱 <b>Модель:</b> ${console.model}\n`;
    message += `🎯 <b>Игры:</b> ${console.game}\n`;
    message += `📊 <b>Состояние:</b> ${getConditionText(console.condition)}\n`;
    message += `💵 <b>Цена:</b> ${console.salePrice} MDL\n\n`;
    
    if (console.description) {
      message += `📝 <b>Описание:</b> ${console.description}\n\n`;
    }

    message += `❓ Хотите купить эту консоль?\n`;
    message += `Для оформления покупки свяжитесь с администратором.`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('✅ Связаться с администратором', `contact_admin_purchase_${consoleId}`)],
      [Markup.button.callback('◀️ Назад к списку', 'show_purchase_consoles')]
    ]);

    // Отправить фото если есть
    if (console.image) {
      try {
        const fs = require('fs');
        const path = require('path');
        const imagePath = path.join(__dirname, '../../uploads/consoles', console.image);
        
        if (fs.existsSync(imagePath)) {
          await ctx.replyWithPhoto({ source: imagePath }, {
            caption: message,
            parse_mode: 'HTML',
            ...keyboard
          });
        } else {
          await ctx.reply(message, {
            parse_mode: 'HTML',
            ...keyboard
          });
        }
      } catch (err) {
        console.error('Ошибка при отправке фото:', err);
        await ctx.reply(message, {
          parse_mode: 'HTML',
          ...keyboard
        });
      }
    } else {
      await ctx.reply(message, {
        parse_mode: 'HTML',
        ...keyboard
      });
    }

    await ctx.answerCbQuery();
  } catch (error) {
    console.error('❌ Ошибка при загрузке деталей покупки:', error);
    await ctx.answerCbQuery('❌ Ошибка при загрузке');
  }
}

/**
 * Обработать запрос на связь с администратором для покупки
 */
async function handleContactAdminForPurchase(ctx, consoleId) {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id.toString() });
    const console = await Console.findById(consoleId);

    if (!user || !console) {
      await ctx.answerCbQuery('❌ Ошибка');
      return;
    }

    // Отправить уведомление администратору
    const adminChatId = process.env.ADMIN_CHAT_ID;
    
    let adminMessage = `🔔 <b>Новый запрос на покупку!</b>\n\n`;
    adminMessage += `👤 <b>Пользователь:</b> ${user.firstName} ${user.lastName}\n`;
    adminMessage += `📞 <b>Телефон:</b> ${user.phoneNumber}\n`;
    
    if (user.username) {
      adminMessage += `💬 <b>Username:</b> @${user.username}\n`;
    }
    
    adminMessage += `\n🎮 <b>Консоль:</b> ${console.name}\n`;
    adminMessage += `📱 <b>Модель:</b> ${console.model}\n`;
    adminMessage += `💵 <b>Цена:</b> ${console.salePrice} MDL\n`;

    const { getBot } = require('./bot');
    const bot = getBot();
    
    await bot.telegram.sendMessage(adminChatId, adminMessage, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[
        Markup.button.url('💬 Написать пользователю', `tg://user?id=${user.telegramId}`)
      ]])
    });

    await ctx.reply(
      '✅ Ваш запрос отправлен администратору!\n\nОн свяжется с вами в ближайшее время для уточнения деталей покупки.',
      require('./keyboards').getMainKeyboard()
    );

    await ctx.answerCbQuery('✅ Запрос отправлен');
  } catch (error) {
    console.error('❌ Ошибка при отправке запроса:', error);
    await ctx.answerCbQuery('❌ Ошибка');
  }
}

/**
 * Получить текстовое описание состояния
 */
function getConditionText(condition) {
  const conditions = {
    new: '🆕 Новая',
    excellent: '💎 Отличное',
    good: '✅ Хорошее',
    fair: '📦 Удовлетворительное'
  };
  return conditions[condition] || condition;
}

module.exports = {
  showPurchaseDetails,
  handleContactAdminForPurchase
};
