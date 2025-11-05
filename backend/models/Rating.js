const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  // Рейтинг от пользователя консоли
  ratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Кого рейтингуют (консоль или пользователя)
  ratedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Связь с арендой
  rentalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rental'
  },
  // Оценка (1-5)
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  // Комментарий
  comment: {
    type: String,
    maxlength: 500
  },
  // Категория рейтинга
  category: {
    type: String,
    enum: ['speed', 'quality', 'communication', 'overall'],
    default: 'overall'
  },
  // Статус
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  // Если админ отклонил, причина
  rejectionReason: String,
  // Дата создания
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Статический метод для получения среднего рейтинга пользователя
ratingSchema.statics.getAverageRating = async function(userId) {
  try {
    const ratings = await this.aggregate([
      { $match: { ratedUser: mongoose.Types.ObjectId(userId), status: 'approved' } },
      {
        $group: {
          _id: '$ratedUser',
          averageRating: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);
    return ratings[0] || { averageRating: 0, count: 0 };
  } catch (err) {
    console.error('Error calculating average rating:', err);
    return { averageRating: 0, count: 0 };
  }
};

// Статический метод для получения ждущих одобрения рейтингов
ratingSchema.statics.getPendingRatings = async function() {
  try {
    const ratings = await this.find({ status: 'pending' })
      .populate('ratedBy', 'firstName lastName telegramId')
      .populate('ratedUser', 'firstName lastName')
      .populate('rentalId')
      .sort({ createdAt: -1 });
    return ratings;
  } catch (err) {
    console.error('Error fetching pending ratings:', err);
    return [];
  }
};

module.exports = mongoose.model('Rating', ratingSchema);
