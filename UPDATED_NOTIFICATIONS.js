const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const { formatIndianCurrency, formatIndianDate, getCurrentIndianDate } = require('./FORMATTED.js');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'reactdeveloper@adinn.co.in',
    pass: 'gxnn sezu klyp ifhn'
  }
});

// Helper function to calculate product totals with GST
const calculateProductTotals = (product, gstPercentage = 18) => {
  if (!product) return { bookingTotal: 0, overallBase: 0, gstAmount: 0, totalWithGST: 0 };

  const bookingTotal = product.booking?.totalPrice || 0;
  const printingCost = product.printingCost || 0;
  const mountingCost = product.mountingCost || 0;
  const overallBase = bookingTotal + printingCost + mountingCost;
  const gstAmount = Math.floor(overallBase * (gstPercentage / 100));
  const totalWithGST = overallBase + gstAmount;

  return {
    bookingTotal,
    printingCost,
    mountingCost,
    overallBase,
    gstAmount,
    totalWithGST,
    totalDays: product.booking?.totalDays || 0,
    pricePerDay: product.price || 0
  };
};

// Helper function to calculate order totals with proper GST handling
const calculateOrderTotals = (products, gstPercentage = 18) => {
  let totalBookingAmount = 0;
  let totalPrintingCost = 0;
  let totalMountingCost = 0;

  products.forEach(product => {
    if (!product.deleted) {
      totalBookingAmount += product.booking?.totalPrice || 0;
      totalPrintingCost += product.printingCost || 0;
      totalMountingCost += product.mountingCost || 0;
    }
  });

  const overallBase = totalBookingAmount + totalPrintingCost + totalMountingCost;
  const gstAmount = Math.floor(overallBase * (gstPercentage / 100));
  const totalWithGST = overallBase + gstAmount;

  return {
    totalBookingAmount,
    totalPrintingCost,
    totalMountingCost,
    overallBase,
    gstAmount,
    totalWithGST
  };
};

// Generate product details HTML for emails
const generateProductDetailsHTML = (products, gstPercentage = 18) => {
  return products.map((product, index) => {
    const productImage = product.image;
    const startDate = formatIndianDate(product.booking?.startDate);
    const endDate = formatIndianDate(product.booking?.endDate);
    const pricePerDay = formatIndianCurrency(product.price || 0);
    const totals = calculateProductTotals(product, gstPercentage);
    
    return `
      <table width="100%" cellpadding="0" cellspacing="0"
        style="border-bottom:2px solid #C4C1C1; margin-bottom:20px; padding-bottom:20px;">
        <tr>
          <td width="120">
            <img src="${productImage}"
              style="height:90px;width:90px;border-radius:10px;">
          </td>
          <td>
            <table style="font-size:16px; width:100%;">
              <tr><td style="padding:5px;"><strong>Product Name</strong></td><td>:</td><td>${product.name}</td></tr>
              <tr><td style="padding:5px;"><strong>Product Code</strong></td><td>:</td><td>${product.prodCode}</td></tr>
              <tr><td style="padding:5px;"><strong>Price Per Day</strong></td><td>:</td><td>${pricePerDay}</td></tr>
              <tr><td style="padding:5px;"><strong>Booked Dates</strong></td><td>:</td><td>${startDate} - ${endDate}</td></tr>
              <tr><td style="padding:5px;"><strong>Total Days</strong></td><td>:</td><td>${product.booking?.totalDays || 0} days</td></tr>
              <tr><td style="padding:5px;"><strong>Booking Amount</strong></td><td>:</td><td>${formatIndianCurrency(totals.bookingTotal, true)}</td></tr>
              <tr><td style="padding:5px;"><strong>Printing Cost</strong></td><td>:</td><td>${formatIndianCurrency(totals.printingCost, true)}</td></tr>
              <tr><td style="padding:5px;"><strong>Mounting Cost</strong></td><td>:</td><td>${formatIndianCurrency(totals.mountingCost, true)}</td></tr>
              <tr><td style="padding:5px;"><strong>Base Amount (Excl. GST)</strong></td><td>:</td><td>${formatIndianCurrency(totals.overallBase, true)}</td></tr>
              <tr><td style="padding:5px;"><strong>GST @${gstPercentage}%</strong></td><td>:</td><td>${formatIndianCurrency(totals.gstAmount, true)}</td></tr>
              <tr style="border-top:2px solid #000;">
                <td style="padding:5px; font-weight:700; color:#E31F25;"><strong>Total (Incl. GST)</strong></td>
                <td style="font-weight:700; color:#E31F25;">:</td>
                <td style="padding:5px; font-weight:700; color:#E31F25;">${formatIndianCurrency(totals.totalWithGST, true)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;
  }).join('');
};

// Generate email footer
const generateEmailFooter = () => {
  return `
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
  `;
};

// 1. Cancellation Notification
router.post('/send-cancellation-notification', async (req, res) => {
  try {
    const { orderId, client, cancelReason, orderDetails, handler, createdAt, totalItems } = req.body;

    if (!orderId || !client || !cancelReason) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const currentDate = getCurrentIndianDate();
    const gstPercentage = orderDetails.client?.gstPercentage || 18;
    const totals = calculateOrderTotals(orderDetails.products || [], gstPercentage);
    const formattedTotalAmount = formatIndianCurrency(totals.totalWithGST, true);
    const formattedCreatedOrderDate = formatIndianDate(createdAt);

    // User Email Template
    const userMailHtmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <title>Order Cancellation</title>
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
            background: linear-gradient(180deg,#dc3545 0%,#c82333 100%);
            font-weight:700;
            font-size:35px;
            color:#FFFFFF;">
            Order Cancellation Notification
          </div>

          <!-- Intro -->
          <div style="font-size:24px; font-weight:600; margin:30px 0;">Hi ${client.name},</div>

          <!-- Order Details -->
          <div style="margin:30px 0;">
            <table border="1" cellpadding="0" cellspacing="0"
              style="border-collapse:collapse; width:100%; border:1px solid gray; text-align:center;">
              <thead>
                <tr style="color:#E31F25; font-weight:600; font-size:20px;">
                  <th style="padding:12px;">Order ID</th>
                  <th style="padding:12px;">Order Date</th>
                  <th style="padding:12px;">Status</th>
                  <th style="padding:12px;">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding:12px;">${orderId}</td>
                  <td style="padding:12px;">${formatIndianDate(createdAt)}</td>
                  <td style="padding:12px; color:#dc3545; font-weight:bold;">CANCELLED</td>
                  <td style="padding:12px; font-weight:600; color:#2ecc71;">${formattedTotalAmount}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Cancellation Reason -->
          <div style="margin:30px 0; padding:20px; background:#fff3f3; border-left:4px solid #dc3545;">
            <h3 style="color:#dc3545; margin-top:0;">Cancellation Reason:</h3>
            <p style="font-size:18px; margin:10px 0;">${cancelReason}</p>
          </div>

          <!-- Product Details -->
          <div>
            <h3>Product Details:</h3>
            ${generateProductDetailsHTML(orderDetails.products, gstPercentage)}
          </div>

          <!-- Message -->
          <div style="font-size:20px; margin:30px 0;">
            If you have any questions regarding this cancellation, please contact our support team.
          </div>

          <div style="font-size:20px; margin:20px 0;">
            <div>We hope to serve you better in the future.</div>
            <div>Thank you for your understanding.</div>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>
    `;

    // Admin Email Template
    const adminMailHtmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <title>Order Cancelled - Admin Notification</title>
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
            background: linear-gradient(180deg,#dc3545 0%,#c82333 100%);
            font-weight:700;
            font-size:35px;
            color:#FFFFFF;">
            ORDER CANCELLED - Action Required
          </div>

          <!-- Intro -->
          <div style="font-size:24px; font-weight:600; margin:30px 0;">Hi Admin Team,</div>

          <!-- Important Info -->
          <div style="margin:30px 0; padding:20px; background:#fff3f3; border:2px solid #dc3545; border-radius:8px;">
            <h3 style="color:#dc3545; margin-top:0;">⚠️ IMPORTANT: Order ${orderId} has been cancelled</h3>
            <p style="font-size:18px;"><strong>Cancelled by:</strong> ${handler || 'Not specified'}</p>
            <p style="font-size:18px;"><strong>Reason:</strong> ${cancelReason}</p>
            <p style="font-size:18px;"><strong>Date:</strong> ${currentDate}</p>
          </div>

          <!-- Order Summary -->
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
                  <td style="padding:12px;">${orderId}</td>
                  <td style="padding:12px;">${formatIndianDate(createdAt)}</td>
                  <td style="padding:12px;">${totalItems}</td>
                  <td style="padding:12px; font-weight:600; color:#dc3545;">${formattedTotalAmount}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Customer Details -->
          <div style="margin:30px 0;">
            <h3>Customer Details:</h3>
            <table border="1" cellpadding="0" cellspacing="0"
              style="border-collapse:collapse; width:100%; border:1px solid #ddd;">
              <tr>
                <td style="padding:12px; background:#f8f9fa;"><strong>Name:</strong></td>
                <td style="padding:12px;">${client.name}</td>
              </tr>
              <tr>
                <td style="padding:12px; background:#f8f9fa;"><strong>Email:</strong></td>
                <td style="padding:12px;">${client.email}</td>
              </tr>
              <tr>
                <td style="padding:12px; background:#f8f9fa;"><strong>Phone:</strong></td>
                <td style="padding:12px;"><a href="tel:${client.contact}" style="color:#2B3333; text-decoration:none;">${client.contact}</a></td>
              </tr>
              <tr>
                <td style="padding:12px; background:#f8f9fa;"><strong>Company:</strong></td>
                <td style="padding:12px;">${client.company || 'Not specified'}</td>
              </tr>
            </table>
          </div>

          <!-- Product Details -->
          <div>
            <h3>Cancelled Products:</h3>
            ${generateProductDetailsHTML(orderDetails.products, gstPercentage)}
          </div>

          <!-- Action Required -->
          <div style="margin:30px 0; padding:20px; background:#e8f4ff; border-left:4px solid #007bff;">
            <h3 style="color:#007bff;">📋 Action Required:</h3>
            <ul style="font-size:18px;">
              <li>Update inventory records</li>
              <li>Process any refunds if applicable</li>
              <li>Update financial records</li>
              <li>Notify relevant departments</li>
            </ul>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>
    `;

    // Send emails
    const userMailOptions = {
      from: 'reactdeveloper@adinn.co.in',
      to: client.email,
      subject: `Order Cancellation - ${orderId}`,
      html: userMailHtmlTemplate
    };

    const adminMailOptions = {
      from: 'reactdeveloper@adinn.co.in',
      to: 'reactdeveloper@adinn.co.in',
      subject: `🚨 ORDER CANCELLED - ${orderId}`,
      html: adminMailHtmlTemplate
    };

    await transporter.sendMail(userMailOptions);
    await transporter.sendMail(adminMailOptions);

    res.json({ success: true, message: "Cancellation notifications sent successfully" });
  } catch (error) {
    console.error("Error sending cancellation notification:", error);
    res.status(500).json({ success: false, error: "Failed to send notifications" });
  }
});

// 2. Product Deletion/Restoration Notification
router.post('/send-product-deletion-notification', async (req, res) => {
  try {
    const { orderId, productId, productName, client, orderDetails, action, handler, createdAt } = req.body;

    if (!orderId || !client || !orderDetails) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const currentDate = getCurrentIndianDate();
    const isDeleting = action === "delete";
    const gstPercentage = orderDetails.client?.gstPercentage || 18;

    // Get ALL products from orderDetails
    const allProducts = orderDetails.products || [];

    // Calculate counts based on ACTUAL current state of products
    let activeProductsCount = 0;
    let deletedProductsCount = 0;

    allProducts.forEach(product => {
      if (product.deleted) {
        deletedProductsCount++;
      } else {
        activeProductsCount++;
      }
    });

    console.log('Product counts after update:', {
      total: allProducts.length,
      active: activeProductsCount,
      deleted: deletedProductsCount,
      action: action
    });

    // Calculate total amount from ACTIVE products only
    const activeProducts = allProducts.filter(p => !p.deleted);
    const totals = calculateOrderTotals(activeProducts, gstPercentage);
    const formattedTotalAmount = formatIndianCurrency(totals.totalWithGST, true);

    // Get the specific product details
    const product = allProducts.find(p => p._id === productId) || {};
    const productCode = product.prodCode || 'N/A';
    const productImage = product.image || '';
    const productPrice = product.price || 0;
    const productBooking = product.booking;
    const productTotals = calculateProductTotals(product, gstPercentage);

    // User Email Template
    const userMailHtmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <title>Product ${isDeleting ? 'Marked as Deleted' : 'Restored'}</title>
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
            background: linear-gradient(180deg,${isDeleting ? '#ff9800' : '#28a745'} 0%,${isDeleting ? '#f57c00' : '#218838'} 100%);
            font-weight:700;
            font-size:35px;
            color:#FFFFFF;">
            Product ${isDeleting ? 'Marked as Deleted' : 'Restored'}
          </div>

          <!-- Intro -->
          <div style="font-size:24px; font-weight:600; margin:30px 0;">Hi ${client.name},</div>

          <!-- Update Message -->
          <div style="margin:30px 0; padding:20px; background:${isDeleting ? '#fff8e1' : '#d4edda'}; border-left:4px solid ${isDeleting ? '#ff9800' : '#28a745'};">
            <h3 style="color:${isDeleting ? '#ff9800' : '#28a745'}; margin-top:0;">
              ${isDeleting ? '⚠️ Product Marked as Deleted' : '✅ Product Restored'}
            </h3>
            <p style="font-size:18px; margin:10px 0;">
              The product <strong>"${productName}"</strong> has been ${isDeleting ? 'marked as deleted' : 'restored'} in your order <strong>${orderId}</strong>.
            </p>
            ${handler ? `<p style="font-size:16px; margin:10px 0;"><strong>Action performed by:</strong> ${handler}</p>` : ''}
            <p style="font-size:16px; margin:10px 0;"><strong>Date:</strong> ${currentDate}</p>
          </div>

          <!-- Product Details -->
          <h3>Product Details:</h3>
          <table width="100%" cellpadding="0" cellspacing="0"
            style="border-bottom:2px solid #C4C1C1; margin-bottom:20px; padding-bottom:20px;">
            <tr>
              <td width="120">
                <img src="${productImage}"
                  style="height:90px;width:90px;border-radius:10px;">
              </td>
              <td>
                <table style="font-size:16px; width:100%;">
                  <tr><td style="padding:5px;"><strong>Product Name</strong></td><td>:</td><td>${productName}</td></tr>
                  <tr><td style="padding:5px;"><strong>Product Code</strong></td><td>:</td><td>${productCode}</td></tr>
                  <tr><td style="padding:5px;"><strong>Price Per Day</strong></td><td>:</td><td>${formatIndianCurrency(productPrice, true)}</td></tr>
                  <tr><td style="padding:5px;"><strong>Booked Dates</strong></td><td>:</td><td>${formatIndianDate(productBooking?.startDate)} - ${formatIndianDate(productBooking?.endDate)}</td></tr>
                  <tr><td style="padding:5px;"><strong>Total Days</strong></td><td>:</td><td>${productBooking?.totalDays || 0} days</td></tr>
                  <tr><td style="padding:5px;"><strong>Booking Amount</strong></td><td>:</td><td>${formatIndianCurrency(productTotals.bookingTotal, true)}</td></tr>
                  <tr><td style="padding:5px;"><strong>Printing Cost</strong></td><td>:</td><td>${formatIndianCurrency(productTotals.printingCost, true)}</td></tr>
                  <tr><td style="padding:5px;"><strong>Mounting Cost</strong></td><td>:</td><td>${formatIndianCurrency(productTotals.mountingCost, true)}</td></tr>
                  <tr><td style="padding:5px;"><strong>Base Amount (Excl. GST)</strong></td><td>:</td><td>${formatIndianCurrency(productTotals.overallBase, true)}</td></tr>
                  <tr><td style="padding:5px;"><strong>GST @${gstPercentage}%</strong></td><td>:</td><td>${formatIndianCurrency(productTotals.gstAmount, true)}</td></tr>
                  <tr style="border-top:2px solid #000;">
                    <td style="padding:5px; font-weight:700; color:#E31F25;"><strong>Total (Incl. GST)</strong></td>
                    <td style="font-weight:700; color:#E31F25;">:</td>
                    <td style="padding:5px; font-weight:700; color:#E31F25;">${formatIndianCurrency(productTotals.totalWithGST, true)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Order Summary -->
          <div style="margin:30px 0;">
            <h3>Order Status After Update:</h3>
            <table border="1" cellpadding="0" cellspacing="0"
              style="border-collapse:collapse; width:100%; border:1px solid #ddd; text-align:center;">
              <thead>
                <tr style="color:#E31F25; font-weight:600; font-size:18px;">
                  <th style="padding:12px;">Order ID</th>
                  <th style="padding:12px;">Order Date</th>
                  <th style="padding:12px;">Active Products</th>
                  <th style="padding:12px;">Deleted Products</th>
                  <th style="padding:12px;">Total Products</th>
                  <th style="padding:12px;">Updated Total (Incl. GST)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding:12px;">${orderId}</td>
                  <td style="padding:12px;">${formatIndianDate(createdAt)}</td>
                  <td style="padding:12px; color:#28a745; font-weight:bold;">${activeProductsCount}</td>
                  <td style="padding:12px; color:${isDeleting ? '#ff9800' : '#6c757d'};">${deletedProductsCount}</td>
                  <td style="padding:12px; font-weight:600;">${allProducts.length}</td>
                  <td style="padding:12px; font-weight:600; color:#2ecc71;">${formattedTotalAmount}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Important Notes -->
          <div style="margin:30px 0; padding:20px; background:${isDeleting ? '#fff8e1' : '#d4edda'}; border-radius:8px;">
            <h4 style="color:${isDeleting ? '#ff9800' : '#28a745'}; margin-top:0;">
              ${isDeleting ? '📝 Important Note:' : '✅ Restoration Complete:'}
            </h4>
            <ul style="font-size:16px; margin:10px 0; padding-left:20px;">
              ${isDeleting ? `
                <li>The product <strong>"${productName}"</strong> has been marked as deleted</li>
                <li>It will be shown with strikeout in your order</li>
                <li>It will NOT be included in total amount calculations</li>
                <li>The booked dates for this product are now AVAILABLE for other customers</li>
                <li>You can restore this product anytime if needed</li>
              ` : `
                <li>The product <strong>"${productName}"</strong> has been successfully restored</li>
                <li>It will now be included in total amount calculations</li>
                <li>The booked dates for this product are now RESERVED again</li>
                <li>Product is fully active in your order</li>
              `}
            </ul>
          </div>

          <!-- Contact Info -->
          <div style="font-size:18px; margin:30px 0; padding:15px; background:#f8f9fa; border-radius:6px;">
            <p style="margin:5px 0;">
              <strong>Need assistance?</strong> Contact our support team if you have any questions.
            </p>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>
    `;

    // Admin Email Template
    const adminMailHtmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <title>Product ${isDeleting ? 'Deleted' : 'Restored'} - Admin Notification</title>
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
            background: linear-gradient(180deg,${isDeleting ? '#ff9800' : '#28a745'} 0%,${isDeleting ? '#f57c00' : '#218838'} 100%);
            font-weight:700;
            font-size:35px;
            color:#FFFFFF;">
            Product ${isDeleting ? 'Deleted' : 'Restored'} - Order ${orderId}
          </div>

          <!-- Intro -->
          <div style="font-size:24px; font-weight:600; margin:30px 0;">Hi Admin Team,</div>

          <!-- Alert Box -->
          <div style="margin:30px 0; padding:20px; background:${isDeleting ? '#fff8e1' : '#d4edda'}; border:2px solid ${isDeleting ? '#ff9800' : '#28a745'}; border-radius:8px;">
            <h3 style="color:${isDeleting ? '#ff9800' : '#28a745'}; margin-top:0;">
              ${isDeleting ? '⚠️ PRODUCT MARKED AS DELETED' : '✅ PRODUCT RESTORED'}
            </h3>
            <p style="font-size:18px;"><strong>Order ID:</strong> ${orderId}</p>
            <p style="font-size:18px;"><strong>Order Date:</strong> ${formatIndianDate(createdAt)}</p>
            <p style="font-size:18px;"><strong>Product:</strong> ${productName} (${productCode})</p>
            <p style="font-size:18px;"><strong>Action:</strong> ${isDeleting ? 'Marked as Deleted' : 'Restored'}</p>
            <p style="font-size:18px;"><strong>Performed by:</strong> ${handler || 'System'}</p>
            <p style="font-size:18px;"><strong>Date:</strong> ${currentDate}</p>
            
            <!-- Date Availability Note -->
            <div style="margin-top:15px; padding:10px; background:${isDeleting ? '#e8f4ff' : '#f8f9fa'}; border-radius:6px;">
              <p style="font-size:16px; margin:5px 0; color:#007bff;">
                ${isDeleting ?
        '📅 The booked dates for this product are now AVAILABLE for other orders.' :
        '📅 The booked dates for this product are now RESERVED again.'
      }
              </p>
            </div>
          </div>

          <!-- Order Statistics -->
          <div style="margin:30px 0; padding:20px; background:#f8f9fa; border-radius:8px;">
            <h3>Order Statistics After Update:</h3>
            <table style="font-size:18px; width:100%; border-collapse: collapse;">
              <tr>
                <td style="padding:12px; background:#e9ecef; border:1px solid #dee2e6;"><strong>Total Products in Order:</strong></td>
                <td style="padding:12px; border:1px solid #dee2e6; font-weight:bold;">${allProducts.length}</td>
              </tr>
              <tr>
                <td style="padding:12px; background:#e9ecef; border:1px solid #dee2e6;"><strong>Active Products:</strong></td>
                <td style="padding:12px; border:1px solid #dee2e6; color:#28a745; font-weight:bold;">${activeProductsCount}</td>
              </tr>
              <tr>
                <td style="padding:12px; background:#e9ecef; border:1px solid #dee2e6;"><strong>Deleted Products:</strong></td>
                <td style="padding:12px; border:1px solid #dee2e6; color:${isDeleting ? '#ff9800' : '#6c757d'};">${deletedProductsCount}</td>
              </tr>
              <tr>
                <td style="padding:12px; background:#e9ecef; border:1px solid #dee2e6;"><strong>Total Booking Amount:</strong></td>
                <td style="padding:12px; border:1px solid #dee2e6;">${formatIndianCurrency(totals.totalBookingAmount, true)}</td>
              </tr>
              <tr>
                <td style="padding:12px; background:#e9ecef; border:1px solid #dee2e6;"><strong>Printing + Mounting:</strong></td>
                <td style="padding:12px; border:1px solid #dee2e6;">${formatIndianCurrency(totals.totalPrintingCost + totals.totalMountingCost, true)}</td>
              </tr>
              <tr>
                <td style="padding:12px; background:#e9ecef; border:1px solid #dee2e6;"><strong>Base Amount (Excl. GST):</strong></td>
                <td style="padding:12px; border:1px solid #dee2e6;">${formatIndianCurrency(totals.overallBase, true)}</td>
              </tr>
              <tr>
                <td style="padding:12px; background:#e9ecef; border:1px solid #dee2e6;"><strong>GST @${gstPercentage}%:</strong></td>
                <td style="padding:12px; border:1px solid #dee2e6;">${formatIndianCurrency(totals.gstAmount, true)}</td>
              </tr>
              <tr style="border-top:2px solid #000;">
                <td style="padding:12px; background:#e9ecef; border:1px solid #dee2e6; font-weight:700; color:#E31F25;"><strong>Updated Total (Incl. GST):</strong></td>
                <td style="padding:12px; border:1px solid #dee2e6; font-weight:700; color:#E31F25;">${formattedTotalAmount}</td>
              </tr>
            </table>
          </div>

          <!-- Product Details -->
          <h3>Product Details:</h3>
          <table width="100%" cellpadding="0" cellspacing="0"
            style="border-bottom:2px solid #C4C1C1; margin-bottom:20px; padding-bottom:20px;">
            <tr>
              <td width="120">
                <img src="${productImage}"
                  style="height:90px;width:90px;border-radius:10px;">
              </td>
              <td>
                <table style="font-size:16px; width:100%;">
                  <tr><td style="padding:5px;"><strong>Product Name</strong></td><td>:</td><td>${productName}</td></tr>
                  <tr><td style="padding:5px;"><strong>Product Code</strong></td><td>:</td><td>${productCode}</td></tr>
                  <tr><td style="padding:5px;"><strong>Price Per Day</strong></td><td>:</td><td>${formatIndianCurrency(productPrice, true)}</td></tr>
                  <tr><td style="padding:5px;"><strong>Booked Dates</strong></td><td>:</td><td>${formatIndianDate(productBooking?.startDate)} - ${formatIndianDate(productBooking?.endDate)}</td></tr>
                  <tr><td style="padding:5px;"><strong>Total Days</strong></td><td>:</td><td>${productBooking?.totalDays || 0} days</td></tr>
                  <tr><td style="padding:5px;"><strong>Booking Amount</strong></td><td>:</td><td>${formatIndianCurrency(productTotals.bookingTotal, true)}</td></tr>
                  <tr><td style="padding:5px;"><strong>Printing Cost</strong></td><td>:</td><td>${formatIndianCurrency(productTotals.printingCost, true)}</td></tr>
                  <tr><td style="padding:5px;"><strong>Mounting Cost</strong></td><td>:</td><td>${formatIndianCurrency(productTotals.mountingCost, true)}</td></tr>
                  <tr><td style="padding:5px;"><strong>Base Amount (Excl. GST)</strong></td><td>:</td><td>${formatIndianCurrency(productTotals.overallBase, true)}</td></tr>
                  <tr><td style="padding:5px;"><strong>GST @${gstPercentage}%</strong></td><td>:</td><td>${formatIndianCurrency(productTotals.gstAmount, true)}</td></tr>
                  <tr style="border-top:2px solid #000;">
                    <td style="padding:5px; font-weight:700; color:#E31F25;"><strong>Total (Incl. GST)</strong></td>
                    <td style="font-weight:700; color:#E31F25;">:</td>
                    <td style="padding:5px; font-weight:700; color:#E31F25;">${formatIndianCurrency(productTotals.totalWithGST, true)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Customer Info -->
          <div style="margin:30px 0;">
            <h3>Customer Information:</h3>
            <table border="1" cellpadding="0" cellspacing="0"
              style="border-collapse:collapse; width:100%; border:1px solid #ddd;">
              <tr>
                <td style="padding:12px; background:#f8f9fa; width:30%;"><strong>Name:</strong></td>
                <td style="padding:12px;">${client.name}</td>
              </tr>
              <tr>
                <td style="padding:12px; background:#f8f9fa;"><strong>Email:</strong></td>
                <td style="padding:12px;">${client.email}</td>
              </tr>
              <tr>
                <td style="padding:12px; background:#f8f9fa;"><strong>Phone:</strong></td>
                <td style="padding:12px;"><a href="tel:${client.contact}" style="color:#2B3333; text-decoration:none;">${client.contact}</a></td>
              </tr>
              <tr>
                <td style="padding:12px; background:#f8f9fa;"><strong>Company:</strong></td>
                <td style="padding:12px;">${client.company || 'Not specified'}</td>
              </tr>
            </table>
          </div>

          <!-- Action Required -->
          <div style="margin:30px 0; padding:20px; background:#e8f4ff; border-left:4px solid #007bff;">
            <h3 style="color:#007bff;">📋 System Actions Required:</h3>
            <ul style="font-size:18px;">
              ${isDeleting ? `
                <li><strong>Inventory Update:</strong> Mark product as deleted in inventory records</li>
                <li><strong>Date Availability:</strong> The booked dates (${productBooking?.totalDays || 0} days) are now AVAILABLE for other bookings</li>
                <li><strong>Financial Update:</strong> Adjust total amount (reduced by ${formatIndianCurrency(productTotals.totalWithGST, true)})</li>
                <li><strong>Calendar Update:</strong> Update booking calendar to show dates as available</li>
              ` : `
                <li><strong>Inventory Update:</strong> Restore product in inventory records</li>
                <li><strong>Date Reservation:</strong> The booked dates (${productBooking?.totalDays || 0} days) are now RESERVED again</li>
                <li><strong>Financial Update:</strong> Adjust total amount (increased by ${formatIndianCurrency(productTotals.totalWithGST, true)})</li>
                <li><strong>Calendar Update:</strong> Update booking calendar to show dates as booked</li>
              `}
            </ul>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>
    `;

    // Send emails
    const userMailOptions = {
      from: 'reactdeveloper@adinn.co.in',
      to: client.email,
      subject: `Product ${isDeleting ? 'Marked as Deleted' : 'Restored'} - Order ${orderId}`,
      html: userMailHtmlTemplate
    };

    const adminMailOptions = {
      from: 'reactdeveloper@adinn.co.in',
      to: 'reactdeveloper@adinn.co.in',
      subject: `🔄 Product ${isDeleting ? 'Deleted' : 'Restored'} - Order ${orderId}`,
      html: adminMailHtmlTemplate
    };

    await transporter.sendMail(userMailOptions);
    await transporter.sendMail(adminMailOptions);

    res.json({
      success: true,
      message: `Product ${isDeleting ? 'deletion' : 'restoration'} notification sent successfully`,
      counts: {
        totalProducts: allProducts.length,
        activeProducts: activeProductsCount,
        deletedProducts: deletedProductsCount,
        totalAmount: formattedTotalAmount
      }
    });
  } catch (error) {
    console.error("Error sending product deletion/restoration notification:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send notification",
      details: error.message
    });
  }
});

// 3. Date Update Notification - UPDATED with complete amount details
router.post('/send-date-update-notification', async (req, res) => {
  try {
    const { orderId, client, product, oldDates, newDates, orderDetails, handler, createdAt } = req.body;

    if (!orderId || !client || !product || !newDates) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const currentDate = getCurrentIndianDate();
    const gstPercentage = orderDetails.client?.gstPercentage || 18;
    
    // Create product objects with old and new dates for calculations
    const productWithOldDates = {
      ...product,
      booking: oldDates || product.booking
    };
    
    const productWithNewDates = {
      ...product,
      booking: {
        ...product.booking,
        startDate: newDates.startDate,
        endDate: newDates.endDate,
        totalDays: newDates.totalDays,
        totalPrice: newDates.totalPrice
      }
    };

    // Calculate totals for old and new dates
    const oldTotals = calculateProductTotals(productWithOldDates, gstPercentage);
    const newTotals = calculateProductTotals(productWithNewDates, gstPercentage);
    
    // Calculate order totals for context
    const updatedProducts = orderDetails.products.map(p => {
      if (p._id === product._id) {
        return productWithNewDates;
      }
      return p;
    });
    const orderTotals = calculateOrderTotals(updatedProducts, gstPercentage);

    // Format values
    const formattedOldStart = oldDates?.startDate ? formatIndianDate(oldDates.startDate) : 'Not previously set';
    const formattedOldEnd = oldDates?.endDate ? formatIndianDate(oldDates.endDate) : 'Not previously set';
    const formattedNewStart = formatIndianDate(newDates.startDate);
    const formattedNewEnd = formatIndianDate(newDates.endDate);
    
    // Calculate differences
    const daysDifference = newDates.totalDays - (oldDates?.totalDays || 0);
    const bookingAmountDifference = newDates.totalPrice - (oldDates?.totalPrice || 0);
    const overallBaseDifference = newTotals.overallBase - oldTotals.overallBase;
    const gstAmountDifference = newTotals.gstAmount - oldTotals.gstAmount;
    const totalWithGSTDifference = newTotals.totalWithGST - oldTotals.totalWithGST;

    // User Email Template - COMPLETELY UPDATED with full amount details
    const userMailHtmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <title>Booking Dates Updated with Amount Changes</title>
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
            background: linear-gradient(180deg,#007bff 0%,#0056b3 100%);
            font-weight:700;
            font-size:35px;
            color:#FFFFFF;">
            Booking Dates & Amount Updated
          </div>

          <!-- Intro -->
          <div style="font-size:24px; font-weight:600; margin:30px 0;">Hi ${client.name},</div>

          <!-- Update Message -->
          <div style="margin:30px 0; padding:20px; background:#e7f3ff; border-left:4px solid #007bff;">
            <h3 style="color:#007bff; margin-top:0;">📅 Booking Dates Successfully Updated</h3>
            <p style="font-size:18px; margin:10px 0;">
              The booking dates for your product have been updated. The changes have been reflected in your order amount.
            </p>
          </div>

          <!-- Product Info -->
          <div style="margin:30px 0; padding:20px; background:#f8f9fa; border-radius:8px;">
            <h3>Product Details:</h3>
            <table style="font-size:18px; width:100%; border-collapse: collapse;">
              <tr>
                <td style="padding:8px; width:40%; background:#e9ecef;"><strong>Product Name:</strong></td>
                <td style="padding:8px;">${product.name}</td>
              </tr>
              <tr>
                <td style="padding:8px; background:#e9ecef;"><strong>Product Code:</strong></td>
                <td style="padding:8px;">${product.prodCode}</td>
              </tr>
              <tr>
                <td style="padding:8px; background:#e9ecef;"><strong>Order ID:</strong></td>
                <td style="padding:8px; font-weight:bold;">${orderId}</td>
              </tr>
              <tr>
                <td style="padding:8px; background:#e9ecef;"><strong>Order Date:</strong></td>
                <td style="padding:8px;">${formatIndianDate(createdAt)}</td>
              </tr>
            </table>
          </div>

          <!-- Date Comparison -->
          <div style="margin:30px 0;">
            <h3>Date Changes Summary:</h3>
            <table border="1" cellpadding="0" cellspacing="0"
              style="border-collapse:collapse; width:100%; border:1px solid #ddd; text-align:center;">
              <thead>
                <tr style="background:#007bff; color:#fff; font-weight:600; font-size:16px;">
                  <th style="padding:12px;">Description</th>
                  <th style="padding:12px;">Previous</th>
                  <th style="padding:12px;">Updated</th>
                  <th style="padding:12px;">Change</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding:12px; background:#f8f9fa;"><strong>Start Date</strong></td>
                  <td style="padding:12px;">${formattedOldStart}</td>
                  <td style="padding:12px; font-weight:bold; color:#007bff;">${formattedNewStart}</td>
                  <td style="padding:12px;">→</td>
                </tr>
                <tr>
                  <td style="padding:12px; background:#f8f9fa;"><strong>End Date</strong></td>
                  <td style="padding:12px;">${formattedOldEnd}</td>
                  <td style="padding:12px; font-weight:bold; color:#007bff;">${formattedNewEnd}</td>
                  <td style="padding:12px;">→</td>
                </tr>
                <tr>
                  <td style="padding:12px; background:#f8f9fa;"><strong>Duration</strong></td>
                  <td style="padding:12px;">${oldDates?.totalDays || 0} days</td>
                  <td style="padding:12px; font-weight:bold; color:#007bff;">${newDates.totalDays} days</td>
                  <td style="padding:12px; color:${daysDifference >= 0 ? '#28a745' : '#dc3545'}; font-weight:bold;">
                    ${daysDifference >= 0 ? '+' : ''}${daysDifference} days
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Amount Changes - NEW SECTION -->
          <div style="margin:30px 0;">
            <h3>Amount Changes (Including GST):</h3>
            <table border="1" cellpadding="0" cellspacing="0"
              style="border-collapse:collapse; width:100%; border:1px solid #ddd; text-align:center;">
              <thead>
                <tr style="background:#28a745; color:#fff; font-weight:600; font-size:16px;">
                  <th style="padding:12px;">Component</th>
                  <th style="padding:12px;">Previous Amount</th>
                  <th style="padding:12px;">Updated Amount</th>
                  <th style="padding:12px;">Difference</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding:12px; background:#f8f9fa;"><strong>Booking Amount</strong></td>
                  <td style="padding:12px;">${formatIndianCurrency(oldTotals.bookingTotal, true)}</td>
                  <td style="padding:12px; font-weight:bold;">${formatIndianCurrency(newTotals.bookingTotal, true)}</td>
                  <td style="padding:12px; color:${bookingAmountDifference >= 0 ? '#28a745' : '#dc3545'}; font-weight:bold;">
                    ${bookingAmountDifference >= 0 ? '+' : ''}${formatIndianCurrency(bookingAmountDifference, true)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px; background:#f8f9fa;"><strong>Printing Cost</strong></td>
                  <td style="padding:12px;">${formatIndianCurrency(oldTotals.printingCost, true)}</td>
                  <td style="padding:12px;">${formatIndianCurrency(newTotals.printingCost, true)}</td>
                  <td style="padding:12px;">No change</td>
                </tr>
                <tr>
                  <td style="padding:12px; background:#f8f9fa;"><strong>Mounting Cost</strong></td>
                  <td style="padding:12px;">${formatIndianCurrency(oldTotals.mountingCost, true)}</td>
                  <td style="padding:12px;">${formatIndianCurrency(newTotals.mountingCost, true)}</td>
                  <td style="padding:12px;">No change</td>
                </tr>
                <tr style="border-top:2px solid #000;">
                  <td style="padding:12px; background:#f8f9fa;"><strong>Base Amount (Excl. GST)</strong></td>
                  <td style="padding:12px;">${formatIndianCurrency(oldTotals.overallBase, true)}</td>
                  <td style="padding:12px; font-weight:bold;">${formatIndianCurrency(newTotals.overallBase, true)}</td>
                  <td style="padding:12px; color:${overallBaseDifference >= 0 ? '#28a745' : '#dc3545'}; font-weight:bold;">
                    ${overallBaseDifference >= 0 ? '+' : ''}${formatIndianCurrency(overallBaseDifference, true)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px; background:#f8f9fa;"><strong>GST @${gstPercentage}%</strong></td>
                  <td style="padding:12px;">${formatIndianCurrency(oldTotals.gstAmount, true)}</td>
                  <td style="padding:12px; font-weight:bold;">${formatIndianCurrency(newTotals.gstAmount, true)}</td>
                  <td style="padding:12px; color:${gstAmountDifference >= 0 ? '#28a745' : '#dc3545'}; font-weight:bold;">
                    ${gstAmountDifference >= 0 ? '+' : ''}${formatIndianCurrency(gstAmountDifference, true)}
                  </td>
                </tr>
                <tr style="border-top:2px solid #000; background:#fff3cd;">
                  <td style="padding:12px; font-weight:700; color:#E31F25;"><strong>TOTAL (Incl. GST)</strong></td>
                  <td style="padding:12px; font-weight:700;">${formatIndianCurrency(oldTotals.totalWithGST, true)}</td>
                  <td style="padding:12px; font-weight:700; color:#E31F25;">${formatIndianCurrency(newTotals.totalWithGST, true)}</td>
                  <td style="padding:12px; font-weight:700; color:${totalWithGSTDifference >= 0 ? '#28a745' : '#dc3545'};">
                    ${totalWithGSTDifference >= 0 ? '+' : ''}${formatIndianCurrency(totalWithGSTDifference, true)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Updated Order Summary -->
          <div style="margin:30px 0; padding:20px; background:#e8f5e9; border-radius:8px;">
            <h3 style="color:#28a745; margin-top:0;">📊 Updated Order Summary</h3>
            <table style="font-size:18px; width:100%; border-collapse: collapse;">
              <tr>
                <td style="padding:10px; width:50%;"><strong>Total Booking Amount:</strong></td>
                <td style="padding:10px;">${formatIndianCurrency(orderTotals.totalBookingAmount, true)}</td>
              </tr>
              <tr>
                <td style="padding:10px;"><strong>Printing + Mounting Cost:</strong></td>
                <td style="padding:10px;">${formatIndianCurrency(orderTotals.totalPrintingCost + orderTotals.totalMountingCost, true)}</td>
              </tr>
              <tr>
                <td style="padding:10px;"><strong>Base Amount (Excl. GST):</strong></td>
                <td style="padding:10px;">${formatIndianCurrency(orderTotals.overallBase, true)}</td>
              </tr>
              <tr>
                <td style="padding:10px;"><strong>GST @${gstPercentage}%:</strong></td>
                <td style="padding:10px;">${formatIndianCurrency(orderTotals.gstAmount, true)}</td>
              </tr>
              <tr style="border-top:2px solid #000;">
                <td style="padding:10px; font-weight:700; color:#E31F25;"><strong>ORDER TOTAL (Incl. GST):</strong></td>
                <td style="padding:10px; font-weight:700; color:#E31F25;">${formatIndianCurrency(orderTotals.totalWithGST, true)}</td>
              </tr>
            </table>
          </div>

          <!-- Important Note -->
          <div style="margin:30px 0; padding:20px; background:#fff3cd; border-left:4px solid #ffc107; border-radius:8px;">
            <h4 style="color:#856404; margin-top:0;">📝 Important Note:</h4>
            <ul style="font-size:16px; margin:10px 0;">
              <li>The updated amount will reflect in your invoice</li>
              <li>Your payment schedule has been adjusted accordingly</li>
              <li>${daysDifference !== 0 ? `The booking period has ${daysDifference > 0 ? 'increased' : 'decreased'} by ${Math.abs(daysDifference)} days` : ''}</li>
            </ul>
          </div>

          <!-- Contact Info -->
          <div style="font-size:18px; margin:30px 0;">
            If you have any questions about these changes, please contact our support team.
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>
    `;

    // Admin Email Template - UPDATED with full amount details
    const adminMailHtmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <title>Booking Dates Modified with Amount Changes - Admin</title>
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
            background: linear-gradient(180deg,#007bff 0%,#0056b3 100%);
            font-weight:700;
            font-size:35px;
            color:#FFFFFF;">
            Booking Dates Modified - Order ${orderId}
          </div>

          <!-- Intro -->
          <div style="font-size:24px; font-weight:600; margin:30px 0;">Hi Admin Team,</div>

          <!-- Update Alert -->
          <div style="margin:30px 0; padding:20px; background:#e7f3ff; border:2px solid #007bff; border-radius:8px;">
            <h3 style="color:#007bff; margin-top:0;">📅 BOOKING DATES UPDATED WITH AMOUNT CHANGES</h3>
            <p style="font-size:18px;"><strong>Order ID:</strong> ${orderId}</p>
            <p style="font-size:18px;"><strong>Order Date:</strong> ${formatIndianDate(createdAt)}</p>
            <p style="font-size:18px;"><strong>Updated by Handler:</strong> ${handler || 'Not specified'}</p>
            <p style="font-size:18px;"><strong>Updated At:</strong> ${currentDate}</p>
            <p style="font-size:18px;"><strong>Product:</strong> ${product.name} (${product.prodCode})</p>
            <p style="font-size:18px;"><strong>Customer Name:</strong> ${client.name}</p>
          </div>

          <!-- Date Comparison -->
          <div style="margin:30px 0;">
            <h3>Date Changes:</h3>
            <table border="1" cellpadding="0" cellspacing="0"
              style="border-collapse:collapse; width:100%; border:1px solid #ddd;">
              <thead>
                <tr style="background:#007bff; color:#fff; font-weight:600;">
                  <th style="padding:12px;">Description</th>
                  <th style="padding:12px;">Before</th>
                  <th style="padding:12px;">After</th>
                  <th style="padding:12px;">Difference</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding:12px; background:#f8f9fa;"><strong>Start Date</strong></td>
                  <td style="padding:12px;">${formattedOldStart}</td>
                  <td style="padding:12px; font-weight:bold; color:#007bff;">${formattedNewStart}</td>
                  <td style="padding:12px;">→</td>
                </tr>
                <tr>
                  <td style="padding:12px; background:#f8f9fa;"><strong>End Date</strong></td>
                  <td style="padding:12px;">${formattedOldEnd}</td>
                  <td style="padding:12px; font-weight:bold; color:#007bff;">${formattedNewEnd}</td>
                  <td style="padding:12px;">→</td>
                </tr>
                <tr>
                  <td style="padding:12px; background:#f8f9fa;"><strong>Duration</strong></td>
                  <td style="padding:12px;">${oldDates?.totalDays || 0} days</td>
                  <td style="padding:12px; font-weight:bold; color:#007bff;">${newDates.totalDays} days</td>
                  <td style="padding:12px; color:${daysDifference >= 0 ? '#28a745' : '#dc3545'}; font-weight:bold;">
                    ${daysDifference >= 0 ? '+' : ''}${daysDifference} days
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Amount Changes - NEW SECTION -->
          <div style="margin:30px 0;">
            <h3>Amount Changes (Including GST):</h3>
            <table border="1" cellpadding="0" cellspacing="0"
              style="border-collapse:collapse; width:100%; border:1px solid #ddd; text-align:center;">
              <thead>
                <tr style="background:#28a745; color:#fff; font-weight:600;">
                  <th style="padding:12px;">Component</th>
                  <th style="padding:12px;">Previous</th>
                  <th style="padding:12px;">Updated</th>
                  <th style="padding:12px;">Difference</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding:12px; background:#f8f9fa;"><strong>Booking Amount</strong></td>
                  <td style="padding:12px;">${formatIndianCurrency(oldTotals.bookingTotal, true)}</td>
                  <td style="padding:12px;">${formatIndianCurrency(newTotals.bookingTotal, true)}</td>
                  <td style="padding:12px; color:${bookingAmountDifference >= 0 ? '#28a745' : '#dc3545'}; font-weight:bold;">
                    ${bookingAmountDifference >= 0 ? '+' : ''}${formatIndianCurrency(bookingAmountDifference, true)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px; background:#f8f9fa;"><strong>Printing Cost</strong></td>
                  <td style="padding:12px;">${formatIndianCurrency(oldTotals.printingCost, true)}</td>
                  <td style="padding:12px;">${formatIndianCurrency(newTotals.printingCost, true)}</td>
                  <td style="padding:12px;">No change</td>
                </tr>
                <tr>
                  <td style="padding:12px; background:#f8f9fa;"><strong>Mounting Cost</strong></td>
                  <td style="padding:12px;">${formatIndianCurrency(oldTotals.mountingCost, true)}</td>
                  <td style="padding:12px;">${formatIndianCurrency(newTotals.mountingCost, true)}</td>
                  <td style="padding:12px;">No change</td>
                </tr>
                <tr>
                  <td style="padding:12px; background:#f8f9fa;"><strong>Base Amount (Excl. GST)</strong></td>
                  <td style="padding:12px;">${formatIndianCurrency(oldTotals.overallBase, true)}</td>
                  <td style="padding:12px;">${formatIndianCurrency(newTotals.overallBase, true)}</td>
                  <td style="padding:12px; color:${overallBaseDifference >= 0 ? '#28a745' : '#dc3545'}; font-weight:bold;">
                    ${overallBaseDifference >= 0 ? '+' : ''}${formatIndianCurrency(overallBaseDifference, true)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px; background:#f8f9fa;"><strong>GST @${gstPercentage}%</strong></td>
                  <td style="padding:12px;">${formatIndianCurrency(oldTotals.gstAmount, true)}</td>
                  <td style="padding:12px;">${formatIndianCurrency(newTotals.gstAmount, true)}</td>
                  <td style="padding:12px; color:${gstAmountDifference >= 0 ? '#28a745' : '#dc3545'}; font-weight:bold;">
                    ${gstAmountDifference >= 0 ? '+' : ''}${formatIndianCurrency(gstAmountDifference, true)}
                  </td>
                </tr>
                <tr style="background:#fff3cd;">
                  <td style="padding:12px; font-weight:700; color:#E31F25;"><strong>TOTAL (Incl. GST)</strong></td>
                  <td style="padding:12px; font-weight:700;">${formatIndianCurrency(oldTotals.totalWithGST, true)}</td>
                  <td style="padding:12px; font-weight:700; color:#E31F25;">${formatIndianCurrency(newTotals.totalWithGST, true)}</td>
                  <td style="padding:12px; font-weight:700; color:${totalWithGSTDifference >= 0 ? '#28a745' : '#dc3545'};">
                    ${totalWithGSTDifference >= 0 ? '+' : ''}${formatIndianCurrency(totalWithGSTDifference, true)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Updated Order Summary -->
          <div style="margin:30px 0; padding:20px; background:#f8f9fa; border-radius:8px;">
            <h3>Updated Order Summary:</h3>
            <table style="font-size:18px; width:100%; border-collapse: collapse;">
              <tr>
                <td style="padding:10px; background:#e9ecef;"><strong>Total Booking Amount:</strong></td>
                <td style="padding:10px;">${formatIndianCurrency(orderTotals.totalBookingAmount, true)}</td>
              </tr>
              <tr>
                <td style="padding:10px; background:#e9ecef;"><strong>Printing + Mounting:</strong></td>
                <td style="padding:10px;">${formatIndianCurrency(orderTotals.totalPrintingCost + orderTotals.totalMountingCost, true)}</td>
              </tr>
              <tr>
                <td style="padding:10px; background:#e9ecef;"><strong>Base Amount (Excl. GST):</strong></td>
                <td style="padding:10px;">${formatIndianCurrency(orderTotals.overallBase, true)}</td>
              </tr>
              <tr>
                <td style="padding:10px; background:#e9ecef;"><strong>GST @${gstPercentage}%:</strong></td>
                <td style="padding:10px;">${formatIndianCurrency(orderTotals.gstAmount, true)}</td>
              </tr>
              <tr style="border-top:2px solid #000;">
                <td style="padding:10px; background:#e9ecef; font-weight:700; color:#E31F25;"><strong>ORDER TOTAL (Incl. GST):</strong></td>
                <td style="padding:10px; font-weight:700; color:#E31F25;">${formatIndianCurrency(orderTotals.totalWithGST, true)}</td>
              </tr>
            </table>
          </div>

          <!-- Customer Info -->
          <div style="margin:30px 0;">
            <h3>Customer Information:</h3>
            <table border="1" cellpadding="0" cellspacing="0"
              style="border-collapse:collapse; width:100%; border:1px solid #ddd;">
              <tr>
                <td style="padding:12px; background:#f8f9fa; width:30%;"><strong>Name:</strong></td>
                <td style="padding:12px;">${client.name}</td>
              </tr>
              <tr>
                <td style="padding:12px; background:#f8f9fa;"><strong>Email:</strong></td>
                <td style="padding:12px;">${client.email}</td>
              </tr>
              <tr>
                <td style="padding:12px; background:#f8f9fa;"><strong>Phone:</strong></td>
                <td style="padding:12px;"><a href="tel:${client.contact}" style="color:#2B3333; text-decoration:none;">${client.contact}</a></td>
              </tr>
            </table>
          </div>

          <!-- Action Notes -->
          <div style="margin:30px 0; padding:20px; background:#e8f4ff; border-left:4px solid #007bff;">
            <h3 style="color:#007bff;">📋 System Update Required:</h3>
            <ul style="font-size:18px;">
              <li>Update booking calendar for product ${product.prodCode}</li>
              <li>Adjust inventory availability for new dates</li>
              <li><strong>Update financial records with new amount: ${formatIndianCurrency(newTotals.totalWithGST, true)}</strong></li>
              <li>Notify relevant teams about date modification</li>
              <li>${daysDifference !== 0 ? `Update invoice with ${daysDifference > 0 ? 'additional' : 'reduced'} charges` : ''}</li>
            </ul>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>
    `;

    // Send emails
    const userMailOptions = {
      from: 'reactdeveloper@adinn.co.in',
      to: client.email,
      subject: `📅 Booking Dates & Amount Updated - Order ${orderId}`,
      html: userMailHtmlTemplate
    };

    const adminMailOptions = {
      from: 'reactdeveloper@adinn.co.in',
      to: 'reactdeveloper@adinn.co.in',
      subject: `📅💰 Dates & Amount Modified for Order ${orderId}`,
      html: adminMailHtmlTemplate
    };

    await transporter.sendMail(userMailOptions);
    await transporter.sendMail(adminMailOptions);

    res.json({ 
      success: true, 
      message: "Date update notifications sent with amount details",
      changes: {
        daysDifference,
        bookingAmountDifference,
        totalWithGSTDifference
      }
    });
  } catch (error) {
    console.error("Error sending date update notification:", error);
    res.status(500).json({ success: false, error: "Failed to send notifications" });
  }
});

module.exports = router;