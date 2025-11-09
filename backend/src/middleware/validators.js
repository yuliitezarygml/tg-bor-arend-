const { body, validationResult, param } = require('express-validator');

// Middleware для обработки ошибок валидации
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Ошибка валидации',
      details: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

// Валидация для логина
const validateLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username обязателен')
    .isLength({ min: 3 })
    .withMessage('Username должен быть минимум 3 символа'),
  body('password')
    .notEmpty()
    .withMessage('Password обязателен')
    .isLength({ min: 6 })
    .withMessage('Password должен быть минимум 6 символов'),
  handleValidationErrors,
];

// Валидация для создания аренды
const validateRentalCreate = [
  body('consoleId')
    .notEmpty()
    .withMessage('consoleId обязателен')
    .isMongoId()
    .withMessage('Неверный формат consoleId'),
  body('userId')
    .notEmpty()
    .withMessage('userId обязателен')
    .isMongoId()
    .withMessage('Неверный формат userId'),
  body('startDate')
    .notEmpty()
    .withMessage('startDate обязателена')
    .isISO8601()
    .withMessage('Неверный формат даты'),
  body('endDate')
    .notEmpty()
    .withMessage('endDate обязателена')
    .isISO8601()
    .withMessage('Неверный формат даты')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('endDate должна быть позже startDate');
      }
      return true;
    }),
  body('totalPrice')
    .notEmpty()
    .withMessage('totalPrice обязателена')
    .isInt({ min: 1 })
    .withMessage('totalPrice должна быть больше 0'),
  handleValidationErrors,
];

// Валидация для создания штрафа
const validatePenaltyCreate = [
  body('userId')
    .notEmpty()
    .withMessage('userId обязателен')
    .isMongoId()
    .withMessage('Неверный формат userId'),
  body('rentalId')
    .notEmpty()
    .withMessage('rentalId обязателен')
    .isMongoId()
    .withMessage('Неверный формат rentalId'),
  body('consoleId')
    .notEmpty()
    .withMessage('consoleId обязателен')
    .isMongoId()
    .withMessage('Неверный формат consoleId'),
  body('type')
    .notEmpty()
    .withMessage('type обязателен')
    .isIn(['late_return', 'damage', 'missing_item', 'other'])
    .withMessage('Неверный тип штрафа'),
  body('description')
    .notEmpty()
    .withMessage('description обязателена')
    .isLength({ min: 5 })
    .withMessage('description должна быть минимум 5 символов'),
  body('amount')
    .notEmpty()
    .withMessage('amount обязателена')
    .isInt({ min: 1 })
    .withMessage('amount должна быть больше 0'),
  handleValidationErrors,
];

// Валидация для обновления консоли
const validateConsoleUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('name не должен быть пустым'),
  body('pricePerDay')
    .optional()
    .isInt({ min: 1 })
    .withMessage('pricePerDay должна быть больше 0'),
  body('status')
    .optional()
    .isIn(['available', 'rented', 'maintenance'])
    .withMessage('Неверный статус'),
  body('condition')
    .optional()
    .isIn(['excellent', 'good', 'fair', 'poor'])
    .withMessage('Неверное состояние'),
  handleValidationErrors,
];

// Валидация для блокировки пользователя
const validateUserBlock = [
  body('blockReason')
    .notEmpty()
    .withMessage('blockReason обязателена')
    .isLength({ min: 5 })
    .withMessage('blockReason должна быть минимум 5 символов'),
  handleValidationErrors,
];

// Валидация для параметров ID
const validateMongoId = [
  param('id')
    .isMongoId()
    .withMessage('Неверный формат ID'),
  handleValidationErrors,
];

module.exports = {
  validateLogin,
  validateRentalCreate,
  validatePenaltyCreate,
  validateConsoleUpdate,
  validateUserBlock,
  validateMongoId,
  handleValidationErrors,
};
