const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Twilio Credentials
const accountSid = "ACb93aa441cd1479351f2bb79c9d2249ab";
const authToken = "c309afe5ed872fb273885285e3337e23";
const twilioClient = twilio(accountSid, authToken);

// OTP Store
const otpStore = {};

// Function to generate 4-digit OTP
const generateOtp = () => Math.floor(1000 + Math.random() * 9000);

// **Send OTP**
app.post('/send-otp', async (req, res) => {
    const { contact } = req.body;

    if (!contact) {
        return res.status(400).json({ success: false, message: "Enter a valid email or phone number" });
    }
    if (otpStore[contact] && Date.now() < otpStore[contact].nextResend) {
        return res.status(400).json({ success: false, message: "Wait before resending OTP" });
    }

    const otp = generateOtp();
    otpStore[contact] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };

    if (contact.includes('@')) {
        // Send OTP via Email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'ihtark5@gmail.com',
                pass: 'tthr usdb xnzq qbgc',
            }
        });

        const mailOptions = {
            from: 'ihtark5@gmail.com',
            to: contact,
            subject: 'Your OTP',
            text: `Your OTP is: ${otp}. Valid for 5 minutes.`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.status(500).json({ success: false, message: "Failed to send OTP" });
            }
            res.status(200).json({ success: true, message: "OTP sent successfully" });
        });
    } else {
        // Send OTP via SMS
        try {
            await twilioClient.messages.create({
                body: `Your OTP is: ${otp}. Valid for 5 minutes.`,
                from: '+19064226997',
                to: contact
            });
            res.status(200).json({ success: true, message: "OTP sent successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: "Failed to send OTP" });
        }
    }
});

// **Verify OTP**
// app.post('/verify-otp', (req, res) => {
//     const { contact, otp } = req.body;

//     if (!otpStore[contact] || otpStore[contact].otp.toString() !== otp.toString()) {
//         return res.status(400).json({ success: false, message: "Invalid OTP" });
//     }

//     delete otpStore[contact];
//     res.status(200).json({ success: true, verified: true, message: "OTP verified" });
// });

app.post('/verify-otp', (req, res) => {
    const { contact, otp } = req.body;
    
    if (!otpStore[contact]) {
        return res.status(400).json({ success: false, message: "OTP expired or invalid" });
    }

    const { otp: storedOtp, expiresAt } = otpStore[contact];

    if (Date.now() > expiresAt) {
        delete otpStore[contact]; // Delete expired OTP
        return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (storedOtp.toString() !== otp.toString()) {
        return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    delete otpStore[contact]; // OTP is valid, remove it
    res.status(200).json({ success: true, verified: true, message: "OTP verified" });
});


app.listen(3500, () => console.log("Server running on port 3500"));
