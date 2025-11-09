const mongoose = require('mongoose');

const consoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      default: 'PlayStation 4',
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    serialNumber: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['available', 'rented', 'maintenance', 'reserved'],
      default: 'available',
    },
    pricePerDay: {
      type: Number,
      required: true,
      default: 100,
    },
    description: {
      type: String,
      default: '',
    },
    condition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good',
    },
    images: [String],
    qrCode: String,
    totalRentals: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Console', consoleSchema);
