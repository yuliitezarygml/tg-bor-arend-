const Discount = require('../models/Discount');

/**
 * Получить активную скидку для консоли
 */
async function getDiscountForConsole(consoleId) {
  try {
    const now = new Date();

    const discount = await Discount.findOne({
      $or: [{ consoleId }, { consoleId: null }], // null = общая скидка
      active: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { maxUsage: null },
        { $expr: { $lt: ['$usedCount', '$maxUsage'] } },
      ],
    }).sort({ discountPercent: -1 }); // Максимальная скидка

    return discount;
  } catch (error) {
    console.error('Ошибка получения скидки:', error);
    return null;
  }
}

/**
 * Проверить, есть ли скидка на консоль в конкретную дату
 */
async function checkDateHasDiscount(consoleId, targetDate) {
  try {
    const discount = await Discount.findOne({
      $or: [{ consoleId }, { consoleId: null }],
      active: true,
      startDate: { $lte: targetDate },
      endDate: { $gte: targetDate },
    });

    return !!discount;
  } catch (error) {
    console.error('Ошибка проверки скидки:', error);
    return false;
  }
}

/**
 * Рассчитать цену со скидкой
 */
async function calculateDiscountedPrice(consoleId, originalPrice, durationHours = 1) {
  try {
    const discount = await getDiscountForConsole(consoleId);

    if (!discount) {
      return {
        finalPrice: originalPrice,
        discountApplied: false,
        discountPercent: 0,
        savedAmount: 0,
      };
    }

    // Проверка минимальной длительности
    if (discount.minHours && durationHours < discount.minHours) {
      return {
        finalPrice: originalPrice,
        discountApplied: false,
        discountPercent: 0,
        savedAmount: 0,
        message: `Скидка действует от ${discount.minHours} часов`,
      };
    }

    let finalPrice = originalPrice;
    let savedAmount = 0;

    if (discount.discountType === 'percentage') {
      savedAmount = (originalPrice * discount.discountPercent) / 100;
      finalPrice = originalPrice - savedAmount;
    } else if (discount.discountType === 'fixed_amount') {
      savedAmount = discount.discountPercent; // В этом случае это фиксированная сумма
      finalPrice = Math.max(0, originalPrice - savedAmount);
    }

    // Увеличиваем счетчик использования
    if (discount.maxUsage) {
      await Discount.findByIdAndUpdate(discount._id, {
        $inc: { usedCount: 1 },
      });
    }

    return {
      finalPrice: Math.round(finalPrice),
      discountApplied: true,
      discountPercent: discount.discountPercent,
      savedAmount: Math.round(savedAmount),
      discountDescription: discount.description,
    };
  } catch (error) {
    console.error('Ошибка расчета скидки:', error);
    return {
      finalPrice: originalPrice,
      discountApplied: false,
      discountPercent: 0,
      savedAmount: 0,
    };
  }
}

/**
 * Создать скидку
 */
async function createDiscount(discountData) {
  try {
    const discount = new Discount(discountData);
    await discount.save();
    console.log(`✅ Скидка создана: ${discount.discountPercent}%`);
    return discount;
  } catch (error) {
    console.error('Ошибка создания скидки:', error);
    throw error;
  }
}

/**
 * Получить все активные скидки
 */
async function getActiveDiscounts() {
  try {
    const now = new Date();

    const discounts = await Discount.find({
      active: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .populate('consoleId')
      .sort({ discountPercent: -1 });

    return discounts;
  } catch (error) {
    console.error('Ошибка получения скидок:', error);
    return [];
  }
}

module.exports = {
  getDiscountForConsole,
  checkDateHasDiscount,
  calculateDiscountedPrice,
  createDiscount,
  getActiveDiscounts,
};
