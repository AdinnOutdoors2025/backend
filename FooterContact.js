// const express = require('express');
// const bodyParser = require('body-parser');
// const nodemailer = require('nodemailer');
// const cors = require('cors');
// const mongoose = require('mongoose');
// const PORT = process.env.PORT || 3001;
// // //EMAIL CREDENTIALS 
// // const {emailID, emailPwd} = require('./EmailCredentials');


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
//         user: 'reactdeveloper@adinn.co.in',
//         pass: 'tcht lwgz hjwr nkzl'
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
//             from: 'reactdeveloper@adinn.co.in',
//             to: 'reactdeveloper@adinn.co.in', // Admin email
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
//         // await transporter.sendMail(mailOptions);
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











const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
const mongoose = require('mongoose');
const request = require('request'); // Add this for SMS

const router = express.Router();
const { generateEmailFooter } = require('./Email_Template.js');


router.use(bodyParser.json());
router.use(cors({
    origin: ['https://backend-bq11.onrender.com', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// NettyFish SMS Configuration
const NETTYFISH_API_KEY = process.env.NETTYFISH_API_KEY || 'aspv58uRbkqDbhCcCN87Mw';
const NETTYFISH_SENDER_ID = process.env.NETTYFISH_SENDER_ID || 'ADINAD';
const NETTYFISH_BASE_URL = 'https://retailsms.nettyfish.com/api/mt/SendSMS';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ADMIN_PHONE = process.env.ADMIN_PHONE;

// Contact Schema
const contactSchema = new mongoose.Schema({
    contactInfo: {
        type: String,
        required: true,
        unique: true // This will prevent duplicates at database level

    },
    contactType: {
        type: String,
        enum: ['email', 'phone'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
// // Add index for better performance
// contactSchema.index({ contactInfo: 1 }, { unique: true });
// contactSchema.index({ createdAt: -1 });

const contact = mongoose.model("FooterContact", contactSchema);

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'reactdeveloper@adinn.co.in',
        pass: 'tcht lwgz hjwr nkzl'
    }
});

// Function to send SMS using NettyFish API
const sendSMS = (phone, templateId, variables = {}) => {
    return new Promise((resolve, reject) => {
        let formattedPhone = phone.replace('+', '');
        if (!formattedPhone.startsWith('91')) {
            formattedPhone = '91' + formattedPhone;
        }

        let text = "";
        switch (templateId) {
            case "1007068250583050089": // Footer contact template
                text = `Adinn Outdoors - Support Notification! A new enquiry has been received. Contact: ${variables.contactInfo}. Please follow up accordingly.`;
                break;
            default:
                text = variables.text || "";
        }

        const encodedText = encodeURIComponent(text);
        const url = `${NETTYFISH_BASE_URL}?APIKey=${NETTYFISH_API_KEY}&senderid=${NETTYFISH_SENDER_ID}&channel=Trans&DCS=0&flashsms=0&number=${formattedPhone}&dlttemplateid=${templateId}&text=${encodedText}&route=17`;

        request.get(url, (error, response, body) => {
            if (error) {
                console.error("SMS API Error:", error);
                reject(error);
            } else {
                try {
                    const result = JSON.parse(body);
                    if (result.ErrorCode === '000') {
                        console.log("SMS sent successfully:", result);
                        resolve(result);
                    } else {
                        console.error("SMS API Error:", result.ErrorMessage);
                        reject(new Error(result.ErrorMessage || 'Failed to send SMS'));
                    }
                } catch (parseError) {
                    console.error("SMS Parse Error:", parseError);
                    reject(parseError);
                }
            }
        });
    });
};


// Helper function to normalize phone number (remove all non-digits)
const normalizePhoneNumber = (phone) => {
    return phone.replace(/\D/g, '');
};

// Helper function to normalize email (convert to lowercase)
const normalizeEmail = (email) => {
    return email.toLowerCase().trim();
};

// Check if contact already exists
const checkExistingContact = async (contactInfo, contactType) => {
    try {
        if (contactType === 'email') {
            const normalizedEmail = normalizeEmail(contactInfo);
            const existingEmail = await contact.findOne({
                contactType: 'email',
                contactInfo: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') }
            });
            return existingEmail;
        } else {
            const normalizedPhone = normalizePhoneNumber(contactInfo);
            // Check if any phone number in database matches the normalized version
            const existingPhone = await contact.findOne({
                contactType: 'phone',
                $expr: {
                    $regexMatch: {
                        input: { $replaceAll: { input: "$contactInfo", find: " ", replacement: "" } },
                        regex: `^${normalizedPhone}$`
                    }
                }
            });
            return existingPhone;
        }
    } catch (error) {
        console.error('Error checking existing contact:', error);
        return null;
    }
};


// Generate admin email content
const generateAdminEmailContent = (contactInfo, contactType) => {
    const isEmail = contactType === 'email';
    const contactLink = isEmail
        ? `<a href="mailto:${contactInfo}">${contactInfo}</a>`
        : `<a href="tel:${contactInfo}">${contactInfo}</a>`;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <title>New Contact Request</title>
    </head>
    <body style="margin:0; padding:0; font-family: Arial, sans-serif;">
        <div style="max-width:700px; margin:auto; font-family:'Montserrat', Arial, sans-serif;">
            <!-- Logo -->
            <img src="https://www.adinnoutdoors.com/wp-content/uploads/2024/04/adinn-outdoor-final-logo.png"
                alt="Adinn Logo" style="height:50px; margin-bottom:15px;">
            
            <!-- Header -->
            <div style="
                text-align:center;
                padding:20px 0;
                background: linear-gradient(180deg,#00573F 0%,#12AC81 100%);
                font-weight:700;
                font-size:35px;
                color:#FFFFFF;">
                New Contact Request from Website
            </div>
            
            <!-- Main Content -->
            <div style="padding:30px; font-size:16px; line-height:1.6;">
                <h2 style="color:#E31F25;">NEW CONTACT REQUEST</h2>
                
                <p style="font-size:17px; margin-bottom:20px;">
                    <strong>Contact Type:</strong> ${contactType.toUpperCase()}
                </p>
                
                <p style="font-size:17px; margin-bottom:20px;">
                    <strong>Contact Information:</strong> ${contactLink}
                </p>
                
                <p style="font-size:17px; margin-bottom:20px;">
                    This user has contacted through the website contact form in the footer section.
                </p>
                
                <p style="font-size:17px; margin-bottom:30px;">
                    Please reach out to them at your earliest convenience.
                </p>
                
                <div style="background-color:#f5f5f5; padding:20px; border-radius:5px; margin:30px 0;">
                    <p style="font-size:14px; color:#666; margin:0;">
                        <strong>Note:</strong> This is an automated notification from the Adinn Outdoors website.
                    </p>
                </div>
            </div>
            
            ${generateEmailFooter()}
        </div>
    </body>
    </html>
    `;
};

// Generate user email content (if email provided)
const generateUserEmailContent = () => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <title>Thank You for Contacting Adinn Outdoors</title>
    </head>
    <body style="margin:0; padding:0; font-family: Arial, sans-serif;">
        <div style="max-width:700px; margin:auto; font-family:'Montserrat', Arial, sans-serif;">
            <!-- Logo -->
            <img src="https://www.adinnoutdoors.com/wp-content/uploads/2024/04/adinn-outdoor-final-logo.png"
                alt="Adinn Logo" style="height:50px; margin-bottom:15px;">
            
            <!-- Header -->
            <div style="
                text-align:center;
                padding:20px 0;
                background: linear-gradient(180deg,#00573F 0%,#12AC81 100%);
                font-weight:700;
                font-size:35px;
                color:#FFFFFF;">
                Thank You for Contacting Adinn Outdoors
            </div>
            
            <!-- Main Content -->
            <div style="padding:30px; font-size:16px; line-height:1.6;">
                <h2 style="color:#E31F25;">WE'VE RECEIVED YOUR MESSAGE</h2>
                
                <p style="font-size:17px; margin-bottom:20px;">
                    Dear Valued Customer,
                </p>
                
                <p style="font-size:17px; margin-bottom:20px;">
                    Thank you for reaching out to Adinn Outdoors! We have successfully received your contact information and our team will get in touch with you shortly.
                </p>
                
                <p style="font-size:17px; margin-bottom:20px;">
                    We appreciate your interest in our outdoor advertising solutions and look forward to assisting you with your advertising needs.
                </p>
                
                <div style="background-color:#E31F25; color:white; padding:20px; border-radius:5px; margin:30px 0; text-align:center;">
                    <p style="font-size:18px; font-weight:bold; margin:0;">
                        Our team typically responds within 24-48 business hours.
                    </p>
                </div>
                
                 <div style="font-size:14px; color:#2B3333;">
                      <a href="tel:7373785057" style="color:#2B3333; text-decoration:none;">7373785057</a> |
                      <a href="tel:9626987861" style="color:#2B3333; text-decoration:none;">9626987861</a>
                  </div>
            </div>
            
            ${generateEmailFooter()}
        </div>
    </body>
    </html>
    `;
};

// Contact form endpoint
router.post('/footerContactInfo', async (req, res) => {
    try {
        const { contactInfo } = req.body;
        // Basic validation
        if (!contactInfo || contactInfo.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Contact information is required'
            });
        }

        // Determine contact type
        const isEmail = contactInfo.includes('@');
        const contactType = isEmail ? 'email' : 'phone';



        // Normalize the contact info for duplicate checking
        let normalizedContactInfo;
        if (isEmail) {
            normalizedContactInfo = normalizeEmail(contactInfo);

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(normalizedContactInfo)) {
                return res.status(400).json({
                    success: false,
                    error: 'Please enter a valid email address'
                });
            }
        } else {
            normalizedContactInfo = normalizePhoneNumber(contactInfo);

            // Phone validation (10 digits for Indian numbers)
            const phoneRegex = /^[0-9]{10}$/;
            if (!phoneRegex.test(normalizedContactInfo)) {
                return res.status(400).json({
                    success: false,
                    error: 'Please enter a valid 10-digit phone number'
                });
            }
        }

        // Check for duplicate contact (prevent duplicate emails and phones)
        const existingContact = await checkExistingContact(contactInfo, contactType);

        if (existingContact) {
            // Check if the duplicate was submitted recently (within last 24 hours)
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const isRecentDuplicate = existingContact.createdAt > twentyFourHoursAgo;

            let message = `This ${contactType} has already been submitted.`;
            if (isRecentDuplicate) {
                message += ' Please wait 24 hours before submitting again.';
            }

            return res.status(409).json({
                success: false,
                error: message,
                duplicate: true,
                submittedAt: existingContact.createdAt
            });
        }


        // Save to database
        const newContact = new contact({
            contactInfo: normalizedContactInfo,
            contactType: contactType
        });
        await newContact.save();
        console.log("New contact saved:", normalizedContactInfo);


        // Email options for admin
        const adminMailOptions = {
            from: 'reactdeveloper@adinn.co.in',
            to: 'reactdeveloper@adinn.co.in', // Admin email
            subject: 'New Contact Request from Website Footer',
            html: generateAdminEmailContent(normalizedContactInfo, contactType)
        };
        //COMMENT TO STOP THE EMAIL 
        //  // Send email to admin
        // try {
        //     await transporter.sendMail(adminMailOptions);
        //     console.log("Admin email sent successfully");
        // } catch (emailError) {
        //     console.error("Failed to send admin email:", emailError);
        //     // Continue even if admin email fails
        // }
        //COMMENT TO STOP THE EMAIL 

        // If contact is email, also send thank you email to user
        let userEmailSent = false;
        if (isEmail) {
            const userMailOptions = {
                from: 'reactdeveloper@adinn.co.in',
                to: normalizedContactInfo, // User's email
                subject: 'Thank You for Contacting Adinn Outdoors',
                html: generateUserEmailContent()
            };
            //COMMENT TO STOP THE EMAIL 
            // try {
            //     await transporter.sendMail(userMailOptions);
            //     userEmailSent = true;
            //     console.log("User email sent successfully");
            // } catch (emailError) {
            //     console.error("Failed to send user email:", emailError);
            //     // Continue even if user email fails
            // }
            //COMMENT TO STOP THE EMAIL 

        }

        // Send SMS to admin if contact is phone number
        let smsSent = false;
        if (IS_PRODUCTION) {
            try {
                await sendSMS(ADMIN_PHONE, "1007068250583050089", {
                    contactInfo: normalizedContactInfo
                });
                smsSent = true;
                console.log("Admin SMS sent successfully");
            } catch (smsError) {
                console.error("Failed to send admin SMS:", smsError);
                // Continue even if SMS fails
            }
        } else {
            // Development logging for SMS
            console.log('=========================================');
            console.log('SMS Testing Information (localhost):');
            console.log('=========================================');
            console.log(`Contact Type: Phone`);
            console.log(`Phone Number: ${normalizedContactInfo}`);
            console.log('ADMIN SMS would be sent to:', ADMIN_PHONE);
            console.log('ADMIN SMS Template: 1007068250583050089');
            console.log(`ADMIN SMS Message: Adinn Outdoors - Support Notification! A new enquiry has been received. Contact: ${normalizedContactInfo}. Please follow up accordingly.`);
            console.log('NOTE: SMS functionality is disabled for localhost testing');
            console.log('=========================================');
        }

        res.status(200).json({
            success: true,
            emailSent: true,
            userEmailSent: userEmailSent,
            smsSent: smsSent,
            contactType: contactType
        });

    } catch (error) {
        console.error('Error in contact form submission:', error);
        // Handle duplicate key error from MongoDB
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                error: 'This contact information has already been submitted.',
                duplicate: true
            });
        }
        res.status(500).json({
            success: false,
            error: 'Failed to process contact information'
        });
    }
});

// GET all footer contacts
router.get('/footerContactInfo', async (req, res) => {
    console.log('Footer contact info route hit');

    try {
        const contacts = await contact.find().sort({ createdAt: -1 });
        console.log('Found contacts:', contacts.length);

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