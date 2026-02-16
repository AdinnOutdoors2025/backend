// emailTemplates.js
const { formatIndianCurrency, formatIndianDate, getCurrentIndianDate } = require('./FORMATTED.js');

// Generate product details HTML with GST support
const generateProductDetailsHTML = (products) => {
    return products.map((product, index) => {
        const productImage = product.image;
        const startDate = formatIndianDate(product.booking?.startDate);
        const endDate = formatIndianDate(product.booking?.endDate);
        const pricePerDay = formatIndianCurrency(product.price || 0);

        // Calculate individual product totals
        const bookingAmount = parseFloat(product.booking?.totalPrice) || 0;
        const printingCost = parseFloat(product.printingCost) || 0;
        const mountingCost = parseFloat(product.mountingCost) || 0;

        // Calculate product base total (before GST)
        const productBaseTotal = bookingAmount + printingCost + mountingCost;

        // Get GST percentage and amount from product data
        const gstPercentage = product.gstPercentage || 18;
        const gstAmount = product.gstAmount || 0;
        const productTotalWithGST = product.totalWithGST || (productBaseTotal + gstAmount);

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
                    <tr><td>Booking Amount</td><td>:</td><td> ${formatIndianCurrency(bookingAmount)}</td></tr>
                    ${printingCost > 0 ? `<tr><td>Printing Cost</td><td>:</td><td> ${formatIndianCurrency(printingCost)}</td></tr>` : ''}
                    ${mountingCost > 0 ? `<tr><td>Mounting Cost</td><td>:</td><td> ${formatIndianCurrency(mountingCost)}</td></tr>` : ''}
                    <tr><td>Base Amount (Excl. GST)</td><td>:</td><td> ${formatIndianCurrency(productBaseTotal)}</td></tr>
                    ${gstAmount > 0 ? `<tr><td>GST @ ${gstPercentage}%</td><td>:</td><td> ${formatIndianCurrency(gstAmount)}</td></tr>` : ''}
                    <tr><td style="font-weight: bold; color: #E31F25;">Total (Incl. GST)</td><td>:</td><td style="font-weight: bold; color: #E31F25;">${formatIndianCurrency(productTotalWithGST)}</td></tr>
                </table>
            </td>
        </tr>
    </table>
    `;
    }).join('');
};

// Generate email footer with current year
const generateEmailFooter = () => {
    const currentYear = new Date().getFullYear();

    return `
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
                  <div style="margin:20px 0; display: flex;gap: 5px;">
                                    <div>
                                        <a href="https://www.instagram.com/adinnoutdoor/" target="_blank"
                                        rel="noopener noreferrer">
                                        <img src="https://www.adinntechnologies.com/images/FootSocIcon1.png"
                                            style="height:35px; margin:0 2px;">
                                    </a>
                                    </div>
                                    <div> <a href="https://www.instagram.com/adinnoutdoor/" target="_blank"
                                        rel="noopener noreferrer">
                                        <img src="https://www.adinntechnologies.com/images/FootSocIcon2.png"
                                            style="height:35px; margin:0 2px;">
                                    </a> </div>
                                    <div> <a href="https://www.facebook.com/adinnoutdoors/" target="_blank"
                                        rel="noopener noreferrer">
                                        <img src="https://www.adinntechnologies.com/images/FootSocIcon3.png"
                                            style="height:35px; margin:0 2px;">
                                    </a> </div>
                                    <div> <a href="https://www.instagram.com/adinnoutdoor/" target="_blank"
                                        rel="noopener noreferrer">
                                        <img src="https://www.adinntechnologies.com/images/FootSocIcon4.png"
                                            style="height:35px; margin:0 2px;">
                                    </a> </div>
                                    <div> <a href="https://www.linkedin.com/showcase/adinn-outdoors/" target="_blank"
                                        rel="noopener noreferrer">
                                        <img src="https://www.adinntechnologies.com/images/FootSocIcon5.png"
                                            style="height:35px; margin:0 2px;">
                                    </a> </div>
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

      <div style="color:black; font-size:14px; margin-top:30px;">
          Copyright © ${currentYear} Adinn Outdoors. All Rights Reserved.
      </div>
  </td>
  </tr>
  </table>
  `;
};

// Generate user email template with GST support
const generateUserEmailTemplate = (orderId, client, products, currentDate, formattedTotalAmount, gstDetails = {}) => {
    const footer = generateEmailFooter();

    // Calculate totals for display
    let overallTotal = 0;
    let overallGST = 0;
    let overallWithGST = 0;

    products.forEach(product => {
        const bookingAmount = parseFloat(product.booking?.totalPrice) || 0;
        const printingCost = parseFloat(product.printingCost) || 0;
        const mountingCost = parseFloat(product.mountingCost) || 0;
        const productBaseTotal = bookingAmount + printingCost + mountingCost;
        const productGST = product.gstAmount || 0;

        overallTotal += productBaseTotal;
        overallGST += productGST;
        overallWithGST += productBaseTotal + productGST;
    });

    return `
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

  <!-- GST Summary -->
  <div style="margin:30px 0; background:#f9f9f9; padding:15px; border-radius:5px;">
    <h3 style="color:#E31F25; margin-bottom:15px;">Order Summary</h3>
    <table style="width:100%; font-size:16px;">
      <tr>
        <td style="padding:8px 0;">Base Amount (Excl. GST):</td>
        <td style="padding:8px 0; text-align:right; font-weight:600;">${formatIndianCurrency(overallTotal)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;">GST @ ${gstDetails.gstPercentage || 18}%:</td>
        <td style="padding:8px 0; text-align:right; font-weight:600;">${formatIndianCurrency(overallGST)}</td>
      </tr>
      <tr style="border-top:2px solid #ddd;">
        <td style="padding:12px 0; font-weight:700; color:#E31F25;">Total Amount (Incl. GST):</td>
        <td style="padding:12px 0; text-align:right; font-weight:700; color:#E31F25;">${formatIndianCurrency(overallWithGST)}</td>
      </tr>
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

  ${footer}
  </div>
  </body>
  </html> 
  `;
};

// Generate admin email template with GST support
const generateAdminEmailTemplate = (orderId, client, products, currentDate, formattedTotalAmount) => {
    const footer = generateEmailFooter();
    const paidAmount = parseFloat(client.paidAmount) || 0;

    // Calculate totals
    let overallTotal = 0;
    let overallGST = 0;
    let overallWithGST = 0;

    products.forEach(product => {
        const bookingAmount = parseFloat(product.booking?.totalPrice) || 0;
        const printingCost = parseFloat(product.printingCost) || 0;
        const mountingCost = parseFloat(product.mountingCost) || 0;
        const productBaseTotal = bookingAmount + printingCost + mountingCost;
        const productGST = product.gstAmount || 0;

        overallTotal += productBaseTotal;
        overallGST += productGST;
        overallWithGST += productBaseTotal + productGST;
    });

    const balanceAmount = overallWithGST - paidAmount;

    return `
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
          <td style="padding:12px; font-weight:600; color:#2ecc71;"> ${formatIndianCurrency(overallWithGST)}</td>
      </tr>
  </tbody>
  </table>
  </div>

  <!-- GST Summary -->
  <div style="margin:30px 0; background:#f9f9f9; padding:15px; border-radius:5px;">
    <h3 style="color:#E31F25; margin-bottom:15px;">Order Summary</h3>
    <table style="width:100%; font-size:16px;">
      <tr>
        <td style="padding:8px 0;">Base Amount (Excl. GST):</td>
        <td style="padding:8px 0; text-align:right; font-weight:600;">${formatIndianCurrency(overallTotal)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;">GST @ ${products[0]?.gstPercentage || 18}%:</td>
        <td style="padding:8px 0; text-align:right; font-weight:600;">${formatIndianCurrency(overallGST)}</td>
      </tr>
      <tr style="border-top:2px solid #ddd;">
        <td style="padding:12px 0; font-weight:700; color:#E31F25;">Total Amount (Incl. GST):</td>
        <td style="padding:12px 0; text-align:right; font-weight:700; color:#E31F25;">${formatIndianCurrency(overallWithGST)}</td>
      </tr>
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
          <td style="padding:12px; font-weight:600; color:#2ecc71;">${formatIndianCurrency(paidAmount)}</td>
          <td style="padding:12px; font-weight:600; color:#e74c3c;">${formatIndianCurrency(balanceAmount)}</td>
      </tr>
  </tbody>
  </table>
  </div>

  <div style="font-size:20px; margin:20px 0;">
  <div>Thank you.</div>
  <div>Adinn Outdoors</div>
  </div>

  ${footer}
  </div>
  </body>
  </html>
  `;
};

module.exports = {
    generateProductDetailsHTML,
    generateEmailFooter,
    generateUserEmailTemplate,
    generateAdminEmailTemplate
};