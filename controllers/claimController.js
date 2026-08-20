const User = require('../models/User');
const { generateClaimToken } = require('../utils/couponCode');
const { sendConsentSms } = require('../utils/sendSms');

const CLAIM_WINDOW_MS = 30 * 60 * 1000; // 30 minutes to Accept before the link expires

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** A link only expires while it's still undecided — once Accepted (or
 * Declined) the outcome is permanent and stays visible any time later. */
function isExpired(user) {
  if (user.claimAccepted || user.claimLinkDeclined) return false;
  if (!user.claimTokenIssuedAt) return false;
  return Date.now() - new Date(user.claimTokenIssuedAt).getTime() > CLAIM_WINDOW_MS;
}

function applyLocation(user, body) {
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    user.claimLocationLat = lat;
    user.claimLocationLng = lng;
  }
}

/** The 4-character token space is small, so guard against collisions with
 * an already-active (undecided, unexpired) claim link. */
async function generateUniqueClaimToken() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const token = generateClaimToken();
    const clash = await User.findOne({ claimToken: token });
    if (!clash) return token;
  }
  throw new Error('Could not generate a unique claim token');
}

/** Called from the coin-win "Name + Phone" form — stores the participant's
 * details and mints the unique claim link for this session (30-minute window). */
exports.registerClaim = async (req, res) => {
  try {
    const { sessionId, name, phone } = req.body;
    if (!sessionId || !phone) {
      return res.status(400).json({ ok: false, message: 'sessionId and phone required' });
    }
    const dateStr = getTodayStr();
    const user = await User.findOne({ sessionId, dateStr });
    if (!user) return res.status(404).json({ ok: false, message: 'Session not found for today' });
    if (user.coinResult !== 'win') {
      return res.status(400).json({ ok: false, message: 'No coupon to claim for this session' });
    }

    const alreadyUsedToday = await User.findOne({
      phone,
      dateStr,
      sessionId: { $ne: sessionId },
    });
    if (alreadyUsedToday) {
      return res
        .status(400)
        .json({ ok: false, message: 'This phone number has already claimed a coupon today. Please try again tomorrow.' });
    }

    user.name = name || user.name;
    user.phone = phone;
    if (!user.claimToken) {
      user.claimToken = await generateUniqueClaimToken();
      user.claimTokenIssuedAt = new Date();
    }
    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      user.detailsLocationLat = lat;
      user.detailsLocationLng = lng;
    }
    await user.save();

    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || '';
    const claimLink = `${frontendBaseUrl}/bcm?token=${user.claimToken}`;
    void sendConsentSms(user.phone, user.name, claimLink);

    return res.json({ ok: true, claimToken: user.claimToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};

/** Called when a coin-win participant hits "Cancel" on the name+phone form
 * instead of claiming — marks the session as not interested, no coupon. */
exports.declineClaim = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ ok: false, message: 'sessionId required' });
    const dateStr = getTodayStr();
    const user = await User.findOne({ sessionId, dateStr });
    if (!user) return res.status(404).json({ ok: false, message: 'Session not found for today' });

    if (!user.claimDeclined) {
      user.claimDeclined = true;
      user.claimDeclinedAt = new Date();
      await user.save();
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};

/** Claim-link page load — shows the participant's auto-filled details and
 * the consent document, never the coupon unless already accepted, and
 * flags the link as expired once the 30-minute window has passed
 * (only while still undecided). */
exports.getClaim = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ claimToken: token });
    if (!user) return res.status(404).json({ ok: false, message: 'Link not found' });

    const expired = isExpired(user);

    return res.json({
      ok: true,
      expired,
      name: user.name || null,
      phone: user.phone || null,
      participantId: user._id,
      wheelCategory: user.wheelCategory,
      wheelSpinCompletedAt: user.wheelSpinCompletedAt,
      taskCompletedAt: user.taskCompletedAt,
      coinFlipCompletedAt: user.coinFlipCompletedAt,
      detailsSubmittedAt: user.claimTokenIssuedAt,
      detailsLocationLat: user.detailsLocationLat,
      detailsLocationLng: user.detailsLocationLng,
      claimAccepted: user.claimAccepted,
      claimAcceptedAt: user.claimAcceptedAt,
      claimLinkDeclined: user.claimLinkDeclined,
      claimLinkDeclinedAt: user.claimLinkDeclinedAt,
      couponCode: user.claimAccepted ? user.couponCode : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};

/** "Accept" checkbox + Submit on the claim-link page — this is the only
 * action that reveals the coupon code, no admin approval involved. */
exports.acceptClaim = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ claimToken: token });
    if (!user) return res.status(404).json({ ok: false, message: 'Link not found' });
    if (user.claimLinkDeclined) {
      return res.status(400).json({ ok: false, message: 'This coupon was already declined' });
    }
    if (isExpired(user)) {
      return res.status(400).json({ ok: false, message: 'This link has expired', expired: true });
    }

    if (!user.claimAccepted) {
      user.claimAccepted = true;
      user.claimAcceptedAt = new Date();
      applyLocation(user, req.body);
      await user.save();
    }

    return res.json({
      ok: true,
      name: user.name || null,
      couponCode: user.couponCode,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};

/** "Decline" checkbox + Submit on the claim-link page — the participant
 * won the coin flip but chooses not to claim the coupon after reading the
 * consent document. Distinct from the earlier coin-win Cancel button. */
exports.declineClaimLink = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ claimToken: token });
    if (!user) return res.status(404).json({ ok: false, message: 'Link not found' });
    if (user.claimAccepted) {
      return res.status(400).json({ ok: false, message: 'This coupon was already accepted' });
    }
    if (isExpired(user)) {
      return res.status(400).json({ ok: false, message: 'This link has expired', expired: true });
    }

    if (!user.claimLinkDeclined) {
      user.claimLinkDeclined = true;
      user.claimLinkDeclinedAt = new Date();
      applyLocation(user, req.body);
      await user.save();
    }

    return res.json({ ok: true, name: user.name || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};
