const User = require('../models/User');
const DailyLimit = require('../models/DailyLimit');

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Called the moment the user hits "Spin the wheel" — this is where the
 * participant's User record actually gets created (see userController.startSession
 * for why: entering the task without spinning shouldn't consume a slot or show
 * up in the admin panel). Re-checks the daily limit here too, since multiple
 * people could pass the softer "Enter the Task" check around the same time. */
exports.startSpin = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ ok: false, message: 'sessionId required' });
    const dateStr = getTodayStr();

    let user = await User.findOne({ sessionId, dateStr });
    if (!user) {
      const dl = await DailyLimit.findOne({ key: 'global' });
      if (!dl) return res.status(400).json({ ok: false, message: 'Participant limit not configured' });

      const usedCount = await User.countDocuments({ dateStr, wheelSpinStartedAt: { $ne: null } });
      if (usedCount >= dl.limit) {
        return res.status(400).json({ ok: false, message: 'Today limit reached' });
      }

      user = new User({ sessionId, dateStr, wheelSpinStartedAt: new Date() });
      await user.save();
    } else if (!user.wheelSpinStartedAt) {
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
    const { sessionId, activity, task } = req.body; // activity = category segment, task = full challenge sentence
    if (!sessionId || !activity) return res.status(400).json({ ok: false, message: 'sessionId and activity required' });
    const dateStr = getTodayStr();
    const user = await User.findOne({ sessionId, dateStr });
    if (!user) return res.status(404).json({ ok: false, message: 'Session not found for today' });
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
    const { sessionId, activity, task } = req.body;
    if (!sessionId) return res.status(400).json({ ok: false, message: 'sessionId required' });
    const dateStr = getTodayStr();
    const user = await User.findOne({ sessionId, dateStr });
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
