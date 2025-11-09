const mongoose = require('mongoose');

const accessorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: String,
    type: {
      type: String,
      enum: ['controller', 'game', 'cable', 'other'],
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      default: 1,
    },
    image: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Accessory', accessorySchema);
