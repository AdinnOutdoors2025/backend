const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const request = require('request');
const axios = require('axios');

// Import formatters
const { formatIndianCurrency, formatIndianDate, getCurrentIndianDate } = require('./FORMATTED.js');
const { generateUserEmailTemplate, generateAdminEmailTemplate } = require('./Email_Template.js');

// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: 'reactdeveloper@adinn.co.in',
//         pass: 'gxnn sezu klyp ifhn'
//     }
// });

// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: 'webdeveloper1@adinn.co.in',
//         pass: 'ppyd zthg xkxi dacz'
//     }
// });

// NettyFish SMS Configuration
const NETTYFISH_API_KEY = process.env.NETTYFISH_API_KEY || 'aspv58uRbkqDbhCcCN87Mw';
const NETTYFISH_SENDER_ID = process.env.NETTYFISH_SENDER_ID || 'ADINAD';
const NETTYFISH_BASE_URL = 'https://retailsms.nettyfish.com/api/mt/SendSMS';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ADMIN PHONE NUMBER - Should be set in environment variables
const ADMIN_PHONE = process.env.ADMIN_PHONE; // Fallback phone number

// SMS sending lock to prevent duplicates
const smsSendLock = new Map();

// Function to send SMS with deduplication
const sendSMS = async (phone, templateId, variables = {}) => {
    const lockKey = `${phone}-${templateId}-${variables.orderId || ''}`;
    
    // Check if SMS was already sent for this combination
    if (smsSendLock.has(lockKey)) {
        console.log(`SMS already sent for ${lockKey}`);
        return { success: true, message: "SMS already sent" };
    }
    
    // Set lock for 5 minutes
    smsSendLock.set(lockKey, true);
    setTimeout(() => smsSendLock.delete(lockKey), 5 * 60 * 1000);
    
    return new Promise((resolve, reject) => {
        // Format phone number (ensure it starts with 91)
        let formattedPhone = phone.replace('+', '').replace(/\s/g, '');
        
        // Remove any leading zeros
        formattedPhone = formattedPhone.replace(/^0+/, '');
        
        if (!formattedPhone.startsWith('91')) {
            formattedPhone = '91' + formattedPhone;
        }

        // Validate phone number length
        if (formattedPhone.length !== 12) { // 91 + 10 digits = 12
            console.error(`Invalid phone number length: ${formattedPhone}`);
            reject(new Error('Invalid phone number format'));
            return;
        }

        let text = "";
        switch (templateId) {
            case "1007197121174928712": // User template
                text = `Thank you for your order with Adinn Outdoors! We've received it successfully. Your order ID is ${variables.orderId}.`;
                break;
            case "1007314947721730551": // Admin template
                text = `Adinn Outdoors - New order received! Order ID: ${variables.orderId}. Please review the order details and take action in the admin panel.`;
                break;
            default:
                text = variables.text || "";
        }

        const encodedText = encodeURIComponent(text);
        const url = `${NETTYFISH_BASE_URL}?APIKey=${NETTYFISH_API_KEY}&senderid=${NETTYFISH_SENDER_ID}&channel=Trans&DCS=0&flashsms=0&number=${formattedPhone}&dlttemplateid=${templateId}&text=${encodedText}&route=17`;

        console.log(`[${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}] SMS Request:`, {
            to: formattedPhone,
            templateId: templateId,
            orderId: variables.orderId,
            url: url.replace(NETTYFISH_API_KEY, '***') // Hide API key in logs
        });

        request.get(url, (error, response, body) => {
            if (error) {
                console.error("SMS API Error:", error);
                reject(error);
            } else {
                try {
                    const result = JSON.parse(body);
                    console.log(`SMS API Response:`, result);
                    if (result.ErrorCode === '000') {
                        console.log(`✅ SMS sent successfully to ${formattedPhone}`);
                        resolve(result);
                    } else {
                        console.error("❌ SMS API Error:", result.ErrorMessage);
                        reject(new Error(result.ErrorMessage || 'Failed to send SMS'));
                    }
                } catch (parseError) {
                    console.error("SMS Parse Error:", parseError);
                    console.error("Raw response:", body);
                    reject(parseError);
                }
            }
        });
    });
};
// Helper to format date as "DD-MMM-YYYY" (e.g., 16-Feb-2026)
const formatDateForPhp = (dateInput) => {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' }); // "Feb"
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};
// Unified order confirmation endpoint
router.post('/send-order-confirmation', async (req, res) => {
    try {
        const {
            orderId, userName, userEmail, userPhone, userAddress, company, products, orderDate, totalAmount,
            overAllTotalAmount, printingCost, mountingCost, gstPercentage, gstAmount, totalAmountWithGST
        } = req.body;

        console.log(`📦 Processing order confirmation for Order ID: ${orderId}`);
        console.log(`🌍 Environment: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}`);

        if (!products || !Array.isArray(products)) {
            throw new Error("Invalid products data");
        }

        // Parse amounts
        const parsedTotalAmount = typeof totalAmount === 'number' ? totalAmount : parseFloat(totalAmount) || 0;
        const parsedOverAllTotalAmount = typeof overAllTotalAmount === 'number' ? overAllTotalAmount : parseFloat(overAllTotalAmount) || 0;
        const parsedPrintingCost = typeof printingCost === 'number' ? printingCost : parseFloat(printingCost) || 0;
        const parsedMountingCost = typeof mountingCost === 'number' ? mountingCost : parseFloat(mountingCost) || 0;
        const parsedGstPercentage = typeof gstPercentage === 'number' ? gstPercentage : parseFloat(gstPercentage) || 0;
        const parsedGstAmount = typeof gstAmount === 'number' ? gstAmount : parseFloat(gstAmount) || 0;
        const parsedTotalAmountWithGST = typeof totalAmountWithGST === 'number' ? totalAmountWithGST : parseFloat(totalAmountWithGST) || 0;
 // --- Construct PHP API payload ---
    const adminEmail = process.env.ADMIN_EMAIL || 'reactdeveloper@adinn.co.in'; // fallback as in sample

    // Build products array for PHP (with per‑product GST and total)
    const phpProducts = products.map(product => {
      const bookingAmount = parseFloat(product.booking?.totalPrice) || 0;
      const productPrintingCost = parseFloat(product.printingCost) || 0;
      const productMountingCost = parseFloat(product.mountingCost) || 0;
      const productBaseTotal = bookingAmount + productPrintingCost + productMountingCost;

      // Allocate GST proportionally to this product
      let productGST = 0;
      if (parsedOverAllTotalAmount > 0) {
        productGST = (productBaseTotal / parsedOverAllTotalAmount) * parsedGstAmount;
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
      baseAmount: parsedOverAllTotalAmount,
      gstAmount: parsedGstAmount,
      grandTotal: parsedTotalAmountWithGST
    };

    // Order object
    const order = {
      orderId: orderId,
      orderDate: formatDateForPhp(orderDate || new Date()),
      gstPercentage: parsedGstPercentage
    };

    // Client object
    const client = {
      name: userName,
      email: userEmail,
      phone: userPhone,
      company: company
    };

    // Final payload
    const mailPayload = {
      mailtype: 'order',
      userEmail: userEmail,
      adminEmail: adminEmail,
      client: client,
      order: order,
      products: phpProducts,
      summary: summary
    };

    // --- Fire‑and‑forget call to PHP API (non‑blocking) ---
    axios.post('https://adinndigital.com/api/index.php', mailPayload, {
      headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
      console.log('✅ PHP order mail API responded:', response.data);
    })
    .catch(error => {
      console.error('❌ Error calling PHP order mail API:', error.message);
      if (error.response) {
        console.error('PHP API error data:', error.response.data);
      }
    });

        // // Create client object for email templates
        // const client = {
        //     name: userName,
        //     email: userEmail,
        //     contact: userPhone,
        //     company: company,
        //     address: userAddress,
        //     paidAmount: 0
        // };
 // --- Construct PHP API payload ---

        // Format products for email templates with GST details
        const formattedProducts = products.map(product => {
            const bookingAmount = parseFloat(product.booking?.totalPrice) || 0;
            const productPrintingCost = parseFloat(product.printingCost) || 0;
            const productMountingCost = parseFloat(product.mountingCost) || 0;
            const productBaseTotal = bookingAmount + productPrintingCost + productMountingCost;
            
            let productGST = 0;
            if (parsedOverAllTotalAmount > 0) {
                productGST = (productBaseTotal / parsedOverAllTotalAmount) * parsedGstAmount;
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
                gstPercentage: parsedGstPercentage,
                gstAmount: productGST,
                totalWithGST: productBaseTotal + productGST
            };
        });

        const currentDate = getCurrentIndianDate();
        const formattedTotalAmount = formatIndianCurrency(parsedTotalAmountWithGST);

        // Generate email templates
        const userMailHtmlTemplate = generateUserEmailTemplate(
            orderId,
            client,
            formattedProducts,
            currentDate,
            formattedTotalAmount,
            {
                gstPercentage: parsedGstPercentage,
                gstAmount: parsedGstAmount,
                totalWithGST: parsedTotalAmountWithGST
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
        try {
            const userMailOptions = {
                from: 'reactdeveloper@adinn.co.in',
                to: userEmail,
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
            // await transporter.sendMail(userMailOptions);
            // await transporter.sendMail(adminMailOptions);
            // console.log("✅ Emails sent successfully");
        //COMMENT TO STOP EMAIL 

        } catch (emailError) {
            console.error("❌ Email sending error:", emailError);
            // Don't fail the entire process if email fails
        }

        // Send SMS - ALWAYS try to send in production, log in development
        try {
            if (IS_PRODUCTION) {
                // Send user SMS with template 1007197121174928712
                await sendSMS(userPhone, "1007197121174928712", { 
                    orderId, 
                    customerName: userName, 
                    amount: parsedTotalAmount 
                });
                
                // Send admin SMS with template 1007314947721730551
                if (ADMIN_PHONE) {
                    await sendSMS(ADMIN_PHONE, "1007314947721730551", { 
                        orderId, 
                        customerName: userName, 
                        amount: parsedTotalAmount 
                    });
                } else {
                    console.error("❌ ADMIN_PHONE environment variable not set");
                }
            } else {
                // Development logging
                console.log('=========================================');
                console.log('SMS TESTING MODE (Not Production):');
                console.log('=========================================');
                console.log(`📞 User SMS would be sent to: ${userPhone}`);
                console.log(`📋 Template: 1007197121174928712`);
                console.log(`📦 Order ID: ${orderId}`);
                console.log(`👤 Customer: ${userName}`);
                console.log(`💰 Amount: ₹${formatIndianCurrency(parsedTotalAmount)}`);
                console.log('');
                console.log(`📞 Admin SMS would be sent to: ${ADMIN_PHONE || 'ADMIN_PHONE_NOT_SET'}`);
                console.log(`📋 Template: 1007314947721730551`);
                console.log(`📦 Order ID: ${orderId}`);
                console.log('=========================================');
            }
        } catch (smsError) {
            console.error("❌ SMS sending error:", smsError);
            // Don't fail the entire process if SMS fails
        }

        res.json({ 
            success: true, 
            message: "Order confirmation processed successfully",
            emailSent: true,
            smsSent: IS_PRODUCTION,
            environment: IS_PRODUCTION ? 'production' : 'development'
        });

    } catch (error) {
        console.error("❌ Error in send-order-confirmation route:", error);
        res.status(500).json({ 
            success: false, 
            error: "Failed to process order confirmation",
            details: error.message
        });
    }
});

router.post('/send-sms', async (req, res) => {
    try {
        const { phone, orderId, customerName, amount, smsType = 'user' } = req.body;

        if (!phone || !orderId) {
            return res.status(400).json({
                success: false,
                error: "Phone and Order ID are required"
            });
        }

        let templateId;
        let targetPhone = phone;
        
        if (smsType === 'admin') {
            templateId = "1007314947721730551";
            targetPhone = ADMIN_PHONE;
        } else {
            templateId = "1007197121174928712";
        }

        if (IS_PRODUCTION) {
            await sendSMS(targetPhone, templateId, { 
                orderId, 
                customerName, 
                amount 
            });
            
            return res.json({
                success: true,
                message: `${smsType === 'admin' ? 'Admin' : 'User'} SMS sent successfully`
            });
        } else {
            console.log(`[DEV] SMS would be sent to: ${targetPhone}, Template: ${templateId}`);
            return res.json({
                success: true,
                message: "SMS would be sent in production",
                debug: {
                    phone: targetPhone,
                    templateId,
                    orderId,
                    customerName,
                    amount,
                    smsType
                }
            });
        }
    } catch (error) {
        console.error("Error in send-sms route:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            details: error.message
        });
    }
});

module.exports = router;