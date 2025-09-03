const express = require('express');
//FOR SMS
const request = require('request');
//FOR EMAIL
const nodemailer = require('nodemailer');
const router = express.Router();

const NETTYFISH_API_KEY = process.env.NETTYFISH_API_KEY || 'aspv58uRbkqDbhCcCN87Mw';
const NETTYFISH_SENDER_ID = process.env.NETTYFISH_SENDER_ID || 'ADINAD';
const NETTYFISH_BASE_URL = 'https://retailsms.nettyfish.com/api/mt/SendSMS';

const sendAdminSMS = (phone, templateId, variables = {}) => {
    return new Promise((resolve, reject) => {
        // let formattedPhone = phone.replace('+', '');
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

// Generate product details HTML
const generateProductDetailsHTML = (products) => {
    return products.map((product, index) => `
        <div style="margin-bottom: 25px; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
            <div style="display: flex; background: #fff; border-left: 4px solid #4CAF50;">
                <div style="flex: 3; padding: 15px;">
                    <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">${product.name}</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <p style="margin: 5px 0; font-size: 14px;"><strong style="color: #666;">Product Code:</strong> ${product.prodCode}</p>
                            <p style="margin: 5px 0; font-size: 14px;"><strong style="color: #666;">Price:</strong> ₹${product.price.toLocaleString()} per day</p>
                            <p style="margin: 5px 0; font-size: 14px;"><strong style="color: #666;">Total Days:</strong> ${product.booking.totalDays}</p>
                            <p style="margin: 5px 0; font-size: 14px;"><strong style="color: #666;">Total Amount:</strong> ₹${product.booking.totalPrice.toLocaleString()}</p>
                            <p style="margin: 5Px 0; font-size: 14px;"><strong style="color: #666;">Booking Dates:</strong> ${new Date(product.booking.startDate).toLocaleDateString()} - ${new Date(product.booking.endDate).toLocaleDateString()}</p>
                        </div>
                    </div> 
                </div>
            </div>
        </div>
    `).join('');
};

router.post('/send-order-notificationsAdmin', async (req, res) => {
    try {
        const { orderData, orderId } = req.body;
        const { client, products } = orderData;

        console.log("Sending notifications for order:", orderId);
        console.log("Client data:", client);

        // Send user email
        const userMailOptions = {
            from: 'reactdeveloper@adinn.co.in',
            to: client.email,
            subject: `Order Confirmation - ${orderId}`,
            html: ` <div style="font-family: montserrat; max-width: 650px; margin: 0 auto; color: #444;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #4CAF50, #2E7D32); padding: 30px 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
                        <img src="https://www.adinnoutdoors.com/wp-content/uploads/2024/04/adinn-outdoor-final-logo.png"
                            alt="Adinn Logo" style="height: 50px; margin-bottom: 15px;">
                        <h1 style="margin: 0; font-weight: 500;">Thank You For Your Order!</h1>
                        <p style="margin: 10px 0 0; opacity: 0.9;">Your order has been received and is being processed</p>
                    </div>

                    <!-- Order Summary -->
                    <div style="background: white; padding: 25px; border-bottom: 1px solid #eee;">
                        <h2 style="margin: 0 0 15px 0; color: #333; font-size: 20px;">ORDER SUMMARY</h2>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <p style="margin: 8px 0; font-size: 15px;"><strong>Order ID:</strong> ${orderId}</p>
                                <p style="margin: 8px 0; font-size: 15px;"><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
                                <p style="margin: 8px 0; font-size: 15px;"><strong>Total Items:</strong> ${products.length}</p>
                                <p style="margin: 8px 0; font-size: 15px;"><strong>Total Amount:</strong> ₹${products.reduce((sum, product) => sum + (product.booking.totalPrice || 0), 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Order Details -->
                    <div style="background: white; padding: 25px; border-bottom: 1px solid #eee;">
                        <h2 style="margin: 0 0 15px 0; color: #333; font-size: 20px;">ORDER DETAILS</h2>
                        ${generateProductDetailsHTML(products)}
                    </div>

                    <!-- Footer -->
                    
        <div style="margin-top: 20px; background: #E3F2FD; padding: 15px 15px 0px 15px; border-radius: 4px; text-align: center;">
            <h3 style="margin: 0 0 0px 0; color: #1769e3; font-size: 16px;">Quick Actions</h3>
            <div style="text-align: center; padding: 20px; color: #777; font-size: 14px;">
                <p style="margin: 0;">Our team will contact you shortly for further details.</p>
                <p style="margin: 10px 0 0;">Thank you for choosing Adinn Outdoors!</p>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                    <div>Need help? Contact us for more details
                        <div style="margin: 10px auto;">
                            <a href="https://www.facebook.com/adinnoutdoors/" target="_blank"
                                style="display: inline-block; width: 20px; height: 20px; margin:0px 5px;">
                                <img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" alt="Facebook"
                                    style="width: 100%; height: auto;">
                            </a>
                            <a href="https://www.instagram.com/adinnoutdoor/" target="_blank"
                                style="display: inline-block; width: 20px; height: 20px; margin:0px 5px;">
                                <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram"
                                    style="width: 100%; height: auto;">
                            </a>
                            <a href="https://www.linkedin.com/showcase/adinn-outdoors/" target="_blank"
                                style="display: inline-block; width: 20px; height: 20px; margin:0px 5px;">
                                <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn"
                                    style="width: 100%; height: auto;">
                            </a>
                            <a href="https://www.youtube.com/@AdinnChannel" target="_blank"
                                style="display: inline-block; width: 20px; height: 20px; margin:0px 5px;">
                                <img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" alt="YouTube"
                                    style="width: 100%; height: auto;">
                            </a>
                             <a href="mailto:reactdeveloper@adinn.co.in" target="_blank"
                                style="display: inline-block; width: 20px; height: 20px; margin:0px 5px;">
                                <img src="https://cdn-icons-png.flaticon.com/512/5968/5968534.png" alt="Gmail"
                                    style="width: 100%; height: auto;">
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
                </div>`
        };

        // Send admin email
        const adminMailOptions = {
            from: 'reactdeveloper@adinn.co.in',
            to: 'reactdeveloper@adinn.co.in',
            subject: `New Order Received - #${orderId}`,
            html: `<div style="font-family:Montserrat; max-width: 650px; margin: 0 auto; color: #444;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #7ec5ffff, #115ed2ff); padding: 30px 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
                        <img src="https://www.adinnoutdoors.com/wp-content/uploads/2024/04/adinn-outdoor-final-logo.png"
                            alt="Adinn Logo" style="height: 50px; margin-bottom: 15px;">
                        <h1 style="margin: 0; font-weight: 500;">New Order Received!</h1>
                        <p style="margin: 10px 0 0; opacity: 0.9;">Order ${orderId} requires processing</p>
                    </div>

                    <!-- Order Summary -->
                    <div style="background: white; padding: 25px; border-bottom: 1px solid #eee;">
                        <h2 style="margin: 0 0 15px 0; color: #333; font-size: 20px;">ORDER SUMMARY</h2>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px;">
                            <div>
                                <p style="margin: 8px 0; font-size: 15px;"><strong>Order ID:</strong> ${orderId}</p>
                                <p style="margin: 8px 0; font-size: 15px;"><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
                                <p style="margin: 8px 0; font-size: 15px;"><strong>Total Items:</strong> ${products.length}</p>
                                <p style="margin: 8px 0; font-size: 15px;"><strong>Total Amount:</strong> ₹${products.reduce((sum, product) => sum + (product.booking.totalPrice || 0), 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Order Details -->
                    <div style="background: white; padding: 25px; border-bottom: 1px solid #eee;">
                        <h2 style="margin: 0 0 15px 0; color: #333; font-size: 20px;">ORDER DETAILS</h2>
                        ${generateProductDetailsHTML(products)}
                    </div>

                    <!-- Customer Details -->
                    <div style="background: white; padding: 25px; border-radius: 0 0 8px 8px;">
                        <h2 style="margin: 0 0 15px 0; color: #333; font-size: 20px;">CUSTOMER DETAILS</h2>
                        <div>
                            <p style="margin: 8px 0; font-size: 15px;"><strong>Name:</strong> ${client.name}</p>
                            <p style="margin: 8px 0; font-size: 15px;"><strong>Email:</strong> ${client.email}</p>
                            <p style="margin: 8px 0; font-size: 15px;"><strong>Phone:</strong><a href='tel:${client.contact}' style="text-decoration:none; color:black;"> ${client.contact} </a></p>
                            <p style="margin: 8px 0; font-size: 15px;"><strong>Company:</strong> ${client.company}</p>
                        </div>
                    </div>
                </div>`
        };

        // Send emails
        await emailTransporter.sendMail(userMailOptions);
        await emailTransporter.sendMail(adminMailOptions);
        console.log("Emails sent successfully");

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
                amount: client.paidAmount
            });
            console.log("Admin SMS sent successfully");
        } catch (smsError) {
            console.error("Failed to send admin SMS:", smsError);
        }


        res.json({ success: true, message: 'Notifications sent successfully' });
    } catch (error) {
        console.error("Error sending notifications:", error);
        res.status(500).json({ success: false, error: "Failed to send notifications" });
    }
});

module.exports = router;