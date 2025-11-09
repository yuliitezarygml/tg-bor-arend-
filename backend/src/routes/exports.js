const express = require('express');
const ExportService = require('../services/exportService');
const authMiddleware = require('../middleware/auth');
const Console = require('../models/Console');
const User = require('../models/User');
const Rental = require('../models/Rental');
const Penalty = require('../models/Penalty');

const router = express.Router();

// Экспортировать консоли в Excel
router.get('/consoles/excel', authMiddleware, async (req, res) => {
  try {
    const consoles = await Console.find()
      .populate('categoryId')
      .lean();

    const buffer = await ExportService.exportConsolesToExcel(consoles);

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="consoles-' + new Date().getTime() + '.xlsx"'
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Ошибка при экспорте консолей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Экспортировать пользователей в Excel
router.get('/users/excel', authMiddleware, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .lean();

    const buffer = await ExportService.exportUsersToExcel(users);

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="users-' + new Date().getTime() + '.xlsx"'
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Ошибка при экспорте пользователей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Экспортировать аренды в Excel
router.get('/rentals/excel', authMiddleware, async (req, res) => {
  try {
    const rentals = await Rental.find()
      .populate('userId', 'firstName lastName')
      .populate('consoleId', 'name model')
      .lean();

    const buffer = await ExportService.exportRentalsToExcel(rentals);

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="rentals-' + new Date().getTime() + '.xlsx"'
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Ошибка при экспорте аренд:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Экспортировать штрафы в Excel
router.get('/penalties/excel', authMiddleware, async (req, res) => {
  try {
    const penalties = await Penalty.find()
      .populate('userId', 'firstName lastName')
      .populate('consoleId', 'name model')
      .lean();

    const buffer = await ExportService.exportPenaltiesToExcel(penalties);

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="penalties-' + new Date().getTime() + '.xlsx"'
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Ошибка при экспорте штрафов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Экспортировать аналитику в PDF
router.post('/analytics/pdf', authMiddleware, async (req, res) => {
  try {
    const { dateRange = '7days', includeAll = true } = req.body;

    // Если includeAll, включаем всё
    const includeOverview = includeAll;
    const includeRevenue = includeAll;
    const includeConsoles = includeAll;
    const includeUsers = includeAll;
    const includePenalties = includeAll;

    const data = {};

    if (includeOverview) {
      const totalUsers = await User.countDocuments();
      const totalConsoles = await Console.countDocuments();
      const activeRentals = await Rental.countDocuments({ status: 'active' });
      const totalPenalties = await Penalty.countDocuments();

      data.overview = {
        totalUsers,
        totalConsoles,
        activeRentals,
        totalPenalties,
      };
    }

    if (includeRevenue) {
      const rentals = await Rental.find({ status: 'completed' }).lean();
      const revenue = rentals.reduce((sum, rental) => sum + (rental.totalPrice || 0), 0);

      data.revenue = [
        {
          period: 'Всего',
          total: revenue,
        },
      ];
    }

    if (includeConsoles) {
      const consoles = await Console.find()
        .populate('categoryId')
        .lean()
        .limit(10);

      data.topConsoles = consoles.map((c) => ({
        name: c.name || 'N/A',
        rentals: c.totalRentals || 0,
        revenue: (c.pricePerDay || 0) * (c.totalRentals || 0),
      }));
    }

    if (includeUsers) {
      const rentals = await Rental.find()
        .populate('userId')
        .lean();

      const userMap = {};
      rentals.forEach((rental) => {
        const userId = rental.userId._id;
        if (!userMap[userId]) {
          userMap[userId] = {
            username: rental.userId.firstName + ' ' + rental.userId.lastName,
            totalSpent: 0,
          };
        }
        userMap[userId].totalSpent += rental.totalPrice || 0;
      });

      data.topUsers = Object.values(userMap)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);
    }

    if (includePenalties) {
      const penalties = await Penalty.find().lean();

      const penaltyMap = {};
      penalties.forEach((penalty) => {
        const type = penalty.type || 'Неизвестно';
        if (!penaltyMap[type]) {
          penaltyMap[type] = { type, count: 0, total: 0 };
        }
        penaltyMap[type].count++;
        penaltyMap[type].total += penalty.amount || 0;
      });

      data.penalties = Object.values(penaltyMap);
    }

    const buffer = await ExportService.exportAnalyticsToPDF(data);

    res.setHeader('Content-Disposition', `attachment; filename="analytics-${new Date().getTime()}.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Ошибка при экспорте аналитики:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Экспортировать аналитику в Excel
router.post('/analytics/excel', authMiddleware, async (req, res) => {
  try {
    const { dateRange = '7days', includeAll = true } = req.body;

    // Если includeAll, включаем всё
    const includeOverview = includeAll;
    const includeRevenue = includeAll;
    const includeConsoles = includeAll;
    const includeUsers = includeAll;
    const includePenalties = includeAll;

    const data = {};

    if (includeOverview) {
      const totalUsers = await User.countDocuments();
      const totalConsoles = await Console.countDocuments();
      const activeRentals = await Rental.countDocuments({ status: 'active' });
      const totalPenalties = await Penalty.countDocuments();

      data.overview = {
        totalUsers,
        totalConsoles,
        activeRentals,
        totalPenalties,
      };
    }

    if (includeRevenue) {
      const rentals = await Rental.find({ status: 'completed' }).lean();
      const revenue = rentals.reduce((sum, rental) => sum + (rental.totalPrice || 0), 0);

      data.revenue = [
        {
          period: 'Всего',
          total: revenue,
        },
      ];
    }

    if (includeConsoles) {
      const consoles = await Console.find()
        .populate('categoryId')
        .lean()
        .limit(10);

      data.topConsoles = consoles.map((c) => ({
        name: c.name || 'N/A',
        rentals: c.totalRentals || 0,
        revenue: (c.pricePerDay || 0) * (c.totalRentals || 0),
      }));
    }

    if (includeUsers) {
      const rentals = await Rental.find()
        .populate('userId')
        .lean();

      const userMap = {};
      rentals.forEach((rental) => {
        const userId = rental.userId._id;
        if (!userMap[userId]) {
          userMap[userId] = {
            username: rental.userId.firstName + ' ' + rental.userId.lastName,
            totalSpent: 0,
          };
        }
        userMap[userId].totalSpent += rental.totalPrice || 0;
      });

      data.topUsers = Object.values(userMap)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);
    }

    if (includePenalties) {
      const penalties = await Penalty.find().lean();

      const penaltyMap = {};
      penalties.forEach((penalty) => {
        const type = penalty.type || 'Неизвестно';
        if (!penaltyMap[type]) {
          penaltyMap[type] = { type, count: 0, total: 0 };
        }
        penaltyMap[type].count++;
        penaltyMap[type].total += penalty.amount || 0;
      });

      data.penalties = Object.values(penaltyMap);
    }

    const buffer = await ExportService.exportAnalyticsToExcel(data);

    res.setHeader('Content-Disposition', `attachment; filename="analytics-${new Date().getTime()}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Ошибка при экспорте аналитики в Excel:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
