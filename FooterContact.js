const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
const mongoose = require('mongoose');
const PORT = process.env.PORT || 3001;
// //EMAIL CREDENTIALS 
// const {emailID, emailPwd} = require('./EmailCredentials');


// const app = express();
const router = express.Router();

// app.use(cors());
// app.use(bodyParser.json());

router.use(bodyParser.json());
router.use(cors());
// In your main Express app
router.use(cors({
    origin: ['https://backend-bq11.onrender.com', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));


// //CONTACT SCHEMA FOR FOOTER
// const contact = mongoose.model("FooterContact", {
//     contactInfo: String,
//     createdAt: { type: Date, default: Date.now }
//     // timeStamp:Date
// });

// Improved Contact Schema
const contactSchema = new mongoose.Schema({
    contactInfo: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const contact = mongoose.model("FooterContact", contactSchema);


// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'reactdeveloper@adinn.co.in',
        pass: 'tcht lwgz hjwr nkzl'
    }
});


// Contact form endpoint
router.post('/footerContactInfo', async (req, res) => {
    try {
        const { contactInfo } = req.body;
        // Save to database
        const newContact = new contact({
            contactInfo: contactInfo,
            // createdAt: { type: Date, default: Date.now }
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
        <div style="font-size:17px;  margin-top: 8px;">Adinn Outdoors !</div> </div> `
        };
        // Send email
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ success: false, error: 'Failed to send email' });
    }
});


// GET all footer contacts
router.get('/footerContactInfo', async (req, res) => {
    console.log('Footer contact info route hit'); // Add this line

    try {
        const contacts = await contact.find().sort({ createdAt: -1 }); // Sort by newest first
        console.log('Found contacts:', contacts.length); // Log how many contacts found

        res.json(contacts);
    } catch (error) {
        console.error('Error fetching footer contacts:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch contacts' });
    }
});

// DELETE a footer contact
router.delete('/footerContactInfo/:id', async (req, res) => {
    try {
        const deletedContact = await contact.findByIdAndDelete(req.params.id);
        if (!deletedContact) {
            return res.status(404).json({ success: false, error: 'Contact not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({ success: false, error: 'Failed to delete contact' });
    }
});


module.exports = router;
// const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// }); 