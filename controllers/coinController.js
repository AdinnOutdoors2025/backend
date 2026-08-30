const User = require('../models/User');
const { getCampaignDateStr } = require('../utils/campaignTime');
const { decideCoinOutcome, releaseExpiredReservations } = require('../services/campaignQuota');

function getTodayStr() {
  return getCampaignDateStr();
}

/** Called the moment the user hits "Flip the coin". This is where the
 * outcome is actually decided now — minute-based quota pacing (see
 * services/campaignQuota.decideCoinOutcome) needs the exact moment of the
 * attempt to compute live remaining-quota/remaining-minutes odds, so the
 * decision can't wait until the animation finishes. On a win, the coupon
 * quota slot is reserved immediately (not yet a coupon code — see
 * claimController.acceptClaim for when the code itself is generated).
 * Idempotent: once coinFlipStartedAt is set, the decision already happened
 * and a repeat call just returns the same stored outcome. */
exports.startCoin = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ ok: false, message: 'sessionId required' });
    const dateStr = getTodayStr();
    const user = await User.findOne({ sessionId, dateStr });
    if (!user) return res.status(404).json({ ok: false, message: 'Session not found for today' });

    if (!user.coinFlipStartedAt) {
      await releaseExpiredReservations(dateStr);

      const now = new Date();
      const outcome = await decideCoinOutcome(dateStr, now);

      if (outcome.win) {
        user.coinResult = 'win';
        user.windowKey = outcome.windowKey;
        user.slotPlanSnapshot = outcome.slotPlan;
        user.couponReservedHourIndex = outcome.hourIndex;
        user.couponReserved = true;
        user.couponReservedAt = now;
      } else {
        user.coinResult = 'lose';
      }

      user.coinFlipStartedAt = now;
      await user.save();
    }

    return res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};

/** Called once the flip animation finishes on the frontend — the outcome
 * was already decided at startCoin, this just finalizes the journey record
 * (completion timestamps). Any `result` in the request body is ignored;
 * the stored decision is the only source of truth. */
exports.saveCoinResult = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ ok: false, message: 'sessionId required' });
    const dateStr = getTodayStr();
    const user = await User.findOne({ sessionId, dateStr });
    if (!user) return res.status(404).json({ ok: false, message: 'Session not found for today' });
    if (user.coinStatus === 'completed') return res.status(400).json({ ok: false, message: 'Coin already completed' });
    if (!user.coinFlipStartedAt || !user.coinResult) {
      return res.status(400).json({ ok: false, message: 'Coin flip not started' });
    }

    const now = new Date();
    user.coinStatus = 'completed';
    user.coinFlipCompletedAt = now;
    user.completedAt = now;
    await user.save();
    return res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};
