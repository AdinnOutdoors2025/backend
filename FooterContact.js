const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
const mongoose = require('mongoose');
const PORT = process.env.PORT || 3001;

// const app = express();
const router = express.Router();

// app.use(cors());
// app.use(bodyParser.json());

router.use(bodyParser.json());
router.use(cors());

//CONTACT SCHEMA FOR FOOTER
const Contact = mongoose.model("FooterContact",{
     contactInfo:String,
    timeStamp:Date
}); 

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'reactdeveloper@adinn.co.in',
        pass: 'gxnn sezu klyp ifhn'
    }
});


// Contact form endpoint
router.post('/footerContactInfo', async (req, res) => {
    try {
        const { contactInfo } = req.body;
        // Save to database
        const newContact = new Contact({
            contactInfo: contactInfo,
            timestamp: new Date()
        });
        await newContact.save(); 
        // Determine if the input is email or phone
        const isEmail = contactInfo.includes('@');

        // Email options
        const mailOptions = {
            from: 'reactdeveloper@adinn.co.in',
            to: 'reactdeveloper@adinn.co.in', // Admin email
            subject: 'New Contact Request from Website',
            html: `
            <div
        style='font-family: Montserrat; margin: 0 auto; padding:20px; border: 1px solid #ddd; border-radius:5px;width: max-content;'>

        <h2>NEW CONTACT REQUEST FROM WEBSITE</h2>

        <p style="font-size:17px">
            <strong>${isEmail ? 'EMAIL' : 'PHONE'}:</strong>
            ${isEmail ?
            `<a href="mailto:${contactInfo}" >${contactInfo}</a>` :
            `<a href="tel:${contactInfo}" >${contactInfo}</a>`
            }
        </p>
        <p style="font-size:17px">This user has contacted through the website contact form.</p>
        <p style="font-size:17px">Please reach out to them at your earliest convenience.</p>
        <br />
       <div style="font-size:17px; margin-top: 30px;">Best regards,</div>
        <div style="font-size:17px;  margin-top: 8px;">Adinn Outdoors !</div>
    </div>

                `
            };

        // Send email
        await transporter.sendMail(mailOptions);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ success: false, error: 'Failed to send email' });
    }
});
module.exports = router;
// const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });