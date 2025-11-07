const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    telegramId: {
      type: String,
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      default: '',
    },
    lastName: {
      type: String,
      default: '',
    },
    username: {
      type: String,
      default: '',
    },
    phoneNumber: {
      type: String,
      default: '',
    },
    photoUrl: {
      type: String,
      default: null,
    },
    contactShared: {
      type: Boolean,
      default: false,
    },
    registrationStep: {
      type: String,
      enum: ['name', 'phone', 'completed'],
      default: 'name',
    },
    // === ВЕРИФИКАЦИЯ ДОКУМЕНТОВ ===
    verificationStep: {
      type: String,
      enum: ['none', 'passport_front', 'passport_back', 'selfie', 'completed'],
      default: 'none',
    },
    passportFrontPhoto: {
      type: String,
      default: null,
    },
    passportBackPhoto: {
      type: String,
      default: null,
    },
    selfiePhoto: {
      type: String,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    // Результаты автоматической проверки документов
    verificationResults: {
      type: Object,
      default: null,
    },
    verificationConfidence: {
      type: Number, // 0-100
      default: 0,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'auto_approved', 'manual_review', 'rejected'],
      default: 'pending',
    },
    // === РЕЙТИНГОВАЯ СИСТЕМА ===
    ratingScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    disciplineScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    loyaltyScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    ratingStatus: {
      type: String,
      enum: ['premium', 'regular', 'risk'],
      default: 'regular',
    },
    // === ФИНАНСЫ ===
    totalSpent: {
      type: Number,
      default: 0,
    },
    totalRentals: {
      type: Number,
      default: 0,
    },
    loyaltyBonus: {
      type: Number,
      default: 0,
    },
    // === СТАТУС И БЛОКИРОВКА ===
    isBanned: {
      type: Boolean,
      default: false,
    },
    botBlocked: {
      type: Boolean,
      default: false,
    },
    botBlockedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
