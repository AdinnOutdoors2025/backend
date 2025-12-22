const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const request = require('request');

// Import formatters
const { formatIndianCurrency, formatIndianDate, getCurrentIndianDate } = require('./FORMATTED.js');

const transporter = nodemailer.createTransport(
    {
        service: 'gmail',
        auth: {
            user: 'reactdeveloper@adinn.co.in',
            pass: 'gxnn sezu klyp ifhn'
        }
    }
);
// // STOPS THE SMS FOR TESTING PURPOSE 
// NettyFish SMS Configuration
const NETTYFISH_API_KEY = process.env.NETTYFISH_API_KEY || 'aspv58uRbkqDbhCcCN87Mw';
const NETTYFISH_SENDER_ID = process.env.NETTYFISH_SENDER_ID || 'ADINAD';
const NETTYFISH_BASE_URL = 'https://retailsms.nettyfish.com/api/mt/SendSMS';
const IS_PRODUCTION = process.env.NODE_ENV === 'production'; //NEWLY ADDED

// Function to send SMS using NettyFish API
const sendSMS = (phone, templateId, variables = {}) => {
    return new Promise((resolve, reject) => {
        // Format phone number (remove + and add 91 if not present)
        let formattedPhone = phone.replace('+', '');
        if (!formattedPhone.startsWith('91')) {
            formattedPhone = '91' + formattedPhone;
        }

        // Prepare text with variables
        let text = "";
        switch (templateId) {
            case "1007197121174928712": // User template
                text = `Thank you for your order with Adinn Outdoors! We've received it successfully. Your order ID is ${variables.orderId}.`;
                break;
            // case "1007478982147905431": // Admin template
            //     text = `New order received! Order ID: ${variables.orderId}. Customer: ${variables.customerName}.`;
            //     break;
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



router.post('/send-sms', async (req, res) => {
    try {
        const { phone, orderId, customerName, amount } = req.body;
        
        if (!phone || !orderId) {
            return res.status(400).json({ 
                success: false, 
                error: "Phone and Order ID are required" 
            });
        }

        // Format phone number (remove + and add 91 if not present)
        let formattedPhone = phone.replace('+', '');
        if (!formattedPhone.startsWith('91')) {
            formattedPhone = '91' + formattedPhone;
        }

        // User template ID - FIXED VALUE
        const USER_TEMPLATE_ID = "1007197121174928712";
        
        // Prepare SMS text for user
        const smsText = `Thank you for your order with Adinn Outdoors! We've received it successfully. Your order ID is ${orderId}.`;
        
        const encodedText = encodeURIComponent(smsText);
        const url = `https://retailsms.nettyfish.com/api/mt/SendSMS?APIKey=aspv58uRbkqDbhCcCN87Mw&senderid=ADINAD&channel=Trans&DCS=0&flashsms=0&number=${formattedPhone}&dlttemplateid=${USER_TEMPLATE_ID}&text=${encodedText}&route=17`;

        // For production, uncomment the actual SMS sending
        if (process.env.NODE_ENV === 'production') {
            request.get(url, (error, response, body) => {
                if (error) {
                    console.error("SMS API Error:", error);
                    return res.status(500).json({ 
                        success: false, 
                        error: "SMS sending failed" 
                    });
                } else {
                    try {
                        const result = JSON.parse(body);
                        if (result.ErrorCode === '000') {
                            console.log("SMS sent successfully:", result);
                            return res.json({ 
                                success: true, 
                                message: "SMS sent successfully" 
                            });
                        } else {
                            console.error("SMS API Error:", result.ErrorMessage);
                            return res.status(400).json({ 
                                success: false, 
                                error: result.ErrorMessage 
                            });
                        }
                    } catch (parseError) {
                        console.error("SMS Parse Error:", parseError);
                        return res.status(500).json({ 
                            success: false, 
                            error: "Failed to parse SMS response" 
                        });
                    }
                }
            });
        } else {
            // For development/local testing
            console.log('=========================================');
            console.log('SMS Testing Information (Development):');
            console.log('=========================================');
            console.log(`To: ${formattedPhone}`);
            console.log(`Template ID: ${USER_TEMPLATE_ID}`);
            console.log(`Order ID: ${orderId}`);
            console.log(`Customer: ${customerName}`);
            console.log(`Amount: ₹${amount || 0}`);
            console.log(`Message: ${smsText}`);
            console.log('=========================================');
            
            return res.json({ 
                success: true, 
                message: "SMS would be sent in production",
                debug: {
                    phone: formattedPhone,
                    templateId: USER_TEMPLATE_ID,
                    orderId,
                    customerName,
                    amount
                }
            });
        }
    } catch (error) {
        console.error("Error in send-sms route:", error);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
}); 





// // STOPS THE SMS FOR TESTING PURPOSE
router.post('/send-order-confirmation', async (req, res) => {
    try {  
        const {
            orderId, userName, userEmail, userPhone, userAddress, company, products, orderDate, totalAmount
        } = req.body;
    
        if (!products || !Array.isArray(products)) {
            throw new Error("Invalid products data");
        }

         // Parse totalAmount to ensure it's a number
        const parsedTotalAmount = typeof totalAmount === 'number' ? 
            totalAmount : 
            parseFloat(totalAmount) || 0;

        console.log("Raw totalAmount:", totalAmount);
        console.log("Parsed totalAmount:", parsedTotalAmount);
        console.log("Type of totalAmount:", typeof totalAmount);


        // Generate product details HTML
        const generateProductDetailsHTML = (products) => {
            return products.map((product, index) => 
          {


             // Parse product amounts
                const productPrice = typeof product.price === 'number' ? 
                    product.price : 
                    parseFloat(product.price) || 0;
                
                const bookingTotalPrice = product.booking?.totalPrice ? 
                    (typeof product.booking.totalPrice === 'number' ? 
                        product.booking.totalPrice : 
                        parseFloat(product.booking.totalPrice) || 0) : 
                    0;

 // Use product.image if available, otherwise use a placeholder
        const productImage = product.image;
        const startDate = formatIndianDate(product.booking?.startDate);
        const endDate = formatIndianDate(product.booking?.endDate);
        const pricePerDay = formatIndianCurrency(product.price || 0);
        const totalPrice = formatIndianCurrency(product.booking?.totalPrice || 0);



            return `
             
        <!-- Product 1 -->
        <table width="100%" cellpadding="0" cellspacing="0"
            style="border-bottom:2px solid #C4C1C1; margin-bottom:20px; padding-bottom:20px;">
            <tr>
                <td width="120">
                    <img src="${productImage}"
                        style="height:90px;width:90px;border-radius:10px;">
                </td>
                <td>
                    <table style="font-size:16px;">
                        <tr><td>Product Name</td><td>:</td><td>${product.name}</td></tr>
                        <tr><td>Product Code</td><td>:</td><td> ${product.prodCode}</td></tr>
                         <tr><td>Price Per Day</td><td>:</td><td> ${pricePerDay}</td></tr>
                        <tr><td>Booked Dates</td><td>:</td><td> ${startDate} - ${endDate}</td></tr>
                        <tr><td>Total Days</td><td>:</td><td> ${product.booking?.totalDays || 0}</td></tr>
                        <tr><td>Total Price</td><td>:</td><td> ${totalPrice}</td></tr>
                    </table>
                </td>
            </tr>
        </table>

       
            `
          }
        
        ).join('');
        };


        console.log("Sending notifications for order:", orderId);
        console.log("Client data:", { orderId, userName, userEmail, userPhone, userAddress, company, orderDate, totalAmount : parsedTotalAmount} );

        // Format total amount for display
        const formattedTotalAmount = formatIndianCurrency(parsedTotalAmount);
        const currentDate = getCurrentIndianDate();
        
        console.log("FORMATTED TOTAL AMOUNT FROM USER SIDE:", formattedTotalAmount);

        const userMailHtmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>User Email</title>
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
            Order Confirmation – Thank You for Choosing Us
        </div>

        <!-- Intro -->
        <div style="font-size:24px; font-weight:600; margin:30px 0;">Hi ${userName},</div>

        <!-- Order Details Table -->
        <div style="margin:30px 0;">
            <table border="1" cellpadding="0" cellspacing="0"
                style="border-collapse:collapse; width:100%; border:1px solid gray; text-align:center;">
                <thead>
                    <tr style="color:#E31F25; font-weight:600; font-size:20px;">
                        <th style="padding:12px;">Order ID</th>
                        <th style="padding:12px;">Order Date</th>
                        <th style="padding:12px;">Total Items</th>
                        <th style="padding:12px;">Total Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding:12px;"> ${orderId}</td>
                        <td style="padding:12px;"> ${currentDate}</td>
                        <td style="padding:12px;"> ${products.length}</td>
                        <td style="padding:12px; font-weight:600; color:#2ecc71;">${formattedTotalAmount}</td>
                    </tr>
                </tbody>
            </table>
        </div>

<div>
 ${generateProductDetailsHTML(products)}
</div>



        <!-- Message -->
        <div style="font-size:20px; margin:30px 0;">
            We’ve received your request, and our team will reach out within the next 15 hours.  
            If you need to update anything, contact us below:
        </div>

        <div style="font-size:20px;"><strong>Email :</strong> 
          <a href="mailto:Vinothkumar@adinn.co.in" style="color:#2B3333; text-decoration:none;">
                                        Vinothkumar@adinn.co.in
                                    </a>
        </div>
        <div style="font-size:20px;"><strong>Phone :</strong> 

                                    <a href="tel:7373785057" style="color:#2B3333; text-decoration:none;">7373785057</a> |
                                    <a href="tel:9626987861" style="color:#2B3333; text-decoration:none;">9626987861</a>         
        </div>

        <div style="font-size:20px; margin:20px 0;">
            <div>We’re here to help.</div>
            <div>Thank you.</div>
        </div>


        <!-- FOOTER (Email-Safe Version) -->
        <table width="100%" cellpadding="0" cellspacing="0" 
            background="https://www.adinntechnologies.com/images/FooterBannerImgEmail.png"
            style="
            background-size:cover; 
            background-repeat:no-repeat; 
            text-align:center; 
            padding:50px 0;
            "
            >

            <tr>
                <td align="center">

                    <!-- Thank You Message -->
                    <table align="center" width="65%" cellpadding="0" cellspacing="0"
                     style="margin-left: 20%;"   >
                        <tr>
                            <td align="center" style="font-size:24px; font-weight:500; color:#2B3333; ">
                                <img src="https://www.adinntechnologies.com/images/FooterThankIconEmail.png"
                                    style="width:30px; vertical-align:middle;">
                                <span style="color:#E31F25;font-weight:700;">Thank you</span> for choosing us - we’re
                                here to keep you happy, steady and ready.
                            </td>
                        </tr>
                    </table>

                    <!-- Footer 3 columns -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:40px;">

                        <tr>
                            <!-- Column 1 -->
                            <td width="33%" valign="top" style="padding:10px;">
                                <img src="https://www.adinnoutdoors.com/wp-content/uploads/2024/04/adinn-outdoor-final-logo.png"
                                    style="height:40px;">

                                <!-- Social -->
                                <div style="margin:20px 0;">
                                    <img src="https://www.adinntechnologies.com/images/FootSocIcon1.png"
                                        style="height:35px; margin:0 2px;">
                                    <img src="https://www.adinntechnologies.com/images/FootSocIcon2.png"
                                        style="height:35px; margin:0 2px;">
                                    <img src="https://www.adinntechnologies.com/images/FootSocIcon3.png"
                                        style="height:35px; margin:0 2px;">
                                    <img src="https://www.adinntechnologies.com/images/FootSocIcon4.png"
                                        style="height:35px; margin:0 2px;">
                                    <img src="https://www.adinntechnologies.com/images/FootSocIcon5.png"
                                        style="height:35px; margin:0 2px;">
                                </div>

                                <div style="font-size:14px; color:#2B3333;">
                                    <a href="tel:7373785057" style="color:#2B3333; text-decoration:none;">7373785057</a> |
                                    <a href="tel:9626987861" style="color:#2B3333; text-decoration:none;">9626987861</a>
                                </div>
                                <div style="font-size:14px; margin-top:10px;">
                                    <a href="mailto:ba@adinn.co.in" style="color:#2B3333; text-decoration:none;">
                                        ba@adinn.co.in
                                    </a>
                                </div>
                            </td>

                            <!-- Column 2 -->
                            <td width="33%" valign="top" style="padding:10px; padding-left: 50px; font-size:15px;">
                                <div style="font-weight:700; margin-bottom:10px;">Services</div>
                                <div style="margin: 10px 0px;">3D & Cutouts</div>
                                <div style="margin: 10px 0px;">Dynamic Advertising</div>
                                <div style="margin: 10px 0px;">Geo Targeting</div>
                                <div style="margin: 10px 0px;">Innovation</div>
                                <div style="margin: 10px 0px;">Traditional</div>
                                <div style="margin: 10px 0px;">Wall Painting</div>
                            </td>

                            <!-- Column 3 -->
                            <td width="33%" valign="top" style="padding:10px; font-size:15px;">
                                <div style="font-weight:700; margin-bottom:10px;">Address</div>
                                29, 1st Cross Street, Vanamamalai Nagar,<br>
                                <span style="font-weight:700;">Madurai-625010</span><br><br>

                                Door No.3, Vijayalakshmi Street,<br>
                                Nungambakkam,<br>
                                <span style="font-weight:700;">Chennai – 600034</span><br><br>

                                Old No.76, New No.976,<br>
                                Rajarajeswari Nagar,<br>
                                <span style="font-weight:700;">Bangalore – 560038</span>
                            </td>

                        </tr>
                    </table>

                    <div style="color:#FFFFFF; font-size:14px; margin-top:30px;">
                        Copyright © 2025 Adinn Outdoors. All Rights Reserved.
                    </div>

                </td>
            </tr>

        </table>

    </div>

</body>
</html>

    
        
        
//         `


        const adminMailHtmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <title>Admin Email</title>
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
        A new order has been received from a customer
        </div>

        <!-- Intro -->
        <div style="font-size:24px; font-weight:600; margin:30px 0;">Hi Admin,</div>

        <!-- Order Details Table -->
        <div style="margin:30px 0;">
        <table border="1" cellpadding="0" cellspacing="0"
        style="border-collapse:collapse; width:100%; border:1px solid gray; text-align:center;">
        <thead>
            <tr style="color:#E31F25; font-weight:600; font-size:20px;">
                <th style="padding:12px;">Order ID</th>
                <th style="padding:12px;">Order Date</th>
                <th style="padding:12px;">Total Items</th>
                <th style="padding:12px;">Total Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="padding:12px;"> ${orderId}</td>
                <td style="padding:12px;"> ${currentDate}</td>
                <td style="padding:12px;"> ${products.length}</td>
                <td style="padding:12px; font-weight:600; color:#2ecc71;"> ${formattedTotalAmount}</td>
            </tr>
        </tbody>
        </table>
        </div>

        <div>
        ${generateProductDetailsHTML(products)}
        </div>

        <!-- Message -->
        <div style="font-size:20px; margin:30px 0;">
        Please review the order and contact the customer within 15 hours. <br>
        If any corrections or updates are needed, please reach out to the customer using the provided contact details.
        </div>

        <!-- CUSTOMER DETAILS -->
        <div style="margin:30px 0;">
        <h3>Customer Details : </h3>
        <table border="1" cellpadding="0" cellspacing="0"
        style="border-collapse:collapse; width:100%; border:1px solid gray; text-align:center;">
        <thead>
            <tr style="color:#E31F25; font-weight:600; font-size:20px;">
                <th style="padding:12px;">Name</th>
                <th style="padding:12px;">Email</th>
                <th style="padding:12px;">Phone</th>
                <th style="padding:12px;">Company</th>
                <th style="padding:12px;">Address</th>

            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="padding:12px;">${userName}</td>
                <td style="padding:12px;">${userEmail}</td>
                <td style="padding:12px;"><a href='tel:${userPhone}' style="text-decoration:none; color:black;"> ${userPhone} </a></td>
                <td style="padding:12px;">${company}</td>
                <td style="padding:12px;">${userAddress}</td>

            </tr>
        </tbody>
        </table>
        </div>


        <div style="font-size:20px; margin:20px 0;">
        <div>Thank you.</div>
        <div>Adinn Outdoors</div>
        </div>

        <!-- FOOTER -->
        <table width="100%" cellpadding="0" cellspacing="0"
        background="https://www.adinntechnologies.com/images/FooterBannerImgEmail.png" style="
        background-size:cover; 
        background-repeat:no-repeat; 
        text-align:center; 
        padding:50px 0;
        ">
        <tr>
        <td align="center">
            <!-- Thank You Message -->
            <table align="center" width="65%" cellpadding="0" cellspacing="0" style="margin-left: 20%;">
                <tr>
                    <td align="center" style="font-size:24px; font-weight:500; color:#2B3333; ">
                        <img src="https://www.adinntechnologies.com/images/FooterThankIconEmail.png"
                            style="width:30px; vertical-align:middle;">
                        <span style="color:#E31F25;font-weight:700;">Thank you</span> for choosing us - we're
                        here to keep you happy, steady and ready.
                    </td>
                </tr>
            </table>

            <!-- Footer 3 columns -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:40px;">
                <tr>
                    <!-- Column 1 -->
                    <td width="33%" valign="top" style="padding:10px;">
                        <img src="https://www.adinnoutdoors.com/wp-content/uploads/2024/04/adinn-outdoor-final-logo.png"
                            style="height:40px;">

                        <!-- Social -->
                        <div style="margin:20px 0;">
                            <img src="https://www.adinntechnologies.com/images/FootSocIcon1.png"
                                style="height:35px; margin:0 2px;">
                            <img src="https://www.adinntechnologies.com/images/FootSocIcon2.png"
                                style="height:35px; margin:0 2px;">
                            <img src="https://www.adinntechnologies.com/images/FootSocIcon3.png"
                                style="height:35px; margin:0 2px;">
                            <img src="https://www.adinntechnologies.com/images/FootSocIcon4.png"
                                style="height:35px; margin:0 2px;">
                            <img src="https://www.adinntechnologies.com/images/FootSocIcon5.png"
                                style="height:35px; margin:0 2px;">
                        </div>

                        <div style="font-size:14px; color:#2B3333;">
                            <a href="tel:7373785057" style="color:#2B3333; text-decoration:none;">7373785057</a> |
                            <a href="tel:9626987861" style="color:#2B3333; text-decoration:none;">9626987861</a>
                        </div>
                        <div style="font-size:14px; margin-top:10px;">
                            <a href="mailto:ba@adinn.co.in" style="color:#2B3333; text-decoration:none;">
                                ba@adinn.co.in
                            </a>
                        </div>
                    </td>

                    <!-- Column 2 -->
                    <td width="33%" valign="top" style="padding:10px; padding-left: 50px; font-size:15px;">
                        <div style="font-weight:700; margin-bottom:10px;">Services</div>
                        <div style="margin: 10px 0px;">3D & Cutouts</div>
                        <div style="margin: 10px 0px;">Dynamic Advertising</div>
                        <div style="margin: 10px 0px;">Geo Targeting</div>
                        <div style="margin: 10px 0px;">Innovation</div>
                        <div style="margin: 10px 0px;">Traditional</div>
                        <div style="margin: 10px 0px;">Wall Painting</div>
                    </td>

                    <!-- Column 3 -->
                    <td width="33%" valign="top" style="padding:10px; font-size:15px;">
                        <div style="font-weight:700; margin-bottom:10px;">Address</div>
                        29, 1st Cross Street, Vanamamalai Nagar,<br>
                        <span style="font-weight:700;">Madurai-625010</span><br><br>

                        Door No.3, Vijayalakshmi Street,<br>
                        Nungambakkam,<br>
                        <span style="font-weight:700;">Chennai – 600034</span><br><br>

                        Old No.76, New No.976,<br>
                        Rajarajeswari Nagar,<br>
                        <span style="font-weight:700;">Bangalore – 560038</span>
                    </td>
                </tr>
            </table>

            <div style="color:#FFFFFF; font-size:14px; margin-top:30px;">
                Copyright © 2025 Adinn Outdoors. All Rights Reserved.
            </div>
        </td>
        </tr>
        </table>
        </div>
        </body>
        </html>
//         `;

        //User Email
        const userMailOptions = {
            from: 'reactdeveloper@adinn.co.in',
            to: userEmail,
            subject: `Order Confirmation - ${orderId}`,
            html: userMailHtmlTemplate
        }
        // Admin email
        const adminMailOptions = {
            from: 'reactdeveloper@adinn.co.in',
            to: 'reactdeveloper@adinn.co.in',
            subject: `New Order Received - #${orderId} Action Required`,
            html: adminMailHtmlTemplate
            
          
        };
        // Send both emails
        await transporter.sendMail(userMailOptions);
        await transporter.sendMail(adminMailOptions);

        
// // STOPS THE SMS FOR TESTING PURPOSE 

if (IS_PRODUCTION) {
        // Send SMS to user
        try {
            await sendSMS(userPhone, "1007197121174928712", { orderId });
            console.log("User SMS sent successfully");
        } catch (smsError) {
            console.error("Failed to send user SMS:", smsError);
            // Don't fail the request if SMS fails
        }

        // // Send SMS to admin
        // try {
        //     await sendSMS('reactdeveloper@adinn.co.in', "1007478982147905431", {
        //         orderId,
        //         customerName: userName,
        //         amount: parsedTotalAmount
        //     });
        //     console.log("Admin SMS sent successfully");
        // } catch (smsError) {
        //     console.error("Failed to send admin SMS:", smsError);
        //     // Don't fail the request if SMS fails
        // }
}
// // STOPS THE SMS FOR TESTING PURPOSE 

// Log SMS information to console for testing
else{
        console.log('=========================================');
        console.log('OTP/SMS Testing Information (localhost):');
        console.log('=========================================');
        console.log(`Order ID: ${orderId}`);
        console.log(`Client: ${userName}, Phone: ${userPhone}, Email: ${userEmail},Total Amount: ₹${totalAmount.toLocaleString()} `);
        console.log('=========================================');
        // Product details
if (products && products.length > 0) {
    console.log('--- Product Details ---');
    products.forEach((product, index) => {
        console.log(`Product ${index + 1}:`);
        console.log(`  - Name: ${product.name}`);
        console.log(`  - Product Code: ${product.prodCode}`);
        console.log(`  - Price per day: ₹${product.price.toLocaleString()}`);
        console.log(`  - Total Days: ${product.booking?.totalDays || 'N/A'}`);
        console.log(`  - Booking Dates: ${product.booking?.startDate ? new Date(product.booking.startDate).toLocaleDateString() : 'N/A'} - ${product.booking?.endDate ? new Date(product.booking.endDate).toLocaleDateString() : 'N/A'}`);
    });
}
        console.log('NOTE: SMS functionality is disabled for localhost testing');
        console.log('Emails have been sent successfully');
        console.log('=========================================');

        res.json({ success: true });
}
    }
    catch (error) {
        console.error("Error sending Emails:", error);
        res.status(500).json({ success: false, error: "Failed to send emails" });
    }
});

module.exports = router;







// const express = require('express');
// const nodemailer = require('nodemailer');
// const router = express.Router();
// const request = require('request');

// // Import formatters
// const { formatIndianCurrency, formatIndianDate, getCurrentIndianDate } = require('./FORMATTED.js');

// const transporter = nodemailer.createTransport(
//     {
//         service: 'gmail',
//         auth: {
//             user: 'reactdeveloper@adinn.co.in',
//             pass: 'gxnn sezu klyp ifhn'
//         }
//     }
// );

// // NettyFish SMS Configuration
// const NETTYFISH_API_KEY = process.env.NETTYFISH_API_KEY || 'aspv58uRbkqDbhCcCN87Mw';
// const NETTYFISH_SENDER_ID = process.env.NETTYFISH_SENDER_ID || 'ADINAD';
// const NETTYFISH_BASE_URL = 'https://retailsms.nettyfish.com/api/mt/SendSMS';

// // Function to send SMS using NettyFish API
// const sendSMS = (phone, templateId, variables = {}) => {
//     return new Promise((resolve, reject) => {
//         // Format phone number (remove + and add 91 if not present)
//         let formattedPhone = phone.replace('+', '');
//         if (!formattedPhone.startsWith('91')) {
//             formattedPhone = '91' + formattedPhone;
//         }

//         // Prepare text with variables
//         let text = "";
//         switch (templateId) {
//             case "1007197121174928712": // User template
//                 text = `Thank you for your order with Adinn Outdoors! We've received it successfully. Your order ID is ${variables.orderId}.`;
//                 break;
//             // case "1007478982147905431": // Admin template
//             //     text = `New order received! Order ID: ${variables.orderId}. Customer: ${variables.customerName}.`;
//             //     break;
//             default:
//                 text = variables.text || "";
//         }

//         const encodedText = encodeURIComponent(text);
//         const url = `${NETTYFISH_BASE_URL}?APIKey=${NETTYFISH_API_KEY}&senderid=${NETTYFISH_SENDER_ID}&channel=Trans&DCS=0&flashsms=0&number=${formattedPhone}&dlttemplateid=${templateId}&text=${encodedText}&route=17`;

//         request.get(url, (error, response, body) => {
//             if (error) {
//                 console.error("SMS API Error:", error);
//                 reject(error);
//             } else {
//                 try {
//                     const result = JSON.parse(body);
//                     if (result.ErrorCode === '000') {
//                         console.log("SMS sent successfully:", result);
//                         resolve(result);
//                     } else {
//                         console.error("SMS API Error:", result.ErrorMessage);
//                         reject(new Error(result.ErrorMessage || 'Failed to send SMS'));
//                     }
//                 } catch (parseError) {
//                     console.error("SMS Parse Error:", parseError);
//                     reject(parseError);
//                 }
//             }
//         });
//     });
// };
// //NEWLY ADDED
// router.post('/send-sms', async (req, res) => {
//     try {
//         const { phone, templateId, variables } = req.body;
        
//         if (!phone || !templateId) {
//             return res.status(400).json({ 
//                 success: false, 
//                 error: "Phone and templateId are required" 
//             });
//         }

//         console.log("SMS Request received:", { phone, templateId, variables });
        
//         // Only send user SMS (templateId: 1007197121174928712)
//         // Don't send admin SMS (templateId: 1007478982147905431)
//         if (templateId === "1007197121174928712") {
//             await sendSMS(phone, templateId, variables);
//             res.json({ 
//                 success: true, 
//                 message: 'User SMS sent successfully' 
//             });
//         } else {
//             // For admin template or any other template, just log but don't send
//             console.log(`[SMS Skipped] Template ${templateId} would be sent to ${phone}`);
//             console.log(`[SMS Skipped] Variables:`, variables);
//             res.json({ 
//                 success: true, 
//                 message: 'SMS skipped (not a user template)' 
//             });
//         }
        
//     } catch (error) {
//         console.error("Error in send-sms endpoint:", error);
//         res.status(500).json({ 
//             success: false, 
//             error: "Failed to send SMS",
//             details: error.message 
//         });
//     }
// });

// router.post('/send-order-confirmation', async (req, res) => {
//     try {  
//         const {
//             orderId, userName, userEmail, userPhone, userAddress, company, products, orderDate, totalAmount
//         } = req.body;
    
//         if (!products || !Array.isArray(products)) {
//             throw new Error("Invalid products data");
//         }

//         // Parse totalAmount to ensure it's a number
//         const parsedTotalAmount = typeof totalAmount === 'number' ? 
//             totalAmount : 
//             parseFloat(totalAmount) || 0;

//         console.log("Sending notifications for order:", orderId);

//         // Generate product details HTML
//         const generateProductDetailsHTML = (products) => {
//             return products.map((product, index) => {
//                 const productImage = product.image;
//                 const startDate = formatIndianDate(product.booking?.startDate);
//                 const endDate = formatIndianDate(product.booking?.endDate);
//                 const pricePerDay = formatIndianCurrency(product.price || 0);
//                 const totalPrice = formatIndianCurrency(product.booking?.totalPrice || 0);

//                 return `
//                     <!-- Product ${index + 1} -->
//                     <table width="100%" cellpadding="0" cellspacing="0"
//                         style="border-bottom:2px solid #C4C1C1; margin-bottom:20px; padding-bottom:20px;">
//                         <tr>
//                             <td width="120">
//                                 <img src="${productImage}"
//                                     style="height:90px;width:90px;border-radius:10px;">
//                             </td>
//                             <td>
//                                 <table style="font-size:16px;">
//                                     <tr><td>Product Name</td><td>:</td><td>${product.name}</td></tr>
//                                     <tr><td>Product Code</td><td>:</td><td> ${product.prodCode}</td></tr>
//                                     <tr><td>Price Per Day</td><td>:</td><td> ${pricePerDay}</td></tr>
//                                     <tr><td>Booked Dates</td><td>:</td><td> ${startDate} - ${endDate}</td></tr>
//                                     <tr><td>Total Days</td><td>:</td><td> ${product.booking?.totalDays || 0}</td></tr>
//                                     <tr><td>Total Price</td><td>:</td><td> ${totalPrice}</td></tr>
//                                 </table>
//                             </td>
//                         </tr>
//                     </table>
//                 `;
//             }).join('');
//         };

//         // Format total amount for display
//         const formattedTotalAmount = formatIndianCurrency(parsedTotalAmount);
//         const currentDate = getCurrentIndianDate();

       
//         const userMailHtmlTemplate = `
// <!DOCTYPE html>
// <html>
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width,initial-scale=1.0">
//     <title>User Email</title>
// </head>

// <body style="margin:0; padding:0; font-family: Arial, sans-serif;">

//     <div style="max-width:700px; margin:auto; font-family:'Montserrat', Arial, sans-serif;">

//         <!-- Logo -->
//         <img src="https://www.adinnoutdoors.com/wp-content/uploads/2024/04/adinn-outdoor-final-logo.png"
//             alt="Adinn Logo" style="height:50px; margin-bottom:15px;">

//         <!-- Header -->
//         <div style="
//             text-align:center;
//             padding:20px 0;
//             background: linear-gradient(180deg,#00573F 0%,#12AC81 100%);
//             font-weight:700;
//             font-size:35px;
//             color:#FFFFFF;">
//             Order Confirmation – Thank You for Choosing Us
//         </div>

//         <!-- Intro -->
//         <div style="font-size:24px; font-weight:600; margin:30px 0;">Hi ${userName},</div>

//         <!-- Order Details Table -->
//         <div style="margin:30px 0;">
//             <table border="1" cellpadding="0" cellspacing="0"
//                 style="border-collapse:collapse; width:100%; border:1px solid gray; text-align:center;">
//                 <thead>
//                     <tr style="color:#E31F25; font-weight:600; font-size:20px;">
//                         <th style="padding:12px;">Order ID</th>
//                         <th style="padding:12px;">Order Date</th>
//                         <th style="padding:12px;">Total Items</th>
//                         <th style="padding:12px;">Total Amount</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//                     <tr>
//                         <td style="padding:12px;"> ${orderId}</td>
//                         <td style="padding:12px;"> ${currentDate}</td>
//                         <td style="padding:12px;"> ${products.length}</td>
//                         <td style="padding:12px; font-weight:600; color:#2ecc71;">${formattedTotalAmount}</td>
//                     </tr>
//                 </tbody>
//             </table>
//         </div>

// <div>
//  ${generateProductDetailsHTML(products)}
// </div>



//         <!-- Message -->
//         <div style="font-size:20px; margin:30px 0;">
//             We’ve received your request, and our team will reach out within the next 15 hours.  
//             If you need to update anything, contact us below:
//         </div>

//         <div style="font-size:20px;"><strong>Email :</strong> 
//           <a href="mailto:Vinothkumar@adinn.co.in" style="color:#2B3333; text-decoration:none;">
//                                         Vinothkumar@adinn.co.in
//                                     </a>
//         </div>
//         <div style="font-size:20px;"><strong>Phone :</strong> 

//                                     <a href="tel:7373785057" style="color:#2B3333; text-decoration:none;">7373785057</a> |
//                                     <a href="tel:9626987861" style="color:#2B3333; text-decoration:none;">9626987861</a>         
//         </div>

//         <div style="font-size:20px; margin:20px 0;">
//             <div>We’re here to help.</div>
//             <div>Thank you.</div>
//         </div>


//         <!-- FOOTER (Email-Safe Version) -->
//         <table width="100%" cellpadding="0" cellspacing="0" 
//             background="https://www.adinntechnologies.com/images/FooterBannerImgEmail.png"
//             style="
//             background-size:cover; 
//             background-repeat:no-repeat; 
//             text-align:center; 
//             padding:50px 0;
//             "
//             >

//             <tr>
//                 <td align="center">

//                     <!-- Thank You Message -->
//                     <table align="center" width="65%" cellpadding="0" cellspacing="0"
//                      style="margin-left: 20%;"   >
//                         <tr>
//                             <td align="center" style="font-size:24px; font-weight:500; color:#2B3333; ">
//                                 <img src="https://www.adinntechnologies.com/images/FooterThankIconEmail.png"
//                                     style="width:30px; vertical-align:middle;">
//                                 <span style="color:#E31F25;font-weight:700;">Thank you</span> for choosing us - we’re
//                                 here to keep you happy, steady and ready.
//                             </td>
//                         </tr>
//                     </table>

//                     <!-- Footer 3 columns -->
//                     <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:40px;">

//                         <tr>
//                             <!-- Column 1 -->
//                             <td width="33%" valign="top" style="padding:10px;">
//                                 <img src="https://www.adinnoutdoors.com/wp-content/uploads/2024/04/adinn-outdoor-final-logo.png"
//                                     style="height:40px;">

//                                 <!-- Social -->
//                                 <div style="margin:20px 0;">
//                                     <img src="https://www.adinntechnologies.com/images/FootSocIcon1.png"
//                                         style="height:35px; margin:0 2px;">
//                                     <img src="https://www.adinntechnologies.com/images/FootSocIcon2.png"
//                                         style="height:35px; margin:0 2px;">
//                                     <img src="https://www.adinntechnologies.com/images/FootSocIcon3.png"
//                                         style="height:35px; margin:0 2px;">
//                                     <img src="https://www.adinntechnologies.com/images/FootSocIcon4.png"
//                                         style="height:35px; margin:0 2px;">
//                                     <img src="https://www.adinntechnologies.com/images/FootSocIcon5.png"
//                                         style="height:35px; margin:0 2px;">
//                                 </div>

//                                 <div style="font-size:14px; color:#2B3333;">
//                                     <a href="tel:7373785057" style="color:#2B3333; text-decoration:none;">7373785057</a> |
//                                     <a href="tel:9626987861" style="color:#2B3333; text-decoration:none;">9626987861</a>
//                                 </div>
//                                 <div style="font-size:14px; margin-top:10px;">
//                                     <a href="mailto:ba@adinn.co.in" style="color:#2B3333; text-decoration:none;">
//                                         ba@adinn.co.in
//                                     </a>
//                                 </div>
//                             </td>

//                             <!-- Column 2 -->
//                             <td width="33%" valign="top" style="padding:10px; padding-left: 50px; font-size:15px;">
//                                 <div style="font-weight:700; margin-bottom:10px;">Services</div>
//                                 <div style="margin: 10px 0px;">3D & Cutouts</div>
//                                 <div style="margin: 10px 0px;">Dynamic Advertising</div>
//                                 <div style="margin: 10px 0px;">Geo Targeting</div>
//                                 <div style="margin: 10px 0px;">Innovation</div>
//                                 <div style="margin: 10px 0px;">Traditional</div>
//                                 <div style="margin: 10px 0px;">Wall Painting</div>
//                             </td>

//                             <!-- Column 3 -->
//                             <td width="33%" valign="top" style="padding:10px; font-size:15px;">
//                                 <div style="font-weight:700; margin-bottom:10px;">Address</div>
//                                 29, 1st Cross Street, Vanamamalai Nagar,<br>
//                                 <span style="font-weight:700;">Madurai-625010</span><br><br>

//                                 Door No.3, Vijayalakshmi Street,<br>
//                                 Nungambakkam,<br>
//                                 <span style="font-weight:700;">Chennai – 600034</span><br><br>

//                                 Old No.76, New No.976,<br>
//                                 Rajarajeswari Nagar,<br>
//                                 <span style="font-weight:700;">Bangalore – 560038</span>
//                             </td>

//                         </tr>
//                     </table>

//                     <div style="color:#FFFFFF; font-size:14px; margin-top:30px;">
//                         Copyright © 2025 Adinn Outdoors. All Rights Reserved.
//                     </div>

//                 </td>
//             </tr>

//         </table>

//     </div>

// </body>
// </html>

    
        
//              `


//         const adminMailHtmlTemplate = `
//         <!DOCTYPE html>
//         <html>
//         <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width,initial-scale=1.0">
//         <title>Admin Email</title>
//         </head>

//         <body style="margin:0; padding:0; font-family: Arial, sans-serif;">

//         <div style="max-width:700px; margin:auto; font-family:'Montserrat', Arial, sans-serif;">

//         <!-- Logo -->
//         <img src="https://www.adinnoutdoors.com/wp-content/uploads/2024/04/adinn-outdoor-final-logo.png"
//         alt="Adinn Logo" style="height:50px; margin-bottom:15px;">

//         <!-- Header -->
//         <div style="
//         text-align:center;
//         padding:20px 0;
//         background: linear-gradient(180deg,#00573F 0%,#12AC81 100%);
//         font-weight:700;
//         font-size:35px;
//         color:#FFFFFF;">
//         A new order has been received from a customer
//         </div>

//         <!-- Intro -->
//         <div style="font-size:24px; font-weight:600; margin:30px 0;">Hi Admin,</div>

//         <!-- Order Details Table -->
//         <div style="margin:30px 0;">
//         <table border="1" cellpadding="0" cellspacing="0"
//         style="border-collapse:collapse; width:100%; border:1px solid gray; text-align:center;">
//         <thead>
//             <tr style="color:#E31F25; font-weight:600; font-size:20px;">
//                 <th style="padding:12px;">Order ID</th>
//                 <th style="padding:12px;">Order Date</th>
//                 <th style="padding:12px;">Total Items</th>
//                 <th style="padding:12px;">Total Amount</th>
//             </tr>
//         </thead>
//         <tbody>
//             <tr>
//                 <td style="padding:12px;"> ${orderId}</td>
//                 <td style="padding:12px;"> ${currentDate}</td>
//                 <td style="padding:12px;"> ${products.length}</td>
//                 <td style="padding:12px; font-weight:600; color:#2ecc71;"> ${formattedTotalAmount}</td>
//             </tr>
//         </tbody>
//         </table>
//         </div>

//         <div>
//         ${generateProductDetailsHTML(products)}
//         </div>

//         <!-- Message -->
//         <div style="font-size:20px; margin:30px 0;">
//         Please review the order and contact the customer within 15 hours. <br>
//         If any corrections or updates are needed, please reach out to the customer using the provided contact details.
//         </div>

//         <!-- CUSTOMER DETAILS -->
//         <div style="margin:30px 0;">
//         <h3>Customer Details : </h3>
//         <table border="1" cellpadding="0" cellspacing="0"
//         style="border-collapse:collapse; width:100%; border:1px solid gray; text-align:center;">
//         <thead>
//             <tr style="color:#E31F25; font-weight:600; font-size:20px;">
//                 <th style="padding:12px;">Name</th>
//                 <th style="padding:12px;">Email</th>
//                 <th style="padding:12px;">Phone</th>
//                 <th style="padding:12px;">Company</th>
//                 <th style="padding:12px;">Address</th>

//             </tr>
//         </thead>
//         <tbody>
//             <tr>
//                 <td style="padding:12px;">${userName}</td>
//                 <td style="padding:12px;">${userEmail}</td>
//                 <td style="padding:12px;"><a href='tel:${userPhone}' style="text-decoration:none; color:black;"> ${userPhone} </a></td>
//                 <td style="padding:12px;">${company}</td>
//                 <td style="padding:12px;">${userAddress}</td>

//             </tr>
//         </tbody>
//         </table>
//         </div>


//         <div style="font-size:20px; margin:20px 0;">
//         <div>Thank you.</div>
//         <div>Adinn Outdoors</div>
//         </div>

//         <!-- FOOTER -->
//         <table width="100%" cellpadding="0" cellspacing="0"
//         background="https://www.adinntechnologies.com/images/FooterBannerImgEmail.png" style="
//         background-size:cover; 
//         background-repeat:no-repeat; 
//         text-align:center; 
//         padding:50px 0;
//         ">
//         <tr>
//         <td align="center">
//             <!-- Thank You Message -->
//             <table align="center" width="65%" cellpadding="0" cellspacing="0" style="margin-left: 20%;">
//                 <tr>
//                     <td align="center" style="font-size:24px; font-weight:500; color:#2B3333; ">
//                         <img src="https://www.adinntechnologies.com/images/FooterThankIconEmail.png"
//                             style="width:30px; vertical-align:middle;">
//                         <span style="color:#E31F25;font-weight:700;">Thank you</span> for choosing us - we're
//                         here to keep you happy, steady and ready.
//                     </td>
//                 </tr>
//             </table>

//             <!-- Footer 3 columns -->
//             <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:40px;">
//                 <tr>
//                     <!-- Column 1 -->
//                     <td width="33%" valign="top" style="padding:10px;">
//                         <img src="https://www.adinnoutdoors.com/wp-content/uploads/2024/04/adinn-outdoor-final-logo.png"
//                             style="height:40px;">

//                         <!-- Social -->
//                         <div style="margin:20px 0;">
//                             <img src="https://www.adinntechnologies.com/images/FootSocIcon1.png"
//                                 style="height:35px; margin:0 2px;">
//                             <img src="https://www.adinntechnologies.com/images/FootSocIcon2.png"
//                                 style="height:35px; margin:0 2px;">
//                             <img src="https://www.adinntechnologies.com/images/FootSocIcon3.png"
//                                 style="height:35px; margin:0 2px;">
//                             <img src="https://www.adinntechnologies.com/images/FootSocIcon4.png"
//                                 style="height:35px; margin:0 2px;">
//                             <img src="https://www.adinntechnologies.com/images/FootSocIcon5.png"
//                                 style="height:35px; margin:0 2px;">
//                         </div>

//                         <div style="font-size:14px; color:#2B3333;">
//                             <a href="tel:7373785057" style="color:#2B3333; text-decoration:none;">7373785057</a> |
//                             <a href="tel:9626987861" style="color:#2B3333; text-decoration:none;">9626987861</a>
//                         </div>
//                         <div style="font-size:14px; margin-top:10px;">
//                             <a href="mailto:ba@adinn.co.in" style="color:#2B3333; text-decoration:none;">
//                                 ba@adinn.co.in
//                             </a>
//                         </div>
//                     </td>

//                     <!-- Column 2 -->
//                     <td width="33%" valign="top" style="padding:10px; padding-left: 50px; font-size:15px;">
//                         <div style="font-weight:700; margin-bottom:10px;">Services</div>
//                         <div style="margin: 10px 0px;">3D & Cutouts</div>
//                         <div style="margin: 10px 0px;">Dynamic Advertising</div>
//                         <div style="margin: 10px 0px;">Geo Targeting</div>
//                         <div style="margin: 10px 0px;">Innovation</div>
//                         <div style="margin: 10px 0px;">Traditional</div>
//                         <div style="margin: 10px 0px;">Wall Painting</div>
//                     </td>

//                     <!-- Column 3 -->
//                     <td width="33%" valign="top" style="padding:10px; font-size:15px;">
//                         <div style="font-weight:700; margin-bottom:10px;">Address</div>
//                         29, 1st Cross Street, Vanamamalai Nagar,<br>
//                         <span style="font-weight:700;">Madurai-625010</span><br><br>

//                         Door No.3, Vijayalakshmi Street,<br>
//                         Nungambakkam,<br>
//                         <span style="font-weight:700;">Chennai – 600034</span><br><br>

//                         Old No.76, New No.976,<br>
//                         Rajarajeswari Nagar,<br>
//                         <span style="font-weight:700;">Bangalore – 560038</span>
//                     </td>
//                 </tr>
//             </table>

//             <div style="color:#FFFFFF; font-size:14px; margin-top:30px;">
//                 Copyright © 2025 Adinn Outdoors. All Rights Reserved.
//             </div>
//         </td>
//         </tr>
//         </table>
//         </div>
//         </body>
//         </html>
//         `;

//         // User Email
//         const userMailOptions = {
//             from: 'reactdeveloper@adinn.co.in',
//             to: userEmail,
//             subject: `Order Confirmation - ${orderId}`,
//             html: userMailHtmlTemplate
//         };

//         // Admin email
//         const adminMailOptions = {
//             from: 'reactdeveloper@adinn.co.in',
//             to: 'reactdeveloper@adinn.co.in',
//             subject: `New Order Received - #${orderId} Action Required`,
//             html: adminMailHtmlTemplate
//         };

//         // Send both emails
//         await transporter.sendMail(userMailOptions);
//         await transporter.sendMail(adminMailOptions);

//         // Send SMS to user only (NOT to admin)
//         try {
//             await sendSMS(userPhone, "1007197121174928712", { 
//                 orderId,
//                 customerName: userName,
//                 amount: parsedTotalAmount
//             });
//             console.log("User SMS sent successfully");
//         } catch (smsError) {
//             console.error("Failed to send user SMS:", smsError);
//             // Don't fail the request if SMS fails
//         }

//         // Log order information
//         console.log('=========================================');
//         console.log('Order Information:');
//         console.log('=========================================');
//         console.log(`Order ID: ${orderId}`);
//         console.log(`Client: ${userName}, Phone: ${userPhone}, Email: ${userEmail}`);
//         console.log(`Total Amount: ${formattedTotalAmount}`);
        
//         // Product details
//         if (products && products.length > 0) {
//             console.log('--- Product Details ---');
//             products.forEach((product, index) => {
//                 console.log(`Product ${index + 1}:`);
//                 console.log(`  - Name: ${product.name}`);
//                 console.log(`  - Product Code: ${product.prodCode}`);
//                 console.log(`  - Price per day: ${formatIndianCurrency(product.price || 0)}`);
//                 console.log(`  - Total Days: ${product.booking?.totalDays || 'N/A'}`);
//                 console.log(`  - Booking Dates: ${product.booking?.startDate ? formatIndianDate(product.booking.startDate) : 'N/A'} - ${product.booking?.endDate ? formatIndianDate(product.booking.endDate) : 'N/A'}`);
//             });
//         }
        
//         console.log('=========================================');

//         res.json({ 
//             success: true, 
//             message: 'Order confirmation sent successfully',
//             orderId: orderId
//         });

//     } catch (error) {
//         console.error("Error sending order confirmation:", error);
//         res.status(500).json({ 
//             success: false, 
//             error: "Failed to send order confirmation",
//             details: error.message 
//         });
//     }
// });

// module.exports = router;