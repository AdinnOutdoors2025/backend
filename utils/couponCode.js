const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';

/** Generates a coupon code such as BB-CM-8F32K7. */
function generateCouponCode(length = 6) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  return `BB-CM-${code}`;
}

/** Generates a short 4-character claim-link token — always exactly 2 letters
 * and 2 digits, shuffled into a random order, e.g. 1J2Y. */
function generateClaimToken() {
  const bytes = crypto.randomBytes(4);
  const chars = [
    LETTERS[bytes[0] % LETTERS.length],
    LETTERS[bytes[1] % LETTERS.length],
    DIGITS[bytes[2] % DIGITS.length],
    DIGITS[bytes[3] % DIGITS.length],
  ];

  const shuffleBytes = crypto.randomBytes(4);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

module.exports = { generateCouponCode, generateClaimToken };
