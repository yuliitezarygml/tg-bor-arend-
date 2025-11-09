const mongoose = require('mongoose');

const penaltySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rentalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rental',
      default: null,
    },
    consoleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Console',
      required: true,
    },
    type: {
      type: String,
      enum: ['late_return', 'damage', 'missing_item', 'other'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'waived', 'disputed'],
      default: 'pending',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    approvedAt: Date,
    paidAt: Date,
    evidence: {
      images: [String], // URL к фотографиям повреждений
      notes: String,
    },
    daysLate: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Penalty', penaltySchema);
