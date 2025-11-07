const { Markup } = require('telegraf');

const getRegistrationKeyboard = () => {
  return Markup.keyboard([
    [Markup.button.contactRequest('� Отправить контакт')],
  ])
    .resize()
    .oneTime();
};

const getMainKeyboard = () => {
  return Markup.keyboard([
    ['🎮 Консоли', '📝 Арендовать'],
    ['💰 Купить', '📊 Мой кабинет'],
    ['📋 Мои заявки', '❓ Помощь'],
  ])
    .resize()
    .persistent();
};

const getVerificationKeyboard = () => {
  return Markup.keyboard([
    ['✅ Верифицировать паспорт'],
    ['📊 Мой кабинет', '❓ Помощь'],
  ])
    .resize()
    .persistent();
};

const getRentalKeyboard = (rentals) => {
  const buttons = rentals.map((rental) => [
    Markup.button.callback(
      `🎮 ${rental.consoleName} - ${rental.status}`,
      `rental_${rental._id}`
    ),
  ]);
  buttons.push([Markup.button.callback('◀️ Назад', 'back')]);
  return Markup.inlineKeyboard(buttons);
};

const getApproveKeyboard = (rentalId) => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Одобрить', `approve_${rentalId}`),
      Markup.button.callback('❌ Отклонить', `reject_${rentalId}`),
    ],
  ]);
};

module.exports = {
  getRegistrationKeyboard,
  getMainKeyboard,
  getVerificationKeyboard,
  getRentalKeyboard,
  getApproveKeyboard,
};
