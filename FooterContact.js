// const express = require('express');
// const bodyParser = require('body-parser');
// const nodemailer = require('nodemailer');
// const cors = require('cors');
// const mongoose = require('mongoose');
// const PORT = process.env.PORT || 3001;
// //EMAIL CREDENTIALS 
// const {emailID, emailPwd} = require('./EmailCredentials');

// // const app = express();
// const router = express.Router();

// // app.use(cors());
// // app.use(bodyParser.json());

// router.use(bodyParser.json());
// router.use(cors());
// // In your main Express app
// router.use(cors({
//     origin: ['https://backend-bq11.onrender.com', 'http://localhost:3000'],
//     methods: ['GET', 'POST', 'DELETE', 'PUT'],
//     allowedHeaders: ['Content-Type', 'Authorization']
// }));


// // //CONTACT SCHEMA FOR FOOTER
// // const contact = mongoose.model("FooterContact", {
// //     contactInfo: String,
// //     createdAt: { type: Date, default: Date.now }
// //     // timeStamp:Date
// // });

// // Improved Contact Schema
// const contactSchema = new mongoose.Schema({
//     contactInfo: {
//         type: String,
//         required: true
//     },
//     createdAt: {
//         type: Date,
//         default: Date.now
//     }
// });

// const contact = mongoose.model("FooterContact", contactSchema);


// // Email configuration
// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: emailID,
//         pass: emailPwd
//     }
// });


// // Contact form endpoint
// router.post('/footerContactInfo', async (req, res) => {
//     try {
//         const { contactInfo } = req.body;
//         // Save to database
//         const newContact = new contact({
//             contactInfo: contactInfo,
//             // createdAt: { type: Date, default: Date.now }
//         });
//         await newContact.save();
//         // Determine if the input is email or phone
//         const isEmail = contactInfo.includes('@');
//         // Email options
//         const mailOptions = {
//             from: emailID,
//             to: emailID, // Admin email
//             subject: 'New Contact Request from Website',
//             html: `
//             <div
//         style='font-family: Montserrat; margin: 0 auto; padding:20px; border: 1px solid #ddd; border-radius:5px;width: max-content;'>
//         <h2>NEW CONTACT REQUEST FROM WEBSITE</h2>
//         <p style="font-size:17px">
//             <strong>${isEmail ? 'EMAIL' : 'PHONE'}:</strong>
//             ${isEmail ?
//                     `<a href="mailto:${contactInfo}" >${contactInfo}</a>` :
//                     `<a href="tel:${contactInfo}" >${contactInfo}</a>`
//                 }
//         </p>
//         <p style="font-size:17px">This user has contacted through the website contact form.</p>
//         <p style="font-size:17px">Please reach out to them at your earliest convenience.</p>
//         <br />
//        <div style="font-size:17px; margin-top: 30px;">Best regards,</div>
//         <div style="font-size:17px;  margin-top: 8px;">Adinn Outdoors !</div> </div> `
//         };
//         // Send email
//         await transporter.sendMail(mailOptions);
//         res.status(200).json({ success: true });
//     } catch (error) {
//         console.error('Error sending email:', error);
//         res.status(500).json({ success: false, error: 'Failed to send email' });
//     }
// });


// // GET all footer contacts
// router.get('/footerContactInfo', async (req, res) => {
//     console.log('Footer contact info route hit'); // Add this line

//     try {
//         const contacts = await contact.find().sort({ createdAt: -1 }); // Sort by newest first
//         console.log('Found contacts:', contacts.length); // Log how many contacts found

//         res.json(contacts);
//     } catch (error) {
//         console.error('Error fetching footer contacts:', error);
//         res.status(500).json({ success: false, error: 'Failed to fetch contacts' });
//     }
// });

// // DELETE a footer contact
// router.delete('/footerContactInfo/:id', async (req, res) => {
//     try {
//         const deletedContact = await contact.findByIdAndDelete(req.params.id);
//         if (!deletedContact) {
//             return res.status(404).json({ success: false, error: 'Contact not found' });
//         }
//         res.json({ success: true });
//     } catch (error) {
//         console.error('Error deleting contact:', error);
//         res.status(500).json({ success: false, error: 'Failed to delete contact' });
//     }
// });


// module.exports = router;
// // const PORT = process.env.PORT || 3001;
// // app.listen(PORT, () => {
// //     console.log(`Server running on port ${PORT}`);
// // }); 






const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
const mongoose = require('mongoose');
const { emailID, emailPwd } = require('./EmailCredentials');

const router = express.Router();
router.use(bodyParser.json());
router.use(cors());

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

const Contact = mongoose.model("FooterContact", contactSchema);

// Enhanced email function that handles SMTP blocks
const sendEmailSafely = async (mailOptions) => {
    // Check if we're on Render (where SMTP is blocked)
    if (process.env.RENDER || process.env.NODE_ENV === 'production') {
        console.log('📧 Email skipped: SMTP blocked on Render deployment');
        return {
            sent: false,
            reason: 'SMTP blocked on Render',
            fallback: 'Contact saved to database only'
        };
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: emailID,
                pass: emailPwd
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Verify transporter first
        await transporter.verify();
        console.log('✅ Email transporter verified');

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
        return { sent: true, info: info };

    } catch (error) {
        console.log('❌ Email sending failed:', error.message);
        return {
            sent: false,
            error: error.message,
            fallback: 'Contact saved to database only'
        };
    }
};

// Contact form endpoint with improved error handling
router.post('/footerContactInfo', async (req, res) => {
    console.log('📨 Received footer contact request:', req.body);

    try {
        const { contactInfo } = req.body;

        // Validate input
        if (!contactInfo || !contactInfo.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Contact information is required'
            });
        }

        // Save to database (this should always work)
        const newContact = new Contact({
            contactInfo: contactInfo.trim()
        });

        await newContact.save();
        console.log('✅ Contact saved to database:', contactInfo);

        // Prepare email content
        const isEmail = contactInfo.includes('@');
        const mailOptions = {
            from: emailID,
            to: emailID, // Admin email
            subject: 'New Contact Request from Website',
            html: `
            <div style='font-family: Montserrat; margin: 0 auto; padding:20px; border: 1px solid #ddd; border-radius:5px;width: max-content;'>
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

        // Try to send email but don't fail the request if it doesn't work
        const emailResult = await sendEmailSafely(mailOptions);
        if (!emailResult.sent) {
            console.log('Email not sent (SMTP blocked), but continuing...');
        }
        // Always return success since database save worked
        res.status(200).json({
            success: true,
            message: 'Contact information submitted successfully',
            databaseSaved: true,
            emailSent: emailResult.sent,
            emailNote: emailResult.sent ? undefined : emailResult.fallback
        });

    } catch (error) {
        console.error('❌ Error in footerContactInfo:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process contact information',
            details: error.message
        });
    }
});

// GET all footer contacts
router.get('/footerContactInfo', async (req, res) => {
    console.log('📋 Fetching footer contacts');

    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        console.log(`✅ Found ${contacts.length} contacts`);

        res.json(contacts);
    } catch (error) {
        console.error('❌ Error fetching footer contacts:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch contacts' });
    }
});


// Add this to your main server file or any router
router.get('/test-email', async (req, res) => {
    try {
        const mailOptions = {
            from: emailID,
            to: emailID,
            subject: 'Test Email from Adinn Backend',
            html: '<h1>This is a test email</h1><p>If you receive this, email is working.</p>'
        };

        const emailResult = await sendEmailSafely(mailOptions);
        
        res.json({
            success: true,
            environment: process.env.NODE_ENV || 'development',
            onRender: !!process.env.RENDER,
            emailSent: emailResult.sent,
            emailInfo: emailResult.sent ? emailResult.info : emailResult.reason
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// DELETE a footer contact
router.delete('/footerContactInfo/:id', async (req, res) => {
    console.log('🗑️ Deleting contact:', req.params.id);

    try {
        const deletedContact = await Contact.findByIdAndDelete(req.params.id);
        if (!deletedContact) {
            return res.status(404).json({ success: false, error: 'Contact not found' });
        }

        console.log('✅ Contact deleted successfully');
        res.json({ success: true, message: 'Contact deleted successfully' });

    } catch (error) {
        console.error('❌ Error deleting contact:', error);
        res.status(500).json({ success: false, error: 'Failed to delete contact' });
    }
});

module.exports = router;