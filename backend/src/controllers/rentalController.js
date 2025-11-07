const Rental = require('../models/Rental');
const Console = require('../models/Console');
const User = require('../models/User');
const { getBot } = require('../telegram-bot/bot');
const { getApproveKeyboard } = require('../telegram-bot/keyboards');

// Получить все заявки на аренду
exports.getAllRentals = async (req, res) => {
  try {
    const rentals = await Rental.find()
      .populate('userId')
      .populate('consoleId')
      .sort({ createdAt: -1 });
    res.json(rentals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Получить заявки пользователя
exports.getUserRentals = async (req, res) => {
  try {
    const rentals = await Rental.find({ userId: req.params.userId })
      .populate('consoleId')
      .sort({ createdAt: -1 });
    res.json(rentals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Создать заявку на аренду
exports.createRental = async (req, res) => {
  try {
    const { userId, consoleId, rentalDate, returnDate } = req.body;

    const console = await Console.findById(consoleId);
    const user = await User.findById(userId);

    if (!console) {
      return res.status(404).json({ message: 'Консоль не найдена' });
    }

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    if (console.status !== 'available') {
      return res.status(400).json({ message: 'Консоль недоступна' });
    }

    // Расчет стоимости
    const days = Math.ceil(
      (new Date(returnDate) - new Date(rentalDate)) / (1000 * 60 * 60 * 24)
    );
    const totalPrice = console.rentalPrice * days;

    const rental = new Rental({
      userId,
      consoleId,
      rentalDate,
      returnDate,
      totalPrice,
    });

    const savedRental = await rental.save();

    // Получить заполненные данные
    const populatedRental = await Rental.findById(savedRental._id)
      .populate('userId')
      .populate('consoleId');

    // Отправить уведомление администратору в Telegram
    const bot = getBot();
    if (bot) {
      const adminChatId = process.env.ADMIN_CHAT_ID;
      const message = `
📱 <b>Новая заявка на аренду!</b>

👤 Пользователь: ${user.firstName} ${user.lastName}
📱 Контакт: ${user.phoneNumber}
🎮 Консоль: ${console.name}
💰 Стоимость: ${totalPrice} MDL
📅 Дата: ${new Date(rentalDate).toLocaleDateString('uk-UA')}
⏰ Возврат: ${new Date(returnDate).toLocaleDateString('uk-UA')}
      `;

      try {
        await bot.telegram.sendMessage(adminChatId, message, {
          parse_mode: 'HTML',
          reply_markup: getApproveKeyboard(savedRental._id).reply_markup,
        });
      } catch (error) {
        console.error('Ошибка при отправке уведомления в Telegram:', error);
      }
    }

    res.status(201).json(populatedRental);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Одобрить заявку
exports.approveRental = async (req, res) => {
  try {
    const rental = await Rental.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', notificationSentToUser: true },
      { new: true }
    )
      .populate('userId')
      .populate('consoleId');

    if (!rental) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    // Обновить статус консоли
    await Console.findByIdAndUpdate(rental.consoleId._id, {
      status: 'rented',
    });

    // Отправить уведомление пользователю в Telegram
    const bot = getBot();
    if (bot && rental.userId.telegramId) {
      const message = `
✅ <b>Ваша заявка одобрена!</b>

🎮 Консоль: ${rental.consoleId.name}
💰 Стоимость: ${rental.totalPrice} MDL
📍 Локация: ${rental.consoleId.location}
      `;

      try {
        await bot.telegram.sendMessage(rental.userId.telegramId, message, {
          parse_mode: 'HTML',
        });
      } catch (error) {
        console.error('Ошибка при отправке уведомления:', error);
      }
    }

    res.json(rental);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Отклонить заявку
exports.rejectRental = async (req, res) => {
  try {
    const { reason } = req.body;

    const rental = await Rental.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', notificationSentToUser: true, adminNotes: reason },
      { new: true }
    )
      .populate('userId')
      .populate('consoleId');

    if (!rental) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    // Обновить статус консоли
    await Console.findByIdAndUpdate(rental.consoleId._id, {
      status: 'available',
    });

    // Отправить уведомление пользователю в Telegram
    const bot = getBot();
    if (bot && rental.userId.telegramId) {
      const message = `
❌ <b>К сожалению, ваша заявка отклонена</b>

🎮 Консоль: ${rental.consoleId.name}
📝 Причина: ${reason || 'Консоль недоступна'}
      `;

      try {
        await bot.telegram.sendMessage(rental.userId.telegramId, message, {
          parse_mode: 'HTML',
        });
      } catch (error) {
        console.error('Ошибка при отправке уведомления:', error);
      }
    }

    res.json(rental);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Получить статистику
exports.getStats = async (req, res) => {
  try {
    const totalConsoles = await Console.countDocuments();
    const availableConsoles = await Console.countDocuments({
      status: 'available',
    });
    const rentedConsoles = await Console.countDocuments({ status: 'rented' });
    const totalUsers = await User.countDocuments();
    const totalRentals = await Rental.countDocuments();
    const approvedRentals = await Rental.countDocuments({
      status: 'approved',
    });
    const pendingRentals = await Rental.countDocuments({ status: 'pending' });

    const totalRevenue = await Rental.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);

    res.json({
      totalConsoles,
      availableConsoles,
      rentedConsoles,
      totalUsers,
      totalRentals,
      approvedRentals,
      pendingRentals,
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
