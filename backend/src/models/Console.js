const mongoose = require('mongoose');

const ConsoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    model: {
      type: String,
      required: true,
    },
    game: {
      type: String,
      required: true,
    },
    rentalPrice: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['available', 'rented', 'maintenance'],
      default: 'available',
    },
    location: {
      type: String,
      default: '',
    },
    // Поля для продажи консолей
    forSale: {
      type: Boolean,
      default: false,
    },
    salePrice: {
      type: Number,
      default: null,
    },
    condition: {
      type: String,
      enum: ['new', 'excellent', 'good', 'fair'],
      default: 'good',
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

module.exports = mongoose.model('Console', ConsoleSchema);
