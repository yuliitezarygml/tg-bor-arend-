const mongoose = require('mongoose');

const logSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    action: {
      type: String,
      required: true,
      enum: [
        'create_rental',
        'update_rental',
        'cancel_rental',
        'create_penalty',
        'update_penalty',
        'approve_penalty',
        'block_user',
        'unblock_user',
        'manage_console',
        'create_admin',
        'update_admin',
        'delete_admin',
      ],
    },
    targetModel: {
      type: String,
      enum: ['User', 'Rental', 'Console', 'Penalty', 'Admin'],
    },
    targetId: mongoose.Schema.Types.ObjectId,
    changes: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    status: {
      type: String,
      enum: ['success', 'failed'],
      default: 'success',
    },
    errorMessage: String,
  },
  { timestamps: true }
);

// Индекс для быстрого поиска по дате
logSchema.index({ createdAt: -1 });
logSchema.index({ adminId: 1, createdAt: -1 });

module.exports = mongoose.model('Log', logSchema);
