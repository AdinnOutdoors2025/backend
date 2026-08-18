const User = require('../models/User');

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Called the moment the user hits "Spin the wheel" — captures wheelSpinStartedAt. */
exports.startSpin = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ ok: false, message: 'phone required' });
    const dateStr = getTodayStr();
    const user = await User.findOne({ phone, dateStr });
    if (!user) return res.status(404).json({ ok: false, message: 'User not found for today' });
    if (!user.wheelSpinStartedAt) {
      user.wheelSpinStartedAt = new Date();
      await user.save();
    }
    return res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};

/** Called when the wheel settles and the participant completes the shown task. */
exports.saveSpinnerResult = async (req, res) => {
  try {
    const { phone, activity, task } = req.body; // activity = category segment, task = full challenge sentence
    if (!phone || !activity) return res.status(400).json({ ok: false, message: 'phone and activity required' });
    const dateStr = getTodayStr();
    const user = await User.findOne({ phone, dateStr });
    if (!user) return res.status(404).json({ ok: false, message: 'User not found for today' });
    if (user.spinnerStatus === 'completed') return res.status(400).json({ ok: false, message: 'Spinner already completed' });

    const now = new Date();
    user.spinnerResult = activity;
    user.wheelCategory = activity;
    user.wheelTask = task || null;
    user.spinnerStatus = 'completed';
    user.wheelSpinStartedAt = user.wheelSpinStartedAt || now;
    user.wheelSpinCompletedAt = now;
    user.taskCompletedAt = now;
    await user.save();
    return res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};

/** Called when the participant fails the shown task — ends the journey (no coin round). */
exports.rejectSpinner = async (req, res) => {
  try {
    const { phone, activity, task } = req.body;
    const dateStr = getTodayStr();
    const user = await User.findOne({ phone, dateStr });
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });
    if (user.spinnerStatus === 'completed' || user.spinnerStatus === 'rejected') {
      return res.status(400).json({ ok: false, message: 'Spinner already resolved' });
    }

    const now = new Date();
    if (activity) {
      user.spinnerResult = activity;
      user.wheelCategory = activity;
    }
    if (task) user.wheelTask = task;
    user.spinnerStatus = 'rejected';
    user.wheelSpinStartedAt = user.wheelSpinStartedAt || now;
    user.wheelSpinCompletedAt = user.wheelSpinCompletedAt || now;
    user.taskFailedAt = now;
    user.completedAt = now;
    await user.save();
    return res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};
