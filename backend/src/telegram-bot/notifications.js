const axios = require('axios');

class NotificationService {
  constructor(bot, adminChatId) {
    this.bot = bot;
    this.adminChatId = adminChatId;
  }

  async notifyNewRental(rental, user, console) {
    try {
      const message = `
📱 <b>Новая заявка на аренду!</b>

👤 Пользователь: ${user.firstName} ${user.lastName}
📱 Контакт: ${user.phoneNumber}
🎮 Консоль: ${console.name}
💰 Стоимость: ${rental.totalPrice} MDL
📅 Дата: ${new Date(rental.rentalDate).toLocaleDateString('uk-UA')}
      `;

      await this.bot.telegram.sendMessage(this.adminChatId, message, {
        parse_mode: 'HTML',
      });

      // Отправить пользователю подтверждение
      await this.bot.telegram.sendMessage(
        user.telegramId,
        '✅ Ваша заявка получена. Ожидайте подтверждения администратора.',
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      console.error('Ошибка при отправке уведомления:', error);
    }
  }

  async notifyApproved(user, console) {
    try {
      const message = `
✅ <b>Ваша заявка одобрена!</b>

🎮 Консоль: ${console.name}
💰 Стоимость: ${console.rentalPrice} MDL/час
📍 Локация: ${console.location}
      `;

      await this.bot.telegram.sendMessage(user.telegramId, message, {
        parse_mode: 'HTML',
      });
    } catch (error) {
      console.error('Ошибка при отправке одобрения:', error);
    }
  }

  async notifyRejected(user, console, reason) {
    try {
      const message = `
❌ <b>К сожалению, ваша заявка отклонена</b>

🎮 Консоль: ${console.name}
📝 Причина: ${reason || 'Консоль недоступна'}
      `;

      await this.bot.telegram.sendMessage(user.telegramId, message, {
        parse_mode: 'HTML',
      });
    } catch (error) {
      console.error('Ошибка при отправке отклонения:', error);
    }
  }
}

module.exports = NotificationService;
