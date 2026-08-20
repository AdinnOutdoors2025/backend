const DailyLimit = require('../models/DailyLimit');
const User = require('../models/User');

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Returns the global participant limit + how many have registered today. */
exports.getLimit = async (req, res) => {
  try{
    const dl = await DailyLimit.findOne({ key: 'global' });
    const usedCount = await User.countDocuments({
      dateStr: getTodayStr(),
      wheelSpinStartedAt: { $ne: null },
    });
    if(!dl) return res.json({ ok:true, configured:false, limit:0, usedCount });
    return res.json({ ok:true, configured:true, limit: dl.limit, usedCount });
  }catch(err){
    console.error(err);res.status(500).json({ ok:false, error: 'Server error' });
  }
}

/** Sets the global participant limit — applies every day until changed again. */
exports.setLimit = async (req, res) => {
  try{
    const { limit } = req.body;
    if(!limit) return res.status(400).json({ ok:false, message: 'limit required' });
    const doc = await DailyLimit.findOneAndUpdate(
      { key: 'global' },
      { $set: { limit } },
      { upsert: true, new: true }
    );
    return res.json({ ok:true, doc });
  }catch(err){
    console.error(err);res.status(500).json({ ok:false, error: 'Server error' });
  }
}

exports.getDashboard = async (req, res) => {
  try{
    const { start, end } = req.query; // optional YYYY-MM-DD
    if(start && end){
      // find users whose dateStr between start and end (inclusive)
      const users = await User.find({ dateStr: { $gte: start, $lte: end } });
      const total = users.length;
      const spinnerCompleted = users.filter(u => u.spinnerStatus === 'completed').length;
      const spinnerPending = users.filter(u => u.spinnerStatus === 'pending').length;
      const coinCompleted = users.filter(u => u.coinStatus === 'completed').length;
      const coinPending = users.filter(u => u.coinStatus === 'pending').length;
      return res.json({ ok:true, total, spinnerCompleted, spinnerPending, coinCompleted, coinPending });
    }
    const today = getTodayStr();
    const users = await User.find({ dateStr: today });
    const dl = await DailyLimit.findOne({ key: 'global' });
    const total = users.length;
    const spinnerCompleted = users.filter(u => u.spinnerStatus === 'completed').length;
    const spinnerPending = users.filter(u => u.spinnerStatus === 'pending').length;
    const coinCompleted = users.filter(u => u.coinStatus === 'completed').length;
    const coinPending = users.filter(u => u.coinStatus === 'pending').length;
    return res.json({
      ok:true, total, spinnerCompleted, spinnerPending, coinCompleted, coinPending,
      limit: dl ? dl.limit : 0,
      usedCount: total,
      limitConfigured: !!dl,
    });
  }catch(err){
    console.error(err);res.status(500).json({ ok:false, error: 'Server error' });
  }
}
