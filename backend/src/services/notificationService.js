const axios = require('axios');
const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');
const User = require('../models/User');

// Настройка Nodemailer (используйте переменные окружения)
const emailTransporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password',
  },
});

class NotificationService {
  /**
   * Создать уведомление и отправить его
   */
  static async sendNotification(userId, type, title, message, options = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        console.error(`Пользователь с ID ${userId} не найден`);
        return null;
      }

      // Создаем запись в БД
      const notification = new Notification({
        userId,
        type,
        title,
        message,
        relatedId: options.relatedId || {},
        sentVia: {
          telegram: options.sendTelegram !== false,
          email: options.sendEmail === true,
          inApp: true,
        },
      });

      // Отправляем в Telegram
      if (options.sendTelegram !== false && user.telegramId) {
        const telegramSent = await this.sendTelegramNotification(
          user.telegramId,
          title,
          message
        );
        if (telegramSent) {
          notification.sentVia.telegram = true;
          notification.sentAt.telegram = new Date();
          console.log(`✅ Telegram уведомление отправлено пользователю ${user.telegramId}`);
        }
      }

      // Отправляем Email
      if (options.sendEmail && user.email) {
        const emailSent = await this.sendEmailNotification(
          user.email,
          title,
          message,
          options.htmlContent
        );
        if (emailSent) {
          notification.sentVia.email = true;
          notification.sentAt.email = new Date();
          console.log(`✅ Email уведомление отправлено на ${user.email}`);
        }
      }

      await notification.save();
      return notification;
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления:', error.message);
      return null;
    }
  }

  /**
   * Отправить уведомление в Telegram
   */
  static async sendTelegramNotification(telegramId, title, message, parseMode = 'HTML') {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        console.error('TELEGRAM_BOT_TOKEN не установлен');
        return false;
      }

      const fullMessage = `<b>${title}</b>\n\n${message}`;

      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: telegramId,
        text: fullMessage,
        parse_mode: parseMode,
      });

      return true;
    } catch (error) {
      console.error('❌ Ошибка отправки Telegram уведомления:', error.message);
      return false;
    }
  }

  /**
   * Отправить Email уведомление
   */
  static async sendEmailNotification(email, subject, text, htmlContent = null) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@ps4rental.local',
        to: email,
        subject,
        text,
        html: htmlContent || `<p>${text}</p>`,
      };

      await emailTransporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('❌ Ошибка отправки Email уведомления:', error.message);
      return false;
    }
  }

  /**
   * Отправить напоминание о конце аренды (за 1 день)
   */
  static async sendRentalReminderNotification(rental) {
    try {
      const user = await User.findById(rental.userId);
      const console = await require('../models/Console').findById(rental.consoleId);

      if (!user || !console) return null;

      const endDate = new Date(rental.endDate).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const title = '⏰ Напоминание о конце аренды';
      const message = `Напоминаем, что аренда консоли <b>${console.name}</b> заканчивается завтра в ${endDate}.\n\nПожалуйста, подготовьтесь к возврату консоли. При просрочке возврата будут применены штрафные санкции.`;

      return await this.sendNotification(
        rental.userId,
        'rental_reminder',
        title,
        message,
        {
          relatedId: { rentalId: rental._id },
          sendTelegram: true,
          sendEmail: true,
        }
      );
    } catch (error) {
      console.error('❌ Ошибка отправки напоминания:', error.message);
      return null;
    }
  }

  /**
   * Отправить уведомление о штрафе
   */
  static async sendPenaltyNotification(penalty) {
    try {
      const user = await User.findById(penalty.userId);
      const console = await require('../models/Console').findById(penalty.consoleId);

      if (!user || !console) return null;

      let typeText = '';
      switch (penalty.type) {
        case 'late_return':
          typeText = `⏰ Штраф за просрочку возврата на ${penalty.daysLate} дней`;
          break;
        case 'damage':
          typeText = '🔧 Штраф за повреждение консоли';
          break;
        case 'missing_item':
          typeText = '❌ Штраф за отсутствие комплектующих';
          break;
        default:
          typeText = '⚠️ Наложен штраф';
      }

      const title = typeText;
      const message = `На ваш аккаунт наложен штраф в размере <b>${penalty.amount} L</b>\n\n<b>Консоль:</b> ${console.name}\n<b>Причина:</b> ${penalty.description}\n\nДля оспаривания штрафа обратитесь в службу поддержки.`;

      return await this.sendNotification(
        penalty.userId,
        'penalty_notice',
        title,
        message,
        {
          relatedId: { penaltyId: penalty._id },
          sendTelegram: true,
          sendEmail: true,
        }
      );
    } catch (error) {
      console.error('❌ Ошибка отправки уведомления о штрафе:', error.message);
      return null;
    }
  }

  /**
   * Отправить уведомление о начале аренды
   */
  static async sendRentalStartNotification(rental) {
    try {
      const user = await User.findById(rental.userId);
      const console = await require('../models/Console').findById(rental.consoleId);

      if (!user || !console) return null;

      const endDate = new Date(rental.endDate).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const title = '🎮 Аренда начата';
      const message = `Ваша аренда консоли <b>${console.name}</b> начата!\n\n<b>Дата возврата:</b> ${endDate}\n<b>Стоимость:</b> ${rental.totalPrice} L\n\nБудьте осторожны с консолью. При повреждении будут применены штрафные санкции.`;

      return await this.sendNotification(
        rental.userId,
        'rental_started',
        title,
        message,
        {
          relatedId: { rentalId: rental._id },
          sendTelegram: true,
        }
      );
    } catch (error) {
      console.error('❌ Ошибка отправки уведомления о начале аренды:', error.message);
      return null;
    }
  }

  /**
   * Отправить уведомление об завершении аренды
   */
  static async sendRentalCompletedNotification(rental) {
    try {
      const user = await User.findById(rental.userId);
      const console = await require('../models/Console').findById(rental.consoleId);

      if (!user || !console) return null;

      const title = '✅ Аренда завершена';
      const message = `Ваша аренда консоли <b>${console.name}</b> успешно завершена!\n\nСпасибо за использование нашего сервиса. Приходите еще! 🎮`;

      return await this.sendNotification(
        rental.userId,
        'rental_completed',
        title,
        message,
        {
          relatedId: { rentalId: rental._id },
          sendTelegram: true,
        }
      );
    } catch (error) {
      console.error('❌ Ошибка отправки уведомления об завершении аренды:', error.message);
      return null;
    }
  }

  /**
   * Получить все уведомления пользователя
   */
  static async getUserNotifications(userId, limit = 20) {
    try {
      return await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error) {
      console.error('❌ Ошибка получения уведомлений:', error.message);
      return [];
    }
  }

  /**
   * Отметить уведомление как прочитанное
   */
  static async markAsRead(notificationId) {
    try {
      return await Notification.findByIdAndUpdate(
        notificationId,
        { isRead: true },
        { new: true }
      );
    } catch (error) {
      console.error('❌ Ошибка отметки уведомления:', error.message);
      return null;
    }
  }

  /**
   * Отметить все уведомления как прочитанные
   */
  static async markAllAsRead(userId) {
    try {
      return await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true }
      );
    } catch (error) {
      console.error('❌ Ошибка отметки всех уведомлений:', error.message);
      return null;
    }
  }
}

module.exports = NotificationService;
