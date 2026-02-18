// ADMIN SMS IMPLEMENTED 
const express = require('express');
const request = require('request');
const nodemailer = require('nodemailer');
const router = express.Router();
const axios = require('axios'); // Add axios


const { formatIndianCurrency, formatIndianDate, getCurrentIndianDate } = require('./FORMATTED.js');
const { generateUserEmailTemplate, generateAdminEmailTemplate } = require('./Email_Template.js');

const NETTYFISH_API_KEY = process.env.NETTYFISH_API_KEY || 'aspv58uRbkqDbhCcCN87Mw';
const NETTYFISH_SENDER_ID = process.env.NETTYFISH_SENDER_ID || 'ADINAD';
const NETTYFISH_BASE_URL = 'https://retailsms.nettyfish.com/api/mt/SendSMS';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ADMIN_PHONE = process.env.ADMIN_PHONE;


// // ADD ADMIN PHONE NUMBERS HERE
// const ADMIN_PHONE_NUMBERS = [
//     '7092558277',  // First admin number
//     '9080407151'   // Second admin number
// ];

const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'reactdeveloper@adinn.co.in',
        pass: 'gxnn sezu klyp ifhn'
    }
});

// SMS sending lock
const adminSmsLock = new Map();
// Helper to format date as "DD-MMM-YYYY" (e.g., 16-Feb-2026)
const formatDateForPhp = (dateInput) => {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};

const sendAdminSMS = (phone, templateId, variables = {}) => {
    const lockKey = `${phone}-${templateId}-${variables.orderId}`;

    if (adminSmsLock.has(lockKey)) {
        console.log(`Admin SMS already sent for ${lockKey}`);
        return Promise.resolve({ success: true, message: "SMS already sent" });
    }

    adminSmsLock.set(lockKey, true);
    setTimeout(() => adminSmsLock.delete(lockKey), 5 * 60 * 1000);

    return new Promise((resolve, reject) => {
        let formattedPhone = phone.toString().replace('+', '');
        if (!formattedPhone.startsWith('91')) {
            formattedPhone = '91' + formattedPhone;
        }

        let text = "";
        switch (templateId) {
            case "1007478982147905431": // User Template for admin-created orders
                text = `Thank you for your order with Adinn Outdoors! We've received it successfully. Your order ID is ${variables.orderId}.`;
                break;
            case "1007314947721730551": // Admin Template
                text = `Adinn Outdoors - New order received! Order ID: ${variables.orderId}. Please review the order details and take action in the admin panel.`;
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
                        console.log("Admin SMS sent successfully:", result);
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

router.post('/send-order-notificationsAdmin', async (req, res) => {
    try {
        const { orderData, orderId } = req.body;
        const { client, products } = orderData;

        console.log("Sending notifications for order:", orderId);

        // Calculate all amounts properly with GST
        let totalBookingAmount = 0;
        let totalPrintingCost = 0;
        let totalMountingCost = 0;
        let overAllTotalAmount = 0;

        products.forEach(product => {
            const bookingAmount = parseFloat(product.booking?.totalPrice) || 0;
            const printingCost = parseFloat(product.printingCost) || 0;
            const mountingCost = parseFloat(product.mountingCost) || 0;

            totalBookingAmount += bookingAmount;
            totalPrintingCost += printingCost;
            totalMountingCost += mountingCost;
            overAllTotalAmount += (bookingAmount + printingCost + mountingCost);
        });

        // Calculate GST (default 18%)
        const gstPercentage = client.gstPercentage || 18;
        const gstAmount = Math.floor(overAllTotalAmount * (gstPercentage / 100));
        const totalAmountWithGST = overAllTotalAmount + gstAmount;

        const formattedTotalAmount = formatIndianCurrency(totalAmountWithGST);
        const currentDate = getCurrentIndianDate();

        // Format products with GST details
        const formattedProducts = products.map(product => {
            const bookingAmount = parseFloat(product.booking?.totalPrice) || 0;
            const productPrintingCost = parseFloat(product.printingCost) || 0;
            const productMountingCost = parseFloat(product.mountingCost) || 0;
            const productBaseTotal = bookingAmount + productPrintingCost + productMountingCost;

            // Calculate GST for this product proportionally
            let productGST = 0;
            if (overAllTotalAmount > 0) {
                productGST = Math.floor((productBaseTotal / overAllTotalAmount) * gstAmount);
            }

            return {
                ...product,
                prodCode: product.prodCode || '',
                price: product.price || 0,
                printingCost: productPrintingCost,
                mountingCost: productMountingCost,
                booking: {
                    ...(product.booking || {}),
                    totalPrice: bookingAmount,
                    totalDays: product.booking?.totalDays || 0,
                    startDate: product.booking?.startDate || product.startDate || new Date(),
                    endDate: product.booking?.endDate || product.endDate || new Date()
                },
                gstPercentage: gstPercentage,
                gstAmount: productGST,
                totalWithGST: productBaseTotal + productGST
            };
        });





        // --- Construct PHP API payload ---
        const adminEmail = process.env.ADMIN_EMAIL || 'reactdeveloper@adinn.co.in'; // Use the sample admin email

        // Build products array for PHP (with per‑product GST and total)
        const phpProducts = products.map(product => {
            const bookingAmount = parseFloat(product.booking?.totalPrice) || 0;
            const productPrintingCost = parseFloat(product.printingCost) || 0;
            const productMountingCost = parseFloat(product.mountingCost) || 0;
            const productBaseTotal = bookingAmount + productPrintingCost + productMountingCost;

            // Allocate GST proportionally to this product
            let productGST = 0;
            if (overAllTotalAmount > 0) {
                productGST = Math.floor((productBaseTotal / overAllTotalAmount) * gstAmount);
            }

            return {
                productImageUrl: product.image || '',
                name: product.name || '',
                prodCode: product.prodCode || '',
                pricePerDay: parseFloat(product.price) || 0,
                startDate: formatDateForPhp(product.booking?.startDate || product.startDate),
                endDate: formatDateForPhp(product.booking?.endDate || product.endDate),
                totalDays: product.booking?.totalDays || 0,
                bookingAmount: bookingAmount,
                printingCost: productPrintingCost,
                mountingCost: productMountingCost,
                gstAmount: productGST,
                totalWithGST: productBaseTotal + productGST
            };
        });

        // Summary object
        const summary = {
            baseAmount: overAllTotalAmount,
            gstAmount: gstAmount,
            grandTotal: totalAmountWithGST
        };

        // Order object – use current date as orderDate
        const order = {
            orderId: orderId,
            orderDate: formatDateForPhp(new Date()), // Always use current date for admin-created orders
            gstPercentage: gstPercentage
        };

        // Client object – convert phone to number if possible
        const phpClient = {
            name: client.name,
            email: client.email,
            phone: client.contact ? Number(client.contact) : 0,
            company: client.company || ''
        };

        // Final payload
        const mailPayload = {
            mailtype: 'order',
            userEmail: client.email,
            adminEmail: adminEmail,
            client: phpClient,
            order: order,
            products: phpProducts,
            summary: summary
        };

        // Log the full payload for debugging
        console.log('📧 PHP Mail Payload (Admin):', JSON.stringify(mailPayload, null, 2));

        // --- Fire‑and‑forget call to PHP API (non‑blocking) ---
        axios.post('https://adinndigital.com/api/index.php', mailPayload, {
            headers: { 'Content-Type': 'application/json' }
        })
            .then(response => {
                console.log('✅ PHP order mail API (admin) responded:', response.data);
            })
            .catch(error => {
                console.error('❌ Error calling PHP order mail API (admin):', error.message);
                if (error.response) {
                    console.error('PHP API error data:', error.response.data);
                }
            });
        // --- Construct PHP API payload ---




        // Generate emails
        const userMailHtmlTemplate = generateUserEmailTemplate(
            orderId,
            client,
            formattedProducts,
            currentDate,
            formattedTotalAmount,
            {
                gstPercentage: gstPercentage,
                gstAmount: gstAmount,
                totalWithGST: totalAmountWithGST
            }
        );

        const adminMailHtmlTemplate = generateAdminEmailTemplate(
            orderId,
            client,
            formattedProducts,
            currentDate,
            formattedTotalAmount
        );

        // Send emails
        const userMailOptions = {
            from: 'reactdeveloper@adinn.co.in',
            to: client.email,
            subject: `Order Confirmation - ${orderId}`,
            html: userMailHtmlTemplate
        };

        const adminMailOptions = {
            from: 'reactdeveloper@adinn.co.in',
            to: 'reactdeveloper@adinn.co.in',
            subject: `New Order Received - #${orderId} Action Required`,
            html: adminMailHtmlTemplate
        };
        //COMMENT TO STOP EMAIL 
        // await emailTransporter.sendMail(userMailOptions);
        // await emailTransporter.sendMail(adminMailOptions);
        //COMMENT TO STOP EMAIL 

        console.log("Emails sent successfully");

        // Send SMS notifications (single call per recipient)
        if (IS_PRODUCTION) {
            // Send SMS to user (if contact exists)
            if (client.contact) {
                try {
                    await sendAdminSMS(client.contact, "1007478982147905431", {
                        orderId: orderId,
                        customerName: client.name,
                        amount: formatIndianCurrency(client.paidAmount || 0)
                    });
                    console.log("User SMS sent successfully");
                } catch (smsError) {
                    console.error("Failed to send user SMS:", smsError);
                }
            }


            //             // Send SMS to admin - FIXED: Send to actual phone numbers, not email
            //             // Send to multiple admin numbers
            //             // for (const adminPhone of ADMIN_PHONE_NUMBERS) { 
            //             try {
            //                 await sendAdminSMS(ADMIN_PHONE, "1007314947721730551", {
            //                     orderId: orderId,
            //                     customerName: client.name,
            //                     amount: formatIndianCurrency(parseFloat(client.paidAmount) || 0)
            //                 });
            //                 console.log(`Admin SMS sent successfully to ${ADMIN_PHONE}`);
            //             } catch (smsError) {
            //                 console.error(`Failed to send admin SMS to ${ADMIN_PHONE}:`, smsError);
            //             }
            //         }
            //         // } 

            // Send SMS to admin
            try {
                await sendAdminSMS(ADMIN_PHONE, "1007314947721730551", {
                    orderId: orderId,
                    customerName: client.name,
                    amount: formatIndianCurrency(client.paidAmount || 0)
                });
                console.log(`Admin SMS sent successfully to ${ADMIN_PHONE}`);
            } catch (smsError) {
                console.error(`Failed to send admin SMS:`, smsError);
            }
        } else {
            // Development logging
            console.log('=========================================');
            console.log('ADMIN NOTIFICATIONS (localhost):');
            console.log('=========================================');
            console.log(`Order ID: ${orderId}`);
            console.log(`Order Date: ${currentDate}`);
            console.log(`Client: ${client.name}, Phone: ${client.contact}, Email: ${client.email}`);
            console.log(`Booking Amount: ${formatIndianCurrency(totalBookingAmount)}`);
            console.log(`Printing Cost: ${formatIndianCurrency(totalPrintingCost)}`);
            console.log(`Mounting Cost: ${formatIndianCurrency(totalMountingCost)}`);
            console.log(`Base Amount (Excl. GST): ${formatIndianCurrency(overAllTotalAmount)}`);
            console.log(`GST @ ${gstPercentage}%: ${formatIndianCurrency(gstAmount)}`);
            console.log(`Total Amount (Incl. GST): ${formatIndianCurrency(totalAmountWithGST)}`);
            console.log(`Paid Amount: ${formatIndianCurrency(client.paidAmount || 0)}`);

            console.log('\nSMS would be sent to:');
            console.log(`- User: ${client.contact} (Template: 1007478982147905431)`);
            console.log(`- Admin: ${ADMIN_PHONE} (Template: 1007314947721730551)`);
            console.log('=========================================');

            //             console.log('\nAdmin SMS would be sent to:', ADMIN_PHONE);
            //             // ADMIN_PHONE_NUMBERS.forEach(phone => {
            //             //     console.log(`  - ${phone}`);
            //             // });
        }

        res.json({
            success: true,
            message: 'Notifications sent successfully',
            gstDetails: {
                baseAmount: overAllTotalAmount,
                gstPercentage: gstPercentage,
                gstAmount: gstAmount,
                totalWithGST: totalAmountWithGST
            }
        });
    } catch (error) {
        console.error("Error sending notifications:", error);
        res.status(500).json({
            success: false,
            error: "Failed to send notifications"
        });
    }
});

module.exports = router;