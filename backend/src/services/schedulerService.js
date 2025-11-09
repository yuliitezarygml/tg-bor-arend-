const cron = require('node-cron');
const Rental = require('../models/Rental');
const Penalty = require('../models/Penalty');
const NotificationService = require('./notificationService');

class SchedulerService {
  /**
   * Инициализировать все запланированные задачи
   */
  static async initialize() {
    console.log('📅 Инициализация планировщика задач...');

    // Проверка напоминаний каждый час
    this.scheduleReminderCheck();

    // Проверка просроченных аренд каждые 30 минут
    this.scheduleOverdueCheck();

    // Очистка старых уведомлений каждый день в 00:00
    this.scheduleNotificationCleanup();

    console.log('✅ Планировщик инициализирован');
  }

  /**
   * Проверить аренды, заканчивающиеся через 24 часа и отправить напоминания
   * Запуск: каждый час
   */
  static scheduleReminderCheck() {
    cron.schedule('0 * * * *', async () => {
      console.log('🔔 Проверка напоминаний о конце аренды...');
      try {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Ищем активные аренды, заканчивающиеся в течение следующих 24 часов
        const rentals = await Rental.find({
          status: 'active',
          endDate: {
            $gte: now,
            $lte: tomorrow,
          },
        }).populate('userId');

        for (const rental of rentals) {
          // Проверяем, не отправляли ли уже напоминание
          const notificationExists = await Notification.findOne({
            'relatedId.rentalId': rental._id,
            type: 'rental_reminder',
            createdAt: {
              $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // За последние 24 часа
            },
          });

          if (!notificationExists) {
            await NotificationService.sendRentalReminderNotification(rental);
          }
        }

        if (rentals.length > 0) {
          console.log(`✅ Отправлено ${rentals.length} напоминаний`);
        }
      } catch (error) {
        console.error('❌ Ошибка проверки напоминаний:', error.message);
      }
    });
  }

  /**
   * Проверить просроченные аренды и применить штрафы
   * Запуск: каждые 30 минут
   */
  static scheduleOverdueCheck() {
    cron.schedule('*/30 * * * *', async () => {
      console.log('⏰ Проверка просроченных аренд...');
      try {
        const now = new Date();

        // Ищем просроченные активные аренды
        const overdueRentals = await Rental.find({
          status: 'active',
          endDate: { $lt: now },
        }).populate('userId').populate('consoleId');

        for (const rental of overdueRentals) {
          // Проверяем, есть ли уже штраф за эту аренду
          const existingPenalty = await Penalty.findOne({
            rentalId: rental._id,
            type: 'late_return',
          });

          if (!existingPenalty) {
            const daysLate = Math.ceil(
              (now - new Date(rental.endDate)) / (1000 * 60 * 60 * 24)
            );

            // Расчет штрафа: 20% от стоимости за каждый полный день просрочки
            const penaltyAmount = Math.ceil(
              (rental.totalPrice * 0.2 * daysLate)
            );

            const penalty = new Penalty({
              userId: rental.userId._id,
              rentalId: rental._id,
              consoleId: rental.consoleId._id,
              type: 'late_return',
              description: `Просрочка возврата консоли на ${daysLate} дней`,
              amount: penaltyAmount,
              daysLate,
              status: 'pending',
              createdBy: null, // Автоматический штраф
            });

            await penalty.save();

            // Отправляем уведомление о штрафе
            await NotificationService.sendPenaltyNotification(penalty);

            console.log(
              `⚠️ Штраф наложен на пользователя ${rental.userId._id}: ${penaltyAmount} руб.`
            );
          }
        }

        if (overdueRentals.length > 0) {
          console.log(`✅ Обработано ${overdueRentals.length} просроченных аренд`);
        }
      } catch (error) {
        console.error('❌ Ошибка проверки просроченных аренд:', error.message);
      }
    });
  }

  /**
   * Очистить старые уведомления (старше 30 дней)
   * Запуск: каждый день в 00:00
   */
  static scheduleNotificationCleanup() {
    cron.schedule('0 0 * * *', async () => {
      console.log('🧹 Очистка старых уведомлений...');
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const Notification = require('../models/Notification');
        const result = await Notification.deleteMany({
          createdAt: { $lt: thirtyDaysAgo },
          isRead: true,
        });

        console.log(`✅ Удалено ${result.deletedCount} старых уведомлений`);
      } catch (error) {
        console.error('❌ Ошибка очистки уведомлений:', error.message);
      }
    });
  }

  /**
   * Остановить все задачи планировщика
   */
  static stopAll() {
    cron.getTasks().forEach((task) => {
      task.stop();
    });
    console.log('⏹️  Планировщик остановлен');
  }
}

module.exports = SchedulerService;
