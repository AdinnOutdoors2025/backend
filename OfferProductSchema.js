const mongoose = require('mongoose');

const offerProductSchema = new mongoose.Schema({
    originalProductId: {
        type: String, required: true, ref: 'Product'
    },
    productCode: {
        type: String, required: true
    },
    name: {
        type: String, required: true
    },
    originalPrice: {
        type: Number, required: true
    },
    offerPrice: {
        type: Number, required: true
    },
    image: {
        type: String, required: true
    },
    printingCost: {
        type: Number, default: 0
    },
    mountingCost: {
        type: Number, default: 0
    },
    lighting: {
        type: String, default: ""
    },
    fromLocation: {
        type: String, default: ""
    },
    toLocation: {
        type: String, default: ""
    },
    rating: {
        type: Number, default: 0
    },
    size: {
        width: { type: Number, default: 0 },
        height: { type: Number, default: 0 },
        squareFeet: { type: Number, default: 0 }
    },
    fixedAmount: {
        type: Number, default: 0
    },
    fixedOffer: {
        type: Number, default: 0
    },
    mediaType: {
        type: String, default: ""
    },
    location: {
        state: { type: String, default: "" },
        district: { type: String, default: "" }
    },
    similarProducts: [{
        name: String,
        productCode: String,
        image: String,
        price: Number
    }], 
    isActive: {
        type: Boolean, default: true
    },
    visible: {
        type: Boolean, default: true
    },
    validUntil: {
        type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days default
    },


    createdAt: { type: Date, default: Date.now }
}
);

module.exports = mongoose.model('OfferProduct', offerProductSchema);




