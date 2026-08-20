require("dotenv").config();
const axios = require('axios');


const CONSENT_SMS_TEMPLATE =
  'Hi {#alp#}, please accept the consent form to receive your Bigg Boss Common Man task coupon code. Click the link below to complete the process. This link is valid for {#num#} minutes.- Adinn\n{#urg#}';

const CLAIM_WINDOW_MINUTES = 30;

// function buildConsentMessage(name, claimLink) {
//   return CONSENT_SMS_TEMPLATE.replace('{#alp#}', name || 'there')
//     .replace('{#num#}', String(CLAIM_WINDOW_MINUTES))
//     .replace('{#urg#}', `<a href="${claimLink}">${claimLink}</a>`);
// }

function buildConsentMessage(name, claimLink) {
  return CONSENT_SMS_TEMPLATE
    .replace('{#alp#}', name || 'there')
    .replace('{#num#}', String(CLAIM_WINDOW_MINUTES))
    .replace('{#urg#}', claimLink);
}

/** Sends the "accept your consent form" SMS via Nettyfish once the coin-win
 * name+phone form is submitted. Best-effort: errors are logged, never thrown,
 * so a Nettyfish outage never blocks the claim-link registration flow. */
async function sendConsentSms(phone, name, claimLink) {
  const apiKey = process.env.NETTYFISH_API_KEY;
  const senderId = process.env.NETTYFISH_SENDER_ID;
  const templateId = process.env.NETTYFISH_TEMPLATE_ID;
  const baseUrl = process.env.NETTYFISH_BASE_URL;

  if (!apiKey || !senderId || !templateId || !baseUrl) {
    console.error('Nettyfish SMS not configured — skipping SMS send');
    return { ok: false, message: 'Nettyfish SMS not configured' };
  }

  const formattedNumber = String(phone).replace(/\D/g, '');
  const message = buildConsentMessage(name, claimLink);

  const url =
    `${baseUrl}?APIKey=${encodeURIComponent(apiKey)}` +
    `&senderid=${encodeURIComponent(senderId)}` +
    `&channel=Trans&DCS=0&flashsms=0` +
    `&number=${encodeURIComponent(formattedNumber)}` +
    `&dlttemplateid=${encodeURIComponent(templateId)}` +
    `&text=${encodeURIComponent(message)}` +
    `&route=17`;

  try {
    const res = await axios.get(url);
    return { ok: true, response: res.data };
  } catch (err) {
    console.error('Nettyfish SMS send failed:', err.message);
    return { ok: false, message: err.message };
  }
}

module.exports = { sendConsentSms };
