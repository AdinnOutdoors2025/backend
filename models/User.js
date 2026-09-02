const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String },
  phone: { type: String, default: null },
  sessionId: { type: String, index: true, default: null },
  dateStr: { type: String, required: true },

  // Wheel / task
  spinnerResult: { type: String, default: null },
  wheelCategory: { type: String, default: null },
  wheelTask: { type: String, default: null },
  spinnerStatus: {
    type: String,
    enum: ['pending', 'completed', 'rejected'],
    default: 'pending',
  },
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

  // Existing quota metadata
  windowKey: { type: String, default: null },
  slotPlanSnapshot: { type: Number, default: null },
  couponReservedHourIndex: { type: Number, default: null },
  couponReserved: { type: Boolean, default: false },
  couponReservedAt: { type: Date, default: null },
  couponReleasedAt: { type: Date, default: null },

  // Claim link
  claimToken: { type: String, default: null, index: true },
  claimTokenIssuedAt: { type: Date, default: null },
  claimAccepted: { type: Boolean, default: false },
  claimAcceptedAt: { type: Date, default: null },
  claimLocationLat: { type: Number, default: null },
  claimLocationLng: { type: Number, default: null },

  // Existing physical/geolocation capture remains untouched.
  detailsLocationLat: { type: Number, default: null },
  detailsLocationLng: { type: Number, default: null },

  // Digital consent files only. No admin location is stored on the participant.
  signatureKey: { type: String, default: null },
  signatureUrl: { type: String, default: null },
  signatureSavedAt: { type: Date, default: null },
  consentPdfKey: { type: String, default: null },
  consentPdfUrl: { type: String, default: null },

  // Coin-win form cancel
  claimDeclined: { type: Boolean, default: false },
  claimDeclinedAt: { type: Date, default: null },

  // Consent-link decline
  claimLinkDeclined: { type: Boolean, default: false },
  claimLinkDeclinedAt: { type: Date, default: null },

  completedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports =
  mongoose.models.BiggUser || mongoose.model('BiggUser', UserSchema, 'bigg_users');
