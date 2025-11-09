const mongoose = require('mongoose');

const consoleDamageHistorySchema = new mongoose.Schema(
  {
    consoleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Console',
      required: true,
    },
    rentalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rental',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'severe'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    images: [String], // URLs фотографий
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    repairCost: {
      type: Number,
      default: 0,
    },
    repaired: {
      type: Boolean,
      default: false,
    },
    repairedAt: Date,
    notes: String,
  },
  { timestamps: true }
);

// Индекс для истории консоли
consoleDamageHistorySchema.index({ consoleId: 1, createdAt: -1 });

module.exports = mongoose.model('ConsoleDamageHistory', consoleDamageHistorySchema);
