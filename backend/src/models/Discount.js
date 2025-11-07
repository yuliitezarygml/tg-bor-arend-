const mongoose = require('mongoose');

const DiscountSchema = new mongoose.Schema(
  {
    consoleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Console',
      default: null,
    },
    discountPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed_amount', 'first_rental', 'seasonal', 'loyalty'],
      default: 'percentage',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      default: '',
    },
    minHours: {
      type: Number,
      default: 0,
    },
    maxUsage: {
      type: Number,
      default: null,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Discount', DiscountSchema);
