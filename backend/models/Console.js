const mongoose = require('mongoose');

const consoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['PlayStation', 'Xbox', 'Nintendo', 'PC', 'Handheld'],
    required: true
  },
  pricePerDay: {
    type: Number,
    required: true
  },
  pricePerHour: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['available', 'rented', 'maintenance'],
    default: 'available'
  },
  description: String,
  image: String,
  serialNumber: {
    type: String,
    unique: true
  },
  games: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game'
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Console', consoleSchema);
