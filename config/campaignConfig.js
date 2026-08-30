// Campaign coupon-quota configuration — slot plans, daily cap, timezone.
// Loaded from env so business constants aren't duplicated in the frontend.

const TIMEZONE = process.env.BIG_BOSS_TIMEZONE || 'Asia/Kolkata';
const DAILY_COUPON_LIMIT = Number(process.env.BIG_BOSS_DAILY_COUPON_LIMIT || 100);
const DEFAULT_SLOT = Number(process.env.BIG_BOSS_DEFAULT_SLOT || 1);

/** Parses "HH:MM-HH:MM:quota" segments separated by commas, e.g. "12:00-16:00:40,16:00-20:00:60". */
function parsePlan(envValue) {
  if (!envValue) return [];
  return envValue.split(',').map((raw) => {
    const segment = raw.trim();
    const match = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2}):(\d+)$/.exec(segment);
    if (!match) throw new Error(`Invalid campaign slot segment: "${segment}"`);
    const startHour = Number(match[1]);
    const endHour = Number(match[3]);
    const baseQuota = Number(match[5]);
    return {
      key: `${startHour}-${endHour}`,
      startHour,
      endHour,
      baseQuota,
    };
  });
}

const SLOT_PLANS = {
  1: parsePlan(process.env.BIG_BOSS_SLOT_1 || '12:00-16:00:40,16:00-20:00:60'),
  2: parsePlan(process.env.BIG_BOSS_SLOT_2 || '12:00-16:00:30,16:00-20:00:40,20:00-24:00:30'),
};

for (const [slot, windows] of Object.entries(SLOT_PLANS)) {
  const sum = windows.reduce((acc, w) => acc + w.baseQuota, 0);
  if (sum !== DAILY_COUPON_LIMIT) {
    console.warn(
      `[campaignConfig] Slot plan ${slot} quotas sum to ${sum}, expected daily cap ${DAILY_COUPON_LIMIT}.`
    );
  }
}

function getPlanWindows(slot) {
  const windows = SLOT_PLANS[slot];
  if (!windows) throw new Error(`Unknown campaign slot plan: ${slot}`);
  return windows;
}

function basePercentOf(baseQuota) {
  return DAILY_COUPON_LIMIT ? Math.round((baseQuota / DAILY_COUPON_LIMIT) * 1000) / 10 : 0;
}

/** Even integer split preserving the exact total (largest-remainder to the first buckets). Display only. */
function hourlySplit(quota, hourCount) {
  if (hourCount <= 0) return [];
  const base = Math.floor(quota / hourCount);
  const remainder = quota % hourCount;
  return Array.from({ length: hourCount }, (_, i) => base + (i < remainder ? 1 : 0));
}

module.exports = {
  TIMEZONE,
  DAILY_COUPON_LIMIT,
  DEFAULT_SLOT,
  SLOT_PLANS,
  getPlanWindows,
  basePercentOf,
  hourlySplit,
};
