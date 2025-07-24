const express = require('express');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const productData = require('./productSchema');
const categoryData = require('./categorySchema');
const mediaTypeData = require('./mediaTypeSchema');
const prodOrderData = require('./productOrderSchema');

// const otpVerification = require('./OtpVerificationEnquire');

// Add this near your other route imports
const cartData = require('./productCartSchema');
const cors = require('cors')
const Razorpay = require('razorpay');//require razorpay then only we use
const bodyParser = require('body-parser');//sent the json data
const crypto = require('crypto');//inbuilt function to embed the data in this we use sha256 algorithm to safest way of payment
// Initialize the Express app
const app = express();
const PORT = 3001;

//Middlewares
app.use(cors());
app.use(bodyParser.json());
// app.use("/images", express.static(path.join(__dirname, "../first-app/public/images")));
app.use("/images", express.static(path.join(__dirname, "../first-app/public/images")));

// MongoDB connection
// mongoose.connect("mongodb://127.0.0.1:27017/your-db-name"
// //     , {
// //   serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
// // }
// );

mongoose.connect("mongodb+srv://ba:sLAqxQMpCCjI2Gtf@adinnoutdoors.zpylrw9.mongodb.net/adinnoutdoors")
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

 

//mongoose.connect("mongodb+srv://karthiyayinitg1312:Rb8gF80kB2lD5bsM@cluster0.6vythax.mongodb.net/new?retryWrites=true&w=majority&appName=Cluster0");

app.use('/verify', require('./VerifyMain'));
app.use('/login', require('./LoginMain'));

//ADMIN USER LOGIN 
app.use('/adminUserLogin', require('./UserAdminLogin'));

//FOOTER CONTACT INFO
app.use('/ContactInfo', require('./FooterContact'));
//ORDER RESERVE EMAIL SENT
app.use('/OrderReserve', require('./OrderReserveEmail'));
//ORDER CART EMAIL SENT
app.use('/OrderCart', require('./OrderCartEmail'));



const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../first-app/public/images')); // ✅ Render-safe path
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // e.g. 16252345.jpg
  },
});

const upload = multer({ storage });

// Route
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    console.log("Uploaded file:", req.file);
    res.status(200).json({ filename: req.file.filename }); // ✅ Must return JSON
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' }); // ✅ Must return JSON
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


//PRODUCTS    Other routes (get, post, put, delete)
app.get('/products', async (req, res) => {
    try {
        const data = await productData.find();
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: err });
    }
});
//GET THE PRODUCT USING ID FOR SPECIFIC PRODUCT
app.get('/products/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const data = await productData.findById(id);
        if (!data) {
            res.status(404).json({ message: "Product not found" });
        }
        // res.json(data);
         const product = data.toObject();
    // Ensure complete image URL
    if (product.image && !product.image.startsWith('http')) {
      product.image = `${req.protocol}://${req.get('host')}${product.image}`;
    }
    
    res.json(product);
        
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});


app.get('/products/similar/:prodCode', async (req, res) => {
    try {
        // First find the current product
        const currentProduct = await productData.findOne({ prodCode: req.params.prodCode });
        if (!currentProduct || !currentProduct.similarProducts || currentProduct.similarProducts.length === 0) {
            return res.status(404).json({ message: "No similar products found" });
        }

        // Extract similar products' ProdCodes
        const prodCodes = currentProduct.similarProducts.map(p => p.ProdCode);

        // Fetch details of all similar products (excluding the current one)
        const similarProducts = await productData.find({
            prodCode: { $in: prodCodes },
            _id: { $ne: currentProduct._id } // Exclude current product by ID instead of prodCode
        });

        // Map the results to match the frontend expectation
        const mappedResults = similarProducts.map(product => ({
            _id: product._id,
            name: product.name,
            location: `${product.location.district}, ${product.location.state}`,
            dimensions: `${product.height} x ${product.width}`,
            price: product.price,
            rating: product.rating,
            image: product.image,
            category: product.mediaType,
            sizeHeight: product.height,
            sizeWidth: product.width,
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

app.post('/products', async (req, res) => {
    try {
        const prodData = new productData(req.body);
        const saved = await prodData.save();
        res.json(saved);
    } catch (err) {
        res.status(500).json({ message: err });
    }
});

app.put('/products/:id', async (req, res) => {
    try {
        // const id = req.params.id;
        const updated = await productData.findByIdAndUpdate(req.params.id, req.body, { new: true });
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



app.delete('/products/:id', async (req, res) => {
    try {
        const deleted = await productData.findByIdAndDelete(req.params.id);
        res.json(deleted);
    } catch (err) {
        res.status(500).json({ message: err });
    }
});



// CATEGORY CRUD OPERATION
// GET 
app.get('/category', async (req, res) => {
    try {
        const categories = await categoryData.find();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
//POST
app.post('/category', async (req, res) => {
    try {
        const newCategory = new categoryData(req.body);
        const saved = await newCategory.save();
        res.json(saved);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
//UPDATE
app.put('/category/:id', async (req, res) => {
    try {
        const updated = await categoryData.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
//DELETE
app.delete('/category/:id', async (req, res) => {
    try {
        const deleted = await categoryData.findByIdAndDelete(req.params.id);
        res.json(deleted);
    } catch (err) {
        res.status(500).json({ message: err });
    }
});




//MEDIA TYPE SECTION
// GET 
app.get('/mediatype', async (req, res) => {
    try {
        const mediaTypes = await mediaTypeData.find();
        res.json(mediaTypes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
//POST
app.post('/mediatype', async (req, res) => {
    try {
        const newMediaType = new mediaTypeData(req.body);
        const saved = await newMediaType.save();
        res.json(saved);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
//UPDATE
app.put('/mediatype/:id', async (req, res) => {
    try {
        const updated = await mediaTypeData.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
//DELETE
app.delete('/mediatype/:id', async (req, res) => {
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
app.get('/prodOrders', async (req, res) => {
    try {
        let query = {};

        if (req.query.userId) {
            query = { 'client.userId': req.query.userId };
        }

        const orders = await prodOrderData.find(query)
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/prodOrders/:id', async (req, res) => {
    try {
        const order = await prodOrderData.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.status(200).json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Updated /booked-dates endpoint
app.get('/booked-dates', async (req, res) => {
    try {
        const excludeOrderId = req.query.excludeOrderId;
        const excludeProductId = req.query.excludeProductId;

        // Find all orders except the current one
        const otherOrders = await prodOrderData.find(
            excludeOrderId ? { _id: { $ne: excludeOrderId } } : {},
            'products.bookedDates'
        );

        // Get dates from other orders
        const otherDates = otherOrders.flatMap(order =>
            order.products.flatMap(product =>
                (product.bookedDates || []).map(d =>
                    new Date(d).toISOString().split('T')[0]
                )
            )
        );

        // If we have a current order, get dates from other products in the same order
        let sameOrderOtherDates = [];
        if (excludeOrderId && excludeProductId) {
            const currentOrder = await prodOrderData.findById(excludeOrderId);
            if (currentOrder) {
                sameOrderOtherDates = currentOrder.products
                    .filter(p => p._id.toString() !== excludeProductId)
                    .flatMap(p =>
                        (p.bookedDates || []).map(d =>
                            new Date(d).toISOString().split('T')[0]
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
 
//FOR  USER SITE ORDER
// GET orders for specific user 
app.get('/prodOrders/user/:userId', async (req, res) => {
    try {
        const orders = await prodOrderData.find({ 'client.userId': req.params.userId });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// //UPDATE
// POST route for creating orders
//CREATION OF ORDER ID FOR ADMIN SIDE
const generateNextOrderId = async (prefix = 'AD') => {
    try {
        // Find the order with the highest orderId for the given prefix
        const lastOrder = await prodOrderData.findOne({ orderId: new RegExp(`^${prefix}`) })
            .sort('-orderId');

        if (!lastOrder) {
            return `${prefix}0001`; // First order for this prefix
        }

        // Extract the numeric part and increment
        const lastNumber = parseInt(lastOrder.orderId.substring(2));
        const nextNumber = lastNumber + 1;

        // Format with leading zeros
        return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
    } catch (err) {
        console.error("Error generating order ID:", err);
        // Fallback - generate based on timestamp
        return `${prefix}${Date.now().toString().slice(-4)}`;
    }
};

// Helper function to generate date range


app.post('/prodOrders', async (req, res) => {
    try {
        if (!req.body.products || !Array.isArray(req.body.products)) {
            return res.status(400).json({
                message: 'Products array is required',
                error: true
            });
        }

        // Validate client information
        if (!req.body.client || !req.body.client.userId) {
            return res.status(400).json({
                message: 'Client information is required',
                error: true
            });
        }

        const prefix = req.body.status === "UserSideOrder" ? "US" : "AD";
        const orderId = await generateNextOrderId(prefix);

        // Process each product
        const products = req.body.products.map(product => {
            if (!product) {
                throw new Error('Invalid product data');
            }

            // Calculate booked dates if booking info exists
            let bookedDates = [];
            if (product.booking && product.booking.startDate && product.booking.endDate) {
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
                booking: product.booking ? {
                    ...product.booking,
                    startDate: new Date(product.booking.startDate),
                    endDate: new Date(product.booking.endDate),
                    totalDays: bookedDates.length,
                    totalPrice: (product.price || 0) * bookedDates.length
                } : null
            };
        });

        const newOrder = new prodOrderData({
            ...req.body,
            orderId: orderId,
            products: products,
            createdAt: new Date()
        });

        const savedOrder = await newOrder.save();
        res.status(201).json(savedOrder);
    } catch (err) {
        console.error('Error creating order:', err);
        res.status(500).json({
            message: err.message || 'Failed to create order',
            error: true
        });
    }
});

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


// Improved date conflict checking middleware
const checkDateConflicts = async (req, res, next) => {
    try {
        const { products } = req.body;
        const orderId = req.params.id;

        const allDates = products.flatMap(p =>
            p.bookedDates.map(d => d.toISOString().split('T')[0])
        );

        // Check other orders for conflicts
        const conflict = await prodOrderData.findOne({
            _id: { $ne: orderId },
            "products.bookedDates": { $in: allDates },
            "products.productId": { $in: products.map(p => p.productId) }
        });

        if (conflict) {
            return res.status(409).json({
                message: 'Date conflict with existing bookings',
                conflicts: conflict._id
            });
        }
        next();
    } catch (err) {
        next(err);
    }
};

//PUT FOR EDIT THE BOOKED DATES
app.put('/prodOrders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const { products } = req.body;

        // Validate products array
        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ message: 'Products array is required' });
        }

        // Check for date conflicts
        const allDates = products.flatMap(p =>
            (p.bookedDates || []).map(d => new Date(d).toISOString().split('T')[0])
        );

        const conflict = await prodOrderData.findOne({
            _id: { $ne: orderId },
            'products.bookedDates': {
                $in: allDates.map(d => new Date(d))
            }
        });

        if (conflict) {
            return res.status(409).json({
                message: 'Date conflict with existing bookings',
                conflictOrderId: conflict._id
            });
        }

        // // Prepare updated products data
        // const updatedProducts = products.map(p => ({
        //     ...p,
        //     bookedDates: (p.bookedDates || []).map(d => new Date(d)),
        //     booking: p.booking ? {
        //         ...p.booking,
        //         startDate: p.booking.startDate ? new Date(p.booking.startDate) : null,
        //         endDate: p.booking.endDate ? new Date(p.booking.endDate) : null,
        //         totalDays: p.booking.totalDays || 
        //             (p.booking.startDate && p.booking.endDate ? 
        //                 Math.ceil((new Date(p.booking.endDate) - new Date(p.booking.startDate)) / (1000 * 60 * 60 * 24)) + 1 : 
        //                 0)
        //     } : null
        // }));

        // Prepare updated products with proper date calculations
        const updatedProducts = products.map(p => {
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
                booking: p.booking ? {
                    ...p.booking,
                    startDate: new Date(p.booking.startDate),
                    endDate: new Date(p.booking.endDate),
                    totalDays: bookedDates.length,
                    totalPrice: (p.price || 0) * bookedDates.length
                } : null
            };
        });

        // Update the order
        const updatedOrder = await prodOrderData.findByIdAndUpdate(
            orderId,
            {
                $set: { products: updatedProducts },
                $currentDate: { updatedAt: true }
            },
            {
                new: true,
                runValidators: true,
                context: 'query'
            }
        );

        if (!updatedOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json({
            success: true,
            message: 'Order updated successfully',
            order: updatedOrder
        });
    } catch (err) {
        console.error('Error updating order:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while updating order',
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

//DELETE THE ORDER 
app.delete('/prodOrders/:id', async (req, res) => {

    try {
        const deletedOrder = await prodOrderData.findByIdAndDelete(req.params.id);
        if (!deletedOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.status(200).json({ message: 'Order deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

//CART ITEMS ROUTE
// GET cart items for user
app.get('/cart/user/:userId', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        const cartItems = await cartData.find({ userId: req.params.userId });
        res.status(200).json(cartItems);
    } catch (err) {
        console.error('Error fetching cart items:', err);
        res.status(500).json({
            message: 'Failed to fetch cart items',
            error: err.message
        });
    }
});

// ADD item to cart
app.post('/cart', async (req, res) => {
    try {
        // Validate required fields
        if (!req.body.userId || !req.body.productId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if item already exists for this user
        const existingItem = await cartData.findOne({
            userId: req.body.userId,
            productId: req.body.productId,
            startDate: req.body.startDate,
            endDate: req.body.endDate
        });

        if (existingItem) {
            return res.status(400).json({ message: 'Item already in cart' });
        }

        const newItem = new cartData(req.body);
        const savedItem = await newItem.save();
        res.status(201).json(savedItem);
    } catch (err) {
        console.error('Error adding to cart:', err);
        res.status(500).json({
            message: 'Failed to add item to cart',
            error: err.message
        });
    }
});

// UPDATE cart item
app.put('/cart/:id', async (req, res) => {
    try {
        const updatedItem = await cartData.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!updatedItem) {
            return res.status(404).json({ message: 'Item not found' });
        }

        res.status(200).json(updatedItem);
    } catch (err) {
        console.error('Error updating cart item:', err);
        res.status(500).json({
            message: 'Failed to update cart item',
            error: err.message
        });
    }
});

// DELETE item from cart
app.delete('/cart/:id', async (req, res) => {
    try {
        const deletedItem = await cartData.findByIdAndDelete(req.params.id);
        if (!deletedItem) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.json({ message: 'Item removed from cart' });
    } catch (err) {
        console.error('Error removing from cart:', err);
        res.status(500).json({
            message: 'Failed to remove item from cart',
            error: err.message
        });
    }
});

// DELETE multiple items from cart
app.delete('/cart', async (req, res) => {
    try {
        const { itemIds } = req.body;
        if (!itemIds || !Array.isArray(itemIds)) {
            return res.status(400).json({ message: 'Invalid item IDs' });
        }

        // Validate all IDs are valid MongoDB ObjectIds
        if (itemIds.some(id => !mongoose.Types.ObjectId.isValid(id))) {
            return res.status(400).json({ message: 'Invalid item ID format' });
        }

        const result = await cartData.deleteMany({
            _id: { $in: itemIds }
        });

        res.json({
            message: `${result.deletedCount} items removed from cart`,
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error('Error removing multiple items:', err);
        res.status(500).json({
            message: 'Failed to remove items from cart',
            error: err.message
        });
    }
});

// CLEAR cart for user
app.delete('/cart/clear/:userId', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        const result = await cartData.deleteMany({
            userId: req.params.userId
        });

        res.json({
            message: `Cart cleared for user`,
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error('Error clearing cart:', err);
        res.status(500).json({
            message: 'Failed to clear cart',
            error: err.message
        });
    }
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
