const crypto = require('crypto');
const User = require('../models/User');
const { getCampaignDateStr } = require('../utils/campaignTime');

function getTodayStr(date = new Date()){
  return getCampaignDateStr(date);
}

/** Called when the participant taps "Enter the Task" — no participant-count
 * gate any more (the coupon quota, not entries, is what's capped now; see
 * services/campaignQuota.js, enforced at coin-win time). No user record is
 * created here; that only happens once "Spin the Wheel" is clicked (see
 * spinnerController.startSpin), so someone who enters but never spins
 * doesn't show up in the admin panel. */
exports.startSession = async (req, res) => {
  try{
    const sessionId = crypto.randomBytes(16).toString('hex');
    return res.json({ ok:true, sessionId, user: null });
  }catch(err){
    console.error(err);res.status(500).json({ ok:false, error: 'Server error' });
  }
}

exports.checkLimit = async (req, res) => {
  return res.json({ ok: false, message: 'Participant limit removed — coupon quota is enforced at coin-win time' });
}

exports.addUser = async (req, res) => {
  try{
    const { name, phone } = req.body;
    if(!phone) return res.status(400).json({ ok:false, message: 'Phone is required' });
    const dateStr = getTodayStr();

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
