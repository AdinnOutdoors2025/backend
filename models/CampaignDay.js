const mongoose = require('mongoose');

// One document per campaign date — snapshots which slot plan governed that
// date so a later admin slot change never rewrites history. dailyIssued is
// the only field mutated after creation, via atomic $inc in campaignQuota.js.
const CampaignDaySchema = new mongoose.Schema({
  dateStr: { type: String, required: true, unique: true }, // YYYY-MM-DD (campaign timezone)
  slotPlan: { type: Number, enum: [1, 2], required: true },
  dailyCap: { type: Number, required: true },
  dailyIssued: { type: Number, required: true, default: 0 },
  createdAt: { type: Date, default: Date.now },
  // Mode 2 only: atomic counter of coin-flip decisions for the fixed
  // 7-WIN / 3-TRY-AGAIN cycle. Scoped per campaign day so a new day starts
  // the cycle fresh. Never touched in slot-based mode.
  flipCounter: { type: Number, required: true, default: 0 },
});

module.exports = mongoose.models.CampaignDay || mongoose.model('CampaignDay', CampaignDaySchema);
