const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcyrypt = require('bcryptjs');
const request = require('request');
require('dotenv').config();
const axios = require('axios');

//EMAIL CREDENTIALS 
const { emailID, emailPwd } = require('./EmailCredentials');


// MongoDB connection 
//USER LOGIN DETAILS ARE STORED IN THIS COLLECTION / DATABASE
const UserSchema = new mongoose.Schema(
    {
        userName: { type: String, required: true },
        userEmail: { type: String, required: true, unique: true },
        userPhone: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }
);
const User = mongoose.model("User", UserSchema)

const router = express.Router();
router.use(bodyParser.json());
router.use(cors());

// Configuration
const NETTYFISH_API_KEY = process.env.NETTYFISH_API_KEY || 'aspv58uRbkqDbhCcCN87Mw';
const NETTYFISH_SENDER_ID = process.env.NETTYFISH_SENDER_ID || 'ADINAD';
const NETTYFISH_TEMPLATE_ID = process.env.NETTYFISH_TEMPLATE_ID || '1007403395830327066';
const IS_PRODUCTION = process.env.NODE_ENV === 'production'; //NEWLY ADDED


const otpStore = {}; // Store OTPs temporarily
// Root endpoint
router.get('/', (req, res) => {
    res.send('Welcome to Email OTP Verification API');
});

// Check if user exists
router.post('/check-user', async (req, res) => {
    const { email, phone } = req.body;
    try {
        let user;
        if (email) {
            user = await User.findOne({ userEmail: email });
        } else if (phone) {
            user = await User.findOne({ userPhone: phone });
        } else {
            return res.status(400).json({ error: 'Email or phone is required' });
        }

        res.json({ exists: !!user });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add this new endpoint to your backend
router.post('/check-user-exists', async (req, res) => {
    const { email, phone } = req.body;

    try {
        const emailExists = email ? await User.findOne({ userEmail: email }) : false;
        const phoneExists = phone ? await User.findOne({ userPhone: phone }) : false;

        res.json({
            emailExists: !!emailExists,
            phoneExists: !!phoneExists
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new user
router.post('/create-user', async (req, res) => {
    const { userName, userEmail, userPhone } = req.body;
    try {
        // Validate all required fields
        if (!userName || !userEmail || !userPhone) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        // if (userEmail) {
        const existingEmail = await User.findOne({ userEmail });
        if (existingEmail) {
            return res.status(400).json({
                error: 'Email already registered',
                suggestion: 'Try logging in or use a different email'

            });
        }
        const existingPhone = await User.findOne({ userPhone });
        if (existingPhone) {
            return res.status(400).json({
                error: 'Phone number already registered',
                suggestion: 'Try logging in or use a different phone number'

            });
        }
        // Create new user
        const newUser = new User({
            userName,
            userEmail,
            userPhone
        });

        await newUser.save();

        if (IS_PRODUCTION) {

            // Send welcome SMS after successful registration
            try {
                const welcomeMessage = "Thank you for registering with Adinn Outdoors. We're glad to have you on board!";
                const mobileNumber = userPhone.replace(/\D/g, '');
                const formattedNumber = mobileNumber.length === 10 ? `91${mobileNumber}` : mobileNumber;

                const welcomeSmsUrl = `https://retailsms.nettyfish.com/api/mt/SendSMS?APIKey=${NETTYFISH_API_KEY}&senderid=${NETTYFISH_SENDER_ID}&channel=Trans&DCS=0&flashsms=0&number=${formattedNumber}&dlttemplateid=1007653370910160293&text=${encodeURIComponent(welcomeMessage)}&route=17`;

                request(welcomeSmsUrl, { method: 'GET' }, (error, response, body) => {
                    if (error) {
                        console.error("Welcome SMS Error:", error);
                    } else {
                        console.log("Welcome SMS sent successfully:", body);
                    }
                });
            } catch (smsError) {
                console.error("Error sending welcome SMS:", smsError);
                // Don't fail the registration if SMS fails
            }

            // // STOPS THE SMS FOR TESTING PURPOSE
        }
        else {
            // Log welcome message to console instead
            console.log('=========================================');
            console.log('WELCOME MESSAGE (Localhost Testing):');
            console.log('=========================================');
            console.log(`User: ${userName}, Email: ${userEmail}, Phone: ${userPhone}`);
            console.log('=========================================');
            console.log('NOTE: Welcome SMS is disabled for localhost testing');
            console.log('=========================================');
        }

        //Sent welcome mail to the User
        const transporter = nodemailer.createTransport(
            {
                service: 'gmail',
                auth: {
                    user: emailID,
                    pass: emailPwd
                }
            }
        );
        //Welcome Email to user
        const userMailOptions = {
            from: emailID,
            to: userEmail,
            subject: 'Welcome to Adinn - Registration Successful',
            html: `
             <div
        style='font-family: Montserrat; margin: 0 auto; padding:20px; border: 1px solid #ddd; border-radius:5px; width:max-content;'>
        <center>
            <img src="https://www.adinnoutdoors.com/wp-content/uploads/2024/04/adinn-outdoor-final-logo.png"
                alt="adinn_logo" style="height:auto; width:auto; margin:0 auto;" />
        </center>

        <h1 style="color: #333;">Hi ${userName}, Welcome to Adinn Outdoors!</h1>
        <p style="font-size: 17px;color:black;">You have successfully registered with us. We're glad to have you on board! </p>
        <h2 style="color: #333; margin-top: 20px;"> Your Registration Details</h2>
        <ul style="font-size: 17px;">
            <li><strong>Name: </strong> ${userName}</li>
            <li><strong>Email: </strong> ${userEmail}</li>
            <li><strong>Phone: </strong> <a href='tel:${userPhone}'> ${userPhone} </a></li>
        </ul>
        <p style="margin-top: 20px;font-size: 17px; color:black;">If you have any questions, Get in touch with us.</p>
       <div>
         <a href="https://www.facebook.com/adinnoutdoors/" target="_blank"
            style="display: inline-block; width: 25px; height: 25px; margin:0px 5px;">
            <img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" alt="Facebook"
                style="width: 100%; height: auto;">
        </a>
        <a href="https://www.instagram.com/adinnoutdoor/" target="_blank"
            style="display: inline-block; width: 25px; height: 25px; margin:0px 5px;">
            <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram"
                style="width: 100%; height: auto;">
        </a>
        <a href="https://www.linkedin.com/showcase/adinn-outdoors/" target="_blank"
            style="display: inline-block; width: 25px; height: 25px; margin:0px 5px;">
            <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn"
                style="width: 100%; height: auto;">
        </a>
        <a href="https://www.youtube.com/@AdinnChannel" target="_blank"
            style="display: inline-block; width: 25px; height: 25px; margin:0px 5px;">
            <img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" alt="YouTube"
                style="width: 100%; height: auto;">
        </a>
        <a href="mailto:emailID" target="_blank"
            style="display: inline-block; width: 25px; height: 25px; margin:0px 5px;">
            <img src="https://cdn-icons-png.flaticon.com/512/5968/5968534.png" alt="Gmail"
                style="width: 100%; height: auto;">
        </a>
       </div>
    </div> `
        };
        const adminMailOptions = {
            from: emailID,
            to: emailID,
            subject: 'New User Registration on Adinn Site',
            html: `
<div style='font-family: Montserrat; margin: 0 auto; padding:20px; border: 1px solid #ddd; border-radius:5px;'> 
<h2 style="color: #333;">New User Registration</h2>
<h3 style="color: #333; margin-top: 20px;">User Details : </h3>
<ul>
<li><strong>Name: </strong> ${userName}</li>
<li><strong>Email: </strong> ${userEmail}</li>
<li><strong>Phone: </strong> ${userPhone}</li>
<li><strong>Registration Date:</strong> ${new Date().toLocaleString()}</li>
</ul>
</div> `
        };
        //Sent both emails (don't wait for these to complete)
        transporter.sendMail(userMailOptions, (error) => {
            if (error) {
                console.error("Error Sending Welcome Mail:", error);
            }
        })
        transporter.sendMail(adminMailOptions, (error) => {
            if (error) {
                console.error("Error Sending admin Mail:", error);
            }
        })

        //PHP MAIL INTEGRATION 
        // --- NEW: Send registration data to the PHP mail API ---
        const mailPayload = {
            mailtype: 'register',
            userName: newUser.userName,
            userEmail: newUser.userEmail,
            userPhone: newUser.userPhone
        };

        // Non‑blocking call – we don't await it
        axios.post('https://adinndigital.com/api/index.php', mailPayload, {
            headers: { 'Content-Type': 'application/json' }
        })
            .then(response => {
                console.log('PHP mail API responded:', response.data);
            })
            .catch(error => {
                console.error('Error calling PHP mail API:', error.message);
                if (error.response) {
                    console.error('PHP API error data:', error.response.data);
                }
            });
        //PHP MAIL INTEGRATION 

        res.json({
            success: true,
            user: {
                _id: newUser._id,
                userName: newUser.userName,
                userEmail: newUser.userEmail,
                userPhone: newUser.userPhone
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Updated Send OTP endpoint with proper Nettyfish integration
router.post('/send-otp', async (req, res) => {
    const { userEmail, phone, userName, isSignUp } = req.body;

    if (!userEmail && !phone) {
        return res.status(400).json({ success: false, message: "Email or phone is required" });
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000);
    const otpKey = userEmail || phone;

    otpStore[otpKey] = {
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes expiry
        userName: userName || null
    };

    if (userEmail) {
        if (!IS_PRODUCTION) {
            console.log('=========================================');
            console.log('EMAIL OTP (Localhost Testing):');
            console.log(`Email: ${userEmail}`);
            console.log(`OTP: ${otp}`);
            console.log('=========================================');
        }

        // // Email OTP logic
        // const transporter = nodemailer.createTransport({
        //     service: 'gmail',
        //     auth: {
        //         user: emailID,
        //         pass: emailPwd
        //     }
        // });

        // const greetingName = userName || 'User';
        // const mailOptions = {
        //     from: emailID,
        //     to: userEmail,
        //     subject: 'Your OTP for Verification',
        //     html: `
        //         <div style='font-family: Montserrat; margin: 0 auto; padding:20px; border: 1px solid #ddd; border-radius:5px;width:max-content;'>
        //             <center>
        //                 <img src="https://www.adinnoutdoors.com/wp-content/uploads/2024/04/adinn-outdoor-final-logo.png" alt="adinn_logo" style="height:auto; width:auto; margin:0 auto;"/>
        //             </center>
        //             <h2 style="color: #333;">Hi ${greetingName}, Welcome to Adinn Outdoors!</h2>
        //             <div style="color:black; font-size:15px">Your One-Time Password (OTP) for verification : </div>
        //             <p style="font-weight:bold; font-size: 26px; gap:20px;">${otp}</p>
        //             <div style="color:black;font-size:15px">This is valid for 5 minutes</div>
        //         </div>
        //     `
        // };
        // transporter.sendMail(mailOptions, (error) => {
        //     if (error) {
        //         console.error(error);
        //         return res.status(500).json({ success: false, message: "Failed to send OTP via email" });
        //     }
        //     res.json({ success: true, message: "OTP sent to email" });
        // });

        let recipientName = userName;
        if (!isSignUp && !recipientName) {
            try {
                const user = await User.findOne({ userEmail: userEmail });
                if (user) {
                    recipientName = user.userName;
                } else {
                    recipientName = 'User'; // fallback (should not happen because we checked existence before)
                }
            } catch (err) {
                console.error("Error fetching user for login OTP:", err);
                recipientName = 'User';
            }
        } else if (!recipientName) {
            recipientName = 'User'; // fallback for signup if name missing
        }

        // Prepare payload for PHP mail API
        const mailPayloadLogin = {
            mailtype: 'login',
            userName: recipientName,
            userEmail: userEmail,
            otp: otp.toString(),
            userPhone: phone || '' // optional, may be used in template
        };
// const mailPayloadLogin =
//        {
// mailtype : "login",
// userName : "sathish",
// userEmail : "sathishdkofficial@gmail.com",
// otp : "1234"
// }

        // Non‑blocking call to PHP API (fire and forget)
        axios.post('https://adinndigital.com/api/index.php', mailPayloadLogin, {
            headers: { 'Content-Type': 'application/json' }

        })
            .then(response => {
                console.log('PHP login mail API responded:', response.data);
            })
            .catch(error => {
                console.error('Error calling PHP login mail API:', error.message);
                if (error.response) {
                    console.error('PHP API error data:', error.response.data);
                }
            });
        console.log('PHP Payload:', JSON.stringify(mailPayloadLogin));
        // Immediately respond to client (OTP already stored)
        return res.json({ success: true, message: "OTP sent to email" });
    } else if (phone) {
        if (IS_PRODUCTION) {

            // Nettyfish SMS OTP implementation - FIXED
            try {
                // Clean the phone number
                const mobileNumber = phone.replace(/\D/g, '');
                // Check if number has country code, if not add 91 for India
                const formattedNumber = mobileNumber.length === 10 ? `91${mobileNumber}` : mobileNumber;
                // Use the approved DLT template with the OTP variable properly formatted
                const message = `Welcome to Adinn Outdoors! Your verification code is ${otp}. Use this OTP to complete your verification. Please don't share it with anyone.`;
                // Construct the API URL with template ID
                const apiUrl = `https://retailsms.nettyfish.com/api/mt/SendSMS?APIKey=${NETTYFISH_API_KEY}&senderid=${NETTYFISH_SENDER_ID}&channel=Trans&DCS=0&flashsms=0&number=${formattedNumber}&dlttemplateid=${NETTYFISH_TEMPLATE_ID}&text=${encodeURIComponent(message)}&route=17`;
                console.log("Sending SMS via URL:", apiUrl);

                // Make the request to Nettyfish API
                request(apiUrl, { method: 'GET' }, (error, response, body) => {
                    if (error) {
                        console.error("Nettyfish API Error:", error);
                        return res.status(500).json({
                            success: false,
                            message: "Failed to send OTP via SMS",
                            error: error.message
                        });
                    }

                    console.log("Nettyfish API Response:", body);

                    // // Check if the response was successful
                    // if (response.statusCode === 200) {
                    //     console.log(`OTP ${otp} sent to ${phone}`);
                    //     res.json({ success: true, message: "OTP sent to phone" });
                    // } 


                    // Parse the response to check if it was successful
                    if (response.statusCode === 200) {
                        try {
                            const responseData = JSON.parse(body);
                            if (responseData.ErrorCode === "000") {
                                console.log(`OTP ${otp} sent to ${phone} via SMS`);
                                res.json({
                                    success: true,
                                    message: "OTP sent to phone via SMS"
                                });
                            } else {
                                console.error("Nettyfish API Error:", responseData.ErrorMessage);
                                res.status(500).json({
                                    success: false,
                                    message: "SMS gateway returned an error",
                                    apiError: responseData.ErrorMessage
                                });
                            }
                        } catch (parseError) {
                            console.error("Error parsing Nettyfish response:", parseError);
                            // Even if parsing fails, check if body contains success indicator
                            if (body && body.includes("Message Accepted")) {
                                console.log(`OTP ${otp} sent to ${phone} via SMS`);
                                res.json({
                                    success: true,
                                    message: "OTP sent to phone via SMS"
                                });
                            } else {
                                res.status(500).json({
                                    success: false,
                                    message: "Invalid response from SMS gateway",
                                    apiResponse: body
                                });
                            }
                        }
                    }


                    else {
                        console.error("Nettyfish API Non-200 Response:", body);
                        res.status(500).json({
                            success: false,
                            message: "SMS gateway returned an error",
                            apiResponse: body
                        });
                    }
                });
            } catch (error) {
                console.error("Error in SMS OTP sending:", error);
                res.status(500).json({
                    success: false,
                    message: "Internal server error while sending SMS OTP",
                    error: error.message
                });
            }
        }



        else {
            // DEVELOPMENT/LOCALHOST: Show OTP in console
            console.log('=========================================');
            console.log('OTP SENDING (Localhost Testing):');
            console.log('=========================================');
            console.log(`Phone: ${phone}`);
            console.log(`OTP: ${otp}`);
            console.log(`User: ${userName || 'Existing User'}`);
            console.log(`Mode: ${isSignUp ? 'Signup' : 'Login'}`);
            console.log('=========================================');
            console.log('NOTE: In production, this would be sent via SMS');
            console.log('=========================================');

            // For localhost testing, return success with test OTP
            res.json({
                success: true,
                message: "OTP sent to phone (check console for testing)",
                testOtp: otp // Include OTP for testing
            });
        }
    }
});

// // Verify OTP endpoint - FIXED user retrieval
// router.post('/verify-otp', async (req, res) => {
//     const { email, phone, otp } = req.body;
//     const otpKey = email || phone;

//     if (!otpKey || !otp) {
//         return res.status(400).json({ success: false, message: "Email/phone and OTP required" });
//     }

//     const storedData = otpStore[otpKey];

//     if (!storedData || Date.now() > storedData.expiresAt) {
//         return res.status(400).json({ success: false, message: "OTP expired or invalid" });
//     }

//     if (otp.toString() !== storedData.otp.toString()) {
//         return res.status(400).json({ success: false, message: "Invalid OTP" });
//     }
//     delete otpStore[otpKey]; // Clear OTP after verification

//     try {
//         // Find user by email OR phone (whichever was used for OTP)
//         let user;
//         if (email) {
//             user = await User.findOne({ userEmail: email });
//         } else if (phone) {
//             user = await User.findOne({ userPhone: phone });
//         }

//         res.json({
//             success: true,
//             verified: true,
//             user: user || null
//         });

//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: 'Server error' });
//     }
// });

// Verify OTP endpoint - UPDATED
router.post('/verify-otp', async (req, res) => {
    const { email, phone, otp } = req.body;
    const otpKey = email || phone;

    if (!otpKey || !otp) {
        return res.status(400).json({ success: false, message: "Email/phone and OTP required" });
    }

    const storedData = otpStore[otpKey];

    if (!storedData || Date.now() > storedData.expiresAt) {
        return res.status(400).json({ success: false, message: "OTP expired or invalid" });
    }

    if (otp.toString() !== storedData.otp.toString()) {
        return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
    delete otpStore[otpKey]; // Clear OTP after verification

    try {
        // Find user by email OR phone (whichever was used for OTP)
        let user;
        if (email) {
            user = await User.findOne({ userEmail: email });
        } else if (phone) {
            user = await User.findOne({ userPhone: phone });
        }

        if (!user) {
            return res.json({
                success: true,
                verified: true,
                user: null
            });
        }

        // FIXED: Return complete user object with _id
        res.json({
            success: true,
            verified: true,
            user: {
                _id: user._id,
                userName: user.userName,
                userEmail: user.userEmail,
                userPhone: user.userPhone
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;