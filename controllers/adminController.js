const User = require('../models/User');
const CampaignDay = require('../models/CampaignDay');
const CampaignWindow = require('../models/CampaignWindow');
const { getCampaignDateStr, getCampaignHour } = require('../utils/campaignTime');
const { DAILY_COUPON_LIMIT, getPlanWindows, basePercentOf } = require('../config/campaignConfig');
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

/** Admin picks Slot Plan 1 or 2 — persists until changed again, and can be
 * switched mid-day. Already-recorded CampaignWindow history is never
 * touched; only windows not yet reached today (and future days) follow the
 * new plan (see services/campaignQuota.js setActiveSlot/ensureWindowAt). */
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

/** Builds the campaign-day + per-window quota summary for one date. Window
 * rows come from the REAL CampaignWindow documents that exist for the date
 * (each stamped with whichever plan was active when IT was first reached) —
 * not from a single day-wide plan — so a day where admin switched plans
 * mid-day correctly shows each segment under its own plan/timing, with
 * history from before the switch untouched. Upcoming windows of the
 * CURRENTLY active plan that haven't started yet get a "not started"
 * placeholder row so admin can see what's still ahead today. */
async function summarizeDay(dateStr, isToday) {
  let campaignDay = await CampaignDay.findOne({ dateStr });
  if (!campaignDay && isToday) campaignDay = await ensureCampaignDay(dateStr);
  if (!campaignDay) return null;

  if (isToday) await ensureCurrentWindow(campaignDay);

  const persisted = await CampaignWindow.find({ dateStr }).sort({ startHour: 1 }).lean();
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

  // Real, already-touched windows — the actual history for the date,
  // regardless of which plan happened to be active for each one.
  const windows = persisted.map((win) => ({
    windowKey: win.windowKey,
    startHour: win.startHour,
    label: `${formatHour12(win.startHour)} - ${formatHour12(win.endHour)}`,
    slotPlan: win.slotPlan,
    basePercent: win.basePercent,
    baseQuota: win.baseQuota,
    carryIn: win.carryIn,
    effectiveQuota: win.effectiveQuota,
    used: win.used, // reserved (coin win), see note above
    remaining: Math.max(win.effectiveQuota - win.used, 0),
    confirmed: confirmedMap.get(win.windowKey) ?? 0, // consent letter Accepted
  }));

  // Placeholder rows for windows of the CURRENTLY active plan that haven't
  // been reached yet today — skip anything whose time already passed (it
  // belonged to a plan that was swapped out before its turn ever came).
  const nowHour = isToday ? getCampaignHour() : null;
  for (const def of getPlanWindows(campaignDay.slotPlan)) {
    if (byKey.has(def.key)) continue;
    if (nowHour !== null && def.startHour < nowHour) continue;
    windows.push({
      windowKey: def.key,
      startHour: def.startHour,
      label: `${formatHour12(def.startHour)} - ${formatHour12(def.endHour)}`,
      slotPlan: campaignDay.slotPlan,
      basePercent: basePercentOf(def.baseQuota),
      baseQuota: def.baseQuota,
      carryIn: 0,
      effectiveQuota: def.baseQuota,
      used: 0,
      remaining: def.baseQuota,
      confirmed: 0,
    });
  }
  windows.sort((a, b) => a.startHour - b.startHour);

  return {
    dateStr,
    slotPlan: campaignDay.slotPlan, // the plan currently governing the rest of today
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
