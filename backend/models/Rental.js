const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  consoleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Console',
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: Date,
  days: Number,
  totalPrice: Number,
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Rental', rentalSchema);
