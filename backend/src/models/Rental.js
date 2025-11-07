const mongoose = require('mongoose');

const RentalSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'active', 'completed', 'cancelled'],
      default: 'pending',
    },
    rentalDate: {
      type: Date,
      required: true,
    },
    returnDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    expectedEndTime: {
      type: Date,
      default: null,
    },
    selectedHours: {
      type: Number,
      default: null,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    expectedCost: {
      type: Number,
      default: 0,
    },
    adminNotes: {
      type: String,
      default: '',
    },
    userMessage: {
      type: String,
      default: '',
    },
    // === ГЕОЛОКАЦИЯ ===
    location: {
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
      address: {
        type: String,
        default: null,
      },
    },
    // === ОЦЕНКА ПОСЛЕ АРЕНДЫ ===
    returnCondition: {
      type: String,
      enum: ['perfect', 'good', 'damaged', 'broken'],
      default: 'perfect',
    },
    returnedOnTime: {
      type: Boolean,
      default: true,
    },
    ruleCompliance: {
      type: String,
      enum: ['no_violations', 'minor_violations', 'major_violations'],
      default: 'no_violations',
    },
    notificationSentToUser: {
      type: Boolean,
      default: false,
    },
    notificationSentToAdmin: {
      type: Boolean,
      default: false,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Rental', RentalSchema);
