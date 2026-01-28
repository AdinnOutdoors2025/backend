const express = require('express');
const bodyParser = require('body-parser');
const Enquiry = require('./OtpVerificationEnquire');
const cors = require('cors');
const nodemailer = require('nodemailer');
const request = require('request');
require('dotenv').config();
//EMAIL CREDENTIALS 
const {emailID, emailPwd} = require('./EmailCredentials');


const router = express.Router();
router.use(bodyParser.json());
router.use(cors());

const otpStore = {};
// Email configuration
// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: emailID,
//         pass: emailPwd
//     }
// });

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
const IS_PRODUCTION = process.env.NODE_ENV === 'production'; //NEWLY ADDED


// Function to send SMS using NettyFish API
const sendSMS = (phone, otp) => {
    return new Promise((resolve, reject) => {
        // Format phone number (remove + and add 91 if not present)
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
        // Format phone number (remove + and add 91 if not present)
        let formattedPhone = phone.replace('+', '');
        if (!formattedPhone.startsWith('91')) {
            formattedPhone = '91' + formattedPhone;
        }

        const text = "Thanks for enquiring Adinn Outdoor Products! We'll share more details with you shortly.";
        const templateId = "1007798213348641202"; // Your confirmation template ID

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



// Get all enquiries
router.get('/enquiries', async (req, res) => {
    try {
        const enquiries = await Enquiry.find().sort({ enquiryDate: -1 }); // Newest first
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


// **Send OTP**
router.post('/send-otp', async (req, res) => {
    const { phone } = req.body;
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
    otpStore[phone] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 }; // OTP expires in 5 mins

    try {


        if (IS_PRODUCTION) {

        // Send OTP using NettyFish API
        const result = await sendSMS(phone, otp);
        console.log(`OTP Sent: ${otp} to ${phone}, NettyFish Response: ${JSON.stringify(result)}`);
        res.status(200).json({ success: true, message: "OTP sent successfully" });
    } 

          // // STOPS THE SMS FOR TESTING PURPOSE 
else{
        // INSTEAD: Show OTP in console for testing
        console.log('=========================================');
        console.log('OTP FOR LOCALHOST TESTING:');
        console.log('=========================================');
        console.log(`Phone: ${phone}`);
        console.log(`OTP: ${otp}`);
        console.log('=========================================');
        console.log('NOTE: SMS functionality is disabled for localhost testing');
        console.log('Use the OTP above to proceed with verification');
        console.log('=========================================');
        
        res.status(200).json({ 
            success: true, 
            message: "OTP sent successfully (check console for testing)",
            // Include OTP in response for testing (remove in production)
            testOtp: otp 
        });
} 
    }
    
    catch (error) {
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

// **Verify OTP** - Updated to store product data
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp, productData } = req.body;
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
                    const enquiry = new Enquiry({
                        phone,
                        productId: productData.id,
                        prodCode: productData.prodCode,
                        printingCost: productData.printingCost,
                        mountingCost: productData.mountingCost,
                        prodLighting: productData.prodLighting,
                        productFrom: productData.productFrom,
                        productTo: productData.productTo,
                        productFixedAmount: productData.productFixedAmount,
                        productFixedOffer: productData.productFixedOffer,
                        category: productData.category,
                        rating: productData.rating,
                        imageUrl: productData.imageUrl,
                        prodName: productData.prodName,
                        location: productData.location,
                        price: productData.price,
                        size: `${productData.sizeHeight}x${productData.sizeWidth}`,
                        dimensions: `${productData.sizeHeight * productData.sizeWidth} Sq.ft`,
                        enquiryDate: new Date()
                    });
                    await enquiry.save();

                    if (IS_PRODUCTION) {

                    // Send confirmation SMS after successful verification and DB save
                    try {
                        await sendConfirmationSMS(phone);
                        console.log(`Confirmation SMS sent to ${phone}`);
                    } catch (smsError) {
                        console.error("Error sending confirmation SMS:", smsError);
                        // Don't fail verification if SMS fails
                    }
                    // Send emails after successful verification and DB save
                    await sendAdminEmail(enquiry);
                } 
                 else{
 // Log confirmation for testing
                    console.log('=========================================');
                    console.log('ENQUIRY SUCCESSFULLY CREATED:');
                    console.log('=========================================');
                    console.log(`Phone: ${phone}`);
                    console.log(`Product: ${productData.prodName}`);
                    console.log(`Product Code: ${productData.prodCode}`);
                    console.log(`Price: ₹${productData.price}`);
                    console.log('=========================================');
                    console.log('NOTE: Confirmation SMS is disabled for localhost');
                    console.log('=========================================');
                    // // Send emails after successful verification and DB save
                    // await sendAdminEmail(enquiry);
                }
            }
                catch (dbError) {
                    console.error("Database save error:", dbError);
                    // Don't fail verification if DB save fails
                }
            }
            return res.status(200).json({ success: true, message: "OTP verified successfully" });
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


router.post('/save-enquiry-without-otp', async (req, res) => {
    try {
        const { phone, productData, userId, userName, userEmail } = req.body;
        
        if (!phone || !productData) {
            return res.status(400).json({ 
                success: false, 
                message: "Phone and product data are required" 
            });
        }

        // Save enquiry to database
        const enquiry = new Enquiry({
            phone,
            productId: productData.id,
            prodCode: productData.prodCode,
            printingCost: productData.printingCost,
            mountingCost: productData.mountingCost,
            prodLighting: productData.prodLighting,
            productFrom: productData.productFrom,
            productTo: productData.productTo,
            productFixedAmount: productData.productFixedAmount,
            productFixedOffer: productData.productFixedOffer,
            category: productData.category,
            rating: productData.rating,
            imageUrl: productData.imageUrl,
            prodName: productData.prodName,
            location: productData.location,
            price: productData.price,
            size: `${productData.sizeHeight}x${productData.sizeWidth}`,
            dimensions: `${productData.sizeHeight * productData.sizeWidth} Sq.ft`,
            enquiryDate: new Date(),
            userId: userId || null,
            userName: userName || null,
            userEmail: userEmail || null,
            enquiryType: 'booked_dates_enquiry'
        });

        await enquiry.save();

        // Send confirmation email to admin
        try {
            const mailOptions = {
                from: "reactdeveloper@adinn.co.in",
                to: "reactdeveloper@adinn.co.in",
                subject: 'New Enquiry for Booked Dates',
                html: `
                    <div style='font-family: Montserrat; margin: 0 auto; padding:20px; border: 1px solid #ddd; border-radius:5px; width:max-content;'>
                        <h1>New Enquiry for Booked Dates:</h1>
                        <div style="font-size:18px;"><strong>User Phone: </strong> <a href='tel:${phone}'>${phone}</a></div>
                        ${userId ? `<div style="font-size:18px;"><strong>User ID: </strong> ${userId}</div>` : ''}
                        ${userName ? `<div style="font-size:18px;"><strong>User Name: </strong> ${userName}</div>` : ''}
                        ${userEmail ? `<div style="font-size:18px;"><strong>User Email: </strong> ${userEmail}</div>` : ''}
                        <div style="font-size:18px;"><strong>Product ID: </strong> ${productData.prodCode}</div>
                        <div style="font-size:18px;"><strong>Product Name: </strong> ${productData.prodName}</div>
                        <div style="font-size:18px;"><strong>Date: </strong> ${new Date().toLocaleDateString()} <span> <strong> Time: </strong> ${new Date().toLocaleTimeString()} </span></div>
                        <div style="font-size:18px;"><strong>Location:</strong> ${productData.location}</div>
                        <div style="font-size:18px;"><strong>Size: </strong> ${productData.sizeHeight}x${productData.sizeWidth} ( ${productData.sizeHeight * productData.sizeWidth} Sq.ft )</div>
                        <div style="font-size:18px;"><strong>Price: </strong> ₹${productData.price?.toLocaleString() || '0'}</div>
                        <br />
                        <p style="font-size:18px; color: #d35400;"><strong>Note:</strong> This enquiry was made because all initial booking dates are currently booked.</p>
                        <p style="font-size:18px;">Please follow up with the customer at your earliest convenience.</p>
                    </div>
                `
            };
            await transporter.sendMail(mailOptions);
        } catch (emailError) {
            console.error("Error sending admin email:", emailError);
            // Don't fail the request if email fails
        }

        res.status(200).json({ 
            success: true, 
            message: "Enquiry saved successfully" 
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

// Function to send admin email
async function sendAdminEmail(enquiry) {
    try {
        const mailOptions = {
            from: "reactdeveloper@adinn.co.in",
            to: "reactdeveloper@adinn.co.in",
            subject: 'New Product Enquiry Received',
            html: `
                   <div style='font-family: Montserrat; margin: 0 auto; padding:20px; border: 1px solid #ddd; border-radius:5px; width:max-content;'>
        <h1>New Product Enquiry Details:</h1>
        <div style="font-size:18px;"><strong>User Phone: </strong> <a href='tel:${enquiry.phone}'>${enquiry.phone}</a></div>
        <div style="font-size:18px;"><strong>Product ID: </strong> ${enquiry.prodCode}</div>
        <div style="font-size:18px;"><strong>Product Name: </strong> ${enquiry.prodName}</div>
        <div style="font-size:18px;"><strong>Date: </strong> ${enquiry.enquiryDate.toLocaleDateString()} <span> <strong> Time: </strong> ${enquiry.enquiryDate.toLocaleTimeString()} </span></div>
        <div style="font-size:18px;"><strong>Location:</strong> ${enquiry.location}</div>
        <div style="font-size:18px;"><strong>Size: </strong> ${enquiry.size} ( ${enquiry.dimensions} )</div>
        <div style="font-size:18px;"><strong>Price: </strong> ₹${enquiry.price.toLocaleString()}</div>
        <br />
        <p style="font-size:18px;">Please follow up with the customer at your earliest convenience.</p>
    </div> `
        };
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error("Error sending admin email:", error);
    }
}

module.exports = router;