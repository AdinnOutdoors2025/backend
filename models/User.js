const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String },
  phone: { type: String, default: null }, // captured only after the coin-win claim form, not at entry
  sessionId: { type: String, index: true, default: null }, // anonymous id assigned before the wheel spin, used as the key until phone is captured
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

  // Coupon quota reservation — set when the coin win atomically reserves a
  // slot against the daily/window cap (see services/campaignQuota.js).
  // Released (couponReserved back to false) if the participant cancels,
  // declines, or the reservation hold window expires unclaimed.
  windowKey: { type: String, default: null },
  slotPlanSnapshot: { type: Number, default: null },
  couponReservedHourIndex: { type: Number, default: null },
  couponReserved: { type: Boolean, default: false },
  couponReservedAt: { type: Date, default: null },
  couponReleasedAt: { type: Date, default: null },

  // Claim link (shown/sent only after the coin-win name+phone form is submitted)
  claimToken: { type: String, default: null, index: true },
  claimTokenIssuedAt: { type: Date, default: null }, // start of the 30-minute claim window
  claimAccepted: { type: Boolean, default: false },
  claimAcceptedAt: { type: Date, default: null },
  claimLocationLat: { type: Number, default: null },
  claimLocationLng: { type: Number, default: null },

  // Location captured at the coin-win name+phone form submit (registerClaim),
  // distinct from claimLocationLat/Lng which is captured at Accept/Decline time.
  detailsLocationLat: { type: Number, default: null },
  detailsLocationLng: { type: Number, default: null },

  // Set when a coin-win participant hits "Cancel" on the name+phone form
  // instead of claiming — they are done with the journey, no coupon.
  claimDeclined: { type: Boolean, default: false },
  claimDeclinedAt: { type: Date, default: null },

  // Set when the participant opens the claim link and ticks "Decline"
  // instead of "Accept" — distinct from claimDeclined (that's the earlier
  // coin-win Cancel button).
  claimLinkDeclined: { type: Boolean, default: false },
  claimLinkDeclinedAt: { type: Date, default: null },

  // Journey
  completedAt: { type: Date, default: null }, // set once the journey has a final outcome (task failed, or coin flipped)
  createdAt: { type: Date, default: Date.now }
});

// Use a distinct model name/collection to avoid colliding with the existing `User` model from other parts of the app
module.exports = mongoose.models.BiggUser || mongoose.model('BiggUser', UserSchema, 'bigg_users');
