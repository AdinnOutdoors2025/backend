const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcyrypt = require('bcryptjs');
// const adinnLogo = require('../first-app/public/images/adinn_logo.png');

const app = express();
const port = process.env.PORT || 3500;
const router = express.Router();


// MongoDB connection
// mongoose.connect('mongodb://127.0.0.1:27017/userLoginDetails');
// mongoose.connect('mongodb://localhost:27017/auth_demo'); 
//USER LOGIN DETAILS ARE STORED IN THIS COLLECTION / DATBASE
const UserSchema = new mongoose.Schema(
    {
        userName: { type: String, required: true },
        userEmail: { type: String, required: true, unique: true },
        userPhone: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }
);
const User = mongoose.model("User", UserSchema)

app.use(bodyParser.json());
app.use(cors());


const otpStore = {}; // Store OTPs temporarily

// Root endpoint
router.get('/', (req, res) => {
    res.send('Welcome to Email OTP Verification API');
});

// Check if user exists
router.post('/check-user', async (req, res) => {
    const { email, phone } = req.body;
    try {
        // const user = await User.findOne({ UserEmail:email });
        // res.json({ exists: !!user });
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
        // Check if user already exists
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
        // }
        // Check if phone already exists
        // if (userPhone) {
        const existingPhone = await User.findOne({ userPhone });
        if (existingPhone) {
            return res.status(400).json({
                error: 'Phone number already registered',
                suggestion: 'Try logging in or use a different phone number'

            });
        }
        // }
        // Create new user
        const newUser = new User({
            userName,
            userEmail,
            userPhone
        });

        await newUser.save();
        //Sent welcome mail to the User
        const transporter = nodemailer.createTransport(
            {
                service: 'gmail',
                auth: {
                    user: 'reactdeveloper@adinn.co.in',
                    pass: 'gxnn sezu klyp ifhn'
                }
            }
        );
        //Welcome Email to user
        const userMailOptions = {
            from: 'reactdeveloper@adinn.co.in',
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
        <a href="mailto:reactdeveloper@adinn.co.in" target="_blank"
            style="display: inline-block; width: 25px; height: 25px; margin:0px 5px;">
            <img src="https://cdn-icons-png.flaticon.com/512/5968/5968534.png" alt="Gmail"
                style="width: 100%; height: auto;">
        </a>
       </div>
    </div>
`
        };
        const adminMailOptions = {
            from: 'reactdeveloper@adinn.co.in',
            to: 'reactdeveloper@adinn.co.in',
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
        res.json({
            success: true,
            user: {
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



// Send OTP (works for both email and phone)
router.post('/send-otp', async (req, res) => {
    const { email, phone, userName } = req.body;

    if (!email && !phone) {
        return res.status(400).json({ success: false, message: "Email or phone is required" });
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000);
    const otpKey = email || phone;

    otpStore[otpKey] = {
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes expiry
                userName: userName || null // Store userName with OTP for verification

    };

    if (email) {
        // Send email OTP
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'reactdeveloper@adinn.co.in',
                pass: 'gxnn sezu klyp ifhn'
            }
        });


         // Use the userName in the email if available
        const greetingName = userName || 'User';
       // const adinnLogoUrl = 'https://ibb.co/LzHWxqHd'; // Use your actual hosted logo URL


        const mailOptions = {
            from: 'reactdeveloper@adinn.co.in',
            to: email,
            subject: 'Your OTP for Verification',
            html: `
    <div style='font-family: Montserrat; margin: 0 auto; padding:20px; border: 1px solid #ddd; border-radius:5px;width:max-content;'>
    <center>
            <img src="https://www.adinnoutdoors.com/wp-content/uploads/2024/04/adinn-outdoor-final-logo.png"  alt="adinn_logo" style="height:auto; width:auto; margin:0 auto;"/>
           </center>
            <h2 style="color: #333;">Hi ${greetingName}, Welcome to Adinn Outdoors!</h2>
            <div style="color:black; font-size:15px">Your One-Time Password (OTP) for verification : </div>
            <p style="font-weight:bold; font-size: 26px; gap:20px;">${otp}</p>
            <div style="color:black;font-size:15px">This is valid for 5 minutes</div>
    </div>
            `
        };

        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ success: false, message: "Failed to send OTP" });
            }
            res.json({ success: true, message: "OTP sent to email" });
        });
    } else if (phone) {
        // In a real router, integrate with SMS service like Twilio here
        console.log(`OTP for ${phone}: ${otp}`); // For development only
        res.json({ success: true, message: "OTP sent to phone" });
    }
});

// Verify OTP
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
        // Check if user exists


        let user;
        if (email) {
            user = await User.findOne({ userEmail: email });
        } else if (phone) {
            user = await User.findOne({ userPhone: phone });
        }

        res.json({
            success: true,
            verified: true,
            userExists: !!user,
            user: user || null
        });

        console.log(`Stored OTP: ${storedData.otp}, Received OTP: ${otp}`);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }

});

module.exports = router;  // Add this at the end
// // **Start the server**
// router.listen(port, () => {
//     console.log(`Server is running on port ${port}`);
// });