const User = require('../models/User');
const { generateCouponCode } = require('../utils/couponCode');

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Called the moment the user hits "Flip the coin" — captures coinFlipStartedAt. */
exports.startCoin = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ ok: false, message: 'sessionId required' });
    const dateStr = getTodayStr();
    const user = await User.findOne({ sessionId, dateStr });
    if (!user) return res.status(404).json({ ok: false, message: 'Session not found for today' });
    if (!user.coinFlipStartedAt) {
      user.coinFlipStartedAt = new Date();
      await user.save();
    }
    return res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};

/** Called when the coin lands — on a win the coupon code is generated right
 * away server-side, but it is only revealed to the participant later, once
 * they submit the claim-link accept form (see claimController). */
exports.saveCoinResult = async (req, res) => {
  try {
    const { sessionId, result } = req.body; // result: 'win' or 'lose'
    if (!sessionId || !result) return res.status(400).json({ ok: false, message: 'sessionId and result required' });
    const dateStr = getTodayStr();
    const user = await User.findOne({ sessionId, dateStr });
    if (!user) return res.status(404).json({ ok: false, message: 'Session not found for today' });
    if (user.coinStatus === 'completed') return res.status(400).json({ ok: false, message: 'Coin already completed' });

    const now = new Date();
    user.coinResult = result;
    user.coinStatus = 'completed';
    user.coinFlipStartedAt = user.coinFlipStartedAt || now;
    user.coinFlipCompletedAt = now;
    user.couponCode = result === 'win' ? generateCouponCode() : null;
    user.completedAt = now;
    await user.save();
    return res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};
