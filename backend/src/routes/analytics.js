const express = require('express');
const Rental = require('../models/Rental');
const User = require('../models/User');
const Penalty = require('../models/Penalty');
const Console = require('../models/Console');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * Получить общую статистику
 */
router.get('/overview', authMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalConsoles = await Console.countDocuments();
    const activeRentals = await Rental.countDocuments({ status: 'active' });
    const totalRentals = await Rental.countDocuments();
    const totalPenalties = await Penalty.countDocuments();
    const pendingPenalties = await Penalty.countDocuments({ status: 'pending' });

    res.json({
      totalUsers,
      totalConsoles,
      activeRentals,
      totalRentals,
      totalPenalties,
      pendingPenalties,
    });
  } catch (error) {
    console.error('Ошибка при получении статистики:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получить статистику по доходам
 */
router.get('/revenue', authMiddleware, async (req, res) => {
  try {
    const { period = 'month' } = req.query; // month, week, day, all

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case 'day':
        dateFilter = {
          createdAt: {
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          },
        };
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        dateFilter = {
          createdAt: {
            $gte: weekStart,
            $lt: now,
          },
        };
        break;
      case 'month':
        dateFilter = {
          createdAt: {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          },
        };
        break;
    }

    const revenue = await Rental.aggregate([
      {
        $match: {
          ...dateFilter,
          status: { $in: ['completed', 'active'] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalPrice' },
          count: { $sum: 1 },
          average: { $avg: '$totalPrice' },
        },
      },
    ]);

    const penaltyRevenue = await Penalty.aggregate([
      {
        $match: {
          ...dateFilter,
          status: 'paid',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      period,
      rental: revenue[0] || { total: 0, count: 0, average: 0 },
      penalties: penaltyRevenue[0] || { total: 0, count: 0 },
      totalRevenue: (revenue[0]?.total || 0) + (penaltyRevenue[0]?.total || 0),
    });
  } catch (error) {
    console.error('Ошибка при получении статистики доходов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получить статистику по консолям
 */
router.get('/consoles', authMiddleware, async (req, res) => {
  try {
    const consoleStats = await Rental.aggregate([
      {
        $match: {
          status: { $in: ['completed', 'active'] },
        },
      },
      {
        $group: {
          _id: '$consoleId',
          rentals: { $sum: 1 },
          revenue: { $sum: '$totalPrice' },
        },
      },
      {
        $sort: { rentals: -1 },
      },
      {
        $lookup: {
          from: 'consoles',
          localField: '_id',
          foreignField: '_id',
          as: 'console',
        },
      },
      {
        $unwind: '$console',
      },
      {
        $project: {
          console: '$console.name',
          serialNumber: '$console.serialNumber',
          rentals: 1,
          revenue: 1,
        },
      },
    ]);

    res.json(consoleStats);
  } catch (error) {
    console.error('Ошибка при получении статистики консолей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получить топ пользователей по расходам
 */
router.get('/top-users', authMiddleware, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topUsers = await Rental.aggregate([
      {
        $group: {
          _id: '$userId',
          rentals: { $sum: 1 },
          totalSpent: { $sum: '$totalPrice' },
        },
      },
      {
        $sort: { totalSpent: -1 },
      },
      {
        $limit: parseInt(limit),
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          firstName: '$user.firstName',
          lastName: '$user.lastName',
          telegramId: '$user.telegramId',
          rentals: 1,
          totalSpent: 1,
        },
      },
    ]);

    res.json(topUsers);
  } catch (error) {
    console.error('Ошибка при получении топ пользователей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получить статистику по штрафам
 */
router.get('/penalties', authMiddleware, async (req, res) => {
  try {
    const stats = await Penalty.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const statusStats = await Penalty.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    res.json({
      byType: stats,
      byStatus: statusStats,
    });
  } catch (error) {
    console.error('Ошибка при получении статистики штрафов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получить статистику по активности (последние N дней)
 */
router.get('/activity', authMiddleware, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(days));

    const activity = await Rental.aggregate([
      {
        $match: {
          createdAt: { $gte: dateFrom },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          rentals: { $sum: 1 },
          revenue: { $sum: '$totalPrice' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
      },
    ]);

    res.json({
      days: parseInt(days),
      activity,
    });
  } catch (error) {
    console.error('Ошибка при получении активности:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получить статистику пользователя
 */
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const rentals = await Rental.find({ userId });
    const penalties = await Penalty.find({ userId });

    const totalSpent = rentals.reduce((sum, r) => sum + r.totalPrice, 0);
    const totalPenalties = penalties.reduce((sum, p) => {
      if (p.status === 'paid') return sum + p.amount;
      return sum;
    }, 0);
    const pendingPenalties = penalties.reduce((sum, p) => {
      if (['pending', 'approved'].includes(p.status)) return sum + p.amount;
      return sum;
    }, 0);

    res.json({
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        telegramId: user.telegramId,
        email: user.email,
        isBlocked: user.isBlocked,
      },
      rentals: {
        total: rentals.length,
        active: rentals.filter((r) => r.status === 'active').length,
        completed: rentals.filter((r) => r.status === 'completed').length,
        cancelled: rentals.filter((r) => r.status === 'cancelled').length,
      },
      finances: {
        totalSpent,
        totalPenalties,
        pendingPenalties,
      },
    });
  } catch (error) {
    console.error('Ошибка при получении статистики пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получить расширенную аналитику
 */
router.get('/extended', authMiddleware, async (req, res) => {
  try {
    const { range = '7days' } = req.query;

    let daysBack = 7;
    if (range === '30days') daysBack = 30;
    if (range === '90days') daysBack = 90;
    if (range === 'year') daysBack = 365;
    if (range === 'all') daysBack = 3650;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - daysBack);

    // Получить данные за предыдущий период для расчета роста
    const prevDateFrom = new Date(dateFrom);
    prevDateFrom.setDate(prevDateFrom.getDate() - daysBack);

    // Текущий доход
    const currentRevenue = (await Rental.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: dateFrom } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]))[0]?.total || 0;

    // Предыдущий доход для расчета роста
    const prevRevenue = (await Rental.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: prevDateFrom, $lt: dateFrom } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]))[0]?.total || 0;

    const revenueGrowth = prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100) : 0;

    // Текущие аренды
    const currentRentals = await Rental.countDocuments({ createdAt: { $gte: dateFrom } });
    const prevRentals = await Rental.countDocuments({ createdAt: { $gte: prevDateFrom, $lt: dateFrom } });
    const rentalsGrowth = prevRentals > 0 ? Math.round(((currentRentals - prevRentals) / prevRentals) * 100) : 0;

    // Активные пользователи
    const activeUsersCount = await User.countDocuments({ isActive: true });
    const prevActiveUsers = await User.countDocuments({ 
      isActive: true, 
      createdAt: { $lt: dateFrom }
    });
    const usersGrowth = prevActiveUsers > 0 ? Math.round(((activeUsersCount - prevActiveUsers) / prevActiveUsers) * 100) : 0;

    // Средняя оценка
    const ratingData = await Rental.aggregate([
      { $match: { rating: { $exists: true, $ne: null }, createdAt: { $gte: dateFrom } } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);
    const avgRating = ratingData[0]?.avgRating || 0;

    // Среднее время аренды
    const rentalDaysData = await Rental.aggregate([
      { $match: { createdAt: { $gte: dateFrom } } },
      {
        $project: {
          days: {
            $divide: [
              { $subtract: ['$endDate', '$startDate'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      { $group: { _id: null, avgDays: { $avg: '$days' } } }
    ]);
    const avgRentalDays = Math.round(rentalDaysData[0]?.avgDays || 0);

    // Средняя цена
    const avgRentalPrice = currentRentals > 0 ? Math.round(currentRevenue / currentRentals) : 0;

    // Общая статистика
    const overview = {
      totalRevenue: Math.round(currentRevenue),
      totalRentals: currentRentals,
      activeUsers: activeUsersCount,
      avgRating: Math.round(avgRating * 10) / 10,
      avgRentalDays: avgRentalDays,
      avgRentalPrice: avgRentalPrice,
      totalPenalties: (await Penalty.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: dateFrom } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]))[0]?.total || 0,
      penaltyCount: await Penalty.countDocuments({ createdAt: { $gte: dateFrom } }),
      revenueGrowth: revenueGrowth,
      rentalsGrowth: rentalsGrowth,
      usersGrowth: usersGrowth,
      satisfactionLevel: avgRating >= 4.5 ? 'Отличный' : avgRating >= 4 ? 'Хороший' : avgRating >= 3 ? 'Средний' : 'Низкий'
    };

    // Дневной доход
    const dailyRevenue = [];
    for (let i = daysBack; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const revenue = await Rental.aggregate([
        {
          $match: {
            status: 'completed',
            createdAt: { $gte: date, $lt: nextDate }
          }
        },
        { $group: { _id: null, revenue: { $sum: '$totalPrice' } } }
      ]);

      dailyRevenue.push({
        date: date.toLocaleDateString('ru-RU'),
        revenue: revenue[0]?.revenue || 0
      });
    }

    // Использование консолей
    const consoleUsage = await Console.aggregate([
      {
        $lookup: {
          from: 'rentals',
          localField: '_id',
          foreignField: 'consoleId',
          as: 'rentals'
        }
      },
      {
        $project: {
          name: 1,
          usage: { $size: '$rentals' },
          revenue: {
            $sum: {
              $cond: [
                { $eq: [{ $arrayElemAt: ['$rentals.status', 0] }, 'completed'] },
                { $arrayElemAt: ['$rentals.totalPrice', 0] },
                0
              ]
            }
          }
        }
      },
      { $sort: { usage: -1 } },
      { $limit: 10 }
    ]);

    // Активность по часам (реальные данные)
    const activityByHour = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourStart = new Date(dateFrom);
      hourStart.setHours(hour, 0, 0, 0);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hour + 1, 0, 0, 0);

      const hourRentals = await Rental.countDocuments({
        createdAt: { $gte: hourStart, $lt: hourEnd },
        status: { $in: ['active', 'completed'] }
      });

      const hourCompletions = await Rental.countDocuments({
        completedAt: { $gte: hourStart, $lt: hourEnd },
        status: 'completed'
      });

      activityByHour.push({
        hour: `${String(hour).padStart(2, '0')}:00`,
        rentals: hourRentals,
        completions: hourCompletions
      });
    }

    // Статистика штрафов (реальные данные)
    const penaltyStats = await Penalty.aggregate([
      { $match: { createdAt: { $gte: dateFrom } } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      {
        $project: {
          name: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 'late_return'] }, then: 'Просрочка' },
                { case: { $eq: ['$_id', 'damage'] }, then: 'Повреждение' },
                { case: { $eq: ['$_id', 'missing_item'] }, then: 'Потеря' },
                { case: { $eq: ['$_id', 'other'] }, then: 'Другое' }
              ],
              default: 'Неизвестно'
            }
          },
          count: 1,
          _id: 0
        }
      }
    ]);

    // Топ игр (реальные данные)
    const topGames = await Rental.aggregate([
      { $match: { createdAt: { $gte: dateFrom } } },
      {
        $group: {
          _id: '$gameName',
          rentals: { $sum: 1 },
          revenue: { $sum: '$totalPrice' },
          rating: { $avg: '$rating' }
        }
      },
      { $sort: { rentals: -1 } },
      { $limit: 10 },
      {
        $project: {
          name: '$_id',
          rentals: 1,
          revenue: 1,
          rating: { $round: ['$rating', 1] },
          _id: 0
        }
      }
    ]);

    // Топ пользователей
    const userStats = await User.aggregate([
      {
        $lookup: {
          from: 'rentals',
          localField: '_id',
          foreignField: 'userId',
          as: 'rentals'
        }
      },
      {
        $project: {
          username: 1,
          rentals: { $size: '$rentals' },
          totalSpent: { $sum: '$rentals.totalPrice' },
          rating: 4.5
        }
      },
      { $sort: { rentals: -1 } },
      { $limit: 5 }
    ]);

    // Удовлетворение (реальные данные)
    const satisfaction = await Rental.aggregate([
      { $match: { rating: { $exists: true, $ne: null }, createdAt: { $gte: dateFrom } } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      {
        $project: {
          rating: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Если нет оценок, возвращаем пустой массив
    const satisfactionWithRatings = [5, 4, 3, 2, 1].map(rating => {
      const found = satisfaction.find(s => s.rating === rating);
      return {
        rating,
        count: found?.count || 0
      };
    });

    res.json({
      overview,
      dailyRevenue,
      consoleUsage,
      activityByHour,
      penaltyStats,
      topGames,
      userStats,
      satisfaction: satisfactionWithRatings
    });
  } catch (error) {
    console.error('Ошибка получения расширенной аналитики:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
