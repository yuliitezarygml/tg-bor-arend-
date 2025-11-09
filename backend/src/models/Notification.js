const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['rental_reminder', 'penalty_notice', 'rental_started', 'rental_completed', 'status_update'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedId: {
      rentalId: mongoose.Schema.Types.ObjectId,
      penaltyId: mongoose.Schema.Types.ObjectId,
      consoleId: mongoose.Schema.Types.ObjectId,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    sentVia: {
      telegram: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
      inApp: { type: Boolean, default: true },
    },
    sentAt: {
      telegram: Date,
      email: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
