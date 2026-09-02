const mongoose = require('mongoose');

const LocationHistorySchema = new mongoose.Schema(
  {
    location: { type: String, required: true, trim: true },
    updatedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const CampaignSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true, default: 'global' },
    activeSlot: { type: Number, enum: [1, 2], default: 1 },

    // Admin-managed campaign location only. Do not copy this into participant records.
    currentLocation: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: 'Tamil Nadu' },
    locationUpdatedAt: { type: Date, default: null },
    locationHistory: { type: [LocationHistorySchema], default: [] },

    // Existing slot-setting timestamp can continue using this field.
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports =
  mongoose.models.CampaignSettings ||
  mongoose.model('CampaignSettings', CampaignSettingsSchema);
