const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String },
  phone: { type: String, required: true },
  dateStr: { type: String, required: true }, // YYYY-MM-DD

  // Wheel / task
  spinnerResult: { type: String, default: null }, // legacy alias of wheelCategory, kept for backward compatibility
  wheelCategory: { type: String, default: null },
  wheelTask: { type: String, default: null }, // full challenge sentence shown in the modal
  spinnerStatus: { type: String, enum: ['pending', 'completed', 'rejected'], default: 'pending' },
  wheelSpinStartedAt: { type: Date, default: null },
  wheelSpinCompletedAt: { type: Date, default: null },
  taskCompletedAt: { type: Date, default: null },
  taskFailedAt: { type: Date, default: null },

  // Coin flip
  coinResult: { type: String, enum: ['win', 'lose', null], default: null },
  coinStatus: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  coinFlipStartedAt: { type: Date, default: null },
  coinFlipCompletedAt: { type: Date, default: null },
  couponCode: { type: String, default: null },

  // Journey
  completedAt: { type: Date, default: null }, // set once the journey has a final outcome (task failed, or coin flipped)
  createdAt: { type: Date, default: Date.now }
});

// Use a distinct model name/collection to avoid colliding with the existing `User` model from other parts of the app
module.exports = mongoose.models.BiggUser || mongoose.model('BiggUser', UserSchema, 'bigg_users');
