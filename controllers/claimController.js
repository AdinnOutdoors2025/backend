const User = require('../models/User');
const { generateClaimToken, generateCouponCode } = require('../utils/couponCode');
const { sendConsentSms } = require('../utils/sendSms');
const { getCampaignDateStr } = require('../utils/campaignTime');
const { releaseCouponSlot, releaseExpiredReservations } = require('../services/campaignQuota');

const CLAIM_WINDOW_MS = 5 * 60 * 1000; // 5 minutes to Accept before the link expires

function getTodayStr() {
  return getCampaignDateStr();
}

/** Releases the coupon-quota reservation for a winning user who is not
 * proceeding to claim it — cancel, decline, or (called separately) expiry. */
async function releaseUserReservation(user) {
  if (!user.couponReserved) return;
  await releaseCouponSlot(user.dateStr, user.windowKey, user.couponReservedHourIndex);
  user.couponReserved = false;
  user.couponCode = null;
  user.couponReleasedAt = new Date();
}

/** A link only expires while it's still undecided — once Accepted (or
 * Declined) the outcome is permanent and stays visible any time later. */
function isExpired(user) {
  if (user.claimAccepted || user.claimLinkDeclined) return false;
  if (!user.claimTokenIssuedAt) return false;
  return Date.now() - new Date(user.claimTokenIssuedAt).getTime() > CLAIM_WINDOW_MS;
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
      await releaseUserReservation(user);
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

    await releaseExpiredReservations(user.dateStr);
    const refreshed = (await User.findOne({ claimToken: token })) || user;

    const expired = isExpired(refreshed);

    return res.json({
      ok: true,
      expired,
      name: refreshed.name || null,
      phone: refreshed.phone || null,
      participantId: refreshed._id,
      wheelCategory: refreshed.wheelCategory,
      wheelSpinCompletedAt: refreshed.wheelSpinCompletedAt,
      taskCompletedAt: refreshed.taskCompletedAt,
      coinFlipCompletedAt: refreshed.coinFlipCompletedAt,
      detailsSubmittedAt: refreshed.claimTokenIssuedAt,
      claimAccepted: refreshed.claimAccepted,
      claimAcceptedAt: refreshed.claimAcceptedAt,
      claimLinkDeclined: refreshed.claimLinkDeclined,
      claimLinkDeclinedAt: refreshed.claimLinkDeclinedAt,
      couponCode: refreshed.claimAccepted ? refreshed.couponCode : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};

/** "Accept" checkbox + Submit on the claim-link page — this is the only
 * action that reveals the coupon code. The reservation made at coin-win
 * time is finalized here, and the coupon code is generated for the first
 * time now (never earlier) — it was only ever a held quota slot until this
 * point, so an abandoned/declined win never had a code to leak. */
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
      if (user.couponReserved && !user.couponCode) {
        user.couponCode = generateCouponCode();
      }
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
      await releaseUserReservation(user);
      await user.save();
    }

    return res.json({ ok: true, name: user.name || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};
