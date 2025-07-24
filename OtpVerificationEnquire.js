const mongoose = require('mongoose');
const enquirySchema = new mongoose.Schema({
    phone: { type: String, required: true },
    productId: { type: String, required: true },
    prodCode: { type: String, required: true },
    printingCost: { type: Number, required: true },
    mountingCost: { type: Number, required: true },
    prodLighting: { type: String, required: true },
    productFrom: { type: String, required: true },
    productTo: { type: String, required: true },
    productFixedAmount: { type: Number, required: true },
    productFixedOffer: { type: Number, required: true },
    category: { type: String, required: true },
    rating: { type: Number, required: true },
    imageUrl: { type: String, required: true },
    prodName: { type: String, required: true },
    location: { type: String, required: true },
    price: { type: Number, required: true },
    size: { type: String, required: true },
    dimensions: { type: String, required: true },
    enquiryDate: { type: Date, default: Date.now }
});
module.exports = mongoose.model('OtpEnquiryVerification', enquirySchema);