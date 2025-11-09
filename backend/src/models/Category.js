const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: String,
    icon: String,
    color: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
