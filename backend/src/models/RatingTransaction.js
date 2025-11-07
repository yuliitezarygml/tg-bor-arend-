const mongoose = require('mongoose');

const RatingTransactionSchema = new mongoose.Schema(
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
    transactionType: {
      type: String,
      enum: [
        'rental_completed',
        'late_return',
        'perfect_condition',
        'damaged_item',
        'rule_violation',
        'loyalty_bonus',
        'manual_adjustment'
      ],
      required: true,
    },
    disciplineChange: {
      type: Number,
      default: 0,
    },
    loyaltyChange: {
      type: Number,
      default: 0,
    },
    totalPointsChange: {
      type: Number,
      default: 0,
    },
    comment: {
      type: String,
      default: '',
    },
    adminId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RatingTransaction', RatingTransactionSchema);
