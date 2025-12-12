const express = require("express");
const multer = require("multer");
const path = require("path");
const mongoose = require("mongoose");
const productData = require("./productSchema");
const categoryData = require("./categorySchema");
const mediaTypeData = require("./mediaTypeSchema");
const prodOrderData = require("./productOrderSchema");
const OrderStatus = require("./orderstatusSchema");
const cartData = require("./productCartSchema");
const cors = require("cors");
const Razorpay = require("razorpay"); //require razorpay then only we use
const bodyParser = require("body-parser"); //sent the json data
const crypto = require("crypto"); //inbuilt function to embed the data in this we use sha256 algorithm to safest way of payment
// Initialize the Express app
const app = express();
const PORT = 3001;

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
// app.get('/products_new', async (req, res) => {
//     try {

//         const page = parseInt(req.query.page) || 0;
//         const limit = parseInt(req.query.limit) || 9;

//         const skip = page * limit;

//         const data = await productData.find()
//             .skip(skip)
//             .limit(limit);

//         const totalCount = await productData.countDocuments();

//         res.json({
//             status: true,
//             current_page: page,
//             limit: limit,
//             total_products: totalCount,
//             total_pages: Math.ceil(totalCount / limit),
//             data: data
//         });

//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// });
/* order fetched with pagination */

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

app.get("/products/similar/:prodCode", async (req, res) => {
  try {
    // First find the current product
    const currentProduct = await productData.findOne({
      prodCode: req.params.prodCode,
    });
    if (
      !currentProduct ||
      !currentProduct.similarProducts ||
      currentProduct.similarProducts.length === 0
    ) {
      return res.status(404).json({ message: "No similar products found" });
    }
    // Extract similar products' ProdCodes
    const prodCodes = currentProduct.similarProducts.map((p) => p.ProdCode);
    // Fetch details of all similar products (excluding the current one)
    const similarProducts = await productData.find({
      prodCode: { $in: prodCodes },
      _id: { $ne: currentProduct._id }, // Exclude current product by ID instead of prodCode
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
    res.json(mappedResults);
  } catch (err) {
    console.error("Error fetching similar products:", err);
    res.status(500).json({ message: "Error fetching similar products" });
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

// Updated booked dates endpoint with exclusion
app.get("/booked-dates/:prodCode", async (req, res) => {
  try {
    const { prodCode } = req.params;
    const excludeOrderId = req.query.excludeOrderId;

    console.log(
      `Fetching booked dates for product: ${prodCode}, excluding order: ${excludeOrderId}`
    );

    // Build query to find orders with this product code
    let query = {
      "products.prodCode": prodCode,
    };

    // Exclude current order if specified
    if (
      excludeOrderId &&
      excludeOrderId !== "null" &&
      excludeOrderId !== "undefined"
    ) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeOrderId) };
    }

    // Find all orders that contain this product code
    const orders = await prodOrderData.find(query);
    console.log(`📊 Found ${orders.length} orders with product ${prodCode}`);

    // Extract all booked dates for this product from other orders
    const bookedDates = [];
    orders.forEach((order) => {
      order.products.forEach((product) => {
        if (product.prodCode === prodCode && product.bookedDates) {
          // Convert dates to ISO string format for consistency
          product.bookedDates.forEach((date) => {
            // const dateObj = new Date(date);
            // bookedDates.push(dateObj.toISOString().split('T')[0]);

            try {
              const dateObj = new Date(date);
              if (!isNaN(dateObj.getTime())) {
                // Normalize to UTC midnight for consistent comparison
                const utcDate = new Date(
                  Date.UTC(
                    dateObj.getUTCFullYear(),
                    dateObj.getUTCMonth(),
                    dateObj.getUTCDate()
                  )
                );
                bookedDates.push(utcDate.toISOString().split("T")[0]);
              }
            } catch (e) {
              console.warn("Invalid date format:", date);
            }
          });
        }
      });
    });

    // Remove duplicates and return
    const uniqueDates = [...new Set(bookedDates)];
    console.log(`📅 Final booked dates for ${prodCode}:`, uniqueDates);

    res.json(uniqueDates);
  } catch (error) {
    console.error("Error fetching booked dates:", error);
    res.status(500).json({ error: "Failed to fetch booked dates" });
  }
});

//FOR  USER SITE ORDER
// GET orders for specific user
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
const generateNextOrderId = async (prefix = "AD") => {
  try {
    // Find the order with the highest orderId for the given prefix
    const lastOrder = await prodOrderData
      .findOne({ orderId: new RegExp(`^${prefix}`) })
      .sort("-orderId");

    if (!lastOrder) {
      return `${prefix}0001`; // First order for this prefix
    }

    // Extract the numeric part and increment
    const lastNumber = parseInt(lastOrder.orderId.substring(2));
    const nextNumber = lastNumber + 1;

    // Format with leading zeros
    return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
  } catch (err) {
    console.error("Error generating order ID:", err);
    // Fallback - generate based on timestamp
    return `${prefix}${Date.now().toString().slice(-4)}`;
  }
};

app.post("/prodOrders", async (req, res) => {
  try {
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

    const prefix = req.body.status === "UserSideOrder" ? "US" : "AD";
    const orderId = await generateNextOrderId(prefix);

    // Process each product
    const products = req.body.products.map((product) => {
      if (!product) {
        throw new Error("Invalid product data");
      }

      // Calculate booked dates if booking info exists
      let bookedDates = [];
      if (
        product.booking &&
        product.booking.startDate &&
        product.booking.endDate
      ) {
        const start = new Date(product.booking.startDate);
        const end = new Date(product.booking.endDate);
        const current = new Date(start);

        while (current <= end) {
          bookedDates.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }
      }

      return {
        ...product,
        bookedDates,
        booking: product.booking
          ? {
              ...product.booking,
              startDate: new Date(product.booking.startDate),
              endDate: new Date(product.booking.endDate),
              totalDays: bookedDates.length,
              totalPrice: (product.price || 0) * bookedDates.length,
            }
          : null,
      };
    });

    const newOrder = new prodOrderData({
      ...req.body,
      orderId: orderId,
      products: products,
      createdAt: new Date(),
    });

    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({
      message: err.message || "Failed to create order",
      error: true,
    });
  }
});

/* delete product for particular order -SK */
app.get("/deleteProductOrder/:orderId/:productId", async (req, res) => {
  try {
    const { orderId, productId } = req.params;

    // STEP 1: FIND the order using orderId (NOT Mongo _id)
    const order = await prodOrderData.findOne({ orderId: orderId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // STEP 2: CHECK if product exists in order.products
    // const productExists = order.products.some(p => p.id === productId);

    // if (!productExists) {
    //   return res.status(404).json({ message: "Product not found in this order" });
    // }

    // STEP 3: REMOVE that product from array
    order.products = order.products.filter((p) => p.id !== productId);

    // STEP 4: RECALCULATE total amount (optional)
    const newTotalAmount = order.products.reduce(
      (sum, p) => sum + (p.booking?.totalPrice || 0),
      0
    );
    order.client.paidAmount = newTotalAmount; // if needed

    order.last_edited = new Date();

    // STEP 5: SAVE CHANGES
    await order.save();

    return res.json({
      message: "Product removed successfully",
      updatedOrder: order,
      total: newTotalAmount,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error", error });
  }
});
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
app.put("/updateOrderStatus/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
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
    // Find and update
    const updatedOrder = await prodOrderData.findByIdAndUpdate(
      orderId,
      { $set: { order_status: status } },
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
      message: "Order status updated successfully",
      data: updatedOrder,
    });
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
    const { name, createdAt, updatedAt } = req.body;

    // Check duplicate
    const exists = await OrderStatus.findOne({ name: name.trim() });
    if (exists) {
      return res.status(200).json({
        status: false,
        message: "Status already exists",
        data : null
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

function generateDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

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

// UPDATED: Check for date conflicts (only for same product)
app.put("/prodOrders/:id", async (req, res) => {
  try {
    const orderId = req.params.id;
    const { products } = req.body;

    // Validate products array
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ message: "Products array is required" });
    }

    // Check for date conflicts for EACH PRODUCT individually
    for (const product of products) {
      const allDates = (product.bookedDates || []).map(
        (d) => new Date(d).toISOString().split("T")[0]
      );

      if (allDates.length > 0) {
        const conflict = await prodOrderData.findOne({
          _id: { $ne: orderId },
          "products.prodCode": product.prodCode, // Only check same product code
          "products.bookedDates": {
            $in: allDates.map((d) => new Date(d)),
          },
        });

        if (conflict) {
          return res.status(409).json({
            message: `Date conflict with existing bookings for product ${product.prodCode}`,
            conflictOrderId: conflict._id,
            productCode: product.prodCode,
          });
        }
      }
    }

    // Prepare updated products with proper date calculations
    const updatedProducts = products.map((p) => {
      let bookedDates = [];
      if (p.booking && p.booking.startDate && p.booking.endDate) {
        bookedDates = generateDateRange(
          new Date(p.booking.startDate),
          new Date(p.booking.endDate)
        );
      }

      return {
        ...p,
        bookedDates,
        booking: p.booking
          ? {
              ...p.booking,
              startDate: new Date(p.booking.startDate),
              endDate: new Date(p.booking.endDate),
              totalDays: bookedDates.length,
              totalPrice: (p.price || 0) * bookedDates.length,
            }
          : null,
      };
    });

    // Update the order
    const updatedOrder = await prodOrderData.findByIdAndUpdate(
      orderId,
      {
        $set: { products: updatedProducts },
        $currentDate: { updatedAt: true },
      },
      {
        new: true,
        runValidators: true,
        context: "query",
      }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    /* update last edited */
    const updateData = {
      ...req.body,
      last_edited: new Date(), // default null if not provided
    };

    // Perform update
    await prodOrderData.findByIdAndUpdate(orderId, updateData, { new: true });
    /* updated last edited */
    res.json({
      success: true,
      message: "Order updated successfully",
      order: updatedOrder,
    });
  } catch (err) {
    console.error("Error updating order:", err);
    res.status(500).json({
      success: false,
      message: "Server error while updating order",
      error: err.message,
    });
  }
});

//DELETE THE ORDER
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
