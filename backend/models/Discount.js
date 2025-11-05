const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      index: true
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    description: String,
    consoleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Console',
      default: null
    },
    isGlobal: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Индекс для быстрого поиска скидок по дате
discountSchema.index({ date: 1, consoleId: 1 });

// Статический метод для получения скидки на конкретную дату
discountSchema.statics.getDiscountForDate = async function(date, consoleId = null) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Ищем скидку для конкретной консоли или глобальную
  let discount = null;
  
  if (consoleId) {
    discount = await this.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
      $or: [
        { consoleId: consoleId },
        { isGlobal: true }
      ]
    }).sort({ consoleId: -1 }); // Приоритет: специфическая скидка > глобальная
  } else {
    discount = await this.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
      isGlobal: true
    });
  }

  return discount;
};

module.exports = mongoose.model('Discount', discountSchema);
