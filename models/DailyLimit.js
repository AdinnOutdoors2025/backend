const mongoose = require('mongoose');

// A single global setting — the participant limit applies every day until
// the admin explicitly changes it. Not scoped by date; only one document
// ever exists (key: 'global').
const DailyLimitSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'global' },
  limit: { type: Number, required: true, default: 100 }
});

module.exports = mongoose.models.DailyLimit || mongoose.model('DailyLimit', DailyLimitSchema);
