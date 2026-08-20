const crypto = require('crypto');
const User = require('../models/User');
const DailyLimit = require('../models/DailyLimit');

function getTodayStr(date = new Date()){
  return date.toISOString().slice(0,10);
}

/** Called when the participant taps "Enter the Task" — only a soft check of
 * the daily participant limit (counted by actual wheel spins, not visits).
 * No user record is created here; that only happens once "Spin the Wheel"
 * is clicked (see spinnerController.startSpin), so someone who enters but
 * never spins doesn't consume a limit slot or show up in the admin panel. */
exports.startSession = async (req, res) => {
  try{
    const dateStr = getTodayStr();

    const dl = await DailyLimit.findOne({ key: 'global' });
    if(!dl) return res.status(400).json({ ok:false, message: 'Participant limit not configured' });

    const usedCount = await User.countDocuments({ dateStr, wheelSpinStartedAt: { $ne: null } });
    if(usedCount >= dl.limit) return res.status(400).json({ ok:false, message: 'Today limit reached' });

    const sessionId = crypto.randomBytes(16).toString('hex');
    return res.json({ ok:true, sessionId, user: null });
  }catch(err){
    console.error(err);res.status(500).json({ ok:false, error: 'Server error' });
  }
}

exports.checkLimit = async (req, res) => {
  try{
    const dateStr = getTodayStr();
    const dl = await DailyLimit.findOne({ key: 'global' });
    if(!dl) return res.json({ ok: false, message: 'Participant limit not set' });
    const used = await User.countDocuments({ dateStr, wheelSpinStartedAt: { $ne: null } });
    return res.json({ ok: true, limit: dl.limit, used });
  }catch(err){
    console.error(err);res.status(500).json({ ok:false, error: 'Server error' });
  }
}

exports.addUser = async (req, res) => {
  try{
    const { name, phone } = req.body;
    if(!phone) return res.status(400).json({ ok:false, message: 'Phone is required' });
    const dateStr = getTodayStr();

    const dl = await DailyLimit.findOne({ key: 'global' });
    if(!dl) return res.status(400).json({ ok:false, message: 'Participant limit not configured' });

    const usedCount = await User.countDocuments({ dateStr });
    if(usedCount >= dl.limit) return res.status(400).json({ ok:false, message: 'Today limit reached' });

    const existing = await User.findOne({ phone, dateStr });
    if(existing) return res.status(400).json({ ok:false, message: 'Already added today' });

    const user = new User({ name, phone, dateStr });
    await user.save();

    return res.json({ ok:true, user });
  }catch(err){
    console.error(err);res.status(500).json({ ok:false, error: 'Server error' });
  }
}

exports.getUserByPhone = async (req, res) => {
  try{
    const { phone } = req.params;
    const dateStr = getTodayStr();
    const user = await User.findOne({ phone, dateStr });
    return res.json({ ok:true, user });
  }catch(err){
    console.error(err);res.status(500).json({ ok:false, error: 'Server error' });
  }
}

exports.listByDate = async (req, res) => {
  try{
    const { date, start, end } = req.query; // either a single `date`, or a `start`/`end` range (YYYY-MM-DD, inclusive)
    let query;
    if(start && end){
      query = { dateStr: { $gte: start, $lte: end } };
    }else{
      query = { dateStr: date || getTodayStr() };
    }
    const users = await User.find(query).sort({ createdAt: -1 });
    return res.json({ ok:true, users });
  }catch(err){
    console.error(err);res.status(500).json({ ok:false, error: 'Server error' });
  }
}
