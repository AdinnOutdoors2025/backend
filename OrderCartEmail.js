


















// const express = require('express');
// const nodemailer = require('nodemailer');
// const router = express.Router();

// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: 'reactdeveloper@adinn.co.in',
//         pass: 'gxnn sezu klyp ifhn'
//     }
// });

// router.post('/send-orderCart-confirmation', async (req, res) => {
//     try {
//         const {
//             orderId, 
//             userName, 
//             userEmail, 
//             userPhone, 
//             userAddress, 
//             company, 
//             products, // This will now be an array of products
//             orderDate,
//             totalAmount
//         } = req.body;

//         // Generate product details HTML for both user and admin emails
//         const generateProductDetailsHTML = (products) => {
//             return products.map(product => `
//                 <div style="margin-bottom: 15px; padding: 10px; border-bottom: 1px solid #eee;">
//                     <div style="display: flex;">
//                         <div style="flex: 1;">
//                             <img src="${product.image}" alt="${product.name}" style="max-width: 100px; height: auto;">
//                         </div>
//                         <div style="flex: 3;">
//                             <h4 style="margin-top: 0;">${product.name}</h4>
//                             <p><strong>Product Code:</strong> ${product.prodCode}</p>
//                             <p><strong>Price:</strong> ₹${product.price.toLocaleString()} per day</p>
//                             <p><strong>Booking Dates:</strong> ${new Date(product.booking.startDate).toLocaleDateString()} to ${new Date(product.booking.endDate).toLocaleDateString()}</p>
//                             <p><strong>Total Days:</strong> ${product.booking.totalDays}</p>
//                             <p><strong>Amount:</strong> ₹${product.booking.totalPrice.toLocaleString()}</p>
//                             <p><strong>Location:</strong> ${product.fromLocation} to ${product.toLocation}</p>
//                             <p><strong>Size:</strong> ${product.size.width} x ${product.size.height} (${product.size.squareFeet} sq.ft)</p>
//                         </div>
//                     </div>
//                 </div>
//             `).join('');
//         };

//         // User Email
//         const userMailOptions = {
//             from: 'reactdeveloper@adinn.co.in',
//             to: userEmail,
//             subject: `Order Confirmation - ${orderId}`,
//             html: `
//                 <div style="font-family: Montserrat, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
//                     <img src="https://www.adinnoutdoors.com/wp-content/uploads/2024/04/adinn-outdoor-final-logo.png" alt="Adinn Logo" style="height: 50px; width: auto; display: block; margin: 0 auto 20px;">
//                     <h2 style="color: #333; text-align: center;">Thank You for Your Order!</h2>
//                     <p style="text-align: center;">Your order has been received and is being processed.</p>

//                     <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
//                         <h3 style="color: #333; margin-top: 0;">Order Summary</h3>
//                         <p><strong>Order ID:</strong> ${orderId}</p>
//                         <p><strong>Order Date:</strong> ${orderDate}</p>
//                         <p><strong>Total Items:</strong> ${products.length}</p>
//                         <p><strong>Total Amount:</strong> ₹${totalAmount.toLocaleString()}</p>
//                     </div>

//                     <div style="margin: 20px 0;">
//                         <h3 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Order Details</h3>
//                         ${generateProductDetailsHTML(products)}
//                     </div>

//                     <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
//                         <h3 style="color: #333; margin-top: 0;">Customer Details</h3>
//                         <p><strong>Name:</strong> ${userName}</p>
//                         <p><strong>Company:</strong> ${company}</p>
//                         <p><strong>Contact:</strong> ${userPhone}</p>
//                         <p><strong>Address:</strong> ${userAddress}</p>
//                     </div>

//                     <p style="text-align: center; color: #777; font-size: 14px;">
//                         Our team will contact you shortly for further details. Thank you for choosing AdinnOutdoors!
//                     </p>
//                 </div>
//             `
//         };

//         // Admin Email
//         const adminMailOptions = {
//             from: 'reactdeveloper@adinn.co.in',
//             to: 'reactdeveloper@adinn.co.in',
//             subject: `New Order Received - #${orderId}`,
//             html: `
//                 <div style="font-family: Montserrat, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
//                     <h2 style="color: #333; text-align: center;">New Order Notification</h2>

//                     <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
//                         <h3 style="color: #333; margin-top: 0;">Order Summary</h3>
//                         <p><strong>Order ID:</strong> ${orderId}</p>
//                         <p><strong>Order Date:</strong> ${orderDate}</p>
//                         <p><strong>Total Items:</strong> ${products.length}</p>
//                         <p><strong>Total Amount:</strong> ₹${totalAmount.toLocaleString()}</p>
//                     </div>

//                     <div style="margin: 20px 0;">
//                         <h3 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Order Details</h3>
//                         ${generateProductDetailsHTML(products)}
//                     </div>

//                     <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
//                         <h3 style="color: #333; margin-top: 0;">Customer Details</h3>
//                         <p><strong>Name:</strong> ${userName}</p>
//                         <p><strong>Company:</strong> ${company}</p>
//                         <p><strong>Email:</strong> ${userEmail}</p>
//                         <p><strong>Phone:</strong> ${userPhone}</p>
//                         <p><strong>Address:</strong> ${userAddress}</p>
//                     </div>

//                     <p style="text-align: center; color: #777; font-size: 14px;">
//                         Please process this order promptly.
//                     </p>
//                 </div>
//             `
//         };

//         // Send both emails
//         await transporter.sendMail(userMailOptions);
//         await transporter.sendMail(adminMailOptions);

//         res.json({ success: true, message: 'Emails sent successfully' });

//     } catch (error) {
//         console.error("Error sending Emails:", error);
//         res.status(500).json({ success: false, error: "Failed to send emails" });
//     }
// });

// module.exports = router;


const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'reactdeveloper@adinn.co.in',
        pass: 'gxnn sezu klyp ifhn'
    }
});

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
            from: 'reactdeveloper@adinn.co.in',
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
    </div> `
        };  
     
        // Admin Email Template (similar structure but with different styling)
        const adminMailOptions = {
            from: 'reactdeveloper@adinn.co.in',
            to: 'reactdeveloper@adinn.co.in',
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

        res.json({ success: true, message: 'Emails sent successfully' });

    } catch (error) {
        console.error("Error sending Emails:", error);
        res.status(500).json({ success: false, error: "Failed to send emails" });
    }
});

module.exports = router;