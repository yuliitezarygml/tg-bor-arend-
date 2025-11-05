const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  telegramId: {
    type: String,
    unique: true,
    sparse: true
  },
  telegramUsername: String,
  phone: String,
  email: String,
  photoUrl: String,
  bio: String,
  registeredAt: {
    type: Date,
    default: Date.now
  },
  totalRentals: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked'],
    default: 'active'
  },
  lastActive: Date,
  // Рейтинги
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  ratingsCount: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('User', userSchema);
