const mongoose = require('mongoose');

const historySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['create', 'update', 'delete', 'rent', 'complete'],
      required: true
    },
    type: {
      type: String,
      enum: ['console', 'rental', 'user', 'game', 'discount'],
      required: true
    },
    itemId: mongoose.Schema.Types.ObjectId,
    itemName: String,
    changes: mongoose.Schema.Types.Mixed,
    oldData: mongoose.Schema.Types.Mixed,
    newData: mongoose.Schema.Types.Mixed,
    userId: mongoose.Schema.Types.ObjectId,
    description: String,
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false
  }
);

// Индекс для быстрого поиска по типу и дате
historySchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('History', historySchema);
