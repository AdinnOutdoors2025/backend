const User = require('../models/User');
const { generateCouponCode } = require('../utils/couponCode');

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Called the moment the user hits "Flip the coin" — captures coinFlipStartedAt. */
exports.startCoin = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ ok: false, message: 'phone required' });
    const dateStr = getTodayStr();
    const user = await User.findOne({ phone, dateStr });
    if (!user) return res.status(404).json({ ok: false, message: 'User not found for today' });
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

exports.saveCoinResult = async (req, res) => {
  try {
    const { phone, result } = req.body; // result: 'win' or 'lose'
    if (!phone || !result) return res.status(400).json({ ok: false, message: 'phone and result required' });
    const dateStr = getTodayStr();
    const user = await User.findOne({ phone, dateStr });
    if (!user) return res.status(404).json({ ok: false, message: 'User not found for today' });
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
