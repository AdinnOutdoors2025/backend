const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "sg2plzcpnl504573.prod.sin2.secureserver.net",
  port: 587,
  secure: false,
  requireTLS: true,

  // ❌ Disable pooling for GoDaddy
  pool: false,

  auth: {
    user: 'contact@adinn.com',
    pass: 'DdFu2$L{90Ss',
  },

  connectionTimeout: 30000,
  greetingTimeout: 15000,
  socketTimeout: 30000,

  tls: {
    rejectUnauthorized: false, // ✅ REQUIRED for GoDaddy
  },
});

module.exports = transporter;
