const mongoose = require('mongoose');
const CampaignSettings = require('../models/CampaignSettings');
const CampaignDay = require('../models/CampaignDay');
const CampaignWindow = require('../models/CampaignWindow');
const User = require('../models/User');
const { DAILY_COUPON_LIMIT, DEFAULT_SLOT, getPlanWindows, basePercentOf, hourlySplit } = require('../config/campaignConfig');
const { getCampaignHour, getCampaignMinute } = require('../utils/campaignTime');

const RESERVATION_HOLD_MS = 5 * 60 * 1000; // matches claimController's CLAIM_WINDOW_MS

async function getActiveSlot() {
  const settings = await CampaignSettings.findOne({ key: 'global' });
  return settings ? settings.activeSlot : DEFAULT_SLOT;
}

async function setActiveSlot(slot) {
  if (![1, 2].includes(slot)) throw new Error('Invalid slot plan');
  getPlanWindows(slot); // throws if unconfigured
  return CampaignSettings.findOneAndUpdate(
    { key: 'global' },
    { $set: { activeSlot: slot, updatedAt: new Date() } },
    { upsert: true, new: true }
  );
}

/** Creates (idempotently) the snapshot doc for a campaign date — the slot
 * plan active at first-touch governs that date forever, regardless of later
 * admin changes. */
async function ensureCampaignDay(dateStr) {
  const activeSlot = await getActiveSlot();
  return CampaignDay.findOneAndUpdate(
    { dateStr },
    { $setOnInsert: { dateStr, slotPlan: activeSlot, dailyCap: DAILY_COUPON_LIMIT, dailyIssued: 0 } },
    { upsert: true, new: true }
  );
}

function windowKeyForHour(windows, hour) {
  const win = windows.find((w) => hour >= w.startHour && hour < w.endHour);
  return win ? win.key : windows[windows.length - 1].key;
}

/** Ensures the CampaignWindow doc for "now" exists, computing carry-forward
 * from the previous window in that plan's order the first time it's touched. */
async function ensureCurrentWindow(campaignDay, now = new Date()) {
  const windows = getPlanWindows(campaignDay.slotPlan);
  const hour = getCampaignHour(now);
  const currentKey = windowKeyForHour(windows, hour);

  let win = await CampaignWindow.findOne({ dateStr: campaignDay.dateStr, windowKey: currentKey });
  if (win) return win;

  const currentIndex = windows.findIndex((w) => w.key === currentKey);
  const def = windows[currentIndex];
  let carryIn = 0;

  if (currentIndex > 0) {
    const prevDef = windows[currentIndex - 1];
    const prevWin = await CampaignWindow.findOne({ dateStr: campaignDay.dateStr, windowKey: prevDef.key });
    carryIn = prevWin ? Math.max(prevWin.effectiveQuota - prevWin.used, 0) : prevDef.baseQuota;
  }

  const effectiveQuota = def.baseQuota + carryIn;
  const hourCount = def.endHour - def.startHour;
  const hourlyQuotas = hourlySplit(effectiveQuota, hourCount);

  try {
    win = await CampaignWindow.create({
      dateStr: campaignDay.dateStr,
      windowKey: def.key,
      slotPlan: campaignDay.slotPlan,
      startHour: def.startHour,
      endHour: def.endHour,
      baseQuota: def.baseQuota,
      basePercent: basePercentOf(def.baseQuota),
      carryIn,
      effectiveQuota,
      used: 0,
      hourlyQuotas, // starts as the even base split; bumped hour-by-hour by ensureHourlyCarry
      hourlyUsed: hourlyQuotas.map(() => 0),
      hourlyCarryApplied: hourlyQuotas.map((_, i) => i === 0), // hour 0 needs no carry-in
    });
  } catch (err) {
    if (err.code === 11000) {
      win = await CampaignWindow.findOne({ dateStr: campaignDay.dateStr, windowKey: currentKey });
    } else {
      throw err;
    }
  }
  return win;
}

/** Walks hour-by-hour from hour 1 up to hourIndex, folding each hour's
 * unused leftover into the NEXT hour's effective quota the first time that
 * next hour is reached — the same carry-forward pattern already used
 * between major windows, just one level down (within a single window).
 * Idempotent: each hour's carry is applied at most once, guarded atomically
 * by hourlyCarryApplied[i], so concurrent callers can't double-carry. */
async function ensureHourlyCarry(win, hourIndex) {
  let current = win;

  // Self-heal CampaignWindow docs created before hourlyCarryApplied existed
  // (Mongoose doesn't retroactively backfill array defaults on old docs).
  // Safe default: only hour 0 needs no carry — matches reality for a doc
  // that has never had per-hour carry-forward applied yet.
  if (!Array.isArray(current.hourlyCarryApplied) || current.hourlyCarryApplied.length !== current.hourlyQuotas.length) {
    const backfilled = current.hourlyQuotas.map((_, i) => i === 0);
    current =
      (await CampaignWindow.findOneAndUpdate(
        { _id: current._id },
        { $set: { hourlyCarryApplied: backfilled } },
        { new: true }
      )) || current;
  }

  for (let h = 1; h <= hourIndex; h++) {
    if (current.hourlyCarryApplied[h]) continue;

    const prevQuota = current.hourlyQuotas[h - 1];
    const prevUsed = current.hourlyUsed[h - 1];
    const carry = Math.max(prevQuota - prevUsed, 0);
    const newEffective = current.hourlyQuotas[h] + carry;

    const updated = await CampaignWindow.findOneAndUpdate(
      { _id: current._id, [`hourlyCarryApplied.${h}`]: { $ne: true } },
      { $set: { [`hourlyQuotas.${h}`]: newEffective, [`hourlyCarryApplied.${h}`]: true } },
      { new: true }
    );
    current = updated || (await CampaignWindow.findById(current._id));
  }
  return current;
}

/** Atomically reserves one coupon slot against the daily cap, the current
 * window's effective quota, AND the current hour's hard quota within that
 * window. Returns { ok:false } without persisting anything if any of the
 * three is exhausted. */
async function reserveCouponSlot(dateStr) {
  const campaignDay = await ensureCampaignDay(dateStr);
  let win = await ensureCurrentWindow(campaignDay);
  const hour = getCampaignHour();
  const hourIndex = hour - win.startHour;
  win = await ensureHourlyCarry(win, hourIndex);

  const session = await mongoose.startSession();
  try {
    let outcome = { ok: false };
    await session.withTransaction(async () => {
      const dayUpdate = await CampaignDay.findOneAndUpdate(
        { dateStr, $expr: { $lt: ['$dailyIssued', '$dailyCap'] } },
        { $inc: { dailyIssued: 1 } },
        { session, new: true }
      );
      if (!dayUpdate) {
        await session.abortTransaction();
        return;
      }

      const windowUpdate = await CampaignWindow.findOneAndUpdate(
        {
          dateStr,
          windowKey: win.windowKey,
          $expr: {
            $and: [
              { $lt: ['$used', '$effectiveQuota'] },
              {
                $lt: [
                  { $arrayElemAt: ['$hourlyUsed', hourIndex] },
                  { $arrayElemAt: ['$hourlyQuotas', hourIndex] },
                ],
              },
            ],
          },
        },
        { $inc: { used: 1, [`hourlyUsed.${hourIndex}`]: 1 } },
        { session, new: true }
      );
      if (!windowUpdate) {
        await session.abortTransaction();
        return;
      }

      outcome = { ok: true, windowKey: win.windowKey, slotPlan: campaignDay.slotPlan, hourIndex };
    });
    return outcome;
  } finally {
    session.endSession();
  }
}

/** Releases a previously reserved slot back to all three counters (floors at 0). */
async function releaseCouponSlot(dateStr, windowKey, hourIndex) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await CampaignDay.findOneAndUpdate(
        { dateStr, dailyIssued: { $gt: 0 } },
        { $inc: { dailyIssued: -1 } },
        { session }
      );
      const hourlyFilter =
        hourIndex != null ? { [`hourlyUsed.${hourIndex}`]: { $gt: 0 } } : {};
      const hourlyUpdate = hourIndex != null ? { [`hourlyUsed.${hourIndex}`]: -1 } : {};
      await CampaignWindow.findOneAndUpdate(
        { dateStr, windowKey, used: { $gt: 0 }, ...hourlyFilter },
        { $inc: { used: -1, ...hourlyUpdate } },
        { session }
      );
    });
  } finally {
    session.endSession();
  }
}

/** Decides a single coin-flip attempt using minute-based quota pacing:
 * probability = (remaining hour quota) / (remaining minutes in the hour),
 * recalculated fresh on every attempt so the hour's quota spreads across the
 * hour instead of bursting in the first few flips or being starved by a
 * flat 50/50 chance. A "win" draw still goes through the same atomic
 * reserveCouponSlot ceiling check (daily + window + hour), so the hard caps
 * are never bypassed even under a race right at the pacing boundary. */
async function decideCoinOutcome(dateStr, now = new Date()) {
  const campaignDay = await ensureCampaignDay(dateStr);
  let win = await ensureCurrentWindow(campaignDay, now);
  const hour = getCampaignHour(now);
  const hourIndex = hour - win.startHour;
  win = await ensureHourlyCarry(win, hourIndex);

  const hourQuota = win.hourlyQuotas[hourIndex] ?? 0;
  const hourUsed = win.hourlyUsed[hourIndex] ?? 0;
  const hourRemaining = Math.max(hourQuota - hourUsed, 0);
  const dailyRemaining = Math.max(campaignDay.dailyCap - campaignDay.dailyIssued, 0);
  const effectiveRemaining = Math.min(hourRemaining, dailyRemaining);

  const minute = getCampaignMinute(now);
  const minutesRemaining = Math.max(60 - minute, 1); // clamp so the last minute doesn't divide by ~0

  const probability = effectiveRemaining <= 0 ? 0 : Math.min(1, effectiveRemaining / minutesRemaining);
  const intendsWin = Math.random() < probability;

  if (!intendsWin) return { win: false };

  const reservation = await reserveCouponSlot(dateStr);
  if (!reservation.ok) return { win: false }; // lost the race to another concurrent attempt

  return { win: true, windowKey: reservation.windowKey, slotPlan: reservation.slotPlan, hourIndex: reservation.hourIndex };
}

/** Sweeps reserved-but-undecided coupon wins whose hold window has expired
 * back into the pool. Safe to call frequently — idempotent per user via the
 * couponReserved flag. */
async function releaseExpiredReservations(dateStr, now = new Date()) {
  const candidates = await User.find({
    dateStr,
    couponReserved: true,
    claimAccepted: { $ne: true },
    claimLinkDeclined: { $ne: true },
    claimDeclined: { $ne: true },
  });

  // The hold clock starts at coin-win, but resets once a claim link is
  // issued (registerClaim) — same 5-minute window claimController enforces
  // for the link itself, so the two never disagree about "expired".
  const expired = candidates.filter((user) => {
    const holdStart = user.claimTokenIssuedAt || user.couponReservedAt;
    if (!holdStart) return false;
    return now.getTime() - new Date(holdStart).getTime() > RESERVATION_HOLD_MS;
  });

  for (const user of expired) {
    await releaseCouponSlot(dateStr, user.windowKey, user.couponReservedHourIndex);
    user.couponReserved = false;
    user.couponCode = null;
    user.couponReleasedAt = now;
    await user.save();
  }
}

module.exports = {
  getActiveSlot,
  setActiveSlot,
  ensureCampaignDay,
  ensureCurrentWindow,
  reserveCouponSlot,
  releaseCouponSlot,
  releaseExpiredReservations,
  decideCoinOutcome,
};
