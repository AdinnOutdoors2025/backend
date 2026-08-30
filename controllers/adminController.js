const User = require('../models/User');
const CampaignDay = require('../models/CampaignDay');
const CampaignWindow = require('../models/CampaignWindow');
const { getCampaignDateStr } = require('../utils/campaignTime');
const { DAILY_COUPON_LIMIT, getPlanWindows } = require('../config/campaignConfig');
const {
  getActiveSlot,
  setActiveSlot,
  ensureCampaignDay,
  ensureCurrentWindow,
} = require('../services/campaignQuota');

function getTodayStr() {
  return getCampaignDateStr();
}

/** "14" -> "2 PM", "0"/"24" -> "12 AM", "12" -> "12 PM" — admin-friendly window labels. */
function formatHour12(hour) {
  const h = ((hour % 24) + 24) % 24;
  const period = h < 12 ? 'AM' : 'PM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour} ${period}`;
}

/** Active campaign slot plan + the (env-configured, read-only) daily coupon cap. */
exports.getSettings = async (req, res) => {
  try {
    const activeSlot = await getActiveSlot();
    return res.json({ ok: true, activeSlot, dailyCap: DAILY_COUPON_LIMIT });
  } catch (err) {
    console.error(err); res.status(500).json({ ok: false, error: 'Server error' });
  }
};

/** Admin picks Slot Plan 1 or 2 — persists until changed again. Only
 * governs days touched from now on; already-snapshotted CampaignDay records
 * are never rewritten (see services/campaignQuota.js ensureCampaignDay). */
exports.setActiveSlot = async (req, res) => {
  try {
    const { slot } = req.body;
    const parsed = Number(slot);
    if (![1, 2].includes(parsed)) {
      return res.status(400).json({ ok: false, message: 'slot must be 1 or 2' });
    }
    const doc = await setActiveSlot(parsed);
    return res.json({ ok: true, activeSlot: doc.activeSlot });
  } catch (err) {
    console.error(err); res.status(500).json({ ok: false, error: 'Server error' });
  }
};

/** Builds the campaign-day + per-window quota summary for one date, using
 * already-persisted CampaignWindow docs for past windows and only touching
 * ensureCurrentWindow for today's in-progress window so history never
 * changes underfoot. */
async function summarizeDay(dateStr, isToday) {
  let campaignDay = await CampaignDay.findOne({ dateStr });
  if (!campaignDay && isToday) campaignDay = await ensureCampaignDay(dateStr);
  if (!campaignDay) return null;

  if (isToday) await ensureCurrentWindow(campaignDay);

  const planWindows = getPlanWindows(campaignDay.slotPlan);
  const persisted = await CampaignWindow.find({ dateStr }).lean();
  const byKey = new Map(persisted.map((w) => [w.windowKey, w]));

  // "Reserved" (dailyIssued/used above) counts a coin-win the moment it's
  // decided — needed so the quota can never be oversold while a claim is
  // still pending. "Confirmed" is the real business number: only consent
  // letters actually Accepted. A user who declined/cancelled/let the link
  // expire was already released from the reserved counters, so it never
  // shows here either — this is a read-only display query, no counters to
  // keep in sync.
  const dailyConfirmed = await User.countDocuments({ dateStr, claimAccepted: true });
  const confirmedByWindow = await User.aggregate([
    { $match: { dateStr, claimAccepted: true } },
    { $group: { _id: '$windowKey', count: { $sum: 1 } } },
  ]);
  const confirmedMap = new Map(confirmedByWindow.map((row) => [row._id, row.count]));

  const windows = planWindows.map((def) => {
    const win = byKey.get(def.key);
    return {
      windowKey: def.key,
      label: `${formatHour12(def.startHour)} - ${formatHour12(def.endHour)}`,
      basePercent: win ? win.basePercent : Math.round((def.baseQuota / campaignDay.dailyCap) * 1000) / 10,
      baseQuota: def.baseQuota,
      carryIn: win ? win.carryIn : 0,
      effectiveQuota: win ? win.effectiveQuota : def.baseQuota,
      used: win ? win.used : 0, // reserved (coin win), see note above
      remaining: win ? Math.max(win.effectiveQuota - win.used, 0) : def.baseQuota,
      confirmed: confirmedMap.get(def.key) ?? 0, // consent letter Accepted
    };
  });

  return {
    dateStr,
    slotPlan: campaignDay.slotPlan,
    dailyCap: campaignDay.dailyCap,
    dailyIssued: campaignDay.dailyIssued, // reserved (coin win), see note above
    dailyRemaining: Math.max(campaignDay.dailyCap - campaignDay.dailyIssued, 0),
    dailyConfirmed, // consent letter Accepted — the real business number
    windows,
  };
}

/** Per-date slot/window quota breakdown for the admin report — powers the
 * quota panel, the slot/window filters, and PDF/Excel exports. */
exports.getCampaignDays = async (req, res) => {
  try {
    const { start, end } = req.query;
    const today = getTodayStr();
    const from = start || today;
    const to = end || today;

    const dates = [];
    for (let d = new Date(`${from}T00:00:00Z`); getCampaignDateStr(d) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
      dates.push(getCampaignDateStr(d));
      if (dates.length > 366) break; // sanity guard against runaway ranges
    }

    const days = [];
    for (const dateStr of dates) {
      const summary = await summarizeDay(dateStr, dateStr === today);
      if (summary) days.push(summary);
    }

    return res.json({ ok: true, days });
  } catch (err) {
    console.error(err); res.status(500).json({ ok: false, error: 'Server error' });
  }
};

exports.getDashboard = async (req, res) => {
  try{
    const { start, end } = req.query; // optional YYYY-MM-DD
    if(start && end){
      const users = await User.find({ dateStr: { $gte: start, $lte: end } });
      const total = users.length;
      const spinnerCompleted = users.filter(u => u.spinnerStatus === 'completed').length;
      const spinnerPending = users.filter(u => u.spinnerStatus === 'pending').length;
      const coinCompleted = users.filter(u => u.coinStatus === 'completed').length;
      const coinPending = users.filter(u => u.coinStatus === 'pending').length;
      return res.json({ ok:true, total, spinnerCompleted, spinnerPending, coinCompleted, coinPending });
    }
    const today = getTodayStr();
    const users = await User.find({ dateStr: today });
    const total = users.length;
    const spinnerCompleted = users.filter(u => u.spinnerStatus === 'completed').length;
    const spinnerPending = users.filter(u => u.spinnerStatus === 'pending').length;
    const coinCompleted = users.filter(u => u.coinStatus === 'completed').length;
    const coinPending = users.filter(u => u.coinStatus === 'pending').length;
    const campaignSummary = await summarizeDay(today, true);
    return res.json({
      ok:true, total, spinnerCompleted, spinnerPending, coinCompleted, coinPending,
      campaign: campaignSummary,
    });
  }catch(err){
    console.error(err);res.status(500).json({ ok:false, error: 'Server error' });
  }
}
