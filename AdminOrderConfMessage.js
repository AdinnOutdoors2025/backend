const express = require('express');
const request = require('request');
const nodemailer = require('nodemailer');
const router = express.Router();

// Import formatters
const { formatIndianCurrency, formatIndianDate, getCurrentIndianDate } = require('./FORMATTED.js');

// STOPS THE SMS FOR TESTING PURPOSE
const NETTYFISH_API_KEY = process.env.NETTYFISH_API_KEY || 'aspv58uRbkqDbhCcCN87Mw';
const NETTYFISH_SENDER_ID = process.env.NETTYFISH_SENDER_ID || 'ADINAD';
const NETTYFISH_BASE_URL = 'https://retailsms.nettyfish.com/api/mt/SendSMS';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const sendAdminSMS = (phone, templateId, variables = {}) => {
    return new Promise((resolve, reject) => {
        let formattedPhone = phone.toString().replace('+', '');
        if (!formattedPhone.startsWith('91')) {
            formattedPhone = '91' + formattedPhone;
        }

        // Prepare text with variables
        let text = "";
        switch (templateId) {
            case "1007478982147905431": // User Template
                text = `Thank you for your order with Adinn Outdoors! We've received it successfully. Your order ID is ${variables.orderId}.`;
                break;
            case "1007197121174928712": // Admin Template
                text = `New order received! Order ID: ${variables.orderId}. Customer: ${variables.customerName}. Amount: ₹${variables.amount}.`;
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

// Add this route to handle SMS sending
router.post('/send-admin-sms', async (req, res) => {
    try {
        const { phone, templateId, variables } = req.body;

        await sendAdminSMS(phone, templateId, variables);
        res.json({ success: true, message: 'SMS sent successfully' });
    } catch (error) {
        console.error("SMS sending error:", error);
        res.status(500).json({ success: false, error: "Failed to send SMS" });
    }
});

// Email transporter
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'reactdeveloper@adinn.co.in',
        pass: 'gxnn sezu klyp ifhn'
    }
});

// Generate product details HTML with Indian formatting
const generateProductDetailsHTML = (products) => {
    return products.map((product, index) => {
        // Use product.image if available, otherwise use a placeholder
        const productImage = product.image;
        const startDate = formatIndianDate(product.booking?.startDate);
        const endDate = formatIndianDate(product.booking?.endDate);
        const pricePerDay = formatIndianCurrency(product.price || 0);
        const totalPrice = formatIndianCurrency(product.booking?.totalPrice || 0);

        return `
        <!-- Product ${index + 1} -->
        <table width="100%" cellpadding="0" cellspacing="0"
            style="border-bottom:2px solid #C4C1C1; margin-bottom:20px; padding-bottom:20px;">
            <tr>
                <td width="120">
                    <img src="${productImage}"
                        style="height:90px;width:90px;border-radius:10px; object-fit: cover;">
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
        `;
    }).join('');
};

router.post('/send-order-notificationsAdmin', async (req, res) => {
    try {
        const { orderData, orderId } = req.body;
        const { client, products } = orderData;

        console.log("Sending notifications for order:", orderId);
        console.log("Client data:", client);

        // Calculate total amount - ensure we parse as numbers
        const totalAmount = products.reduce((sum, product) => {
            const price = parseFloat(product.booking?.totalPrice) || 0;
            return sum + price;
        }, 0);

        const formattedTotalAmount = formatIndianCurrency(totalAmount);
        const currentDate = getCurrentIndianDate();

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
        <div style="font-size:24px; font-weight:600; margin:30px 0;">Hi ${client.name},</div>

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
        We've received your request, and our team will reach out within the next 15 hours.  
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
        <div>We're here to help.</div>
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
        `;

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
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="padding:12px;">${client.name}</td>
                <td style="padding:12px;">${client.email}</td>
                <td style="padding:12px;"><a href='tel:${client.contact}' style="text-decoration:none; color:black;"> ${client.contact} </a></td>
                <td style="padding:12px;">${client.company}</td>
            </tr>
        </tbody>
        </table>
        </div>

        <!-- CUSTOMER PAYMENT DETAILS -->
        <div style="margin:30px 0;">
        <h3>Payment Details : </h3>
        <table border="1" cellpadding="0" cellspacing="0"
        style="border-collapse:collapse; width:100%; border:1px solid gray; text-align:center;">
        <thead>
            <tr style="color:#E31F25; font-weight:600; font-size:20px;">
                <th style="padding:12px;">Paid Amount</th>
                <th style="padding:12px;">Balance Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="padding:12px; font-weight:600; color:#2ecc71;">${formatIndianCurrency(parseFloat(client.paidAmount) || 0)}</td>
                <td style="padding:12px; font-weight:600; color:#e74c3c;">${formatIndianCurrency(totalAmount - (parseFloat(client.paidAmount) || 0))}</td>
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
        `;

        // Send user email
        const userMailOptions = {
            from: 'reactdeveloper@adinn.co.in',
            to: client.email,
            subject: `Order Confirmation - ${orderId}`,
            html: userMailHtmlTemplate
        };

        // Send admin email
        const adminMailOptions = {
            from: 'reactdeveloper@adinn.co.in',
            to: 'reactdeveloper@adinn.co.in',
            subject: `New Order Received - #${orderId} Action Required`,
            html: adminMailHtmlTemplate
        };

        // Send emails
        await emailTransporter.sendMail(userMailOptions);
        await emailTransporter.sendMail(adminMailOptions);
        console.log("Emails sent successfully");

        // Log product details for debugging
        if (products && products.length > 0) {
            console.log('--- Product Details for Email ---');
            products.forEach((product, index) => {
                console.log(`Product ${index + 1}:`);
                console.log(`  - Name: ${product.name}`);
                console.log(`  - Image: ${product.image || 'No image'}`);
                console.log(`  - Product Code: ${product.prodCode}`);
                console.log(`  - Price per day: ${formatIndianCurrency(product.price || 0)}`);
                console.log(`  - Booking Dates: ${formatIndianDate(product.booking?.startDate)} - ${formatIndianDate(product.booking?.endDate)}`);
                console.log(`  - Total Price: ${formatIndianCurrency(product.booking?.totalPrice || 0)}`);
            });
        }

        // Send SMS if in production
        if (IS_PRODUCTION) {
            // Send SMS to user
            if (client.contact) {
                try {
                    await sendAdminSMS(client.contact, "1007478982147905431", {
                        orderId: orderId
                    });
                    console.log("User SMS sent successfully");
                } catch (smsError) {
                    console.error("Failed to send user SMS:", smsError);
                }
            }

            // Send SMS to admin
            try {
                await sendAdminSMS('reactdeveloper@adinn.co.in', "1007197121174928712", {
                    orderId: orderId,
                    customerName: client.name,
                    amount: formatIndianCurrency(parseFloat(client.paidAmount) || 0)
                });
                console.log("Admin SMS sent successfully");
            } catch (smsError) {
                console.error("Failed to send admin SMS:", smsError);
            }
        } else {
            // Log SMS information to console for testing
            console.log('=========================================');
            console.log('OTP/SMS Testing Information (localhost):');
            console.log('=========================================');
            console.log(`Order ID: ${orderId}`);
            console.log(`Order Date: ${currentDate}`);
            console.log(`Client: ${client.name}, Phone: ${client.contact}, Email: ${client.email}`);
            console.log(`Total Amount: ${formattedTotalAmount}`);
            console.log(`Paid Amount: ${formatIndianCurrency(parseFloat(client.paidAmount) || 0)}`);
            console.log(`Balance Amount: ${formatIndianCurrency(totalAmount - (parseFloat(client.paidAmount) || 0))}`);

            console.log('\nNOTE: SMS functionality is disabled for localhost testing');
            console.log('Emails have been sent successfully');
            console.log('=========================================');
        }

        res.json({ success: true, message: 'Notifications sent successfully' });
    } catch (error) {
        console.error("Error sending notifications:", error);
        res.status(500).json({ success: false, error: "Failed to send notifications" });
    }
});

module.exports = router;