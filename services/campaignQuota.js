const mongoose = require('mongoose');
const CampaignSettings = require('../models/CampaignSettings');
const CampaignDay = require('../models/CampaignDay');
const CampaignWindow = require('../models/CampaignWindow');
const { DAILY_COUPON_LIMIT, DEFAULT_SLOT, getPlanWindows, basePercentOf, hourlySplit } = require('../config/campaignConfig');
const { getCampaignDateStr, getCampaignHour, getCampaignMinute } = require('../utils/campaignTime');

async function getActiveSlot() {
  const settings = await CampaignSettings.findOne({ key: 'global' });
  return settings ? settings.activeSlot : DEFAULT_SLOT;
}

/** Sets the admin's chosen slot plan. Today's CampaignDay snapshot (see
 * ensureCampaignDay) is normally locked to whatever plan governed it at
 * first touch — but if today has 0 confirmed coupons so far, nothing real
 * has happened yet, so there's no history to protect: today gets
 * re-snapshotted onto the new plan too (its stale CampaignWindow docs, built
 * for the old plan's hours/percentages, are cleared so they regenerate
 * fresh). The moment a coupon is confirmed, today locks in for good. */
async function setActiveSlot(slot) {
  if (![1, 2].includes(slot)) throw new Error('Invalid slot plan');
  getPlanWindows(slot); // throws if unconfigured

  const settings = await CampaignSettings.findOneAndUpdate(
    { key: 'global' },
    { $set: { activeSlot: slot, updatedAt: new Date() } },
    { upsert: true, new: true }
  );

  const today = getCampaignDateStr();
  const todayDoc = await CampaignDay.findOne({ dateStr: today });
  if (todayDoc && todayDoc.dailyIssued === 0 && todayDoc.slotPlan !== slot) {
    todayDoc.slotPlan = slot;
    await todayDoc.save();
    await CampaignWindow.deleteMany({ dateStr: today });
  }

  return settings;
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

/** Ensures the CampaignWindow doc for plan-window `index` exists, recursing
 * to its predecessor FIRST so carry-forward always chains correctly even
 * when several consecutive windows were never touched by anyone (e.g. 12-4
 * and 4-8 both had zero activity before 8-12 starts) — without this, a
 * window would compute its carry from its untouched predecessor's bare base
 * quota instead of that predecessor's own (possibly carry-boosted)
 * effective quota, silently losing whatever carried into the earlier gap. */
async function ensureWindowAt(campaignDay, windows, index) {
  const def = windows[index];

  let win = await CampaignWindow.findOne({ dateStr: campaignDay.dateStr, windowKey: def.key });
  if (win) return win;

  let carryIn = 0;
  if (index > 0) {
    const prevWin = await ensureWindowAt(campaignDay, windows, index - 1);
    carryIn = Math.max(prevWin.effectiveQuota - prevWin.used, 0);
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
      win = await CampaignWindow.findOne({ dateStr: campaignDay.dateStr, windowKey: def.key });
    } else {
      throw err;
    }
  }
  return win;
}

/** Ensures the CampaignWindow doc for "now" exists (and, transitively, every
 * earlier window in today's plan — see ensureWindowAt). */
async function ensureCurrentWindow(campaignDay, now = new Date()) {
  const windows = getPlanWindows(campaignDay.slotPlan);
  const hour = getCampaignHour(now);
  const currentKey = windowKeyForHour(windows, hour);
  const currentIndex = windows.findIndex((w) => w.key === currentKey);
  return ensureWindowAt(campaignDay, windows, currentIndex);
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

/** Atomically confirms one coupon slot against the daily cap, the current
 * window's effective quota, AND the current hour's hard quota within that
 * window. This is the single real point of consumption — called only from
 * claimController.acceptClaim, never at coin-win time — so hourlyUsed/
 * window.used/dailyIssued only ever count consent letters actually
 * Accepted. Returns { ok:false } without persisting anything if any of the
 * three is exhausted (the caller must then refuse to issue a coupon). */
async function confirmCouponSlot(dateStr) {
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

/** Decides a single coin-flip attempt using minute-based quota pacing:
 * probability = (remaining hour quota) / (remaining minutes in the hour),
 * recalculated fresh on every attempt so the hour's quota spreads across the
 * hour instead of bursting in the first few flips or being starved by a
 * flat 50/50 chance. This is a READ-ONLY check — nothing is consumed here;
 * hourlyUsed/window.used/dailyIssued only ever move at consent-accept time
 * (see confirmCouponSlot), so a "win" shown here is not yet a guaranteed
 * coupon. The hard part is the clamp: once remaining hits 0 (daily cap or
 * this hour's carry-adjusted quota already fully confirmed), probability
 * drops to 0 and every further flip shows "Try Again" only. */
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

  return { win: intendsWin };
}

module.exports = {
  getActiveSlot,
  setActiveSlot,
  ensureCampaignDay,
  ensureCurrentWindow,
  confirmCouponSlot,
  decideCoinOutcome,
};
