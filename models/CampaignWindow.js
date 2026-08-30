const mongoose = require('mongoose');

// One document per (dateStr, windowKey) major time window — created lazily
// the first time that window is touched, at which point carry-forward from
// the previous window is baked into effectiveQuota. `used` is the only field
// mutated after creation, via atomic $inc in campaignQuota.js.
const CampaignWindowSchema = new mongoose.Schema({
  dateStr: { type: String, required: true }, // YYYY-MM-DD (campaign timezone)
  windowKey: { type: String, required: true }, // e.g. "12-16"
  slotPlan: { type: Number, enum: [1, 2], required: true },
  startHour: { type: Number, required: true },
  endHour: { type: Number, required: true },
  baseQuota: { type: Number, required: true },
  basePercent: { type: Number, required: true },
  carryIn: { type: Number, required: true, default: 0 },
  effectiveQuota: { type: Number, required: true },
  used: { type: Number, required: true, default: 0 },
  // hourlyQuotas[i] starts as the even base split, then gets bumped once
  // (atomically, guarded by hourlyCarryApplied[i]) the moment hour i is first
  // reached, folding in unused quota carried from hour i-1. So it always
  // reads as "this hour's enforceable effective quota" — base until reached,
  // base+carry from then on. hourlyUsed is the atomically-incremented usage
  // counter parallel to it; hourlyCarryApplied guards against double-carry.
  hourlyQuotas: { type: [Number], default: [] },
  hourlyUsed: { type: [Number], default: [] },
  hourlyCarryApplied: { type: [Boolean], default: [] },
  createdAt: { type: Date, default: Date.now },
});

CampaignWindowSchema.index({ dateStr: 1, windowKey: 1 }, { unique: true });

module.exports =
  mongoose.models.CampaignWindow || mongoose.model('CampaignWindow', CampaignWindowSchema);
