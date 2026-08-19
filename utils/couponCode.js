const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Generates a coupon code such as BB-CM-8F32K7. */
function generateCouponCode(length = 6) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  return `BB-CM-${code}`;
}

/** Generates a short 4-character claim-link token, e.g. 1J2Y. */
function generateClaimToken() {
  const bytes = crypto.randomBytes(4);
  let code = '';
  for (let i = 0; i < 4; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

module.exports = { generateCouponCode, generateClaimToken };
