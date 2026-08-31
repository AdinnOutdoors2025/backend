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

/** Sets the admin's chosen slot plan. Admin can switch at any time, even
 * mid-day with real activity already on the books — CampaignDay.slotPlan
 * tracks "the plan currently governing the REST of today", not a rigid
 * whole-day lock. Real consumption (`used`) is never touched or shrunk.
 *
 * For any window shared between the old and new plan (same windowKey) that
 * has already been reached: its base is rebased to
 * MAX(new plan's own definition, real confirmed count) — a window can never
 * be shrunk below what's actually happened. If that real count exceeds the
 * new plan's own share for that slot (overflow), the excess is deducted
 * from the rest of the day: the new plan's remaining not-yet-reached
 * windows split whatever's left of the daily cap EVENLY (not by their own
 * percentages, which no longer fit) — this is the only case where they
 * don't just use their native definition. When there's no overflow, the
 * plan's own percentages already sum to the daily cap, so remaining windows
 * need no adjustment at all (handled naturally when they're later reached,
 * see ensureWindowAt / summarizeDay's placeholders). */
async function setActiveSlot(slot) {
  if (![1, 2].includes(slot)) throw new Error('Invalid slot plan');
  const newWindows = getPlanWindows(slot); // throws if unconfigured

  const settings = await CampaignSettings.findOneAndUpdate(
    { key: 'global' },
    { $set: { activeSlot: slot, updatedAt: new Date() } },
    { upsert: true, new: true }
  );

  const today = getCampaignDateStr();
  const campaignDay = await CampaignDay.findOneAndUpdate(
    { dateStr: today },
    { $set: { slotPlan: slot } },
    { new: true }
  );
  if (!campaignDay) return settings; // nothing touched today yet — nothing to rebase

  const existingDocs = await CampaignWindow.find({ dateStr: today });
  const existingByKey = new Map(existingDocs.map((w) => [w.windowKey, w]));

  let lockedTotal = 0;
  const touchedKeys = new Set();
  for (const def of newWindows) {
    const existing = existingByKey.get(def.key);
    if (!existing) continue;
    touchedKeys.add(def.key);

    const newBase = Math.max(def.baseQuota, existing.used);
    lockedTotal += newBase;
    if (newBase === existing.baseQuota && existing.slotPlan === slot) continue;

    const newEffective = newBase + existing.carryIn;
    const hourCount = existing.endHour - existing.startHour;
    const newHourlyQuotas = hourlySplit(newEffective, hourCount);
    await CampaignWindow.updateOne(
      { _id: existing._id },
      {
        $set: {
          slotPlan: slot,
          baseQuota: newBase,
          basePercent: basePercentOf(newBase),
          effectiveQuota: newEffective,
          hourlyQuotas: newHourlyQuotas,
        },
      }
    );
  }

  const remainingDefs = newWindows.filter((def) => !touchedKeys.has(def.key));
  const nativeSum = remainingDefs.reduce((sum, def) => sum + def.baseQuota, 0);
  const remainingBudget = Math.max(0, campaignDay.dailyCap - lockedTotal);

  if (remainingDefs.length > 0 && remainingBudget < nativeSum) {
    // Overflow: the plan's native percentages no longer fit today — split
    // whatever's left evenly across the still-untouched windows instead.
    const splitBases = hourlySplit(remainingBudget, remainingDefs.length);
    for (let i = 0; i < remainingDefs.length; i++) {
      const def = remainingDefs[i];
      const overrideBase = splitBases[i];
      const hourCount = def.endHour - def.startHour;
      const overrideHourly = hourlySplit(overrideBase, hourCount);
      await CampaignWindow.findOneAndUpdate(
        { dateStr: today, windowKey: def.key, used: 0 },
        {
          $set: {
            slotPlan: slot,
            baseQuota: overrideBase,
            basePercent: basePercentOf(overrideBase),
            carryIn: 0,
            effectiveQuota: overrideBase,
            hourlyQuotas: overrideHourly,
            hourlyUsed: overrideHourly.map(() => 0),
            hourlyCarryApplied: overrideHourly.map((_, idx) => idx === 0),
          },
          $setOnInsert: {
            dateStr: today,
            windowKey: def.key,
            startHour: def.startHour,
            endHour: def.endHour,
            used: 0,
          },
        },
        { upsert: true }
      );
    }
  }

  return settings;
}

/** Creates (idempotently) the snapshot doc for a campaign date — governs
 * whichever windows haven't been reached yet; see setActiveSlot for how a
 * mid-day admin change updates this going forward without touching history. */
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
 * to its predecessor FIRST (within the CURRENT plan's own sequence) so
 * same-plan gaps always chain correctly even when several consecutive
 * windows were never touched by anyone.
 *
 * The actual carry-in source, though, is NOT "the previous index in this
 * plan's list" — it's "whichever CampaignWindow doc for today (any plan)
 * chronologically ends at or before this window starts". This is what lets
 * carry-forward bridge correctly across a mid-day admin slot switch: if
 * admin changes Slot 1 -> Slot 2 after 4-8 PM already ran, Slot 2's 8-12 PM
 * window picks up Slot 1's real, already-recorded 4-8 PM leftover — not a
 * fresh, never-happened Slot 2 "4-8 PM" recomputed from scratch. Recursing
 * into the current plan's own predecessor first still matters for ordinary
 * same-plan gaps (nothing foreign to find yet, so it creates one). */
async function ensureWindowAt(campaignDay, windows, index) {
  const def = windows[index];

  let win = await CampaignWindow.findOne({ dateStr: campaignDay.dateStr, windowKey: def.key });
  if (win) return win;

  if (index > 0) {
    await ensureWindowAt(campaignDay, windows, index - 1);
  }

  const priorWin = await CampaignWindow.findOne({
    dateStr: campaignDay.dateStr,
    endHour: { $lte: def.startHour },
  }).sort({ endHour: -1 });
  const carryIn = priorWin ? Math.max(priorWin.effectiveQuota - priorWin.used, 0) : 0;

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
