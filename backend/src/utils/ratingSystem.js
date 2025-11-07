const User = require('../models/User');
const RatingTransaction = require('../models/RatingTransaction');
const Rental = require('../models/Rental');

// Веса для расчета итогового рейтинга
const DISCIPLINE_WEIGHT = 0.6;
const LOYALTY_WEIGHT = 0.4;

// Правила для дисциплины
const DISCIPLINE_RULES = {
  return_timing: {
    on_time: 10,
    slightly_late: 0,
    very_late: -20,
  },
  item_condition: {
    perfect: 10,
    good: 0,
    damaged: -30,
  },
  rule_compliance: {
    no_violations: 10,
    minor_violations: 0,
    major_violations: -10,
  },
};

// Правила для лояльности
const LOYALTY_RULES = {
  bonus_per_rental: 5,
  max_rental_bonus: 30,
  tenure_6_months: 10,
  tenure_12_months: 20,
  promotion_participation: 10,
};

/**
 * Расчет дисциплины на основе последних транзакций
 */
async function calculateDisciplineScore(userId) {
  try {
    const transactions = await RatingTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);

    if (transactions.length === 0) {
      return 50; // Базовый рейтинг для новых пользователей
    }

    const scores = transactions.map((transaction) => {
      let score = 100;

      // Оценка по времени возврата
      if (transaction.transactionType === 'late_return') {
        score += DISCIPLINE_RULES.return_timing.very_late;
      } else {
        score += DISCIPLINE_RULES.return_timing.on_time;
      }

      // Добавляем изменение дисциплины из транзакции
      score += transaction.disciplineChange;

      return Math.max(0, Math.min(100, score));
    });

    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  } catch (error) {
    console.error('Ошибка расчета дисциплины:', error);
    return 50;
  }
}

/**
 * Расчет лояльности клиента
 */
async function calculateLoyaltyScore(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return 50;

    let score = 0;

    // Бонус за повторные аренды
    const rentalBonus = Math.min(
      user.totalRentals * LOYALTY_RULES.bonus_per_rental,
      LOYALTY_RULES.max_rental_bonus
    );
    score += rentalBonus;

    // Бонус за стаж
    const joinDate = new Date(user.createdAt);
    const tenureDays = (Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24);

    if (tenureDays >= 365) {
      score += LOYALTY_RULES.tenure_12_months;
    } else if (tenureDays >= 180) {
      score += LOYALTY_RULES.tenure_6_months;
    }

    // Бонус лояльности из профиля
    score += user.loyaltyBonus || 0;

    return Math.min(100, score);
  } catch (error) {
    console.error('Ошибка расчета лояльности:', error);
    return 50;
  }
}

/**
 * Расчет итогового рейтинга пользователя
 */
async function calculateUserFinalRating(userId) {
  try {
    const discipline = await calculateDisciplineScore(userId);
    const loyalty = await calculateLoyaltyScore(userId);

    const finalScore = Math.round(discipline * DISCIPLINE_WEIGHT + loyalty * LOYALTY_WEIGHT);

    // Определение статуса
    let ratingStatus = 'regular';
    if (finalScore >= 80) {
      ratingStatus = 'premium';
    } else if (finalScore < 50) {
      ratingStatus = 'risk';
    }

    // Обновляем пользователя
    await User.findByIdAndUpdate(userId, {
      ratingScore: finalScore,
      disciplineScore: discipline,
      loyaltyScore: loyalty,
      ratingStatus,
    });

    return {
      finalScore,
      discipline,
      loyalty,
      ratingStatus,
    };
  } catch (error) {
    console.error('Ошибка расчета итогового рейтинга:', error);
    return {
      finalScore: 50,
      discipline: 50,
      loyalty: 50,
      ratingStatus: 'regular',
    };
  }
}

/**
 * Добавление транзакции рейтинга
 */
async function addRatingTransaction(userId, transactionType, disciplineChange = 0, loyaltyChange = 0, comment = '', rentalId = null) {
  try {
    const transaction = new RatingTransaction({
      userId,
      rentalId,
      transactionType,
      disciplineChange,
      loyaltyChange,
      totalPointsChange: disciplineChange + loyaltyChange,
      comment,
    });

    await transaction.save();

    // Пересчитываем рейтинг пользователя
    await calculateUserFinalRating(userId);

    return transaction;
  } catch (error) {
    console.error('Ошибка добавления транзакции рейтинга:', error);
    throw error;
  }
}

/**
 * Обновление рейтинга после завершения аренды
 */
async function updateRatingOnRentalCompletion(userId, rentalId, returnCondition = 'perfect', onTime = true) {
  try {
    let disciplineChange = 0;
    let loyaltyChange = 5; // Базовый бонус за аренду

    // Оценка по условию возврата
    if (returnCondition === 'perfect') {
      disciplineChange += 10;
    } else if (returnCondition === 'damaged') {
      disciplineChange -= 30;
    } else if (returnCondition === 'broken') {
      disciplineChange -= 50;
    }

    // Оценка по времени
    if (!onTime) {
      disciplineChange -= 20;
      await addRatingTransaction(
        userId,
        'late_return',
        -20,
        0,
        'Поздний возврат консоли',
        rentalId
      );
    }

    // Основная транзакция
    await addRatingTransaction(
      userId,
      'rental_completed',
      disciplineChange,
      loyaltyChange,
      `Аренда завершена. Состояние: ${returnCondition}`,
      rentalId
    );

    // Увеличиваем счетчик аренд
    await User.findByIdAndUpdate(userId, {
      $inc: { totalRentals: 1 },
    });

    return await calculateUserFinalRating(userId);
  } catch (error) {
    console.error('Ошибка обновления рейтинга:', error);
    throw error;
  }
}

/**
 * Получение привилегий по статусу
 */
function getUserStatusBenefits(ratingStatus) {
  const benefits = {
    premium: {
      discountPercent: 15,
      prioritySupport: true,
      skipVerification: true,
      benefits: ['Скидка 15%', 'Приоритетная поддержка', 'Автоодобрение заявок'],
    },
    regular: {
      discountPercent: 0,
      prioritySupport: false,
      skipVerification: false,
      benefits: ['Стандартные условия аренды'],
    },
    risk: {
      discountPercent: 0,
      prioritySupport: false,
      skipVerification: false,
      requiresApproval: true,
      benefits: ['Требуется одобрение админа', 'Возможны ограничения'],
    },
  };

  return benefits[ratingStatus] || benefits.regular;
}

module.exports = {
  calculateDisciplineScore,
  calculateLoyaltyScore,
  calculateUserFinalRating,
  addRatingTransaction,
  updateRatingOnRentalCompletion,
  getUserStatusBenefits,
  DISCIPLINE_WEIGHT,
  LOYALTY_WEIGHT,
};
