const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const request = require('request');
//EMAIL CREDENTIALS 
const {emailID, emailPwd} = require('./EmailCredentials');
const productTable = require('./productOrderSchema')


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: emailID,
        pass: emailPwd
    }
});

//NEWLY ADDED CODE
// NettyFish SMS Configuration (same as above)
const NETTYFISH_API_KEY = process.env.NETTYFISH_API_KEY || 'aspv58uRbkqDbhCcCN87Mw';
const NETTYFISH_SENDER_ID = process.env.NETTYFISH_SENDER_ID || 'ADINAD';
const NETTYFISH_BASE_URL = 'https://retailsms.nettyfish.com/api/mt/SendSMS';
const IS_PRODUCTION = process.env.NODE_ENV === 'production'; //NEWLY ADDED

// Function to send SMS using NettyFish API (same as above)
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
            case "1007478982147905431": // Admin template
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



router.post('/send-orderCart-confirmation', async (req, res) => {
    try {
        const {
            orderId,
            userName,
            userEmail,
            userPhone,
            userAddress,
            company,
            products,
            orderDate,
            totalAmount
        } = req.body;

        // Generate product details HTML
        const generateProductDetailsHTML = (products) => {
            return products.map((product, index) => `
                <div style="margin-bottom: 25px; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                    <div style="display: flex; background: #fff; border-left: 4px solid #4CAF50;">
                        <div>
                        
                        </div>
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

        // User Email Template
        const userMailOptions = {
            from: emailID,
            to: userEmail,
            subject: `Your Order #${orderId} Confirmation`,
            html: `
                <div style="font-family: montserrat; max-width: 650px; margin: 0 auto; color: #444;">
        <!-- Header -->
        <div
            style="background: linear-gradient(135deg, #4CAF50, #2E7D32); padding: 30px 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
            <img src="https://www.adinnoutdoors.com/wp-content/uploads/2024/04/adinn-outdoor-final-logo.png"
                alt="Adinn Logo" style="height: 50px; margin-bottom: 15px;">
            <h1 style="margin: 0; font-weight: 500;">Thank You For Your Order!</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Your order has been received and is being processed</p>
        </div>

        <!-- Order Summary -->
        <div style="background: white; padding: 25px; border-bottom: 1px solid #eee;">
            <h2 style="margin: 0 0 15px 0; color: #333; font-size: 20px; display: flex; align-items: center;">
         
                ORDER SUMMARY

            </h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Order ID:</strong> ${orderId}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Order Date:</strong> ${orderDate}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Total Items:</strong> ${products.length}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Total Amount:</strong> ₹${totalAmount.toLocaleString()}</p>
                </div>

            </div>
        </div>

        <!-- Order Details -->
        <div style="background: white; padding: 25px; border-bottom: 1px solid #eee;">
            <h2 style="margin: 0 0 15px 0; color: #333; font-size: 20px; display: flex; align-items: center;">
                ORDER DETAILS
            </h2>
            ${generateProductDetailsHTML(products)}
        </div>

        <div style="margin-top: 20px; background: #E3F2FD; padding: 15px 15px 0px 15px; border-radius: 4px; text-align: center;">
            <h3 style="margin: 0 0 0px 0; color: #1769e3; font-size: 16px;">Quick Actions</h3>
            <!-- Footer -->
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
                             <a href="mailto:emailID" target="_blank"
                                style="display: inline-block; width: 20px; height: 20px; margin:0px 5px;">
                                <img src="https://cdn-icons-png.flaticon.com/512/5968/5968534.png" alt="Gmail"
                                    style="width: 100%; height: auto;">
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div> `
        };

        // Admin Email Template (similar structure but with different styling)
        const adminMailOptions = {
            from: emailID,
            to: emailID,
            subject: `🚀 New Order #${orderId} - Action Required`,
            html: `
    <div style="font-family:Montserrat; max-width: 650px; margin: 0 auto; color: #444;">
        <!-- Header -->
        <div
            style="background: linear-gradient(135deg, #7ec5ffff, #115ed2ff); padding: 30px 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
            <img src="https://www.adinnoutdoors.com/wp-content/uploads/2024/04/adinn-outdoor-final-logo.png"
                alt="Adinn Logo" style="height: 50px; margin-bottom: 15px;">
            <h1 style="margin: 0; font-weight: 500;">New Order Received!</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Order ${orderId} requires processing</p>
        </div>

        <!-- Order Summary -->
        <div style="background: white; padding: 25px; border-bottom: 1px solid #eee;">
            <h2 style="margin: 0 0 15px 0; color: #333; font-size: 20px; display: flex; align-items: center;">
                ORDER SUMMARY
            </h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px;">
                <div>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Order ID:</strong> ${orderId}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Order Date:</strong> ${orderDate}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Total Items:</strong> ${products.length}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Total Amount:</strong>
                        ₹${totalAmount.toLocaleString()}</p>
                </div>
            </div>
        </div>

        <!-- Order Details -->
        <div style="background: white; padding: 25px; border-bottom: 1px solid #eee;">
            <h2 style="margin: 0 0 15px 0; color: #333; font-size: 20px; display: flex; align-items: center;">
                ORDER DETAILS
            </h2>
            ${generateProductDetailsHTML(products)}
        </div>

        <!-- Customer Details -->
        <div style="background: white; padding: 25px; border-radius: 0 0 8px 8px;">
            <h2 style="margin: 0 0 15px 0; color: #333; font-size: 20px; display: flex; align-items: center;"> CUSTOMER DETAILS </h2>
                <div>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Name:</strong> ${userName}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Email:</strong> ${userEmail}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Phone:</strong><a href='tel:${userPhone}' style="text-decoration:none; color:black;"> ${userPhone} </a></p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Company:</strong> ${company} </p>
                    <p style="margin: 15px 0 8px 0; font-size: 15px;"><strong>Address:</strong> ${userAddress} </p>
                </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px; color: #777; font-size: 14px;">
            <p style="margin: 0;">This order was placed through the Adinn Outdoors website.</p>
        </div>

    </div> 
    `
        };

        // Send both emails
        await transporter.sendMail(userMailOptions);
        await transporter.sendMail(adminMailOptions);

        //NEWLY ADDED CODE
        if (IS_PRODUCTION) {

        // Send SMS to user
        try {
            await sendSMS(userPhone, "1007197121174928712", { orderId });
            console.log("User SMS sent successfully");
        } catch (smsError) {
            console.error("Failed to send user SMS:", smsError);
            // Don't fail the request if SMS fails
        }

        // Send SMS to admin
        try {
            await sendSMS(emailID, "1007478982147905431", {
                orderId,
                customerName: userName,
                amount: totalAmount
            });
            console.log("Admin SMS sent successfully");
        } catch (smsError) {
            console.error("Failed to send admin SMS:", smsError);
            // Don't fail the request if SMS fails
        }

        // res.json({ success: true, message: 'Emails sent successfully' });

    }

    
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


        res.json({ success: true, message: 'Emails sent successfully' });
}
    }
    
    catch (error) {
        console.error("Error sending Emails:", error);
        res.status(500).json({ success: false, error: "Failed to send emails" });
    }
});



/* update handle by name particular order against */
router.put('/update-order', async (req, res) => {
    try {
        const orderId = req.query.id;
        const handledBy = req.query.handled_by;

        // CASE 1: If ID is missing
        if (!orderId || orderId.trim() === "") {
            return res.status(400).json({
                status: false,
                message: "ID cannot be empty",
                data : null
            });
        }

        // Prepare update data
        const updateData = {
            ...req.body,
            handled_by: handledBy || null  // default null if not provided
        };

        // Perform update
        const updatedOrder = await productTable.findByIdAndUpdate(
            orderId,
            updateData,
            { new: true }
        );

        // CASE 2: If no document found with given ID
        if (!updatedOrder) {
            return res.status(404).json({
                status: false,
                message: "Order ID not found",
                data : null
            });
        }

        // Success response
        res.json({
            status: true,
            message: "Order updated successfully",
            data: updatedOrder
        });

    } catch (error) {
        console.error("Error updating order:", error);
        res.status(500).json({ status: false, message: "Internal server error" });
    }
});

/* update handle by name particular order against */


module.exports = router;