const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema(
  {
    consoleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Console',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    gameName: {
      type: String,
      default: 'Не указано',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    deposit: {
      type: Number,
      default: 0,
    },
    depositReturned: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: '',
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Rental', rentalSchema);
