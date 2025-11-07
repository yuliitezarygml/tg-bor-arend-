const Reservation = require('../models/Reservation');

/**
 * Создать временную резервацию консоли
 */
async function createTempReservation(userId, consoleId, timeoutMinutes = 30) {
  try {
    // Удаляем старые резервации этого пользователя
    await Reservation.deleteMany({ userId });

    // Создаем новую резервацию
    const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

    const reservation = new Reservation({
      userId,
      consoleId,
      expiresAt,
      timeoutMinutes,
    });

    await reservation.save();
    console.log(`✅ Резервация создана для пользователя ${userId} на ${timeoutMinutes} минут`);

    return reservation;
  } catch (error) {
    console.error('Ошибка создания резервации:', error);
    throw error;
  }
}

/**
 * Удалить резервацию пользователя
 */
async function removeTempReservation(userId) {
  try {
    await Reservation.deleteMany({ userId });
    console.log(`🗑️ Резервация удалена для пользователя ${userId}`);
  } catch (error) {
    console.error('Ошибка удаления резервации:', error);
  }
}

/**
 * Очистка истекших резерваций
 */
async function cleanupExpiredReservations() {
  try {
    const result = await Reservation.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    if (result.deletedCount > 0) {
      console.log(`🧹 Удалено истекших резерваций: ${result.deletedCount}`);
    }

    return result.deletedCount;
  } catch (error) {
    console.error('Ошибка очистки резерваций:', error);
    return 0;
  }
}

/**
 * Проверить, зарезервирована ли консоль
 */
async function isConsoleReserved(consoleId, excludeUserId = null) {
  try {
    const query = {
      consoleId,
      expiresAt: { $gt: new Date() },
    };

    if (excludeUserId) {
      query.userId = { $ne: excludeUserId };
    }

    const reservation = await Reservation.findOne(query);
    return !!reservation;
  } catch (error) {
    console.error('Ошибка проверки резервации:', error);
    return false;
  }
}

/**
 * Получить резервацию пользователя
 */
async function getUserReservation(userId) {
  try {
    const reservation = await Reservation.findOne({
      userId,
      expiresAt: { $gt: new Date() },
    }).populate('consoleId');

    return reservation;
  } catch (error) {
    console.error('Ошибка получения резервации:', error);
    return null;
  }
}

// Запускаем очистку каждые 5 минут
setInterval(cleanupExpiredReservations, 5 * 60 * 1000);

module.exports = {
  createTempReservation,
  removeTempReservation,
  cleanupExpiredReservations,
  isConsoleReserved,
  getUserReservation,
};
