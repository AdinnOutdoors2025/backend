//CORRECTLY HANDLE THE BOTH LOGGED IN AND LOGOUT USER ADMIN MAIL 
const express = require('express');
const bodyParser = require('body-parser');
const Enquiry = require('./OtpVerificationEnquire');
const cors = require('cors');
const nodemailer = require('nodemailer');
const request = require('request');
require('dotenv').config();

const router = express.Router();
router.use(bodyParser.json());
router.use(cors());

const otpStore = {};

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'reactdeveloper@adinn.co.in',
    pass: 'gxnn sezu klyp ifhn'
  }
});

// NettyFish SMS Configuration
const NETTYFISH_API_KEY = process.env.NETTYFISH_API_KEY || 'aspv58uRbkqDbhCcCN87Mw';
const NETTYFISH_SENDER_ID = process.env.NETTYFISH_SENDER_ID || 'ADINAD';
const NETTYFISH_TEMPLATE_ID = process.env.NETTYFISH_TEMPLATE_ID || '1007403395830327066';
const NETTYFISH_BASE_URL = 'https://retailsms.nettyfish.com/api/mt/SendSMS';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Function to send SMS using NettyFish API
const sendSMS = (phone, otp) => {
    return new Promise((resolve, reject) => {
        let formattedPhone = phone.replace('+', '');
        if (!formattedPhone.startsWith('91')) {
            formattedPhone = '91' + formattedPhone;
        }

        const text = `Welcome to Adinn Outdoors! Your verification code is ${otp}. Use this OTP to complete your verification. Please don't share it with anyone.`;

        const encodedText = encodeURIComponent(text);
        const url = `${NETTYFISH_BASE_URL}?APIKey=${NETTYFISH_API_KEY}&senderid=${NETTYFISH_SENDER_ID}&channel=Trans&DCS=0&flashsms=0&number=${formattedPhone}&dlttemplateid=${NETTYFISH_TEMPLATE_ID}&text=${encodedText}&route=17`;

        request.get(url, (error, response, body) => {
            if (error) {
                reject(error);
            } else {
                try {
                    const result = JSON.parse(body);
                    if (result.ErrorCode === '000') {
                        resolve(result);
                    } else {
                        reject(new Error(result.ErrorMessage || 'Failed to send SMS'));
                    }
                } catch (parseError) {
                    reject(parseError);
                }
            }
        });
    });
};

// Function to send confirmation SMS using NettyFish API
const sendConfirmationSMS = (phone) => {
    return new Promise((resolve, reject) => {
        let formattedPhone = phone.replace('+', '');
        if (!formattedPhone.startsWith('91')) {
            formattedPhone = '91' + formattedPhone;
        }

        const text = "Thanks for enquiring Adinn Outdoor Products! We'll share more details with you shortly.";
        const templateId = "1007798213348641202";

        const encodedText = encodeURIComponent(text);
        const url = `${NETTYFISH_BASE_URL}?APIKey=${NETTYFISH_API_KEY}&senderid=${NETTYFISH_SENDER_ID}&channel=Trans&DCS=0&flashsms=0&number=${formattedPhone}&dlttemplateid=${templateId}&text=${encodedText}&route=17`;

        request.get(url, (error, response, body) => {
            if (error) {
                reject(error);
            } else {
                try {
                    const result = JSON.parse(body);
                    if (result.ErrorCode === '000') {
                        resolve(result);
                    } else {
                        reject(new Error(result.ErrorMessage || 'Failed to send confirmation SMS'));
                    }
                } catch (parseError) {
                    reject(parseError);
                }
            }
        });
    });
};

// **Send OTP**
router.post('/send-otp', async (req, res) => {
    const { phone, enquiryType } = req.body;
    
    if (!phone || !phone.startsWith('+')) {
        return res.status(400).json({ success: false, message: "Enter a valid phone number in E.164 format" });
    }
    
    if (!phone || !phone.startsWith('+91')) {
        return res.status(400).json({
            success: false,
            message: "Phone number must start with +91 followed by 10 digits"
        });
    }

    if (!phone.match(/^\+91\d{10}$/)) {
        return res.status(400).json({
            success: false,
            message: "Invalid phone number format. Use +91 followed by 10 digits"
        });
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[phone] = { 
        otp, 
        expiresAt: Date.now() + 5 * 60 * 1000,
        enquiryType: enquiryType || 'normal_enquiry'
    };

    try {
        if (IS_PRODUCTION) {
            // Send OTP using NettyFish API
            const result = await sendSMS(phone, otp);
            console.log(`OTP Sent: ${otp} to ${phone}, NettyFish Response: ${JSON.stringify(result)}`);
            res.status(200).json({ success: true, message: "OTP sent successfully" });
        } else {
            console.log('=========================================');
            console.log('OTP FOR LOCALHOST TESTING:');
            console.log('=========================================');
            console.log(`Phone: ${phone}`);
            console.log(`OTP: ${otp}`);
            console.log(`Enquiry Type: ${enquiryType || 'normal_enquiry'}`);
            console.log('=========================================');
            console.log('NOTE: SMS functionality is disabled for localhost testing');
            console.log('Use the OTP above to proceed with verification');
            console.log('=========================================');
            
            res.status(200).json({ 
                success: true, 
                message: "OTP sent successfully (check console for testing)",
                testOtp: otp 
            });
        }
    } catch (error) {
        console.error("NettyFish Error:", error);
        let errorMessage = "Failed to send OTP";
        if (error.message.includes('Invalid Number')) {
            errorMessage = "Invalid phone number";
        }
        res.status(500).json({
            success: false,
            message: errorMessage,
            nettyfishError: error.message
        });
    }
});

// **Verify OTP** - Updated to handle guest users and send admin email
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp, productData, enquiryType, isGuest } = req.body;
        
        if (!phone || !otp) {
            return res.status(400).json({ success: false, message: "Phone and OTP are required" });
        }
        
        const storedData = otpStore[phone];
        if (!storedData || Date.now() > storedData.expiresAt) {
            return res.status(400).json({ success: false, message: "OTP expired or not found" });
        }
        
        if (otp.toString() === storedData.otp.toString()) {
            delete otpStore[phone]; // Remove OTP after verification
            
            // Store enquiry in database if product data exists
            if (productData) {
                try {
                    // Check for duplicate enquiry in the last 5 minutes
                    const recentEnquiry = await Enquiry.findOne({
                        phone: phone,
                        prodCode: productData.prodCode,
                        enquiryDate: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
                    });

                    if (recentEnquiry) {
                        console.log('Duplicate enquiry detected and prevented for phone:', phone);
                        return res.status(200).json({ 
                            success: true, 
                            message: "OTP verified successfully - enquiry already submitted recently",
                            duplicate: true 
                        });
                    }

                    // Create enquiry document for guest user
                    const enquiry = new Enquiry({
                        phone: phone,
                        productId: productData.id || productData._id,
                        prodCode: productData.prodCode,
                        printingCost: productData.printingCost || 0,
                        mountingCost: productData.mountingCost || 0,
                        prodLighting: productData.prodLighting || 'Unknown',
                        productFrom: productData.productFrom || 'Unknown',
                        productTo: productData.productTo || 'Unknown',
                        productFixedAmount: productData.productFixedAmount || 0,
                        productFixedOffer: productData.productFixedOffer || 0,
                        category: productData.category || productData.mediaType || 'Unknown',
                        rating: productData.rating || 0,
                        imageUrl: productData.imageUrl || productData.image || '',
                        prodName: productData.prodName || productData.name || 'Unknown',
                        location: productData.location || `${productData.district || ''}, ${productData.state || ''}`,
                        price: productData.price || productData.displayPrice || 0,
                        size: `${productData.sizeHeight || 0}x${productData.sizeWidth || 0}`,
                        dimensions: `${(productData.sizeHeight || 0) * (productData.sizeWidth || 0)} Sq.ft`,
                        enquiryDate: new Date(),
                        userId: null, // Guest users don't have user ID
                        userName: null,
                        userEmail: null,
                        enquiryType: enquiryType || 'normal_enquiry',
                        userStatus: 'guest', // Mark as guest user
                        verified: true // OTP verified
                    });

                    await enquiry.save();

                    // Log the enquiry creation
                    console.log('=========================================');
                    console.log('GUEST USER ENQUIRY SUCCESSFULLY CREATED:');
                    console.log('=========================================');
                    console.log('User Status: GUEST_USER');
                    console.log(`Phone: ${phone}`);
                    console.log(`Product: ${productData.prodName || productData.name}`);
                    console.log(`Product Code: ${productData.prodCode}`);
                    console.log(`Enquiry Type: ${enquiryType || 'normal_enquiry'}`);
                    console.log('=========================================');

                    // Send admin email for guest user enquiry
                    try {
                        await sendGuestUserAdminEmail(enquiry);
                        console.log(`Admin email sent for guest enquiry from ${phone}`);
                    } catch (emailError) {
                        console.error("Error sending guest admin email:", emailError);
                        // Don't fail verification if email fails
                    }

                    if (IS_PRODUCTION) {
                        // Send confirmation SMS for guest users
                        try {
                            await sendConfirmationSMS(phone);
                            console.log(`Confirmation SMS sent to guest user ${phone}`);
                        } catch (smsError) {
                            console.error("Error sending confirmation SMS:", smsError);
                        }
                    } else {
                        console.log('=========================================');
                        console.log('NOTE: Confirmation SMS is disabled for localhost');
                        console.log('=========================================');
                    }
                } catch (dbError) {
                    console.error("Database save error:", dbError);
                    // Don't fail verification if DB save fails
                }
            }
            
            return res.status(200).json({ 
                success: true, 
                message: "OTP verified successfully",
                userStatus: 'guest'
            });
        } else {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }
    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error during verification"
        });
    }
});

// Save enquiry without OTP (for logged-in users)
router.post('/save-enquiry-without-otp', async (req, res) => {
    try {
        const { phone, productData, userId, userName, userEmail, enquiryType } = req.body;
        
        if (!phone || !productData) {
            return res.status(400).json({ 
                success: false, 
                message: "Phone and product data are required" 
            });
        }

        // Validate phone format
        if (!phone.startsWith('+91')) {
            return res.status(400).json({
                success: false,
                message: "Phone number must start with +91"
            });
        }

        // Check for duplicate enquiry in the last 5 minutes
        const recentEnquiry = await Enquiry.findOne({
            phone: phone,
            userId: userId,
            prodCode: productData.prodCode,
            enquiryDate: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
        });

        if (recentEnquiry) {
            console.log('Duplicate enquiry detected and prevented for user:', userId);
            return res.status(200).json({ 
                success: true, 
                message: "Enquiry already submitted recently",
                duplicate: true 
            });
        }

        // Save enquiry to database
        const enquiry = new Enquiry({
            phone: phone,
            productId: productData.id || productData._id,
            prodCode: productData.prodCode,
            printingCost: productData.printingCost || 0,
            mountingCost: productData.mountingCost || 0,
            prodLighting: productData.prodLighting || 'Unknown',
            productFrom: productData.productFrom || 'Unknown',
            productTo: productData.productTo || 'Unknown',
            productFixedAmount: productData.productFixedAmount || 0,
            productFixedOffer: productData.productFixedOffer || 0,
            category: productData.category || productData.mediaType || 'Unknown',
            rating: productData.rating || 0,
            imageUrl: productData.imageUrl || productData.image || '',
            prodName: productData.prodName || productData.name || 'Unknown',
            location: productData.location || `${productData.district || ''}, ${productData.state || ''}`,
            price: productData.price || productData.displayPrice || 0,
            size: `${productData.sizeHeight || 0}x${productData.sizeWidth || 0}`,
            dimensions: `${(productData.sizeHeight || 0) * (productData.sizeWidth || 0)} Sq.ft`,
            enquiryDate: new Date(),
            userId: userId || null,
            userName: userName || null,
            userEmail: userEmail || null,
            enquiryType: enquiryType || 'normal_enquiry',
            userStatus: userId ? 'logged_in' : 'guest',
            verified: userId ? true : false
        });

        await enquiry.save();

        // Send confirmation email to admin for logged-in user
        try {
            const mailOptions = {
                from: "reactdeveloper@adinn.co.in",
                to: "reactdeveloper@adinn.co.in",
                subject: `New Enquiry: ${enquiryType === 'booked_dates_enquiry' ? 'Booked Dates Enquiry' : 'Product Enquiry'}`,
                html: `
                    <div style='font-family: Montserrat; margin: 0 auto; padding:20px; border: 1px solid #ddd; border-radius:5px; width:max-content;'>
                        <h1>New Enquiry Received:</h1>
                        <div style="font-size:18px;"><strong>User Status: </strong> ${userId ? 'LOGGED-IN USER' : 'GUEST USER'}</div>
                        <div style="font-size:18px;"><strong>User Phone: </strong> <a href='tel:${phone}'>${phone}</a></div>
                        ${userId ? `<div style="font-size:18px;"><strong>User ID: </strong> ${userId}</div>` : ''}
                        ${userName ? `<div style="font-size:18px;"><strong>User Name: </strong> ${userName}</div>` : ''}
                        ${userEmail ? `<div style="font-size:18px;"><strong>User Email: </strong> ${userEmail}</div>` : ''}
                        <div style="font-size:18px;"><strong>Product Code: </strong> ${productData.prodCode}</div>
                        <div style="font-size:18px;"><strong>Product Name: </strong> ${productData.prodName || productData.name}</div>
                        <div style="font-size:18px;"><strong>Date: </strong> ${new Date().toLocaleDateString()} <span> <strong> Time: </strong> ${new Date().toLocaleTimeString()} </span></div>
                        <div style="font-size:18px;"><strong>Location:</strong> ${productData.location || 'N/A'}</div>
                        <div style="font-size:18px;"><strong>Size: </strong> ${productData.sizeHeight || 0}x${productData.sizeWidth || 0} ( ${(productData.sizeHeight || 0) * (productData.sizeWidth || 0)} Sq.ft )</div>
                        <div style="font-size:18px;"><strong>Price: </strong> ₹${(productData.price || productData.displayPrice || 0).toLocaleString()}</div>
                        <br />
                        ${enquiryType === 'booked_dates_enquiry' ? 
                            '<p style="font-size:18px; color: #d35400;"><strong>Note:</strong> This enquiry was made because all initial booking dates are currently booked.</p>' : 
                            ''
                        }
                        <p style="font-size:18px;">Please follow up with the customer at your earliest convenience.</p>
                    </div>
                `
            };
            await transporter.sendMail(mailOptions);
            console.log(`Admin email sent for enquiry from ${phone}`);
            console.log(`User Status: ${userId ? 'LOGGED-IN' : 'GUEST'}`);

        } catch (emailError) {
            console.error("Error sending admin email:", emailError);
        }

        res.status(200).json({ 
            success: true, 
            message: "Enquiry saved successfully",
            enquiryId: enquiry._id
        });

    } catch (error) {
        console.error("Error saving enquiry without OTP:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to save enquiry",
            error: error.message 
        });
    }
});

// Function to send admin email for guest users (normal enquiry OTP process)
async function sendGuestUserAdminEmail(enquiry) {
    try {
        const mailOptions = {
            from: "reactdeveloper@adinn.co.in",
            to: "reactdeveloper@adinn.co.in",
            subject: 'New Product Enquiry Received (Guest User)',
            html: `
                <div style='font-family: Montserrat; margin: 0 auto; padding:20px; border: 1px solid #ddd; border-radius:5px; width:max-content;'>
                    <h1 style="color: #e74c3c;">NEW GUEST USER ENQUIRY</h1>
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                        <div style="font-size:18px; color: #e74c3c; font-weight: bold;">
                            ⚠️ USER STATUS: GUEST USER (OTP VERIFIED)
                        </div>
                        <div style="font-size:16px; color: #7f8c8d;">
                            This user is not logged in and completed OTP verification
                        </div>
                    </div>
                    <div style="font-size:18px;"><strong>User Phone: </strong> <a href='tel:${enquiry.phone}'>${enquiry.phone}</a></div>
                    <div style="font-size:18px;"><strong>User Status: </strong> <span style="color: #e74c3c; font-weight: bold;">GUEST USER</span></div>
                    <div style="font-size:18px;"><strong>Product Code: </strong> ${enquiry.prodCode}</div>
                    <div style="font-size:18px;"><strong>Product Name: </strong> ${enquiry.prodName}</div>
                    <div style="font-size:18px;"><strong>Date: </strong> ${enquiry.enquiryDate.toLocaleDateString()} <span> <strong> Time: </strong> ${enquiry.enquiryDate.toLocaleTimeString()} </span></div>
                    <div style="font-size:18px;"><strong>Location:</strong> ${enquiry.location}</div>
                    <div style="font-size:18px;"><strong>Size: </strong> ${enquiry.size} ( ${enquiry.dimensions} )</div>
                    <div style="font-size:18px;"><strong>Price: </strong> ₹${enquiry.price.toLocaleString()}</div>
                    <div style="font-size:18px;"><strong>Enquiry Type: </strong> ${enquiry.enquiryType}</div>
                    <div style="font-size:18px;"><strong>Verification Method: </strong> OTP Verification</div>
                    <br />
                    <div style="background-color: #fff3cd; padding: 10px; border-radius: 5px; border-left: 4px solid #ffc107;">
                        <p style="font-size:16px; color: #856404;">
                            <strong>Note:</strong> This user completed OTP verification. Consider following up to convert them to a registered user.
                        </p>
                    </div>
                    <br />
                    <p style="font-size:18px;">Please follow up with the customer at your earliest convenience.</p>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        console.log(`Guest user admin email sent for enquiry from ${enquiry.phone}`);
    } catch (error) {
        console.error("Error sending guest user admin email:", error);
    }
}

// Get all enquiries
router.get('/enquiries', async (req, res) => {
    try {
        const enquiries = await Enquiry.find().sort({ enquiryDate: -1 });
        res.status(200).json(enquiries);
    } catch (error) {
        console.error("Error fetching enquiries:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch enquiries",
            error: error.message
        });
    }
});

// Delete an enquiry
router.delete('/enquiries/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedEnquiry = await Enquiry.findByIdAndDelete(id);

        if (!deletedEnquiry) {
            return res.status(404).json({
                success: false,
                message: "Enquiry not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Enquiry deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting enquiry:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete enquiry",
            error: error.message
        });
    }
});

module.exports = router;