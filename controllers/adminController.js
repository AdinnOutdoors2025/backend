const path = require('path');
const User = require('../models/User');
const CampaignSettings = require('../models/CampaignSettings');
const CampaignDay = require('../models/CampaignDay');
const CampaignWindow = require('../models/CampaignWindow');
const { getCampaignDateStr, getCampaignHour } = require('../utils/campaignTime');
const {
  DAILY_COUPON_LIMIT,
  DEFAULT_SLOT,
  getPlanWindows,
  basePercentOf,
} = require('../config/campaignConfig');
const {
  getActiveSlot,
  setActiveSlot,
  ensureCampaignDay,
  ensureCurrentWindow,
} = require('../services/campaignQuota');
const { getObjectStream } = require('../utils/spaces');

function getTodayStr() {
  return getCampaignDateStr();
}

function formatHour12(hour) {
  const h = ((hour % 24) + 24) % 24;
  const period = h < 12 ? 'AM' : 'PM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour} ${period}`;
}

async function getGlobalSettings() {
  return CampaignSettings.findOne({ key: 'global' });
}

/** Existing slot settings endpoint. */
exports.getSettings = async (req, res) => {
  try {
    const activeSlot = await getActiveSlot();
    return res.json({ ok: true, activeSlot, dailyCap: DAILY_COUPON_LIMIT });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};

/** Existing active slot update. */
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
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};

/** Current admin-managed campaign location. */
exports.getLocation = async (req, res) => {
  try {
    const settings = await getGlobalSettings();
    return res.json({
      ok: true,
      currentLocation: settings?.currentLocation?.trim() || '',
      state: settings?.state?.trim() || 'Tamil Nadu',
      updatedAt: settings?.locationUpdatedAt || null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
};

/** Update admin campaign location and append one admin-only history row. */
exports.updateLocation = async (req, res) => {
  try {
    const location = String(req.body?.location || '').trim().replace(/\s+/g, ' ');
    if (!location) {
      return res.status(400).json({ ok: false, message: 'Location is required' });
    }
    if (location.length > 120) {
      return res.status(400).json({ ok: false, message: 'Location is too long' });
    }
    const requestedState = String(req.body?.state || '').trim().replace(/\s+/g, ' ');
    if (requestedState.length > 120) {
      return res.status(400).json({ ok: false, message: 'State is too long' });
    }

    const existing = await getGlobalSettings();

    const now = new Date();
    const settings = await CampaignSettings.findOneAndUpdate(
      { key: 'global' },
      {
        $set: {
          currentLocation: location,
          state: requestedState || existing?.state?.trim() || 'Tamil Nadu',
          locationUpdatedAt: now,
        },
        $setOnInsert: {
          activeSlot: DEFAULT_SLOT,
        },
        $push: {
          locationHistory: {
            $each: [{ location, updatedAt: now }],
            $slice: -5000,
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({
      ok: true,
      currentLocation: settings.currentLocation,
      state: settings.state || 'Tamil Nadu',
      updatedAt: settings.locationUpdatedAt,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
};

/** Admin location history filtered with the same YYYY-MM-DD range used by the report. */
exports.getLocationHistory = async (req, res) => {
  try {
    const { start, end } = req.query;
    const settings = await getGlobalSettings();
    const raw = Array.isArray(settings?.locationHistory) ? settings.locationHistory : [];

    const history = raw
      .filter((entry) => {
        if (!entry?.updatedAt) return false;
        const key = getCampaignDateStr(entry.updatedAt);
        if (start && key < start) return false;
        if (end && key > end) return false;
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((entry) => ({
        location: entry.location,
        updatedAt: entry.updatedAt,
        dateStr: getCampaignDateStr(entry.updatedAt),
      }));

    return res.json({ ok: true, history });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
};

/** Stored consent PDF preview/download. Uses the finalized object; it is not regenerated. */
exports.getConsentPdf = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).lean();
    if (!user || !user.claimAccepted || !user.consentPdfKey) {
      return res.status(404).json({ ok: false, message: 'Consent PDF not found' });
    }

    const object = await getObjectStream(user.consentPdfKey);
    const filename = path.posix.basename(user.consentPdfKey) || 'consent-letter.pdf';
    const disposition = req.query.download === '1' ? 'attachment' : 'inline';

    res.setHeader('Content-Type', object.ContentType || 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    if (object.ContentLength) res.setHeader('Content-Length', String(object.ContentLength));

    if (object.Body && typeof object.Body.pipe === 'function') {
      object.Body.pipe(res);
      return;
    }

    const bytes = await object.Body.transformToByteArray();
    return res.end(Buffer.from(bytes));
  } catch (err) {
    console.error(err);
    if (!res.headersSent) return res.status(500).json({ ok: false, error: 'Server error' });
  }
};

async function summarizeDay(dateStr, isToday) {
  let campaignDay = await CampaignDay.findOne({ dateStr });
  if (!campaignDay && isToday) campaignDay = await ensureCampaignDay(dateStr);
  if (!campaignDay) return null;

  if (isToday) await ensureCurrentWindow(campaignDay);

  const persisted = await CampaignWindow.find({ dateStr }).sort({ startHour: 1 }).lean();
  const byKey = new Map(persisted.map((w) => [w.windowKey, w]));

  const dailyConfirmed = await User.countDocuments({ dateStr, claimAccepted: true });
  const confirmedByWindow = await User.aggregate([
    { $match: { dateStr, claimAccepted: true } },
    { $group: { _id: '$windowKey', count: { $sum: 1 } } },
  ]);
  const confirmedMap = new Map(confirmedByWindow.map((row) => [row._id, row.count]));

  const windows = persisted.map((win) => ({
    windowKey: win.windowKey,
    startHour: win.startHour,
    label: `${formatHour12(win.startHour)} - ${formatHour12(win.endHour)}`,
    slotPlan: win.slotPlan,
    basePercent: win.basePercent,
    baseQuota: win.baseQuota,
    carryIn: win.carryIn,
    effectiveQuota: win.effectiveQuota,
    used: win.used,
    remaining: Math.max(win.effectiveQuota - win.used, 0),
    confirmed: confirmedMap.get(win.windowKey) ?? 0,
  }));

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
    slotPlan: campaignDay.slotPlan,
    dailyCap: campaignDay.dailyCap,
    dailyIssued: campaignDay.dailyIssued,
    dailyRemaining: Math.max(campaignDay.dailyCap - campaignDay.dailyIssued, 0),
    dailyConfirmed,
    windows,
  };
}

exports.getCampaignDays = async (req, res) => {
  try {
    const { start, end } = req.query;
    const today = getTodayStr();
    const from = start || today;
    const to = end || today;

    const dates = [];
    for (
      let d = new Date(`${from}T00:00:00Z`);
      getCampaignDateStr(d) <= to;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      dates.push(getCampaignDateStr(d));
      if (dates.length > 366) break;
    }

    const days = [];
    for (const dateStr of dates) {
      const summary = await summarizeDay(dateStr, dateStr === today);
      if (summary) days.push(summary);
    }

    return res.json({ ok: true, days });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const { start, end } = req.query;
    if (start && end) {
      const users = await User.find({ dateStr: { $gte: start, $lte: end } });
      const total = users.length;
      const spinnerCompleted = users.filter((u) => u.spinnerStatus === 'completed').length;
      const spinnerPending = users.filter((u) => u.spinnerStatus === 'pending').length;
      const coinCompleted = users.filter((u) => u.coinStatus === 'completed').length;
      const coinPending = users.filter((u) => u.coinStatus === 'pending').length;
      return res.json({ ok: true, total, spinnerCompleted, spinnerPending, coinCompleted, coinPending });
    }

    const today = getTodayStr();
    const users = await User.find({ dateStr: today });
    const total = users.length;
    const spinnerCompleted = users.filter((u) => u.spinnerStatus === 'completed').length;
    const spinnerPending = users.filter((u) => u.spinnerStatus === 'pending').length;
    const coinCompleted = users.filter((u) => u.coinStatus === 'completed').length;
    const coinPending = users.filter((u) => u.coinStatus === 'pending').length;
    const campaignSummary = await summarizeDay(today, true);

    return res.json({
      ok: true,
      total,
      spinnerCompleted,
      spinnerPending,
      coinCompleted,
      coinPending,
      campaign: campaignSummary,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
};
