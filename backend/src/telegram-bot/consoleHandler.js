const { Markup } = require('telegraf');
const Console = require('../models/Console');
const Discount = require('../models/Discount');
const { getDiscountForConsole, calculateDiscountedPrice } = require('../utils/discountSystem');

/**
 * Показать список всех доступных консолей
 */
async function showConsoleList(ctx) {
  try {
    const consoles = await Console.find({ status: 'available' }).sort({ name: 1 });

    if (consoles.length === 0) {
      await ctx.reply('😔 К сожалению, сейчас нет доступных консолей.');
      return;
    }

    let message = '🎮 <b>Доступные консоли:</b>\n\n';
    
    const buttons = [];
    
    for (const console of consoles) {
      const discount = await getDiscountForConsole(console._id);
      const priceInfo = discount 
        ? `💰 <s>${console.rentalPrice} MDL/ч</s> → <b>${calculateDiscountedPrice(console.rentalPrice, discount)} MDL/ч</b> 🔥`
        : `💰 <b>${console.rentalPrice} MDL/ч</b>`;
      
      message += `${console.name}\n`;
      message += `📱 Модель: ${console.model}\n`;
      message += `🎯 Игры: ${console.game}\n`;
      message += `${priceInfo}\n`;
      
      if (discount) {
        message += `🎁 Скидка ${discount.discountPercent}%\n`;
      }
      
      message += `\n`;

      buttons.push([
        Markup.button.callback(`📦 ${console.name}`, `select_console_${console._id}`)
      ]);
    }

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons)
    });
  } catch (error) {
    console.error('❌ Ошибка при получении консолей:', error);
    await ctx.reply('Произошла ошибка при загрузке консолей.');
  }
}

/**
 * Показать детали конкретной консоли
 */
async function showConsoleDetails(ctx, consoleId) {
  try {
    const console = await Console.findById(consoleId);
    
    if (!console) {
      await ctx.answerCbQuery('❌ Консоль не найдена');
      return;
    }

    const discount = await getDiscountForConsole(consoleId);
    
    let message = `🎮 <b>${console.name}</b>\n\n`;
    message += `📱 <b>Модель:</b> ${console.model}\n`;
    message += `🎯 <b>Игры:</b> ${console.game}\n`;
    message += `📍 <b>Локация:</b> ${console.location || 'Не указана'}\n`;
    message += `⏰ <b>Время аренды:</b> ${console.rentalTime || 'Гибкое'}\n`;
    
    if (discount) {
      const originalPrice = console.rentalPrice;
      const discountedPrice = calculateDiscountedPrice(originalPrice, discount);
      message += `\n💰 <b>Цена:</b> <s>${originalPrice} MDL/ч</s> → <b>${discountedPrice} MDL/ч</b>\n`;
      message += `🎁 <b>Скидка:</b> ${discount.discountPercent}% 🔥\n`;
    } else {
      message += `\n💰 <b>Цена:</b> ${console.rentalPrice} MDL/ч\n`;
    }
    
    message += `\n📊 <b>Статус:</b> ${console.status === 'available' ? '✅ Доступна' : '❌ Занята'}\n`;

    if (console.status === 'available') {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📝 Арендовать', `rent_console_${consoleId}`)],
        [Markup.button.callback('💰 Купить', `buy_console_${consoleId}`)],
        [Markup.button.callback('◀️ Назад к списку', 'show_consoles')]
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
    } else {
      await ctx.reply(message, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[
          Markup.button.callback('◀️ Назад к списку', 'show_consoles')
        ]])
      });
    }

    await ctx.answerCbQuery();
  } catch (error) {
    console.error('❌ Ошибка при загрузке деталей консоли:', error);
    await ctx.answerCbQuery('❌ Ошибка при загрузке');
  }
}

/**
 * Показать консоли доступные для покупки
 */
async function showConsolesForPurchase(ctx) {
  try {
    const consoles = await Console.find({ forSale: true }).sort({ name: 1 });

    if (consoles.length === 0) {
      await ctx.reply('😔 К сожалению, сейчас нет консолей доступных для покупки.');
      return;
    }

    let message = '💰 <b>Консоли на продажу:</b>\n\n';
    
    const buttons = [];
    
    for (const console of consoles) {
      message += `${console.name}\n`;
      message += `📱 Модель: ${console.model}\n`;
      message += `💵 Цена: <b>${console.salePrice || 'По запросу'} MDL</b>\n`;
      message += `📊 Состояние: ${console.condition || 'Отличное'}\n\n`;

      buttons.push([
        Markup.button.callback(`💰 ${console.name}`, `purchase_console_${console._id}`)
      ]);
    }

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons)
    });
  } catch (error) {
    console.error('❌ Ошибка при получении консолей на продажу:', error);
    await ctx.reply('Произошла ошибка при загрузке консолей.');
  }
}

module.exports = {
  showConsoleList,
  showConsoleDetails,
  showConsolesForPurchase
};
