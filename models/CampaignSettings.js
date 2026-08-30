const mongoose = require('mongoose');

// Admin-controlled active slot plan — a single global setting, persisted
// until an admin changes it. Replaces DailyLimit for admin state; DailyLimit
// itself is left in place unused rather than deleted.
const CampaignSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'global' },
  activeSlot: { type: Number, enum: [1, 2], required: true, default: 1 },
  updatedAt: { type: Date, default: Date.now },
});

module.exports =
  mongoose.models.CampaignSettings || mongoose.model('CampaignSettings', CampaignSettingsSchema);
