const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    consoleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Console',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'converted'],
      default: 'pending',
    },
    rentalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rental',
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    confirmedAt: Date,
    cancelledAt: Date,
    cancelReason: String,
  },
  { timestamps: true }
);

// Индексы для быстрого поиска
reservationSchema.index({ consoleId: 1, startDate: 1, endDate: 1 });
reservationSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
