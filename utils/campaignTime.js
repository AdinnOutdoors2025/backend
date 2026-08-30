const { TIMEZONE } = require('../config/campaignConfig');

/** yyyy-mm-dd for a given instant, resolved in the campaign timezone (default Asia/Kolkata)
 * instead of UTC — fixes the day boundary flipping ~5:30am local time. */
function getCampaignDateStr(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** 0-23 hour-of-day for a given instant, resolved in the campaign timezone. */
function getCampaignHour(date = new Date()) {
  const hourStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    hour12: false,
  }).format(date);
  // Intl can render midnight as "24" in en-GB depending on runtime ICU data.
  return Number(hourStr) % 24;
}

/** 0-59 minute-of-hour for a given instant, resolved in the campaign timezone.
 * Used for minute-based coupon-quota pacing within the current hour. */
function getCampaignMinute(date = new Date()) {
  const minuteStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    minute: '2-digit',
  }).format(date);
  return Number(minuteStr) % 60;
}

module.exports = { getCampaignDateStr, getCampaignHour, getCampaignMinute };
