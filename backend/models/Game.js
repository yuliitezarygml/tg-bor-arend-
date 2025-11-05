const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true
    },
    genre: String,
    platform: {
      type: String,
      enum: ['PlayStation', 'Xbox', 'Nintendo', 'PC', 'Multi'],
      default: 'Multi'
    },
    releaseDate: Date,
    developer: String,
    description: String,
    coverUrl: String,
    rating: {
      type: Number,
      min: 0,
      max: 10,
      default: 5
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

module.exports = mongoose.model('Game', gameSchema);
