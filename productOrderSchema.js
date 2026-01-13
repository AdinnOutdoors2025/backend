//UPDATED SCHEMA HANDLING THE STATUS PROPERLY
const mongoose = require("mongoose");

const productOrderSchema = new mongoose.Schema({
  client: {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, match: /.+\@.+\..+/ },
    contact: { type: String, required: true },
    company: { type: String, required: true },
    address: { type: String },
    pincode: { type: String },
    state: { type: String },
    city: { type: String },
    totalAmount: { type: Number },
    paidAmount: {
      type: [
        {
          amount: { type: Number },
          paidAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    balanceAmount: { type: Number },
  },
  
  products: [
    {
      id: { type: String, required: true },
      prodCode: {
        type: String,
        required: true,
        trim: true
      },
      name: { type: String, required: true },
      image: { type: String, required: true },
      price: { type: Number, required: true, min: 0 },
      printingCost: { type: Number },
      mountingCost: { type: Number },
      lighting: { type: String },
      fixedAmount: { type: Number, min: 0 },
      fixedAmountOffer: { type: Number, min: 0 },
      size: {
        width: { type: Number, required: true, min: 0 },
        height: { type: Number, required: true, min: 0 },
        squareFeet: { type: Number, required: true, min: 0 },
      },
      fromLocation: { type: String },
      toLocation: { type: String },
      rating: { type: Number, min: 0, max: 5 },
      mediaType: { type: String, required: true },
      location: {
        state: { type: String, required: true },
        district: { type: String, required: true },
      },
      booking: {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        totalDays: { type: Number, required: true, min: 1 },
        totalPrice: { type: Number, required: true, min: 0 },
      },
      bookedDates: {
        type: [Date],
        required: true,
        default: [],
      },
      deleted: {
        type: Boolean,
        default: false 
      },
      deletedAt: {
        type: Date,
        default: null
      },
      deletedBy: {
        type: String,
        default: null
      },
    },
  ],

  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: "AD0001",
  },
  
  // Order origin status - fixed based on how order was created
  status: {
    type: String,
    required: true,
    enum: ["Added Manually", "UserSideOrder"],
    default: "UserSideOrder",
  },
  
  // Order workflow status - changes based on admin actions
  order_status: {
    type: String,
    required: true,
    default: "Pending Client Confirmation",
    enum: [
      "Pending Client Confirmation",
      "Order Confirmed",
      "Design in Progress",
      "Awaiting Client side design Approval",
      "Ready for Printing",
      "Printing in Progress",
      "Completed / Installed",
      "Payment Pending",
      "Payment Completed",
      "Cancelled",
      "pending"
    ]
  },
  
  // Track who confirmed the order (admin)
  confirmed_at: {
    type: Date,
    default: null
  },
  confirmed_by: {
    type: String,
    default: null
  },
  confirmation_notes: {
    type: String,
    default: null
  },
  
  handled_by: {
    type: String,
    default: null,
  },
  
  last_edited: {
    type: Date,
    default: null,
  },
  
  order_cancel_reason: {
    type: String,
    default: null,
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
  
  orderType: {
    type: String,
    enum: ["single", "cart"],
    default: "single",
  }
});

// Index for faster queries
productOrderSchema.index({ "products.prodCode": 1 });
productOrderSchema.index({ order_status: 1 });
productOrderSchema.index({ createdAt: -1 });

const productOrderModel = mongoose.model("ProductOrder", productOrderSchema);
module.exports = productOrderModel;