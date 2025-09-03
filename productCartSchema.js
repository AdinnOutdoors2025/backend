const mongoose = require('mongoose');
const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' // Assuming you have a User model
    },
    productId: { type: String, required: true },
    prodCode: { type: String, required: true },
    prodName: { type: String, required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    rating: { type: Number },
    district: { type: String },
    state: { type: String },
    dateRange: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    sizeWidth: { type: String },
    sizeHeight: { type: String },
    dimension: { type: String },
    adType: { type: String },
    totalAmount: { type: String },
    totalDays: { type: Number },
    SpotOutdoorType: { type: String },
    PrintingCost: { type: Number },
    MountingCost: { type: Number },
    FromSpot: { type: String },
    ToSpot: { type: String },
    SpotPay: { type: Number },
    Offer: { type: Number },
    userEmail: { type: String },
    userPhone: { type: String },
    userName: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cart', cartSchema);