const express = require('express');
const bodyParser = require('body-parser');
const Enquiry = require('./OtpVerificationEnquire')
const cors = require('cors');
const nodemailer = require('nodemailer');

require('dotenv').config(); // Load API keys securely
const accountSid = "ACb93aa441cd1479351f2bb79c9d2249ab"; // Store these in .env
const authToken = "e0f72e3f7785d575dda78f61394fa5af"; //e0f72e3f7785d575dda78f61394fa5af //Previous c309afe5ed872fb273885285e3337e23
const client = require('twilio')(accountSid, authToken);
const router = express.Router();

const app = express();
router.use(bodyParser.json());
router.use(cors());
// const router = express.Router();


const otpStore = {}; // Store OTPs temporarily
// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'reactdeveloper@adinn.co.in',
        pass: 'gxnn sezu klyp ifhn'
    }
});

// GET  & DELETE THE ENQUIRY DETAILS
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


//POST THE ENQUIRY DETAILS WITH PRODUCT DATA

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
        const message = await client.messages.create({
            // body: `Your OTP is: ${otp}. Valid for 5 minutes.`,
            body: `Welcome to Adinn Outdoors!\nYour One-Time Password (OTP) for verification is\n* ${otp} *\nDo not share this code with anyone.`,
            //  messagingServiceSid: "MGfdd70b29590d5e1edc19f4cd9fe2e9f4", // ✅ Use Messaging Service SID
            from: '+19064226997',
            to: phone
        });

        console.log(`OTP Sent: ${otp} to ${phone}, Message SID: ${message.sid}`);
        res.status(200).json({ success: true, message: "OTP sent successfully" });
    } catch (error) {
        // console.error("Twilio Error:", error);

        // if (error.code === 21608) {
        //     res.status(400).json({ success: false, message: "Upgrade Twilio account to send to unverified numbers." });
        // } else {
        //     res.status(500).json({ success: false, message: "Failed to send OTP. Check Twilio logs." });
        // }

        console.error("Twilio Error:", error);

        let errorMessage = "Failed to send OTP";
        if (error.code === 21211) {
            errorMessage = "Invalid phone number";
        } else if (error.code === 21608) {
            errorMessage = "Twilio trial account limitation - verify number in Twilio console";
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            twilioError: error.message
        });
    }
});


//DATABASE STORED THE DATA
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

                    // Send emails after successful verification and DB save
                    await sendAdminEmail(enquiry);
                    // await sendUserSMS(phone); 

                } catch (dbError) {
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


// Function to send admin email
async function sendAdminEmail(enquiry) {
    try {
        const mailOptions = {
            from: 'reactdeveloper@adinn.co.in',
            to: 'reactdeveloper@adinn.co.in',
            subject: 'New Product Enquiry Received',
            html: `
                   <div style='font-family: Montserrat; margin: 0 auto; padding:20px; border: 1px solid #ddd; border-radius:5px; width:max-content;'>
        <h1>New Product Enquiry Details:</h1>
        <div style="font-size:18px;"><strong>User Phone: </strong> <a href='${enquiry.phone}'>${enquiry.phone}</a></div>
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

// // **Start Server**
// const PORT = 4003;
// router.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });

