const User = require('../models/User');
const CampaignSettings = require('../models/CampaignSettings');
const { generateClaimToken, generateCouponCode } = require('../utils/couponCode');
const { sendConsentSms } = require('../utils/sendSms');
const { getCampaignDateStr } = require('../utils/campaignTime');
const { confirmCouponSlot } = require('../services/campaignQuota');
const { uploadBuffer, deleteObject } = require('../utils/spaces');
const { generateReleasePdf } = require('../utils/releasePdf');

const CLAIM_WINDOW_MS = 5 * 60 * 1000;
const MAX_SIGNATURE_BYTES = 1024 * 1024; // 1 MB decoded PNG limit

function getTodayStr() {
  return getCampaignDateStr();
}

function isExpired(user) {
  if (user.claimAccepted || user.claimLinkDeclined) return false;
  if (!user.claimTokenIssuedAt) return false;
  return Date.now() - new Date(user.claimTokenIssuedAt).getTime() > CLAIM_WINDOW_MS;
}

async function generateUniqueClaimToken() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const token = generateClaimToken();
    const clash = await User.findOne({ claimToken: token });
    if (!clash) return token;
  }
  throw new Error('Could not generate a unique claim token');
}

async function getCurrentAdminLocation() {
  const settings = await CampaignSettings.findOne({ key: 'global' }).lean();
  return {
    currentLocation: settings?.currentLocation?.trim() || '',
    state: settings?.state?.trim() || 'Tamil Nadu',
  };
}

function sanitizeName(value) {
  const normalized = String(value || 'participant')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'participant';
}

function sanitizePhone(value) {
  return String(value || '').replace(/\D/g, '') || 'no-phone';
}

function parseSignatureDataUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('data:image/png;base64,')) {
    throw new Error('Please provide a valid PNG signature.');
  }

  const base64 = value.slice('data:image/png;base64,'.length);
  if (!base64) throw new Error('Signature is required.');

  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) throw new Error('Signature is required.');
  if (buffer.length > MAX_SIGNATURE_BYTES) {
    throw new Error('Signature image is too large. Please clear and sign again.');
  }

  // PNG magic bytes.
  if (
    buffer.length < 8 ||
    buffer[0] !== 0x89 ||
    buffer[1] !== 0x50 ||
    buffer[2] !== 0x4e ||
    buffer[3] !== 0x47
  ) {
    throw new Error('Invalid signature image.');
  }

  return buffer;
}

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
      return res.status(400).json({
        ok: false,
        message: 'This phone number has already claimed a coupon today. Please try again tomorrow.',
      });
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
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
};

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
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
};

exports.getClaim = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ claimToken: token });
    if (!user) return res.status(404).json({ ok: false, message: 'Link not found' });

    const expired = isExpired(user);
    const { currentLocation, state } = await getCurrentAdminLocation();

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
      claimAccepted: user.claimAccepted,
      claimAcceptedAt: user.claimAcceptedAt,
      claimLinkDeclined: user.claimLinkDeclined,
      claimLinkDeclinedAt: user.claimLinkDeclinedAt,
      couponCode: user.claimAccepted ? user.couponCode : null,

      // Live admin location only; not a participant snapshot field.
      currentLocation,
      state,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
};

exports.acceptClaim = async (req, res) => {
  let uploadedSignatureKey = null;
  let uploadedPdfKey = null;

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

    // Idempotent repeat accept: do not require a second signature.
    if (user.claimAccepted) {
      return res.json({
        ok: true,
        name: user.name || null,
        couponCode: user.couponCode,
      });
    }

    const signatureBuffer = parseSignatureDataUrl(req.body?.signatureDataUrl);
    const { currentLocation, state } = await getCurrentAdminLocation();
    if (!currentLocation) {
      return res.status(400).json({
        ok: false,
        message: 'Campaign location is not configured. Please contact the administrator.',
      });
    }

    const acceptedAt = new Date();
    const dateStr = getCampaignDateStr(acceptedAt);
    const safeName = sanitizeName(user.name);
    const safePhone = sanitizePhone(user.phone);
    const folder = `bcm/${dateStr}`;
    const signatureKey = `${folder}/cons-${safeName}-${safePhone}-signature.png`;
    const pdfKey = `${folder}/cons-letter-${safeName}-${safePhone}.pdf`;

    // Create immutable final files first. If quota fails, delete these files.
    const signatureUpload = await uploadBuffer({
      key: signatureKey,
      buffer: signatureBuffer,
      contentType: 'image/png',
      contentDisposition: 'inline',
    });
    uploadedSignatureKey = signatureKey;

    const pdfBuffer = await generateReleasePdf({
      name: user.name || 'Participant',
      phone: user.phone || '',
      participantId: String(user._id),
      location: currentLocation,
      state,
      acceptedAt,
      signatureBuffer,
    });

    const pdfUpload = await uploadBuffer({
      key: pdfKey,
      buffer: pdfBuffer,
      contentType: 'application/pdf',
      contentDisposition: `inline; filename="${pdfKey.split('/').pop()}"`,
    });
    uploadedPdfKey = pdfKey;

    // Preserve the current business rule exactly: consent acceptance is the
    // only place that consumes the slot quota in slot-based mode.
    const confirmation = await confirmCouponSlot(dateStr);
    if (!confirmation.ok) {
      await Promise.allSettled([deleteObject(signatureKey), deleteObject(pdfKey)]);
      uploadedSignatureKey = null;
      uploadedPdfKey = null;
      return res.status(400).json({
        ok: false,
        message: "Sorry, today's coupon quota is full. Please try again tomorrow.",
      });
    }

    user.claimAccepted = true;
    user.claimAcceptedAt = acceptedAt;
    user.windowKey = confirmation.windowKey;
    user.slotPlanSnapshot = confirmation.slotPlan;
    user.couponCode = generateCouponCode();

    user.signatureKey = signatureUpload.key;
    user.signatureUrl = signatureUpload.url;
    user.signatureSavedAt = acceptedAt;
    user.consentPdfKey = pdfUpload.key;
    user.consentPdfUrl = pdfUpload.url;

    // Intentionally NO participant/consent location field is stored.
    await user.save();

    uploadedSignatureKey = null;
    uploadedPdfKey = null;

    return res.json({
      ok: true,
      name: user.name || null,
      couponCode: user.couponCode,
    });
  } catch (err) {
    console.error(err);
    if (uploadedSignatureKey || uploadedPdfKey) {
      await Promise.allSettled([
        uploadedSignatureKey ? deleteObject(uploadedSignatureKey) : Promise.resolve(),
        uploadedPdfKey ? deleteObject(uploadedPdfKey) : Promise.resolve(),
      ]);
    }

    const message = err instanceof Error ? err.message : 'Server error';
    if (
      message.includes('Signature') ||
      message.includes('signature') ||
      message.includes('Campaign location')
    ) {
      return res.status(400).json({ ok: false, message });
    }
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
};

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
      await user.save();
    }

    return res.json({ ok: true, name: user.name || null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
};
