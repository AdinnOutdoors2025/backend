const express = require("express");
const multer = require("multer");
const path = require("path");
const mongoose = require("mongoose");
const productData = require("./productSchema");
const categoryData = require("./categorySchema");
const mediaTypeData = require("./mediaTypeSchema");
const prodOrderData = require("./productOrderSchema");
const productEnquiryData = require("./OtpVerificationEnquire");
const OverallFooterContacts = require("./OverallFooterContacts");
const OverallUsers = require("./OveallUsers");
const OrderStatus = require("./orderstatusSchema");
const cartData = require("./productCartSchema");
const cors = require("cors");
const Razorpay = require("razorpay"); //require razorpay then only we use
const bodyParser = require("body-parser"); //sent the json data
const crypto = require("crypto"); //inbuilt function to embed the data in this we use sha256 algorithm to safest way of payment
// Initialize the Express apps
const app = express();
const PORT = 3001;
const nodemailer = require("nodemailer");
// const transporter = require("./mailer");
const axios = require("axios");

//Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(
  "/images",
  express.static(path.join(__dirname, "../first-app/public/images"))
);
app.use(express.static("public"));

mongoose
  .connect(
    "mongodb+srv://ba:sLAqxQMpCCjI2Gtf@adinnoutdoors.zpylrw9.mongodb.net/adinnoutdoors"
  )
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));
// app.use(cors({
//     origin: ['https://backend-plum-two-80.vercel.app', 'http://localhost:3000'],
//     methods: ['GET', 'POST', 'DELETE', 'PUT'],
//     allowedHeaders: ['Content-Type', 'Authorization']
// }));
// mongoose
//   .connect(
//     "mongodb://127.0.0.1:27017/Outdoors_backup"
//   )
//   .then(() => console.log("MongoDB connected successfully"))
//   .catch((err) => console.error("MongoDB connection error:", err));

app.use("/verify", require("./VerifyMain"));
app.use("/login", require("./LoginMain"));
//ADMIN USER LOGIN
app.use("/adminUserLogin", require("./UserAdminLogin"));
//FOOTER CONTACT INFO
app.use("/ContactInfo", require("./FooterContact"));
//ORDER RESERVE EMAIL SENT
app.use("/OrderReserve", require("./OrderReserveEmail"));
//ORDER CART EMAIL SENT
app.use("/OrderCart", require("./OrderCartEmail"));
//BLOG upload and Edit
app.use("/BlogAdd", require("./BlogAdd"));
//ADMIN SIDE ORDER EMAIL AND SMS SENT
app.use("/AdminOrder", require("./AdminOrderConfMessage"));

//RAZORPAY NOT IMPLEMENTED

//OFFER PRODUCT
app.use("/OfferedProduct", require("./OfferProduct"));

//TIMER
app.use("/DealTimerRun", require("./DealTimer"));
//UPDATE ORDER EMAIL NOTIFICATION
app.use("/notifications", require("./UPDATED_NOTIFICATIONS"));

//PRIME SPOT PRODUCT
app.use("/PrimeSpoted", require("./PrimeSpots"));


app.get('/',(req,res)=>{
  return res.send("Backend is running");
})
//IMAGE UPLOAD CLOUDINARY CORRECTED CODE
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: "adinn-outdoors",
  api_key: "288959228422799",
  api_secret: "hNd1fd5iPmj20YRxnrRFFAVEtiw",
  secure: true, // Add this for HTTPS
});

//MAIN IMAGE UPLOAD CODE
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: "uploadProdImages",
      allowed_formats: ["jpg", "jpeg", "png"],
      transformation: [
        { width: 1600, height: 1200, crop: "limit", quality: "auto" },
      ],
    };
  },
});

const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

app.post("/upload", imageUpload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    console.log("Main image URL:", req.file.path);
    console.log("Main image public_id:", req.file.filename);
    res.status(200).json({
      message: "Upload successful",
      imageUrl: req.file.path, // ✅ Cloudinary secure URL
      public_id: req.file.filename, // ✅ Correct ID for future delete, etc.
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// //RAZORPAY configuration / setup
// const razorpay = new Razorpay( //new Razorpay - it is in built function to set up the razorpay method...inside we put the generated key and id
//     {
//         key_id: 'rzp_test_9SJbuhNnrdw3ra',
//         key_secret: 'ckOBXQLz2s7ZAqckvnJ1aUxd'
//     }
// )
// //create an order ...razorpay order
// app.post(
//     '/create-order', async (req, res) => {
//         const { amount, currency } = req.body; //this is in UI...what we type inside the type box amt and their currency type INR(indian rupees/anything)get that
//         try {
//             const options = { //we get the amount and currency type from frontend
//                 amount: amount * 100, // Amount in paise...because all the input value come under paise...we need to conver into whole amount
//                 currency, //currency code like INR
//                 receipt: `receipt_${Math.floor(Math.random() * 10000)}`, //receipt number create with random number and * 1000 limit... that will convert into whole number
//                 payment_capture: 1 //Auto capture the payment receipt / take a screen shot 1- true/ok to get the screen...0-false
//             }
//             const order = await razorpay.orders.create(options) //razorpay.orders.create - inbuilt function to create a razorpay order with we send the created payment options //that amount current,and one id generated sent to front end file..
//             res.status(200).json({
//                 order_id: order.id,
//                 currency: order.currency,
//                 amount: order.amount
//             });
//         }
//         catch (error) {
//             console.log("Error creating order", error);
//             res.status(500).send("Error creating order");
//         }
//     }
// )
// //verify the payment signature
// app.post(
//     '/verify-payment', (req, res) => {
//         const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;//get all the inputs from UI...jsx file

//         const body = razorpay_order_id + "|" + razorpay_payment_id  //create a long textwithid type receipt by adding the order id and payment if
//         const expectedSignature = crypto.createHmac('sha256', 'ckOBXQLz2s7ZAqckvnJ1aUxd').update(body.toString()).digest('hex');//create a hash of the body using the secret key and we use SHA256 embedding algorithm for safe transaction
//         if (razorpay_signature === expectedSignature) { //if the signature is correct then it is payment is successful
//             res.status(200).json(
//                 { message: 'Payment Successful' }
//             )
//         }
//         else {
//             res.status(400).json({ message: 'Payment Failed' })
//         }
//     }
// )

const additionalFileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith("video/");
    return {
      folder: isVideo ? "final_uploadProdVideos" : "final_uploadProdImages",
      resource_type: isVideo ? "video" : "image",
      allowed_formats: isVideo
        ? ["mp4", "mov", "avi", "mkv", "webm"]
        : ["jpg", "jpeg", "png", "gif"],
      // format: isVideo ? 'mp4' : 'jpg',
      // transformation: isVideo ? [] : [{ width: 800, height: 800, crop: 'limit' }]
      transformation: isVideo
        ? { quality: "auto", fetch_format: "auto" }
        : { width: 800, height: 600, crop: "limit", quality: "auto" },
    };
  },
});

const additionalFileUpload = multer({ storage: additionalFileStorage });

// Save files endpoint
app.post(
  "/save-videos",
  additionalFileUpload.array("files", 3),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }
      const savedFiles = req.files.map((file) => ({
        url: file.path,
        public_id: file.filename,
        type: file.mimetype.startsWith("video/") ? "video" : "image",
      }));

      res.status(200).json(savedFiles);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "File save failed" });
    }
  }
);

// Delete endpoint
app.post("/delete-video", async (req, res) => {
  try {
    const { public_id, resource_type } = req.body;

    if (!public_id || !resource_type) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: resource_type,
    });

    if (result.result === "ok") {
      res.status(200).json({ message: "File deleted successfully" });
    } else {
      res.status(400).json({ error: "File deletion failed" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during file deletion" });
  }
});

//PRODUCTS    Other routes (get, post, put, delete)
app.get("/products", async (req, res) => {
  try {
    const data = await productData.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err });
  }
});

/* order fetched with pagination */
app.get("/products_paginated", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 9;
    const skip = page * limit;

    const {
      states,
      districts,
      categories,
      sortBy,
      visibleOnly = true,
    } = req.query;

    // Build filter object
    let filter = {};

    if (visibleOnly === "true") {
      filter.visible = { $ne: false };
    }

    // Filter by states
    if (states) {
      const stateArray = Array.isArray(states) ? states : [states];
      filter["location.state"] = { $in: stateArray };
    }

    // Filter by districts
    if (districts) {
      const districtArray = Array.isArray(districts) ? districts : [districts];
      filter["location.district"] = { $in: districtArray };
    }

    // Filter by categories (media types)
    if (categories) {
      const categoryArray = Array.isArray(categories)
        ? categories
        : [categories];
      filter.mediaType = { $in: categoryArray };
    }

    // Build sort object
    let sort = {};
    switch (sortBy) {
      case "price_asc":
        sort.price = 1;
        break;
      case "price_desc":
        sort.price = -1;
        break;
      case "rating_desc":
        sort.rating = -1;
        break;
      case "rating_asc":
        sort.rating = 1;
        break;
      default:
        sort.createdAt = -1;
    }

    console.log("Filter:", filter);
    console.log("Sort:", sort);

    const data = await productData
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalCount = await productData.countDocuments(filter);

    const transformedData = data.map((product) => ({
      id: product._id,
      prodName: product.name,
      printingCost: product.printingCost,
      mountingCost: product.mountingCost,
      prodCode: product.prodCode,
      prodLighting: product.lighting,
      productFrom: product.from,
      productTo: product.to,
      productFixedAmount: product.fixedAmount,
      productFixedOffer: product.fixedOffer,
      location: `${product.location.district}, ${product.location.state}`,
      category: product.mediaType,
      price: product.price,
      sizeHeight: product.height,
      sizeWidth: product.width,
      sizeSide: product.side,
      productsquareFeet: product.productsquareFeet,
      rating: product.rating,
      imageUrl: product.image,
      district: product.location.district,
      state: product.location.state,
      latitude: product.Latitude,
      longitude: product.Longitude,
      prodLocationLink: product.LocationLink,
      visible: product.visible,
    }));

    res.json({
      status: true,
      current_page: page,
      limit: limit,
      total_products: totalCount,
      total_pages: Math.ceil(totalCount / limit),
      data: transformedData,
    });
  } catch (err) {
    console.error("Error in products_paginated:", err);
    res.status(500).json({ message: err.message });
  }
});

app.get("/products_new", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const skip = page * limit;

    // Only get visible products
    const filter = { visible: { $ne: false } };

    const data = await productData.find(filter).skip(skip).limit(limit);

    const totalCount = await productData.countDocuments(filter);

    res.json({
      status: true,
      current_page: page,
      limit: limit,
      total_products: totalCount,
      total_pages: Math.ceil(totalCount / limit),
      data: data,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
/* order fetched with pagination */

//GET THE PRODUCT USING ID FOR SPECIFIC PRODUCT
app.get("/products/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = await productData.findById(id);
    if (!data) {
      res.status(404).json({ message: "Product not found" });
    }
    // res.json(data);
    const product = data.toObject();
    // Ensure complete image URL
    if (product.image && !product.image.startsWith("http")) {
      product.image = `${req.protocol}://${req.get("host")}${product.image}`;
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// app.get("/products/similar/:prodCode", async (req, res) => {
//   try {
//     // First find the current product
//     const currentProduct = await productData.findOne({
//       prodCode: req.params.prodCode,
//     });
//     if (
//       !currentProduct ||
//       !currentProduct.similarProducts ||
//       currentProduct.similarProducts.length === 0
//     ) {
//       return res.status(404).json({ message: "No similar products found" });
//     }
//     // Extract similar products' ProdCodes
//     const prodCodes = currentProduct.similarProducts.map((p) => p.ProdCode);
//     // Fetch details of all similar products (excluding the current one)
//     const similarProducts = await productData.find({
//       prodCode: { $in: prodCodes },
//       _id: { $ne: currentProduct._id }, // Exclude current product by ID instead of prodCode
//     });
//     // Map the results to match the frontend expectation
//     const mappedResults = similarProducts.map((product) => ({
//       _id: product._id,
//       name: product.name,
//       location: `${product.location.district}, ${product.location.state}`,
//       dimensions: `${product.width} x ${product.height}`,
//       price: product.price,
//       rating: product.rating,
//       image: product.image,
//       category: product.mediaType,
//       sizeHeight: product.height,
//       sizeWidth: product.width,
//       sizeSide: product.side,
//       district: product.location.district,
//       state: product.location.state,
//       printingCost: product.printingCost,
//       mountingCost: product.mountingCost,
//       prodCode: product.prodCode,
//       prodLighting: product.lighting,
//       productFrom: product.from,
//       productTo: product.to,
//       productFixedAmount: product.fixedAmount,
//       productFixedOffer: product.fixedOffer,
//     }));
//     res.json(mappedResults);
//   } catch (err) {
//     console.error("Error fetching similar products:", err);
//     res.status(500).json({ message: "Error fetching similar products" });
//   }
// });






// Update the similar products endpoint in your Express app
app.get("/products/similar/:prodCode", async (req, res) => {
  try {
    // Decode and clean the product code
    const prodCode = decodeURIComponent(req.params.prodCode).trim();
    const cleanedProdCode = prodCode.replace(/^#/, '').trim();

    console.log(`Fetching similar products for code: "${cleanedProdCode}"`);

    // First find the current product using regex for flexibility
    const currentProduct = await productData.findOne({
      prodCode: { $regex: new RegExp(`^${cleanedProdCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });

    if (!currentProduct) {
      console.log(`Current product not found with code: ${cleanedProdCode}`);
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if similarProducts exists and is not empty
    if (!currentProduct.similarProducts || currentProduct.similarProducts.length === 0) {
      console.log(`No similar products defined for: ${cleanedProdCode}`);
      return res.status(200).json([]); // Return empty array instead of 404
    }

    // Extract similar products' ProdCodes
    const prodCodes = currentProduct.similarProducts.map((p) => {
      // Clean each product code
      return p.ProdCode ? p.ProdCode.replace(/^#/, '').trim() : '';
    }).filter(code => code !== '');

    if (prodCodes.length === 0) {
      console.log(`No valid similar product codes found for: ${cleanedProdCode}`);
      return res.status(200).json([]);
    }

    // Fetch details of all similar products
    const similarProducts = await productData.find({
      $or: prodCodes.map(code => ({
        prodCode: { $regex: new RegExp(`^${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      }))
    });

    // Map the results to match the frontend expectation
    const mappedResults = similarProducts.map((product) => ({
      _id: product._id,
      name: product.name,
      location: `${product.location.district}, ${product.location.state}`,
      dimensions: `${product.width} x ${product.height}`,
      price: product.price,
      rating: product.rating,
      image: product.image,
      category: product.mediaType,
      sizeHeight: product.height,
      sizeWidth: product.width,
      sizeSide: product.side,
      district: product.location.district,
      state: product.location.state,
      printingCost: product.printingCost,
      mountingCost: product.mountingCost,
      prodCode: product.prodCode,
      prodLighting: product.lighting,
      productFrom: product.from,
      productTo: product.to,
      productFixedAmount: product.fixedAmount,
      productFixedOffer: product.fixedOffer,
    }));

    console.log(`Found ${mappedResults.length} similar products for ${cleanedProdCode}`);
    res.json(mappedResults);
  } catch (err) {
    console.error("Error fetching similar products:", err);
    res.status(500).json({ message: "Error fetching similar products", error: err.message });
  }
});



app.post("/products", async (req, res) => {
  try {
    const prodData = new productData(req.body);
    const saved = await prodData.save();
    console.log("Product saved to MongoDB:", saved);
    res.json(saved);
  } catch (err) {
    console.error("Error saving product to MongoDB:", err);
    res.status(500).json({
      message: err,
      details: err.errors, // This will show validation errors
    });
  }
});

app.put("/products/:id", async (req, res) => {
  try {
    // const id = req.params.id;
    const updated = await productData.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err });
  }
});

app.patch("/products/:id", async (req, res) => {
  const { id } = req.params;
  const { visible } = req.body;

  try {
    const updatedProduct = await productData.findByIdAndUpdate(
      id,
      { visible },
      { new: true }
    );

    res.json(updatedProduct);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Failed to update visibility" });
  }
});

app.patch("/products/:id/remove-similar", async (req, res) => {
  const { id } = req.params;
  const { prodCode } = req.body;

  try {
    const updatedProduct = await productData.findByIdAndUpdate(
      id,
      { $pull: { similarProducts: { ProdCode: prodCode } } },
      { new: true }
    );

    res.json(updatedProduct);
  } catch (err) {
    console.error("Remove similar error:", err);
    res.status(500).json({ message: "Failed to remove similar product" });
  }
});

app.delete("/products/:id", async (req, res) => {
  try {
    const product = await productData.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Delete main image from Cloudinary if it exists
    if (product.image && product.image.public_id) {
      await cloudinary.uploader.destroy(product.image.public_id);
    }

    // Delete additional files from Cloudinary
    if (product.additionalFiles && product.additionalFiles.length > 0) {
      for (const file of product.additionalFiles) {
        if (file.public_id) {
          await cloudinary.uploader.destroy(file.public_id, {
            resource_type: file.type === "video" ? "video" : "image",
          });
        }
      }
    }
    // Delete from database
    await productData.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err });
  }
});

// PRIME SPOT SECTION 

// Route to mark product as Prime in main products collection
app.put('/products/:id/mark-prime', async (req, res) => {
  try {
    const { isPrime } = req.body;

    // Validate isPrime value
    if (isPrime !== 0 && isPrime !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid prime status. Must be 0 or 1'
      });
    }

    const updateData = {
      isPrime: isPrime,
      updatedAt: new Date()
    };

    // If setting as prime, add primeUpdatedAt timestamp
    if (isPrime === 1) {
      updateData.primeUpdatedAt = new Date();
    } else if (isPrime === 0) {
      updateData.primeUpdatedAt = null;
    }

    const updatedProduct = await productData.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: `Product marked as ${isPrime === 1 ? 'Prime' : 'Regular'} successfully`,
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error updating product prime status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Check if product is already prime
app.get('/products/check-prime/:prodCode', async (req, res) => {
  try {
    const cleanedCode = req.params.prodCode.replace(/^#/, '').trim();

    const product = await productData.findOne({
      prodCode: { $regex: new RegExp(`^${cleanedCode}$`, 'i') }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      isPrime: product.isPrime || 0,
      productId: product._id,
      name: product.name,
      prodCode: product.prodCode,
      message: product.isPrime === 1 ? 'Product is already Prime' : 'Product is not Prime'
    });
  } catch (error) {
    console.error('Error checking prime status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Route to get only Prime products (FIXED - SIMPLE VERSION)
app.get('/products/get-prime', async (req, res) => {
  try {
    console.log('Fetching prime products...');

    // Find products where isPrime = 1 and visible is not false
    const primeProducts = await productData.find({
      $and: [
        { isPrime: 1 },
        {
          $or: [
            { visible: true },
            { visible: { $exists: false } },
            { visible: null }
          ]
        }
      ]
    }).sort({
      primeUpdatedAt: -1,
      createdAt: -1
    });

    console.log(`Found ${primeProducts.length} prime products`);

    // Transform the data for frontend
    const transformedProducts = primeProducts.map(product => ({
      _id: product._id,
      name: product.name,
      prodCode: product.prodCode,
      price: product.price,
      height: product.height,
      width: product.width,
      rating: product.rating || 0,
      image: product.image,
      mediaType: product.mediaType,
      lighting: product.lighting,
      from: product.from,
      to: product.to,
      printingCost: product.printingCost,
      mountingCost: product.mountingCost,
      Latitude: product.Latitude,
      Longitude: product.Longitude,
      LocationLink: product.LocationLink,
      isPrime: product.isPrime || 1,
      location: {
        state: product.location?.state || '',
        district: product.location?.district || ''
      },
      productsquareFeet: product.productsquareFeet || (product.width * product.height).toFixed(2),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      primeUpdatedAt: product.primeUpdatedAt
    }));

    res.json({
      success: true,
      count: transformedProducts.length,
      data: transformedProducts
    });
  } catch (error) {
    console.error('Error fetching prime products:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.stack
    });
  }
});

// Get products with prime status filter
app.get('/products/with-prime-status', async (req, res) => {
  try {
    const { status, includeHidden } = req.query;
    let filter = {};

    // Handle visibility
    if (includeHidden !== 'true') {
      filter.visible = { $ne: false };
    }

    // Filter by prime status
    if (status === '0' || status === '1') {
      filter.isPrime = parseInt(status);
    } else if (status === 'all') {
      // Include all products
      filter.$or = [
        { isPrime: 0 },
        { isPrime: 1 },
        { isPrime: { $exists: false } }
      ];
    } else if (status === 'undefined') {
      // Products without isPrime field
      filter.isPrime = { $exists: false };
    } else {
      // Default: get all products
      filter.$or = [
        { isPrime: 0 },
        { isPrime: 1 },
        { isPrime: { $exists: false } }
      ];
    }

    const products = await productData.find(filter)
      .sort({
        isPrime: -1,
        primeUpdatedAt: -1,
        createdAt: -1
      });

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Error fetching products with prime status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all products for admin table
app.get('/products/admin/prime-table', async (req, res) => {
  try {
    const { includeHidden } = req.query;

    let filter = {};

    // Handle visibility
    if (includeHidden !== 'true') {
      filter.visible = { $ne: false };
    }

    // Get all products
    const products = await productData.find(filter)
      .sort({
        isPrime: -1,
        primeUpdatedAt: -1,
        createdAt: -1
      });

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Error fetching products for admin table:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// DEBUG Route: Get all products to check data
app.get('/products-debug/all', async (req, res) => {
  try {
    const allProducts = await productData.find({});

    // Count prime products
    const primeProducts = allProducts.filter(p => p.isPrime === 1);
    const visiblePrimeProducts = allProducts.filter(p => p.isPrime === 1 && p.visible !== false);

    res.json({
      success: true,
      totalCount: allProducts.length,
      primeCount: primeProducts.length,
      visiblePrimeCount: visiblePrimeProducts.length,
      allProducts: allProducts.map(p => ({
        _id: p._id,
        name: p.name,
        prodCode: p.prodCode,
        isPrime: p.isPrime || 0,
        visible: p.visible,
        location: p.location
      })),
      primeProducts: primeProducts.map(p => ({
        _id: p._id,
        name: p.name,
        prodCode: p.prodCode,
        isPrime: p.isPrime
      }))
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Route to get only Prime products
app.get('/products/prime', async (req, res) => {
  try {
    const primeProducts = await productData.find({
      isPrime: 1,
      visible: { $ne: false }
    }).sort({ createdAt: -1 });

    res.json(primeProducts);
  } catch (error) {
    console.error('Error fetching prime products:', error);
    res.status(500).json({ message: error.message });
  }
});

// Route to get products by prime status (0 or 1)
app.get('/products/filter/prime-status/:status', async (req, res) => {
  try {
    const status = parseInt(req.params.status); // 0 or 1

    if (status !== 0 && status !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid prime status'
      });
    }

    const filter = { isPrime: status };

    // Only show visible products by default
    if (req.query.includeHidden !== 'true') {
      filter.visible = { $ne: false };
    }

    const products = await productData.find(filter)
      .sort({
        primeUpdatedAt: -1,
        createdAt: -1
      });

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Error filtering by prime status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get only Prime products (for homepage)
app.get('/products/prime-only', async (req, res) => {
  try {
    const filter = {
      isPrime: 1,
      visible: { $ne: false }
    };

    const products = await productData.find(filter)
      .sort({
        primeUpdatedAt: -1, // Recently updated first
        createdAt: -1
      });

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Error fetching prime products:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// PRIME SPOT SECTION 


// CATEGORY CRUD OPERATION
// GET
app.get("/category", async (req, res) => {
  try {
    const categories = await categoryData.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
//POST
app.post("/category", async (req, res) => {
  try {
    const newCategory = new categoryData(req.body);
    const saved = await newCategory.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
//UPDATE
app.put("/category/:id", async (req, res) => {
  try {
    const updated = await categoryData.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
//DELETE
app.delete("/category/:id", async (req, res) => {
  try {
    const deleted = await categoryData.findByIdAndDelete(req.params.id);
    res.json(deleted);
  } catch (err) {
    res.status(500).json({ message: err });
  }
});

//MEDIA TYPE SECTION
// GET
app.get("/mediatype", async (req, res) => {
  try {
    const mediaTypes = await mediaTypeData.find();
    res.json(mediaTypes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
//POST
app.post("/mediatype", async (req, res) => {
  try {
    const newMediaType = new mediaTypeData(req.body);
    const saved = await newMediaType.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
//UPDATE
app.put("/mediatype/:id", async (req, res) => {
  try {
    const updated = await mediaTypeData.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
//DELETE
app.delete("/mediatype/:id", async (req, res) => {
  try {
    const deleted = await mediaTypeData.findByIdAndDelete(req.params.id);
    res.json(deleted);
  } catch (err) {
    res.status(500).json({ message: err });
  }
});



//PRODUCT ORDER SECTION
//GET
// Get orders with user filter
app.get("/prodOrders", async (req, res) => {
  try {
    let query = {};

    if (req.query.userId) {
      query = { "client.userId": req.query.userId };
    }

    const orders = await prodOrderData.find(query).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/prodOrders/:id", async (req, res) => {
  try {
    const order = await prodOrderData.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Updated /booked-dates endpoint
app.get("/booked-dates", async (req, res) => {
  try {
    const excludeOrderId = req.query.excludeOrderId;
    const excludeProductId = req.query.excludeProductId;

    // Find all orders except the current one
    const otherOrders = await prodOrderData.find(
      excludeOrderId ? { _id: { $ne: excludeOrderId } } : {},
      "products.bookedDates"
    );

    // Get dates from other orders
    const otherDates = otherOrders.flatMap((order) =>
      order.products.flatMap((product) =>
        (product.bookedDates || []).map(
          (d) => new Date(d).toISOString().split("T")[0]
        )
      )
    );

    // If we have a current order, get dates from other products in the same order
    let sameOrderOtherDates = [];
    if (excludeOrderId && excludeProductId) {
      const currentOrder = await prodOrderData.findById(excludeOrderId);
      if (currentOrder) {
        sameOrderOtherDates = currentOrder.products
          .filter((p) => p._id.toString() !== excludeProductId)
          .flatMap((p) =>
            (p.bookedDates || []).map(
              (d) => new Date(d).toISOString().split("T")[0]
            )
          );
      }
    }
    // Combine and deduplicate
    const allDates = [...otherDates, ...sameOrderOtherDates];
    res.json([...new Set(allDates)]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.get("/prodOrders/user/:userId", async (req, res) => {
  try {
    const orders = await prodOrderData.find({
      "client.userId": req.params.userId,
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
//CREATION OF ORDER ID FOR ADMIN SIDE
// const generateNextOrderId = async (prefix = "AD") => {
//   try {
//     // Find the order with the highest orderId for the given prefix
//     const lastOrder = await prodOrderData
//       .findOne({ orderId: new RegExp(`^${prefix}`) })
//       .sort("-orderId");

//     if (!lastOrder) {
//       return `${prefix}0001`; // First order for this prefix
//     }

//     // Extract the numeric part and increment
//     const lastNumber = parseInt(lastOrder.orderId.substring(2));
//     const nextNumber = lastNumber + 1;

//     // Format with leading zeros
//     return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
//   } catch (err) {
//     console.error("Error generating order ID:", err);
//     // Fallback - generate based on timestamp
//     return `${prefix}${Date.now().toString().slice(-4)}`;
//   }
// };

// UPDATED: Generate order ID with proper format
const generateNextOrderId = async (prefix = "AD") => {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Find orders with the same prefix and date
    const regex = new RegExp(`^${prefix}${dateStr}`);
    const lastOrder = await prodOrderData
      .findOne({ orderId: regex })
      .sort({ orderId: -1 });

    let sequentialNumber;

    if (!lastOrder) {
      // First order of the day
      sequentialNumber = '001';
    } else {
      // Extract the last 3 digits and increment
      const lastOrderId = lastOrder.orderId;
      const lastSeq = parseInt(lastOrderId.slice(-3)) || 0;
      sequentialNumber = String(lastSeq + 1).padStart(3, '0');
    }

    return `${prefix}${dateStr}${sequentialNumber}`;

  } catch (err) {
    console.error("Error generating order ID:", err);
    // Fallback - generate based on timestamp
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const randomSeq = Math.floor(100 + Math.random() * 900);
    return `${prefix}${year}${month}${day}${randomSeq}`;
  }
};

// app.post("/prodOrders", async (req, res) => {
//   try {
//     console.log("📦 Received order creation request:", {
//       client: req.body.client?.email,
//       productsCount: req.body.products?.length || 0,
//       status: req.body.status,
//       order_status: req.body.order_status
//     });

//     if (!req.body.products || !Array.isArray(req.body.products)) {
//       return res.status(400).json({
//         message: "Products array is required",
//         error: true,
//       });
//     }

//     // Validate client information
//     if (!req.body.client || !req.body.client.userId) {
//       return res.status(400).json({
//         message: "Client information is required",
//         error: true,
//       });
//     }

//     // Determine prefix and status based on request
//     const status = req.body.status || "UserSideOrder";
//     const prefix = status === "Added Manually" ? "AD" : "US";
//     const orderId = await generateNextOrderId(prefix);

//     // Set order_status based on status
//     let order_status = req.body.order_status;
//     if (!order_status || order_status.trim() === "") {
//       // Default order_status based on status
//       order_status = status === "Added Manually" 
//         ? "Pending Client Confirmation" 
//         : "pending";
//     }

//     // Process each product
//     const products = req.body.products.map((product) => {
//       if (!product) {
//         throw new Error("Invalid product data");
//       }

//       // Validate booking dates
//       if (!product.booking || !product.booking.startDate || !product.booking.endDate) {
//         throw new Error("Booking dates are required");
//       }

//       // Parse dates
//       const start = new Date(product.booking.startDate);
//       const end = new Date(product.booking.endDate);

//       if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//         throw new Error("Invalid booking dates");
//       }

//       // Calculate booked dates
//       let bookedDates = [];
//       const current = new Date(start);

//       while (current <= end) {
//         const normalizedDate = new Date(Date.UTC(
//           current.getUTCFullYear(),
//           current.getUTCMonth(),
//           current.getUTCDate()
//         ));
//         bookedDates.push(normalizedDate);
//         current.setDate(current.getDate() + 1);
//       }

//       const totalDays = bookedDates.length;

//       return {
//         ...product,
//         bookedDates,
//         booking: {
//           ...product.booking,
//           startDate: new Date(product.booking.startDate),
//           endDate: new Date(product.booking.endDate),
//           totalDays: totalDays,
//           totalPrice: (product.price || 0) * totalDays,
//         },
//         deleted: false,
//         deletedAt: null,
//         deletedBy: null
//       };
//     });

//     // Normalize paidAmount array
//     let normalizedPaidAmount = [];
//     if (req.body.client.paidAmount) {
//       if (Array.isArray(req.body.client.paidAmount)) {
//         normalizedPaidAmount = req.body.client.paidAmount.map(payment => ({
//           amount: Number(payment.amount) || 0,
//           paidAt: payment.paidAt ? new Date(payment.paidAt) : new Date()
//         }));
//       } else if (typeof req.body.client.paidAmount === 'number') {
//         normalizedPaidAmount = [{
//           amount: req.body.client.paidAmount,
//           paidAt: new Date()
//         }];
//       }
//     }

//     // Calculate total amount from products
//     const totalAmount = products.reduce((sum, p) => {
//       if (p.deleted) return sum;
//       return sum + (p.booking?.totalPrice || 0);
//     }, 0);

//     // Calculate total paid
//     const totalPaid = normalizedPaidAmount.reduce((sum, p) => sum + (p.amount || 0), 0);
//     const balanceAmount = Math.max(totalAmount - totalPaid, 0);

//     // Create new order
//     const newOrder = new prodOrderData({
//       ...req.body,
//       orderId: orderId,
//       products: products,
//       client: {
//         ...req.body.client,
//         totalAmount: totalAmount,
//         paidAmount: normalizedPaidAmount,
//         balanceAmount: balanceAmount
//       },
//       status: status, // "Added Manually" or "UserSideOrder"
//       order_status: order_status, // "Pending Client Confirmation" or "pending"
//       createdAt: new Date(),
//       last_edited: new Date()
//     });

//     const savedOrder = await newOrder.save();
//     console.log("✅ Order saved successfully:", {
//       orderId: savedOrder.orderId,
//       status: savedOrder.status,
//       order_status: savedOrder.order_status,
//       totalAmount: savedOrder.client.totalAmount
//     });

//     res.status(201).json({
//       success: true,
//       orderId: savedOrder.orderId,
//       _id: savedOrder._id,
//       order_status: savedOrder.order_status,
//       status: savedOrder.status,
//       message: "Order created successfully"
//     });
//   } catch (err) {
//     console.error("❌ Error creating order:", err);
//     res.status(500).json({
//       message: err.message || "Failed to create order",
//       error: true,
//       details: err.errors
//     });
//   }
// });


// app.put("/prodOrders/:id", async (req, res) => {
//   try {
//     const orderId = req.params.id;
//     const updateData = req.body;

//     console.log("Updating order:", orderId, "with data:", updateData);

//     // Find existing order
//     const existingOrder = await prodOrderData.findById(orderId);
//     if (!existingOrder) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     // Process products if provided
//     if (updateData.products && Array.isArray(updateData.products)) {
//       const updatedProducts = updateData.products.map((product) => {
//         if (!product.booking || !product.booking.startDate || !product.booking.endDate) {
//           throw new Error("Booking dates are required");
//         }

//         // Parse dates
//         const start = new Date(product.booking.startDate);
//         const end = new Date(product.booking.endDate);

//         if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//           throw new Error("Invalid booking dates");
//         }

//         // Calculate booked dates
//         let bookedDates = [];
//         const current = new Date(start);

//         while (current <= end) {
//           const normalizedDate = new Date(Date.UTC(
//             current.getUTCFullYear(),
//             current.getUTCMonth(),
//             current.getUTCDate()
//           ));
//           bookedDates.push(normalizedDate);
//           current.setDate(current.getDate() + 1);
//         }

//         const totalDays = bookedDates.length;

//         return {
//           ...product,
//           bookedDates,
//           booking: {
//             ...product.booking,
//             startDate: new Date(product.booking.startDate),
//             endDate: new Date(product.booking.endDate),
//             totalDays: totalDays,
//             totalPrice: (product.price || 0) * totalDays,
//           },
//           deleted: product.deleted !== undefined ? product.deleted : false,
//           deletedAt: product.deletedAt || null,
//           deletedBy: product.deletedBy || null
//         };
//       });

//       updateData.products = updatedProducts;
//     }

//     // Handle paidAmount normalization
//     if (updateData.client && updateData.client.paidAmount) {
//       if (Array.isArray(updateData.client.paidAmount)) {
//         updateData.client.paidAmount = updateData.client.paidAmount.map(payment => ({
//           amount: Number(payment.amount) || 0,
//           paidAt: payment.paidAt ? new Date(payment.paidAt) : new Date()
//         }));
//       } else if (typeof updateData.client.paidAmount === 'number') {
//         updateData.client.paidAmount = [{
//           amount: updateData.client.paidAmount,
//           paidAt: new Date()
//         }];
//       }
//     }

//     // Calculate totals
//     if (updateData.products) {
//       const totalAmount = updateData.products.reduce((sum, p) => {
//         if (p.deleted) return sum;
//         return sum + (p.booking?.totalPrice || 0);
//       }, 0);

//       const totalPaid = (updateData.client?.paidAmount || existingOrder.client.paidAmount)
//         .reduce((sum, p) => sum + (p.amount || 0), 0);

//       const balanceAmount = Math.max(totalAmount - totalPaid, 0);

//       if (updateData.client) {
//         updateData.client.totalAmount = totalAmount;
//         updateData.client.balanceAmount = balanceAmount;
//       }
//     }

//     // Add last_edited timestamp
//     updateData.last_edited = new Date();

//     // FIX: Preserve status if not provided in update
//     if (!updateData.status) {
//       updateData.status = existingOrder.status;
//     }
//     if (!updateData.order_status) {
//       updateData.order_status = existingOrder.order_status;
//     }

//     // Update the order
//     const updatedOrder = await prodOrderData.findByIdAndUpdate(
//       orderId,
//       { $set: updateData },
//       {
//         new: true,
//         runValidators: true,
//         context: 'query'
//       }
//     );

//     if (!updatedOrder) {
//       return res.status(404).json({ message: 'Order not found after update' });
//     }

//     res.json({
//       success: true,
//       message: 'Order updated successfully',
//       order: updatedOrder,
//       orderId: updatedOrder.orderId,
//       _id: updatedOrder._id
//     });
//   } catch (err) {
//     console.error('Error updating order:', err);
//     res.status(500).json({
//       success: false,
//       message: 'Server error while updating order',
//       error: err.message
//     });
//   }
// });



// DELETE THE ORDER

app.post("/prodOrders", async (req, res) => {
  try {
    console.log("📦 Received order creation request:", {
      client: req.body.client?.email,
      productsCount: req.body.products?.length || 0,
      status: req.body.status,
      order_status: req.body.order_status
    });

    if (!req.body.products || !Array.isArray(req.body.products)) {
      return res.status(400).json({
        message: "Products array is required",
        error: true,
      });
    }

    // Validate client information
    if (!req.body.client || !req.body.client.userId) {
      return res.status(400).json({
        message: "Client information is required",
        error: true,
      });
    }

    // Determine prefix and status based on request
    const status = req.body.status || "UserSideOrder";
    const prefix = status === "Added Manually" ? "AD" : "US";
    const orderId = await generateNextOrderId(prefix);

    // Set order_status based on status
    let order_status = req.body.order_status;
    if (!order_status || order_status.trim() === "") {
      // Default order_status based on status
      order_status = status === "Added Manually"
        ? "Pending Client Confirmation"
        : "pending";
    }

    // Process each product and calculate individual totals
    const products = req.body.products.map((product) => {
      if (!product) {
        throw new Error("Invalid product data");
      }

      // Validate booking dates
      if (!product.booking || !product.booking.startDate || !product.booking.endDate) {
        throw new Error("Booking dates are required");
      }

      // Parse dates
      const start = new Date(product.booking.startDate);
      const end = new Date(product.booking.endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Invalid booking dates");
      }

      // Calculate booked dates
      let bookedDates = [];
      const current = new Date(start);

      while (current <= end) {
        const normalizedDate = new Date(Date.UTC(
          current.getUTCFullYear(),
          current.getUTCMonth(),
          current.getUTCDate()
        ));
        bookedDates.push(normalizedDate);
        current.setDate(current.getDate() + 1);
      }

      const totalDays = bookedDates.length;

      // Get individual costs
      const price = product.price || 0;
      const printingCost = product.printingCost || 0;
      const mountingCost = product.mountingCost || 0;
      const totalPrice = price * totalDays;

      return {
        ...product,
        bookedDates,
        booking: {
          ...product.booking,
          startDate: new Date(product.booking.startDate),
          endDate: new Date(product.booking.endDate),
          totalDays: totalDays,
          totalPrice: totalPrice,
        },
        // Store individual product calculations
        price: price,
        printingCost: printingCost,
        mountingCost: mountingCost,
        deleted: false,
        deletedAt: null,
        deletedBy: null
      };
    });

    // Calculate overall totals from all products
    let totalAmount = 0;
    let totalOverallAmount = 0; // Sum of (booking totalPrice + printingCost + mountingCost) for all products
    let totalPrintingCost = 0;
    let totalMountingCost = 0;

    products.forEach(product => {
      if (!product.deleted) {
        const bookingTotal = product.booking?.totalPrice || 0;
        const printing = product.printingCost || 0;
        const mounting = product.mountingCost || 0;

        totalAmount += bookingTotal;
        totalPrintingCost += printing;
        totalMountingCost += mounting;
        totalOverallAmount += (bookingTotal + printing + mounting);
      }
    });

    // Get GST percentage from request or use default (18%)
    const gstPercentage = req.body.client?.gstPercentage || 18;
    const gstAmount = totalOverallAmount * (gstPercentage / 100);
        const formattedGstAmountFloor = Math.floor(gstAmount);

    const totalAmountWithGST = totalOverallAmount + formattedGstAmountFloor;

    // Normalize paidAmount array
    let normalizedPaidAmount = [];
    if (req.body.client.paidAmount) {
      if (Array.isArray(req.body.client.paidAmount)) {
        normalizedPaidAmount = req.body.client.paidAmount.map(payment => ({
          amount: Number(payment.amount) || 0,
          paidAt: payment.paidAt ? new Date(payment.paidAt) : new Date()
        }));
      } else if (typeof req.body.client.paidAmount === 'number') {
        normalizedPaidAmount = [{
          amount: req.body.client.paidAmount,
          paidAt: new Date()
        }];
      }
    }

    // Calculate total paid
    const totalPaid = normalizedPaidAmount.reduce((sum, p) => sum + (p.amount || 0), 0);
    const balanceAmount = Math.max(totalAmount - totalPaid, 0);

    // Create new order
    const newOrder = new prodOrderData({
      ...req.body,
      orderId: orderId,
      products: products,
      client: {
        ...req.body.client,
        totalAmount: totalAmount,
        overAllTotalAmount: totalOverallAmount, // Sum of all (booking total + printing + mounting)
        gstPercentage: gstPercentage,
        gstAmount: formattedGstAmountFloor,
        totalAmountWithGST: totalAmountWithGST, // Total with GST
        paidAmount: normalizedPaidAmount,
        balanceAmount: balanceAmount,
        totalPrintingCost: totalPrintingCost, // Optional: store totals for reference
        totalMountingCost: totalMountingCost   // Optional: store totals for reference
      },
      // Store overall totals at order level too (optional)
      overAllTotalAmount: totalOverallAmount,
      gstPercentage: gstPercentage,
      gstAmount: formattedGstAmountFloor,
      totalAmountWithGST: totalAmountWithGST,
      status: status, // "Added Manually" or "UserSideOrder"
      order_status: order_status, // "Pending Client Confirmation" or "pending"
      createdAt: new Date(),
      last_edited: new Date()
    });

    const savedOrder = await newOrder.save();
    console.log("✅ Order saved successfully:", {
      orderId: savedOrder.orderId,
      status: savedOrder.status,
      order_status: savedOrder.order_status,
      totalAmount: savedOrder.client.totalAmount,
      overallTotal: savedOrder.client.overAllTotalAmount,
      gstAmount: savedOrder.client.gstAmount,
      totalWithGST: savedOrder.client.totalAmountWithGST
    });

    res.status(201).json({
      success: true,
      orderId: savedOrder.orderId,
      _id: savedOrder._id,
      order_status: savedOrder.order_status,
      status: savedOrder.status,
      message: "Order created successfully"
    });
  } catch (err) {
    console.error("❌ Error creating order:", err);
    res.status(500).json({
      message: err.message || "Failed to create order",
      error: true,
      details: err.errors
    });
  }
});

// app.put("/prodOrders/:id", async (req, res) => {
//   try {
//     const orderId = req.params.id;
//     const updateData = req.body;

//     console.log("Updating order:", orderId, "with data:", updateData);

//     // Find existing order
//     const existingOrder = await prodOrderData.findById(orderId);
//     if (!existingOrder) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     // Process products if provided
//     if (updateData.products && Array.isArray(updateData.products)) {
//       const updatedProducts = updateData.products.map((product) => {
//         if (!product.booking || !product.booking.startDate || !product.booking.endDate) {
//           throw new Error("Booking dates are required");
//         }

//         // Parse dates
//         const start = new Date(product.booking.startDate);
//         const end = new Date(product.booking.endDate);

//         if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//           throw new Error("Invalid booking dates");
//         }

//         // Calculate booked dates
//         let bookedDates = [];
//         const current = new Date(start);

//         while (current <= end) {
//           const normalizedDate = new Date(Date.UTC(
//             current.getUTCFullYear(),
//             current.getUTCMonth(),
//             current.getUTCDate()
//           ));
//           bookedDates.push(normalizedDate);
//           current.setDate(current.getDate() + 1);
//         }

//         const totalDays = bookedDates.length;

//         // Get individual costs
//         const price = product.price || 0;
//         const printingCost = product.printingCost || 0;
//         const mountingCost = product.mountingCost || 0;
//         const totalPrice = price * totalDays;

//         return {
//           ...product,
//           bookedDates,
//           booking: {
//             ...product.booking,
//             startDate: new Date(product.booking.startDate),
//             endDate: new Date(product.booking.endDate),
//             totalDays: totalDays,
//             totalPrice: totalPrice,
//           },
//           price: price,
//           printingCost: printingCost,
//           mountingCost: mountingCost,
//           deleted: product.deleted !== undefined ? product.deleted : false,
//           deletedAt: product.deletedAt || null,
//           deletedBy: product.deletedBy || null
//         };
//       });

//       updateData.products = updatedProducts;

//       // Calculate overall totals from updated products
//       let totalAmount = 0;
//       let totalOverallAmount = 0;
//       let totalPrintingCost = 0;
//       let totalMountingCost = 0;

//       updatedProducts.forEach(product => {
//         if (!product.deleted) {
//           const bookingTotal = product.booking?.totalPrice || 0;
//           const printing = product.printingCost || 0;
//           const mounting = product.mountingCost || 0;

//           totalAmount += bookingTotal;
//           totalPrintingCost += printing;
//           totalMountingCost += mounting;
//           totalOverallAmount += (bookingTotal + printing + mounting);
//         }
//       });

//       // Get GST percentage from update data or existing order
//       const gstPercentage = updateData.client?.gstPercentage ||
//         existingOrder.client?.gstPercentage ||
//         18;
//       const gstAmount = totalOverallAmount * (gstPercentage / 100);
//           const formattedGstAmountFloor = Math.floor(gstAmount);

//       const totalAmountWithGST = totalOverallAmount + formattedGstAmountFloor;

//       // Store calculations in updateData
//       updateData.overAllTotalAmount = totalOverallAmount;
//       updateData.gstPercentage = gstPercentage;
//       updateData.gstAmount = formattedGstAmountFloor;
//       updateData.totalAmountWithGST = totalAmountWithGST;
//     }

//     // Handle paidAmount normalization
//     if (updateData.client && updateData.client.paidAmount) {
//       if (Array.isArray(updateData.client.paidAmount)) {
//         updateData.client.paidAmount = updateData.client.paidAmount.map(payment => ({
//           amount: Number(payment.amount) || 0,
//           paidAt: payment.paidAt ? new Date(payment.paidAt) : new Date()
//         }));
//       } else if (typeof updateData.client.paidAmount === 'number') {
//         updateData.client.paidAmount = [{
//           amount: updateData.client.paidAmount,
//           paidAt: new Date()
//         }];
//       }
//     }

//     // Calculate totals if products were updated
//     if (updateData.products) {
//       const totalPaid = (updateData.client?.paidAmount || existingOrder.client.paidAmount)
//         .reduce((sum, p) => sum + (p.amount || 0), 0);

//       const balanceAmount = Math.max(totalAmount - totalPaid, 0);

//       if (updateData.client) {
//         updateData.client.totalAmount = totalAmount;
//         updateData.client.overAllTotalAmount = totalOverallAmount;
//         updateData.client.gstPercentage = gstPercentage;
//         updateData.client.gstAmount = formattedGstAmountFloor;
//         updateData.client.totalAmountWithGST = totalAmountWithGST;
//         updateData.client.balanceAmount = balanceAmount;
//       }
//     }

//     // Add last_edited timestamp
//     updateData.last_edited = new Date();

//     // FIX: Preserve status if not provided in update
//     if (!updateData.status) {
//       updateData.status = existingOrder.status;
//     }
//     if (!updateData.order_status) {
//       updateData.order_status = existingOrder.order_status;
//     }

//     // Update the order
//     const updatedOrder = await prodOrderData.findByIdAndUpdate(
//       orderId,
//       { $set: updateData },
//       {
//         new: true,
//         runValidators: true,
//         context: 'query'
//       }
//     );

//     if (!updatedOrder) {
//       return res.status(404).json({ message: 'Order not found after update' });
//     }

//     res.json({
//       success: true,
//       message: 'Order updated successfully',
//       order: updatedOrder,
//       orderId: updatedOrder.orderId,
//       _id: updatedOrder._id
//     });
//   } catch (err) {
//     console.error('Error updating order:', err);
//     res.status(500).json({
//       success: false,
//       message: 'Server error while updating order',
//       error: err.message
//     });
//   }
// });

app.put("/prodOrders/:id", async (req, res) => {
  try {
    const orderId = req.params.id;
    const updateData = req.body;

    console.log("Updating order:", orderId);

    // Find existing order
    const existingOrder = await prodOrderData.findById(orderId);
    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Process products if provided
    if (updateData.products && Array.isArray(updateData.products)) {
      const updatedProducts = updateData.products.map((product) => {
        if (!product.booking || !product.booking.startDate || !product.booking.endDate) {
          return product;
        }

        // Parse dates
        const start = new Date(product.booking.startDate);
        const end = new Date(product.booking.endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return product;
        }

        // Calculate booked dates
        let bookedDates = [];
        const current = new Date(start);

        while (current <= end) {
          const normalizedDate = new Date(Date.UTC(
            current.getUTCFullYear(),
            current.getUTCMonth(),
            current.getUTCDate()
          ));
          bookedDates.push(normalizedDate);
          current.setDate(current.getDate() + 1);
        }

        const totalDays = bookedDates.length;

        return {
          ...product,
          bookedDates,
          booking: {
            ...product.booking,
            startDate: new Date(product.booking.startDate),
            endDate: new Date(product.booking.endDate),
            totalDays: totalDays,
            totalPrice: (product.price || 0) * totalDays,
          },
          deleted: product.deleted !== undefined ? product.deleted : false,
          deletedAt: product.deletedAt || null,
          deletedBy: product.deletedBy || null
        };
      });

      updateData.products = updatedProducts;
    }

    // If client data is provided, use it; otherwise, preserve existing client data
    if (updateData.client) {
      // Ensure all required client fields are present
      updateData.client = {
        ...existingOrder.client.toObject(), // Preserve existing client data
        ...updateData.client, // Override with new data
        // Ensure required fields are not lost
        userId: updateData.client.userId || existingOrder.client.userId,
        name: updateData.client.name || existingOrder.client.name,
        email: updateData.client.email || existingOrder.client.email,
        contact: updateData.client.contact || existingOrder.client.contact,
        company: updateData.client.company || existingOrder.client.company,
      };
    } else {
      // If no client data provided, keep the existing client data
      updateData.client = existingOrder.client;
    }

    // Handle paidAmount normalization
    if (updateData.client && updateData.client.paidAmount) {
      if (Array.isArray(updateData.client.paidAmount)) {
        updateData.client.paidAmount = updateData.client.paidAmount.map(payment => ({
          amount: Number(payment.amount) || 0,
          paidAt: payment.paidAt ? new Date(payment.paidAt) : new Date()
        }));
      } else if (typeof updateData.client.paidAmount === 'number') {
        updateData.client.paidAmount = [{
          amount: updateData.client.paidAmount,
          paidAt: new Date()
        }];
      }
    }

    // Calculate total paid
    const totalPaid = (updateData.client?.paidAmount || existingOrder.client.paidAmount)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // Calculate balance
    if (updateData.client && updateData.client.totalAmountWithGST !== undefined) {
      updateData.client.balanceAmount = Math.max(updateData.client.totalAmountWithGST - totalPaid, 0);
    }

    // Add last_edited timestamp
    updateData.last_edited = new Date();

    // Preserve status if not provided in update
    if (!updateData.status) {
      updateData.status = existingOrder.status;
    }
    if (!updateData.order_status) {
      updateData.order_status = existingOrder.order_status;
    }

    // Update the order
    const updatedOrder = await prodOrderData.findByIdAndUpdate(
      orderId,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
        context: 'query'
      }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found after update' });
    }

    console.log("✅ Order updated successfully:", {
      orderId: updatedOrder.orderId,
      totalAmount: updatedOrder.client?.totalAmount,
      overallTotal: updatedOrder.client?.overAllTotalAmount,
      gstAmount: updatedOrder.client?.gstAmount,
      totalWithGST: updatedOrder.client?.totalAmountWithGST
    });

    res.json({
      success: true,
      message: 'Order updated successfully',
      order: updatedOrder,
      orderId: updatedOrder.orderId,
      _id: updatedOrder._id
    });
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while updating order',
      error: err.message
    });
  }
});



app.delete("/prodOrders/:id", async (req, res) => {
  try {
    const deletedOrder = await prodOrderData.findByIdAndDelete(req.params.id);
    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


/* delete product for particular order -SK */

const updateBookedDatesOnDelete = async (product, orderId) => {
  try {
    console.log(`📅 Freeing booked dates for deleted product: ${product.prodCode}`);
    return true;
  } catch (error) {
    console.error('Error updating booked dates on delete:', error);
    return false;
  }
};

const updateBookedDatesOnRestore = async (product, orderId) => {
  try {
    // When a product is restored, we need to check for date conflicts
    console.log(`📅 Restoring booked dates for product: ${product.prodCode}`);

    // The booked dates will automatically be included in future
    // /booked-dates endpoint queries
    return true;
  } catch (error) {
    console.error('Error updating booked dates on restore:', error);
    return false;
  }
};


// // Update the /booked-dates/:prodCode endpoint to exclude deleted products
// app.get("/booked-dates/:prodCode", async (req, res) => {
//   try {
//     const { prodCode } = req.params;
//     const excludeOrderId = req.query.excludeOrderId;

//     console.log(
//       `Fetching booked dates for product: ${prodCode}, excluding order: ${excludeOrderId}`
//     );

//     // Build query to find orders with this product code
//     let query = {
//       "products.prodCode": prodCode,
//     };

//     // Exclude current order if specified
//     if (
//       excludeOrderId &&
//       excludeOrderId !== "null" &&
//       excludeOrderId !== "undefined"
//     ) {
//       query._id = { $ne: new mongoose.Types.ObjectId(excludeOrderId) };
//     }

//     // Find all orders that contain this product code
//     const orders = await prodOrderData.find(query);
//     console.log(`📊 Found ${orders.length} orders with product ${prodCode}`);

//     // Extract all booked dates for this product from other orders
//     // EXCLUDE dates from deleted products
//     const bookedDates = [];
//     orders.forEach((order) => {
//       order.products.forEach((product) => {
//         if (product.prodCode === prodCode && product.bookedDates && !product.deleted) {
//           // Convert dates to ISO string format for consistency
//           product.bookedDates.forEach((date) => {
//             try {
//               const dateObj = new Date(date);
//               if (!isNaN(dateObj.getTime())) {
//                 // Normalize to UTC midnight for consistent comparison
//                 const utcDate = new Date(
//                   Date.UTC(
//                     dateObj.getUTCFullYear(),
//                     dateObj.getUTCMonth(),
//                     dateObj.getUTCDate()
//                   )
//                 );
//                 bookedDates.push(utcDate.toISOString().split("T")[0]);
//               }
//             } catch (e) {
//               console.warn("Invalid date format:", date);
//             }
//           });
//         }
//       });
//     });

//     // Remove duplicates and return
//     const uniqueDates = [...new Set(bookedDates)];
//     console.log(`📅 Final booked dates for ${prodCode}:`, uniqueDates);

//     res.json(uniqueDates);
//   } catch (error) {
//     console.error("Error fetching booked dates:", error);
//     res.status(500).json({ error: "Failed to fetch booked dates" });
//   }
// });

app.get("/booked-dates/:prodCode", async (req, res) => {
  try {
    const { prodCode } = req.params;
    const excludeOrderId = req.query.excludeOrderId;

    console.log(`Fetching dates for product: ${prodCode}, excluding order: ${excludeOrderId}`);

    // Build query to find orders with this product code
    let query = {
      "products.prodCode": prodCode,
      "products.deleted": { $ne: true }
    };

    // Exclude current order if specified
    if (excludeOrderId && excludeOrderId !== "null" && excludeOrderId !== "undefined") {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeOrderId) };
    }

    // Find all orders that contain this product code
    const orders = await prodOrderData.find(query);
    console.log(`📊 Found ${orders.length} orders with product ${prodCode}`);

    // Separate dates based on order_status
    const cancelledDates = [];  // Green - available
    const pendingDates = [];    // Orange - pending confirmation
    const confirmedDates = [];  // Red - confirmed/booked

    orders.forEach((order) => {
      order.products.forEach((product) => {
        if (product.prodCode === prodCode && product.bookedDates && !product.deleted) {
          const orderStatus = order.order_status || 'Pending Client Confirmation';

          // Categorize based on order_status
          product.bookedDates.forEach((date) => {
            try {
              if (!date) return;

              const dateObj = new Date(date);
              if (isNaN(dateObj.getTime())) {
                console.warn("Invalid date in bookedDates:", date);
                return;
              }

              // Normalize to UTC midnight for consistent comparison
              const utcDate = new Date(
                Date.UTC(
                  dateObj.getUTCFullYear(),
                  dateObj.getUTCMonth(),
                  dateObj.getUTCDate()
                )
              );

              const dateString = utcDate.toISOString().split("T")[0];

              // CATEGORIZE BASED ON ORDER_STATUS
              if (orderStatus === "Cancelled" || orderStatus === "cancelled") {
                // Cancelled orders - green (available)
                cancelledDates.push(dateString);
              } else if (orderStatus === "Pending Client Confirmation" ||
                orderStatus === "pending" ||
                orderStatus === "Pending") {
                // Pending orders - orange
                pendingDates.push({
                  date: dateString,
                  orderId: order.orderId,
                  orderDate: order.createdAt,
                  orderStatus: orderStatus
                });
              } else {
                // All other statuses (Order Confirmed, Design in Progress, etc.) - red (confirmed/booked)
                confirmedDates.push(dateString);
              }
            } catch (e) {
              console.warn("Error processing date:", date, e);
            }
          });
        }
      });
    });

    // Remove duplicates and maintain backward compatibility
    const uniqueCancelledDates = [...new Set(cancelledDates)];
    const uniqueConfirmedDates = [...new Set(confirmedDates)];

    // For pending dates, keep the structure but deduplicate
    const uniquePendingDates = pendingDates.filter((value, index, self) =>
      index === self.findIndex((p) => p.date === value.date)
    );

    console.log(`📅 Date categories for ${prodCode}:`);
    console.log(`  - Cancelled (green/available): ${uniqueCancelledDates.length}`);
    console.log(`  - Pending (orange): ${uniquePendingDates.length}`);
    console.log(`  - Confirmed (red/booked): ${uniqueConfirmedDates.length}`);

    res.json({
      cancelled: uniqueCancelledDates,
      pending: uniquePendingDates,
      confirmed: uniqueConfirmedDates
    });
  } catch (error) {
    console.error("Error fetching booked dates:", error);
    res.status(500).json({
      error: "Failed to fetch booked dates",
      cancelled: [],
      pending: [],
      confirmed: []
    });
  }
});

// Update the delete/restore endpoint to handle date availability
app.get("/deleteProductOrder/:orderIdentifier/:productId", async (req, res) => {
  try {
    const { orderIdentifier, productId } = req.params;
    const { deletedBy } = req.query;

    // Determine if orderIdentifier is MongoDB _id or orderId
    let query = {};
    if (mongoose.Types.ObjectId.isValid(orderIdentifier)) {
      query = { _id: orderIdentifier };
    } else {
      query = { orderId: orderIdentifier };
    }

    const order = await prodOrderData.findOne(query);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    /* ---------- FIND PRODUCT ---------- */
    const productIndex = order.products.findIndex(
      (p) => p._id.toString() === productId
    );

    if (productIndex === -1) {
      return res.status(404).json({ message: "Product not found in order" });
    }

    const product = order.products[productIndex];
    const isCurrentlyDeleted = product.deleted;

    /* ---------- HANDLE DATE AVAILABILITY ---------- */
    if (isCurrentlyDeleted) {
      // Restoring product - check if dates are available
      await updateBookedDatesOnRestore(product, order._id);
    } else {
      // Deleting product - free up the dates
      await updateBookedDatesOnDelete(product, order._id);
    }

    /* ---------- NORMALIZE paidAmount ---------- */
    let normalizedPaid = [];
    if (Array.isArray(order.client.paidAmount)) {
      normalizedPaid = order.client.paidAmount
        .map((p) => {
          if (p && typeof p === "object" && typeof p.amount === "number") {
            return {
              amount: p.amount,
              paidAt: p.paidAt || order.createdAt || new Date(),
            };
          }
          if (typeof p === "number") {
            return {
              amount: p,
              paidAt: order.createdAt || new Date(),
            };
          }
          return null;
        })
        .filter(Boolean);
    } else if (typeof order.client.paidAmount === "number") {
      normalizedPaid = [
        {
          amount: order.client.paidAmount,
          paidAt: order.createdAt || new Date(),
        },
      ];
    }

    order.client.paidAmount = normalizedPaid;

    /* ---------- TOGGLE DELETE STATUS ---------- */
    if (isCurrentlyDeleted) {
      // RESTORE product
      order.products[productIndex].deleted = false;
      order.products[productIndex].deletedAt = null;
      order.products[productIndex].deletedBy = null;
    } else {
      // DELETE product
      order.products[productIndex].deleted = true;
      order.products[productIndex].deletedAt = new Date();
      order.products[productIndex].deletedBy = deletedBy || "System";
    }

    /* ---------- RECALCULATE TOTALS ---------- */
    const totalAmount = order.products.reduce((sum, p) => {
      if (p.deleted) {
        return sum; // Skip deleted products
      }
      return sum + (p.booking?.totalPrice || 0);
    }, 0);

    /* ---------- RECALCULATE PAID & BALANCE ---------- */
    const totalPaid = normalizedPaid.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    const balanceAmount = Math.max(totalAmount - totalPaid, 0);

    /* ---------- UPDATE FIELDS ---------- */
    order.client.totalAmount = totalAmount;
    order.client.balanceAmount = balanceAmount;
    order.last_edited = new Date();

    await order.save();

    res.json({
      status: true,
      message: isCurrentlyDeleted
        ? "Product restored successfully"
        : "Product marked as deleted successfully",
      totalAmount,
      totalPaid,
      balanceAmount,
      updatedOrder: order,
      productStatus: isCurrentlyDeleted ? "active" : "deleted",
      action: isCurrentlyDeleted ? "restore" : "delete",
      // Send product details for email notification
      productDetails: {
        name: product.name,
        prodCode: product.prodCode,
        image: product.image,
        price: product.price,
        booking: product.booking,
        bookedDates: product.bookedDates
      }
    });
  } catch (error) {
    console.error("Delete/Restore error:", error);
    res.status(500).json({
      status: false,
      message: "Server Error",
      error: error.message,
    });
  }
});


/* restore product for particular order */
app.get("/restoreProductOrder/:orderIdentifier/:productId", async (req, res) => {
  try {
    const { orderIdentifier, productId } = req.params;

    // Determine if orderIdentifier is MongoDB _id or orderId
    let query = {};
    if (mongoose.Types.ObjectId.isValid(orderIdentifier)) {
      // It's a MongoDB _id
      query = { _id: orderIdentifier };
    } else {
      // It's an orderId like AD0001
      query = { orderId: orderIdentifier };
    }

    const order = await prodOrderData.findOne(query);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Find the product and restore it
    const productIndex = order.products.findIndex(
      (p) => p._id.toString() === productId
    );

    if (productIndex === -1) {
      return res.status(404).json({ message: "Product not found in order" });
    }

    // Restore product
    order.products[productIndex].deleted = false;
    order.products[productIndex].deletedAt = null;
    order.products[productIndex].deletedBy = null;

    // Recalculate totals considering only active products
    const totalAmount = order.products.reduce((sum, p) => {
      if (p.deleted) {
        return sum; // Skip deleted products
      }
      return sum + (p.booking?.totalPrice || 0);
    }, 0);

    // Normalize paidAmount array if needed
    let normalizedPaid = [];
    if (Array.isArray(order.client.paidAmount)) {
      normalizedPaid = order.client.paidAmount
        .map((p) => {
          if (p && typeof p === "object" && typeof p.amount === "number") {
            return {
              amount: p.amount,
              paidAt: p.paidAt || order.createdAt || new Date(),
            };
          }
          if (typeof p === "number") {
            return {
              amount: p,
              paidAt: order.createdAt || new Date(),
            };
          }
          return null;
        })
        .filter(Boolean);
    } else if (typeof order.client.paidAmount === "number") {
      normalizedPaid = [
        {
          amount: order.client.paidAmount,
          paidAt: order.createdAt || new Date(),
        },
      ];
    }

    order.client.paidAmount = normalizedPaid;

    const totalPaid = normalizedPaid.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    const balanceAmount = Math.max(totalAmount - totalPaid, 0);

    // Update order totals
    order.client.totalAmount = totalAmount;
    order.client.balanceAmount = balanceAmount;
    order.last_edited = new Date();

    await order.save();

    res.json({
      status: true,
      message: "Product restored successfully",
      totalAmount,
      totalPaid,
      balanceAmount,
      updatedOrder: order,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Server Error",
      error: error.message,
    });
  }
});



app.get("/softDeleteProductOrder/:orderId/:productId", async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    const { action } = req.query; // 'delete' or 'restore'

    const order = await prodOrderData.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Find the product
    const productIndex = order.products.findIndex(
      (p) => p._id.toString() === productId
    );

    if (productIndex === -1) {
      return res.status(404).json({ message: "Product not found in order" });
    }

    const product = order.products[productIndex];

    // Toggle deleted status
    if (action === "restore") {
      // Restore product
      product.deleted = false;
      product.deletedAt = null;
      product.deletedBy = null;
    } else {
      // Soft delete product
      product.deleted = true;
      product.deletedAt = new Date();
      product.deletedBy = req.query.deletedBy || "System";
    }

    // Calculate totals considering deleted products
    let totalAmount = 0;
    let totalPaid = 0;

    order.products.forEach((p) => {
      if (!p.deleted) {
        totalAmount += p.booking?.totalPrice || 0;
      }
    });

    // Calculate paid amount
    if (Array.isArray(order.client.paidAmount)) {
      totalPaid = order.client.paidAmount.reduce(
        (sum, p) => sum + (p.amount || 0),
        0
      );
    } else if (typeof order.client.paidAmount === "number") {
      totalPaid = order.client.paidAmount;
    }

    const balanceAmount = Math.max(totalAmount - totalPaid, 0);

    // Update order totals
    order.client.totalAmount = totalAmount;
    order.client.balanceAmount = balanceAmount;
    order.last_edited = new Date();

    await order.save();

    res.json({
      status: true,
      message:
        action === "restore"
          ? "Product restored successfully"
          : "Product marked as deleted",
      totalAmount,
      totalPaid,
      balanceAmount,
      updatedOrder: order,
      productStatus: product.deleted ? "deleted" : "active",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Server Error",
      error: error.message,
    });
  }
});


// // Helper function to check if dates are available after product deletion
// app.get("/check-date-availability/:prodCode", async (req, res) => {
//   try {
//     const { prodCode } = req.params;
//     const { startDate, endDate, excludeOrderId } = req.query;

//     if (!startDate || !endDate) {
//       return res.status(400).json({ error: "Start and end dates are required" });
//     }

//     // Get all booked dates for this product (excluding deleted products)
//     const bookedDates = await getBookedDatesForProduct(prodCode, excludeOrderId);

//     // Check if requested dates are available
//     const start = new Date(startDate);
//     const end = new Date(endDate);
//     const current = new Date(start);

//     const conflictingDates = [];

//     while (current <= end) {
//       const dateStr = current.toISOString().split('T')[0];
//       if (bookedDates.includes(dateStr)) {
//         conflictingDates.push(dateStr);
//       }
//       current.setDate(current.getDate() + 1);
//     }

//     const isAvailable = conflictingDates.length === 0;

//     res.json({
//       isAvailable,
//       conflictingDates,
//       totalRequestedDays: Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1,
//       availableDays: isAvailable ? 
//         Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1 : 
//         Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1 - conflictingDates.length
//     });
//   } catch (error) {
//     console.error("Error checking date availability:", error);
//     res.status(500).json({ error: "Failed to check date availability" });
//   }
// });

app.get("/check-date-availability/:prodCode", async (req, res) => {
  try {
    const { prodCode } = req.params;
    const { startDate, endDate, excludeOrderId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start and end dates are required"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format"
      });
    }

    // Get all booked dates for this product
    const dateResponse = await fetch(`${req.protocol}://${req.get('host')}/booked-dates/${prodCode}${excludeOrderId ? `?excludeOrderId=${excludeOrderId}` : ''}`);
    const dateData = await dateResponse.json();

    const confirmedDates = dateData.confirmed || [];
    const pendingDates = dateData.pending || [];

    // Generate all dates in requested range
    const requestedDates = [];
    const current = new Date(start);
    const endDateObj = new Date(end);

    while (current <= endDateObj) {
      const dateStr = current.toISOString().split('T')[0];
      requestedDates.push(dateStr);
      current.setDate(current.getDate() + 1);
    }

    // Check for conflicts
    const confirmedConflicts = [];
    const pendingConflicts = [];
    const availableDates = [];

    requestedDates.forEach(dateStr => {
      if (confirmedDates.includes(dateStr)) {
        confirmedConflicts.push(dateStr);
      } else if (pendingDates.some(p => p.date === dateStr)) {
        pendingConflicts.push({
          date: dateStr,
          type: 'pending'
        });
      } else {
        availableDates.push(dateStr);
      }
    });

    const totalRequestedDays = requestedDates.length;
    const confirmedConflictCount = confirmedConflicts.length;
    const pendingConflictCount = pendingConflicts.length;
    const availableCount = availableDates.length;
    const isAvailable = confirmedConflictCount === 0;

    res.json({
      success: true,
      isAvailable,
      hasConflicts: confirmedConflictCount > 0,
      hasQueueDates: pendingConflictCount > 0,
      totalRequestedDays,
      confirmedConflicts,
      pendingConflicts,
      availableDates,
      confirmedConflictCount,
      pendingConflictCount,
      availableCount,
      message: confirmedConflictCount > 0
        ? `${confirmedConflictCount} date(s) are already confirmed booked. ${pendingConflictCount > 0 ? `${pendingConflictCount} date(s) are in queue.` : ''}`
        : pendingConflictCount > 0
          ? `All dates available. ${pendingConflictCount} date(s) are in queue (can be booked).`
          : 'All dates are available for immediate booking.'
    });
  } catch (error) {
    console.error("Error checking date availability:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Helper function to get booked dates
async function getBookedDatesForProduct(prodCode, excludeOrderId = null) {
  const query = {
    "products.prodCode": prodCode,
    "products.deleted": { $ne: true } // Exclude deleted products
  };

  if (excludeOrderId) {
    query._id = { $ne: new mongoose.Types.ObjectId(excludeOrderId) };
  }

  const orders = await prodOrderData.find(query);

  const bookedDates = [];
  orders.forEach(order => {
    order.products.forEach(product => {
      if (product.prodCode === prodCode && product.bookedDates && !product.deleted) {
        product.bookedDates.forEach(date => {
          const dateObj = new Date(date);
          if (!isNaN(dateObj.getTime())) {
            const utcDate = new Date(
              Date.UTC(
                dateObj.getUTCFullYear(),
                dateObj.getUTCMonth(),
                dateObj.getUTCDate()
              )
            );
            bookedDates.push(utcDate.toISOString().split('T')[0]);
          }
        });
      }
    });
  });

  return [...new Set(bookedDates)];
}

/* delete product for particular order -SK */

/* import order status -Sk */
app.get("/importOrderStatus", async (req, res) => {
  try {
    const now = new Date(); // current timestamp

    const orderStatuses = [
      { name: "Pending client confirmation", createdAt: now, updatedAt: null },
      { name: "Order Confirmed", createdAt: now, updatedAt: null },
      { name: "Design in Progress", createdAt: now, updatedAt: null },
      {
        name: "Awaiting Client side design Approval",
        createdAt: now,
        updatedAt: null,
      },
      { name: "Ready for Printing", createdAt: now, updatedAt: null },
      { name: "Printing in Progress", createdAt: now, updatedAt: null },
      { name: "Completed / Installed", createdAt: now, updatedAt: null },
      { name: "Payment Pending", createdAt: now, updatedAt: null },
      { name: "Payment Completed", createdAt: now, updatedAt: null },
      { name: "Cancelled", createdAt: now, updatedAt: null },
    ];

    // Optional: delete old records
    await OrderStatus.deleteMany({});

    // Insert new records
    await OrderStatus.insertMany(orderStatuses);

    res.json({ message: "Order statuses imported successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server Error" });
  }
});
/* import order status -Sk */

/* get order statuses */
app.get("/getOrderStatuses", async (req, res) => {
  try {
    const statuses = await OrderStatus.find().sort({ createdAt: 1 });

    res.json({
      status: true,
      message: "Statuses reterived successfully",
      data: statuses,
    });
  } catch (error) {
    console.error("Error fetching order statuses:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching order statuses",
    });
  }
});
/* get order statuses */
/* update order status */
// app.put("/updateOrderStatus/:orderId", async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const { status, cancel, reason, isConfirmation } = req.body;

//     if (!status && cancel == false) {
//       return res.status(400).json({
//         status: false,
//         message: "Status is required",
//       });
//     }

//     // Validate ObjectId
//     if (!mongoose.Types.ObjectId.isValid(orderId)) {
//       return res.status(400).json({
//         status: false,
//         message: "Invalid Order ID",
//       });
//     }

//     // Find and update
//     if (cancel == false) {
//       let updateData = {};

//       // Special handling for order confirmation
//       if (isConfirmation && status === "Order Confirmed") {
//         updateData = {
//           order_status: "confirmed", // Set to confirmed for filtering
//           status: "Confirmed", // Set to Confirmed (capital C for consistency)
//           confirmed_at: new Date(),
//           confirmed_by: req.body.confirmedBy || "Admin"
//         };
//       } else {
//         // Normal status update
//         updateData = { order_status: status };

//         // Map status to proper values
//         if (status.toLowerCase().includes("pending")) {
//           updateData.order_status = "pending";
//         } else if (status.toLowerCase().includes("cancelled")) {
//           updateData.order_status = "cancelled";
//           updateData.status = "Cancelled";
//         } else if (status.toLowerCase().includes("completed")) {
//           updateData.order_status = "completed";
//         }
//       }

//       const updatedOrder = await prodOrderData.findByIdAndUpdate(
//         orderId,
//         { $set: updateData },
//         { new: true }
//       );

//       if (!updatedOrder) {
//         return res.status(404).json({
//           status: false,
//           message: "Order not found",
//         });
//       }

//       return res.status(200).json({
//         status: true,
//         message: isConfirmation ? "Order confirmed successfully" : "Order status updated successfully",
//         data: updatedOrder,
//       });
//     }

//     if (cancel == true) {
//       const updatedOrder = await prodOrderData.findByIdAndUpdate(
//         orderId,
//         {
//           $set: {
//             order_cancel_reason: reason,
//             order_status: "cancelled",
//             status: "Cancelled",
//           },
//         },
//         { new: true }
//       );

//       if (!updatedOrder) {
//         return res.status(404).json({
//           status: false,
//           message: "Order not found",
//         });
//       }

//       return res.status(200).json({
//         status: true,
//         message: "Reason updated successfully",
//         data: updatedOrder,
//       });
//     }
//   } catch (error) {
//     console.error("Error updating order status:", error);
//     res.status(500).json({
//       status: false,
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// });


app.put("/updateOrderStatus/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, cancel, reason, isConfirmation } = req.body;

    if (!status && cancel == false) {
      return res.status(400).json({
        status: false,
        message: "Status is required",
      });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        status: false,
        message: "Invalid Order ID",
      });
    }

    // Find the order first
    const existingOrder = await prodOrderData.findById(orderId);
    if (!existingOrder) {
      return res.status(404).json({
        status: false,
        message: "Order not found",
      });
    }

    if (cancel == false) {
      let updateData = {};

      // DO NOT CHANGE THE 'status' FIELD (it should remain "Added Manually" or "UserSideOrder")
      // Only update 'order_status' field
      updateData.order_status = status;

      // Special handling for order confirmation
      if (isConfirmation && status === "Order Confirmed") {
        updateData.confirmed_at = new Date();
        updateData.confirmed_by = req.body.confirmedBy || "Admin";
      }

      const updatedOrder = await prodOrderData.findByIdAndUpdate(
        orderId,
        { $set: updateData },
        { new: true }
      );

      if (!updatedOrder) {
        return res.status(404).json({
          status: false,
          message: "Order not found",
        });
      }

      return res.status(200).json({
        status: true,
        message: isConfirmation ? "Order confirmed successfully" : "Order status updated successfully",
        data: updatedOrder,
      });
    }

    if (cancel == true) {
      // For cancellation, only update order_status, NOT the main status field
      const updatedOrder = await prodOrderData.findByIdAndUpdate(
        orderId,
        {
          $set: {
            order_cancel_reason: reason,
            order_status: "Cancelled", // Only update order_status
            // DO NOT update the main 'status' field
          },
        },
        { new: true }
      );

      if (!updatedOrder) {
        return res.status(404).json({
          status: false,
          message: "Order not found",
        });
      }

      return res.status(200).json({
        status: true,
        message: "Order cancelled successfully",
        data: updatedOrder,
      });
    }
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

/* update order status */

/* add new order status -SK */

app.post("/addOrderStatus/", async (req, res) => {
  try {
    const { name, cancel, createdAt, updatedAt } = req.body;

    // Check duplicate
    const exists = await OrderStatus.findOne({ name: name.trim() });
    if (exists) {
      return res.status(200).json({
        status: false,
        message: "Status already exists",
        data: null,
      });
    }

    const newStatus = new OrderStatus({
      name,
      createdAt,
      updatedAt,
    });

    await newStatus.save();

    return res.status(201).json({
      status: true,
      message: "Order status added successfully",
      data: newStatus,
    });
  } catch (error) {
    console.error("Add Status Error:", error);
    res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
});

/* add new order status -SK */

/* Update advance and remaining amount in particular order */
app.post("/updateOrderAmounts", async (req, res) => {
  try {
    const { orderId, advanceAmount } = req.body;

    if (!orderId || advanceAmount === undefined) {
      return res.json({
        status: false,
        message: "orderId and advanceAmount are required",
      });
    }

    const order = await prodOrderData.findOne({ orderId });
    if (!order) {
      return res.json({
        status: false,
        message: "Order not found",
      });
    }

    /* ---------- NORMALIZE paidAmount ---------- */

    if (!Array.isArray(order.client.paidAmount)) {
      if (typeof order.client.paidAmount === "number") {
        order.client.paidAmount = [
          {
            amount: order.client.paidAmount,
            paidAt: order.createdAt || new Date(),
          },
        ];
      } else {
        order.client.paidAmount = [];
      }
    }

    /* ---------- CALCULATE TOTAL AMOUNT ---------- */

    const totalAmount = order.products.reduce(
      (sum, p) => sum + Number(p.booking?.totalPrice || 0),
      0
    );

    /* ---------- ADD NEW PAYMENT ---------- */

    const paidValue = Number(advanceAmount);
    if (isNaN(paidValue) || paidValue <= 0) {
      return res.json({
        status: false,
        message: "Invalid advanceAmount",
      });
    }

    order.client.paidAmount.push({
      amount: paidValue,
      paidAt: new Date(),
    });

    /* ---------- TOTAL PAID ---------- */

    const totalPaid = order.client.paidAmount.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );

    const remainingAmount = Math.max(totalAmount - totalPaid, 0);

    /* ---------- SAVE REQUIRED FIELDS ---------- */

    order.client.totalAmount = totalAmount;
    order.client.balanceAmount = remainingAmount;
    order.last_edited = new Date();

    await order.save();

    return res.json({
      status: true,
      message: "Payment added successfully",
      totalAmount,
      totalPaid,
      remainingAmount,
      data: order,
    });
  } catch (error) {
    console.error(error);
    return res.json({
      status: false,
      message: "Server Error",
      error: error.message,
    });
  }
});

/* Update advance and remaining amount in particular order */

// //PUT FOR EDIT THE BOOKED DATES
// app.put('/prodOrders/:id', async (req, res) => {
//     try {
//         const orderId = req.params.id;
//         const { products } = req.body;

//         // Validate products array
//         if (!products || !Array.isArray(products)) {
//             return res.status(400).json({ message: 'Products array is required' });
//         }

//         // Check for date conflicts
//         const allDates = products.flatMap(p =>
//             (p.bookedDates || []).map(d => new Date(d).toISOString().split('T')[0])
//         );

//         const conflict = await prodOrderData.findOne({
//             _id: { $ne: orderId },
//             'products.bookedDates': {
//                 $in: allDates.map(d => new Date(d))
//             }
//         });

//         if (conflict) {
//             return res.status(409).json({
//                 message: 'Date conflict with existing bookings',
//                 conflictOrderId: conflict._id
//             });
//         }
//         // Prepare updated products with proper date calculations
//         const updatedProducts = products.map(p => {
//             let bookedDates = [];
//             if (p.booking && p.booking.startDate && p.booking.endDate) {
//                 bookedDates = generateDateRange(
//                     new Date(p.booking.startDate),
//                     new Date(p.booking.endDate)
//                 );
//             }

//             return {
//                 ...p,
//                 bookedDates,
//                 booking: p.booking ? {
//                     ...p.booking,
//                     startDate: new Date(p.booking.startDate),
//                     endDate: new Date(p.booking.endDate),
//                     totalDays: bookedDates.length,
//                     totalPrice: (p.price || 0) * bookedDates.length
//                 } : null
//             };
//         });

//         // Update the order
//         const updatedOrder = await prodOrderData.findByIdAndUpdate(
//             orderId,
//             {
//                 $set: { products: updatedProducts },
//                 $currentDate: { updatedAt: true }
//             },
//             {
//                 new: true,
//                 runValidators: true,
//                 context: 'query'
//             }
//         );

//         if (!updatedOrder) {
//             return res.status(404).json({ message: 'Order not found' });
//         }

//         res.json({
//             success: true,
//             message: 'Order updated successfully',
//             order: updatedOrder
//         });
//     } catch (err) {
//         console.error('Error updating order:', err);
//         res.status(500).json({
//             success: false,
//             message: 'Server error while updating order',
//             error: err.message,
//             stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
//         });
//     }
// });

// Check for date conflicts (only for same product)

// NEWLY ADDED Handled by admin
// UPDATE HANDLED_BY AND LAST_EDITED
app.put("/prodOrders/:id/handled-by", async (req, res) => {
  try {
    const orderId = req.params.id;
    const { handled_by } = req.body;

    if (!handled_by || handled_by.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Handler name is required",
      });
    }

    // Check if order exists
    const existingOrder = await prodOrderData.findById(orderId);
    if (!existingOrder) {
      console.log("❌ Order not found:", orderId);
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // // Check if already handled by someone else
    // if (existingOrder.handled_by && existingOrder.handled_by.trim() !== '') {
    //     if (existingOrder.handled_by.toLowerCase() !== handled_by.toLowerCase()) {
    //         return res.status(200).json({
    //             success: false,
    //             already_handled: true,
    //             current_handler: existingOrder.handled_by,
    //             message: `This order is already being handled by ${existingOrder.handled_by}`
    //         });
    //     }
    // }

    // Always update, even if already handled by someone
    // (Remove the check that prevents updating if already handled)
    const trimmedName = handled_by.trim();

    // Update order
    const updatedOrder = await prodOrderData.findByIdAndUpdate(
      orderId,
      {
        $set: {
          handled_by: trimmedName,
          last_edited: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );
    console.log("✅ Order updated successfully:", updatedOrder._id);

    res.json({
      success: true,
      message: "Handler name updated successfully",
      order: updatedOrder,
    });
  } catch (err) {
    console.error("❌ Error updating handler:", err);
    res.status(500).json({
      success: false,
      message: "Server error while updating handler",
      error: err.message,
    });
  }
});
// NEWLY ADDED Handled by admin
// RAC CONCEPTS 

app.get("/pending-reservations/:prodCode", async (req, res) => {
  try {
    const { prodCode } = req.params;

    // Find all pending orders for this product
    const pendingOrders = await prodOrderData.find({
      "products.prodCode": prodCode,
      $or: [
        { order_status: "pending" },
        { order_status: "Pending" },
        { status: "pending" },
        { status: "Pending" }
      ],
      "products.deleted": { $ne: true }
    }).sort({ createdAt: 1 }); // Sort by creation time (queue order)

    // Extract detailed reservation info
    const reservations = [];
    pendingOrders.forEach((order) => {
      order.products.forEach((product) => {
        if (product.prodCode === prodCode && !product.deleted) {
          const dates = [];
          product.bookedDates.forEach(date => {
            const dateObj = new Date(date);
            dates.push(dateObj.toISOString().split('T')[0]);
          });

          reservations.push({
            orderId: order.orderId,
            userId: order.client?.userId,
            userName: order.client?.name,
            userEmail: order.client?.email,
            productName: product.name,
            dates: dates,
            createdAt: order.createdAt,
            totalDays: product.booking?.totalDays || 0,
            totalAmount: product.booking?.totalPrice || 0
          });
        }
      });
    });

    res.json({
      success: true,
      count: reservations.length,
      reservations: reservations
    });
  } catch (error) {
    console.error("Error fetching pending reservations:", error);
    res.status(500).json({ error: "Failed to fetch pending reservations" });
  }
});

// NEW: Confirm order endpoint (admin action)
app.put("/orders/:orderId/confirm", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { confirmedBy, notes } = req.body;

    console.log(`Confirming order ${orderId} by ${confirmedBy}`);

    // Find order by orderId or _id
    let order;
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      order = await prodOrderData.findById(orderId);
    } else {
      order = await prodOrderData.findOne({ orderId: orderId });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Check if already confirmed
    if (order.order_status === "confirmed" || order.status === "Confirmed") {
      return res.status(400).json({
        success: false,
        message: "Order is already confirmed"
      });
    }

    // Check if order is cancelled
    if (order.order_status === "cancelled" || order.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot confirm a cancelled order"
      });
    }

    // Update order status
    const previousStatus = order.order_status || order.status;
    order.order_status = "confirmed";
    order.status = "Confirmed";
    order.handled_by = confirmedBy || order.handled_by;
    order.confirmed_at = new Date();
    order.confirmed_by = confirmedBy;
    order.confirmation_notes = notes;
    order.last_edited = new Date();

    await order.save();

    console.log(`Order ${orderId} confirmed successfully`);

    // Send confirmation email
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || "adinn@example.com",
        to: order.client.email,
        subject: `Order Confirmed - ${order.orderId}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .order-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #4CAF50; }
              .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
              .status-badge { display: inline-block; padding: 5px 10px; background: #4CAF50; color: white; border-radius: 3px; font-weight: bold; }
              .product-item { border-bottom: 1px solid #eee; padding: 10px 0; }
              .dates { color: #e53935; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Order Confirmed!</h1>
                <p>Your booking has been confirmed</p>
              </div>
              <div class="content">
                <p>Dear ${order.client.name},</p>
                <p>We are pleased to inform you that your order has been confirmed by our team.</p>
                
                <div class="order-details">
                  <h3>Order Details</h3>
                  <p><strong>Order ID:</strong> ${order.orderId}</p>
                  <p><strong>Status:</strong> <span class="status-badge">CONFIRMED ✅</span></p>
                  <p><strong>Confirmed by:</strong> ${confirmedBy}</p>
                  <p><strong>Confirmed on:</strong> ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p><strong>Total Amount:</strong> ₹${order.client.totalAmount?.toLocaleString('en-IN') || '0'}</p>
                </div>
                
                <h3>Product Details:</h3>
                ${order.products.map((product, index) => `
                  <div class="product-item">
                    <p><strong>${index + 1}. ${product.name}</strong></p>
                    <p>Product Code: ${product.prodCode}</p>
                    <p>Booking Dates: <span class="dates">
                      ${new Date(product.booking.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} 
                      to 
                      ${new Date(product.booking.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      (${product.booking.totalDays} days)
                    </span></p>
                    <p>Amount: ₹${product.booking.totalPrice?.toLocaleString('en-IN') || '0'}</p>
                  </div>
                `).join('')}
                
                <p><strong>Note:</strong> Your booking dates are now locked and unavailable for others.</p>
                
                <p>If you have any questions, please contact our support team.</p>
                
                <p>Best regards,<br>
                The Adinn Team</p>
              </div>
              <div class="footer">
                <p>This is an automated email. Please do not reply to this message.</p>
                <p>© ${new Date().getFullYear()} Adinn Advertising. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`Confirmation email sent to ${order.client.email}`);
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Don't fail the whole operation if email fails
    }

    res.json({
      success: true,
      message: "Order confirmed successfully",
      order: {
        orderId: order.orderId,
        status: order.order_status,
        confirmed_at: order.confirmed_at,
        confirmed_by: order.confirmed_by,
        previousStatus: previousStatus
      }
    });
  } catch (error) {
    console.error("Error confirming order:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.toString()
    });
  }
});

// NEW: Get date availability suggestions
app.get("/date-suggestions/:prodCode", async (req, res) => {
  try {
    const { prodCode } = req.params;
    const { requiredDays = 7, startFrom } = req.query;

    const daysRequired = parseInt(requiredDays) || 7;
    const startDate = startFrom ? new Date(startFrom) : new Date();

    // Get confirmed dates
    const dateResponse = await fetch(`${req.protocol}://${req.get('host')}/booked-dates/${prodCode}`);
    const dateData = await dateResponse.json();

    const confirmedDates = dateData.confirmed || [];
    const pendingDates = dateData.pending || [];

    // Combine both confirmed and pending for conflict checking
    const allBlockedDates = [...new Set([...confirmedDates])]; // Only confirmed dates block

    const suggestions = [];
    const maxDaysToCheck = 90; // Check next 90 days

    for (let dayOffset = 0; dayOffset < maxDaysToCheck; dayOffset++) {
      const currentStart = new Date(startDate);
      currentStart.setDate(currentStart.getDate() + dayOffset);

      // Skip past dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (currentStart < today) continue;

      let consecutiveDays = 0;
      let currentDay = new Date(currentStart);
      let availableDays = [];
      let conflictDays = [];

      while (consecutiveDays < daysRequired) {
        const dateStr = currentDay.toISOString().split('T')[0];

        // Check if date is confirmed booked
        if (allBlockedDates.includes(dateStr)) {
          conflictDays.push({
            date: dateStr,
            type: 'confirmed'
          });
          break;
        }

        // Check if date is pending (still available)
        const isPending = pendingDates.some(p => p.date === dateStr);

        availableDays.push({
          date: dateStr,
          status: isPending ? 'pending' : 'available'
        });

        consecutiveDays++;
        currentDay.setDate(currentDay.getDate() + 1);
      }

      if (consecutiveDays >= daysRequired) {
        const endDate = new Date(currentStart);
        endDate.setDate(endDate.getDate() + daysRequired - 1);

        const pendingCount = availableDays.filter(d => d.status === 'pending').length;

        suggestions.push({
          startDate: currentStart.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          totalDays: daysRequired,
          availableDays: daysRequired,
          pendingInRange: pendingCount,
          hasPending: pendingCount > 0,
          suggestionText: `${currentStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
          note: pendingCount > 0 ? `(${pendingCount} pending dates in queue)` : 'All dates available'
        });

        if (suggestions.length >= 3) break; // Limit to 3 suggestions
      }
    }

    res.json({
      success: true,
      suggestions: suggestions,
      totalBlockedDates: allBlockedDates.length,
      totalPendingDates: pendingDates.length
    });
  } catch (error) {
    console.error("Error generating date suggestions:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


app.get("/check-date-conflicts/:prodCode", async (req, res) => {
  try {
    const { prodCode } = req.params;
    const { startDate, endDate, excludeOrderId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start and end dates are required"
      });
    }

    console.log(`Checking date conflicts for ${prodCode}: ${startDate} to ${endDate}`);

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format"
      });
    }

    // Get all booked dates (both confirmed and pending)
    const dateResponse = await fetch(`${req.protocol}://${req.get('host')}/booked-dates/${prodCode}${excludeOrderId ? `?excludeOrderId=${excludeOrderId}` : ''}`);
    const dateData = await dateResponse.json();

    const confirmedDates = dateData.confirmed || [];
    const pendingDates = dateData.pending || [];

    // Generate all dates in requested range
    const requestedDates = [];
    const current = new Date(start);
    const endDateObj = new Date(end);

    while (current <= endDateObj) {
      const dateStr = current.toISOString().split('T')[0];
      requestedDates.push(dateStr);
      current.setDate(current.getDate() + 1);
    }

    // Check for conflicts
    const confirmedConflicts = [];
    const pendingConflicts = [];
    const availableDates = [];

    requestedDates.forEach(dateStr => {
      if (confirmedDates.includes(dateStr)) {
        confirmedConflicts.push({
          date: dateStr,
          type: 'confirmed',
          status: 'blocked'
        });
      } else if (pendingDates.some(p => p.date === dateStr)) {
        pendingConflicts.push({
          date: dateStr,
          type: 'pending',
          status: 'queue'
        });
      } else {
        availableDates.push({
          date: dateStr,
          type: 'available',
          status: 'free'
        });
      }
    });

    const totalRequestedDays = requestedDates.length;
    const confirmedConflictCount = confirmedConflicts.length;
    const pendingConflictCount = pendingConflicts.length;
    const availableCount = availableDates.length;

    // Generate suggestions if there are confirmed conflicts
    const suggestions = [];
    if (confirmedConflictCount > 0 && availableCount < totalRequestedDays) {
      // Try to find alternative date ranges
      const alternativeRanges = await generateAlternativeDateRanges(
        prodCode,
        start,
        end,
        totalRequestedDays,
        confirmedDates,
        pendingDates
      );

      if (alternativeRanges.length > 0) {
        suggestions.push(...alternativeRanges);
      }
    }

    res.json({
      success: true,
      hasConflicts: confirmedConflictCount > 0,
      hasQueueDates: pendingConflictCount > 0,
      totalRequestedDays,
      confirmedConflicts,
      pendingConflicts,
      availableDates,
      confirmedConflictCount,
      pendingConflictCount,
      availableCount,
      canBook: confirmedConflictCount === 0,
      suggestions: suggestions.length > 0 ? suggestions.slice(0, 3) : [],
      message: confirmedConflictCount > 0
        ? `${confirmedConflictCount} date(s) are already confirmed booked. ${pendingConflictCount > 0 ? `${pendingConflictCount} date(s) are in queue.` : ''}`
        : pendingConflictCount > 0
          ? `All dates available. ${pendingConflictCount} date(s) are in queue (can be booked).`
          : 'All dates are available for immediate booking.'
    });
  } catch (error) {
    console.error("Error checking date conflicts:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Helper function to generate alternative date ranges
async function generateAlternativeDateRanges(prodCode, originalStart, originalEnd, requiredDays, confirmedDates, pendingDates) {
  const suggestions = [];
  const maxAttempts = 30;

  // Try different starting points
  for (let attempt = 0; attempt < maxAttempts && suggestions.length < 3; attempt++) {
    // Start from original start date + attempt days
    const startDate = new Date(originalStart);
    startDate.setDate(startDate.getDate() + attempt);

    // Skip past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) continue;

    let consecutiveAvailable = 0;
    let currentDate = new Date(startDate);
    let potentialStart = new Date(startDate);
    let potentialEnd = null;

    // Try to find required consecutive days
    while (consecutiveAvailable < requiredDays) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Check if date is available (not confirmed)
      if (!confirmedDates.includes(dateStr)) {
        consecutiveAvailable++;
        if (consecutiveAvailable === 1) {
          potentialStart = new Date(currentDate);
        }
        if (consecutiveAvailable === requiredDays) {
          potentialEnd = new Date(currentDate);
          break;
        }
      } else {
        consecutiveAvailable = 0;
        potentialStart = new Date(currentDate);
        potentialStart.setDate(potentialStart.getDate() + 1);
      }

      currentDate.setDate(currentDate.getDate() + 1);

      // Don't search too far into the future
      if (currentDate > new Date(originalEnd.getTime() + (90 * 24 * 60 * 60 * 1000))) {
        break;
      }
    }

    if (potentialEnd) {
      // Count pending dates in this range
      let pendingCount = 0;
      let checkDate = new Date(potentialStart);
      while (checkDate <= potentialEnd) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (pendingDates.some(p => p.date === dateStr)) {
          pendingCount++;
        }
        checkDate.setDate(checkDate.getDate() + 1);
      }

      suggestions.push({
        startDate: potentialStart.toISOString().split('T')[0],
        endDate: potentialEnd.toISOString().split('T')[0],
        totalDays: requiredDays,
        pendingInRange: pendingCount,
        hasPending: pendingCount > 0,
        suggestionText: `${potentialStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${potentialEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
        note: pendingCount > 0 ? `(${pendingCount} pending dates in queue)` : 'All dates available'
      });
    }
  }

  return suggestions;
}
// RAC CONCEPTS 


//CART ITEMS ROUTE
// GET cart items for user
app.get("/cart/user/:userId", async (req, res) => {
  try {
    console.log("Received request for user ID:", req.params.userId);
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const cartItems = await cartData.find({ userId: req.params.userId });
    // console.log('Found cart items:', cartItems);
    console.log("Found cart items:", cartItems.length);
    res.status(200).json(cartItems);
  } catch (err) {
    console.error("Error fetching cart items:", err);
    res.status(500).json({
      message: "Failed to fetch cart items",
      error: err.message,
    });
  }
});

// ADD item to cart
app.post("/cart", async (req, res) => {
  try {
    console.log("Received cart item:", req.body);
    // Validate required fields
    if (!req.body.userId || !req.body.productId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if item already exists for this user
    const existingItem = await cartData.findOne({
      userId: req.body.userId,
      productId: req.body.productId,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
    });

    if (existingItem) {
      return res.status(400).json({ message: "Item already in cart" });
    }

    const newItem = new cartData(req.body);
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (err) {
    console.error("Error adding to cart:", err);
    res.status(500).json({
      message: "Failed to add item to cart",
      error: err.message,
    });
  }
});

// UPDATE cart item
app.put("/cart/:id", async (req, res) => {
  try {
    const updatedItem = await cartData.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json(updatedItem);
  } catch (err) {
    console.error("Error updating cart item:", err);
    res.status(500).json({
      message: "Failed to update cart item",
      error: err.message,
    });
  }
});

// DELETE item from cart
app.delete("/cart/:id", async (req, res) => {
  try {
    const deletedItem = await cartData.findByIdAndDelete(req.params.id);
    if (!deletedItem) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.json({ message: "Item removed from cart" });
  } catch (err) {
    console.error("Error removing from cart:", err);
    res.status(500).json({
      message: "Failed to remove item from cart",
      error: err.message,
    });
  }
});

// DELETE multiple items from cart
app.delete("/cart", async (req, res) => {
  try {
    const { itemIds } = req.body;
    if (!itemIds || !Array.isArray(itemIds)) {
      return res.status(400).json({ message: "Invalid item IDs" });
    }

    // Validate all IDs are valid MongoDB ObjectIds
    if (itemIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ message: "Invalid item ID format" });
    }

    const result = await cartData.deleteMany({
      _id: { $in: itemIds },
    });

    res.json({
      message: `${result.deletedCount} items removed from cart`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Error removing multiple items:", err);
    res.status(500).json({
      message: "Failed to remove items from cart",
      error: err.message,
    });
  }
});

// CLEAR cart for user
app.delete("/cart/clear/:userId", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const result = await cartData.deleteMany({
      userId: req.params.userId,
    });

    res.json({
      message: `Cart cleared for user`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Error clearing cart:", err);
    res.status(500).json({
      message: "Failed to clear cart",
      error: err.message,
    });
  }
});



/* send mail on adinn.com site -Sk */
const contactUserTemplate = ({ firstname, lastname, email, message }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>User Email</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f9f9f9;">
  <div style="max-width:700px;margin:auto;background:#ffffff;padding:20px;border:1px solid #ddd;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:20px;">
      <img src="cid:adinnlogo" alt="Adinn Logo" style="height:50px;">
    </div>

    <!-- Greeting -->
    <div style="font-size:24px;font-weight:600;margin-bottom:20px;">Hi ${firstname},</div>

    <!-- Message -->
    <p style="font-size:16px;line-height:1.5;">
      Thank you for contacting <strong>Adinn Advertising Services Ltd</strong>.
      We have received your message and our team will get back to you shortly.
    </p>

    <!-- User Details Table -->
    <h3 style="margin-top:30px;">Your submitted details</h3>
    <table style="border-collapse:collapse;width:100%;font-size:14px;">
      <tr>
        <td style="padding:6px 0;font-weight:bold;">Name:</td>
        <td style="padding:6px 0;">${firstname} ${lastname}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-weight:bold;">Email:</td>
        <td style="padding:6px 0;"><a href="mailto:${email}" style="color:#2B3333;text-decoration:none;">${email}</a></td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-weight:bold;vertical-align:top;">Message:</td>
        <td style="padding:6px 0;">${message}</td>
      </tr>
    </table>

    <!-- Footer -->
    <p style="margin-top:30px;font-size:14px;line-height:1.5;">
      Regards,<br/>
      <strong>Adinn Advertising Services Ltd</strong><br/>
      📞 +91 7373785048 | 9626987861<br/>
      📧 <a href="mailto:info@adinn.co.in" style="color:#2B3333;text-decoration:none;">contact@adinn.com</a><br/>
      🌐 <a href="https://www.adinn.com" target="_blank" style="color:#2B3333;text-decoration:none;">www.adinn.com</a>
    </p>


  </div>
</body>
</html>
`;

app.post("/sendMailAdinnContactUs", async (req, res) => {
  try {
    const { firstName, lastName, email, message } = req.body;


    // ✅ Validation
    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // ✅ Email HTML
    const htmlContent = contactUserTemplate({
      firstname: firstName,
      lastname: lastName,
      email,
      message,
    });

    // ✅ Brevo API calls
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Adinn Advertising Services Ltd",
          email: "contact@adinn.com",
        },
        to: [
          {
            email: "info@adinn.co.in",
          },
        ],
        // cc: [
        //   {
        //     email: "srbedev@adinn.co.in",
        //   },
        // ],
        subject: "Thank you for contacting Adinn",
        htmlContent: htmlContent,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,

          "Content-Type": "application/json",
        },
        timeout: 15000, // 15 sec safety's
      }
    );

    // ✅ Success response
    return res.status(200).json({
      success: true,
      message: "Mail sent successfully",
      response: response.data,
    });

  } catch (error) {
    console.error(
      "Brevo Mail Error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: "Mail sending failed",
      error: error.response?.data || error.message,
    });
  }
});



/* send mail on adinn.com site -SK */



// Simple GET  HII
app.post("/checkPost", (req, res) => {
  const { firstName, lastName, email, message } = req.body;
  res.json({ firstName: firstName, lastName: lastName, email: email, message: message, test: "test" });
});
app.get("/testurl", async (req, res) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "mail.adinnoutdoors.com",
      port: 465,
      secure: false,
      auth: {
        user: "roadshows@adinnoutdoors.com",
        pass: "Pie~(HOk7q5c",
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"Order Notification" <roadshows@adinnoutdoors.com>`,
      to: "webdeveloper1@adinn.co.in",
      subject: "New Order Notification",
      html: `
          <h3>New Order Received</h3>
          <p>This is a test email sent from Node.js</p>
        `,
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Email sending failed",
      error: error.message,
    });
  }

})



app.get("/checkOrderConflict/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    const EXCLUDED_STATUSES = [
      "Order Confirmed",
      "Design in Progress",
      "Awaiting Client side design Approval",
      "Ready for Printing",
      "Printing in Progress",
      "Completed / Installed",
      "Payment Pending",
      "Payment Completed",
      "Cancelled"
    ];

    // 1️⃣ Current Order
    const currentOrder = await prodOrderData.findOne({ orderId });
    if (!currentOrder) {
      return res.status(404).json({ success: false });
    }

    const currentProduct = currentOrder.products?.[0];
    if (!currentProduct || currentProduct.deleted) {
      return res.json({ success: true, conflicts: [] });
    }

    const productId = currentProduct.id;
    const currentBookedDates = currentProduct.bookedDates;

    const currentUserColor = generateUserColor(currentOrder.client.userId);

    // 2️⃣ Other orders with SAME product (no date filtering)
    const conflicts = await prodOrderData.aggregate([
      {
        $match: {
          orderId: { $ne: orderId },
          order_status: { $nin: EXCLUDED_STATUSES }
        }
      },
      { $unwind: "$products" },
      {
        $match: {
          "products.deleted": false,
          "products.id": productId
        }
      },
      {
        $project: {
          _id: 0,
          orderId: 1,
          client: {
            userId: "$client.userId",
            name: "$client.name",
            email: "$client.email",
            contact: "$client.contact"
          },
          booking: "$products.booking",

          // ✅ ALL booked dates of that product
          bookedDates: "$products.bookedDates",

          // ✅ Still calculate matched dates (optional but useful)
          matchedDates: {
            $setIntersection: ["$products.bookedDates", currentBookedDates]
          }
        }
      }
    ]);

    // 3️⃣ Add color inside client
    const conflictsWithColor = conflicts.map(conflict => ({
      ...conflict,
      client: {
        ...conflict.client,
        colorCode: generateUserColor(conflict.client.userId)
      }
    }));

    return res.json({
      success: true,

      currentOrder: {
        orderId: currentOrder.orderId,
        client: {
          userId: currentOrder.client.userId,
          name: currentOrder.client.name,
          contact: currentOrder.client.contact || "--",
          colorCode: currentUserColor
        },
        productId,
        booking: currentProduct.booking,
        bookedDates: currentBookedDates
      },

      // ✅ SAME KEY NAME
      conflicts: conflictsWithColor
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});





// ================================
// COLOR FAMILY DEFINITIONS
// ================================
const COLOR_FAMILIES = [
  { name: "blue", hueRange: [200, 240] },
  { name: "purple", hueRange: [260, 300] },
  { name: "teal", hueRange: [160, 190] }
];

// Track used families (per page / request lifecycle)
const usedColorFamilies = new Set();

// Cache user → color mapping
const userColorCache = new Map();

// ================================
// MAIN FUNCTION
// ================================
function generateUserColor(userKey) {
  // Return cached color if exists
  if (userColorCache.has(userKey)) {
    return userColorCache.get(userKey);
  }

  // Create deterministic hash
  let hash = 0;
  for (let i = 0; i < userKey.length; i++) {
    hash = userKey.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Pick unused family first
  let family =
    COLOR_FAMILIES.find(f => !usedColorFamilies.has(f.name)) ||
    COLOR_FAMILIES[Math.abs(hash) % COLOR_FAMILIES.length];

  usedColorFamilies.add(family.name);

  // Pick hue inside allowed range
  const [minHue, maxHue] = family.hueRange;
  const hue = minHue + (Math.abs(hash) % (maxHue - minHue));

  const saturation = 65;
  const lightness = 55;

  const color = hslToHex(hue, saturation, lightness);

  // Cache result
  userColorCache.set(userKey, color);

  return color;
}

// ================================
// HSL → HEX CONVERTER
// ================================
function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;

  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  return (
    "#" +
    [f(0), f(8), f(4)]
      .map(x =>
        Math.round(255 * x)
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

app.get("/getDashboardCount", async (req, res) => {
  try {




    const [
      totalOrders,
      activeOrders,
      cancelledOrders,
      visibleProducts,
      bookedProductsAgg,
      revenueAgg,
      totalEnquiries,
      contantCount,
      usersCount,
    ] = await Promise.all([

      // 1️⃣ Total orders
      prodOrderData.countDocuments({
        order_status: { $exists: true }
      }),

      // 2️⃣ Active orders
      prodOrderData.countDocuments({
        order_status: { $ne: "Cancelled" }
      }),

      // 3️⃣ Cancelled orders
      prodOrderData.countDocuments({
        order_status: "Cancelled"
      }),

      // 4️⃣ Visible products
      productData.countDocuments({
        visible: { $ne: false }
      }),

      // 5️⃣ Booked products count
      prodOrderData.aggregate([
        {
          $match: {
            order_status: { $ne: "Cancelled" }
          }
        },
        {
          $unwind: "$products"
        },
        {
          $count: "count"
        }
      ]),

      // 6️⃣ Total revenue (with GST)
      prodOrderData.aggregate([
        {
          $match: {
            order_status: { $ne: "Cancelled" }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: "$totalAmountWithGST"
            }
          }
        }
      ]),
      // 7️⃣ Overall product enquiries count
      productEnquiryData.countDocuments({}),

      // 8️⃣ Contact us enquiries count
      OverallFooterContacts.countDocuments({}),

      // 9️⃣ Total users count
      OverallUsers.countDocuments({})



    ]);

    res.json({
      success: true,
      data: {
        orders: {
          total: totalOrders,
          active: activeOrders,
          cancelled: cancelledOrders
        },
        bookedProducts: bookedProductsAgg[0]?.count || 0,
        visibleProducts,
        revenue: revenueAgg[0]?.totalRevenue || 0,
        productEnquiries: totalEnquiries,
        contactEnquiries: contantCount,
        users: usersCount
      }
    });

  } catch (error) {
    console.error("Dashboard count error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard counts",
      error: error.message
    });
  }
});




//BREVO EMAIL INTEGRATION
// app.post("/sendBrevoSMTP", async (req, res) => {
//   try {
//     const { firstName, lastName, email, message } = req.body;


//     const transporter = nodemailer.createTransport({
//       host: "smtpout.secureserver.net",
//       port: 465,
//       secure: true, // 587 = false
//       auth: {
//         user: "noreply@adinndigital.com",
//         pass: "Adinn@321@"
//       }

//     });

// const mailOptions = {
//   from: 'Adinn <noreply@adinndigital.com>',
//   to: email,
//   subject: `Welcome ${firstName} ${lastName}!`,
//   html: `<h1>Welcome to Adinn</h1>`,
//   text: `Welcome ${firstName} ${lastName}!`
// };



//     const info = await transporter.sendMail(mailOptions);

//     res.json({
//       success: true,
//       messageId: info.messageId,
//       message: "Email sent via SMTP"
//     });

//   } catch (error) {
//     console.error("SMTP Error:", error);
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// });


// BREVO SMTP EMAIL INTEGRATION (with Render-compatible fixes)
app.post("/sendBrevoSMTP", async (req, res) => {
  try {
    const { firstName, lastName, email, message } = req.body;

    // Force IPv4 DNS lookup (avoids IPv6 timeouts)
    const dns = require('dns');
   const transporter = nodemailer.createTransport({
  host: "smtpout.secureserver.net",
  port: 2525,              // Alternative port that works on free tier
  secure: false,           // false for ports other than 465
  requireTLS: true,        // Use TLS
  auth: {
    user: "noreply@adinndigital.com",
    pass: "Adinn@321@"     // ⚠️ Move to environment variable!
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
  // Force IPv4
  lookup: (hostname, options, callback) => {
    const dns = require('dns');
    dns.lookup(hostname, { ...options, family: 4 }, callback);
  }
});

    const mailOptions = {
      from: 'Adinn <noreply@adinndigital.com>',
      to: email,
      subject: `Welcome ${firstName} ${lastName}!`,
      html: `<h1>Welcome to Adinn</h1>`,
      text: `Welcome ${firstName} ${lastName}!`
    };

    const info = await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      messageId: info.messageId,
      message: "Email sent via SMTP"
    });

  } catch (error) {
    console.error("SMTP Error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
//BREVO EMAIL INTEGRATION
//PHP MAIL IMPLEMENTATION 
const phpMailUrl = 'https://adinndigital.com/api/mail.php';

// axios.post(phpMailUrl, {
//   headers: {
//     'Content-Type': 'application/json'
//   }
// })
// .then(response => {
//   console.log('✅ Success:', response.data);
// })
// .catch(error => {
//   if (error.response) {
//     // The server responded with a status code outside 2xx
//     console.error('❌ Server Error:', error.response.data);
//   } else if (error.request) {
//     // No response was received
//     console.error('❌ No response from server:', error.request);
//   } else {
//     // Something else went wrong
//     console.error('❌ Request Error:', error.message);
//   }
// }); 

app.post('/phpMailTest', async (req, res) => {
  console.log('Received request body:', req.body);

  try {
    const response = await axios.post('https://adinndigital.com/api/mail.php', req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('PHP API response:', response.data);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error:', error.message);
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});