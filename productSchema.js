const mongoose = require('mongoose');
const additionalFileSchema = new mongoose.Schema({
  url: String,
  type: String,
  public_id: String
});
const productSchema = new mongoose.Schema({
    name: String,
    description:String, // Update if you use
    price: Number,
    printingCost: Number,
    mountingCost: Number,
    image : String,
    imagePublicId: String, // Add this field
    additionalFiles: [additionalFileSchema], // Changed from [String] to proper schema
    prodCode: String,
    lighting: String,
    from: String,
    to: String,
    rating: Number,
    width: Number,
    height: Number,
    fixedAmount: Number,
    fixedOffer: Number,
    mediaType: String,
    productsquareFeet: Number,
    location: {
  state: String,
  district: String
},
visible: {
        type: Boolean,
        default: true
    },
    similarProducts: {
        type: [{
            Prodname: String,
            ProdCode: String,
            image: String,
            ProdMountingCost:Number,
            ProdPrintingCost:Number,
            ProdPrice:Number
        }],
        required: [true, "Similar products array is required"]
    },
    Latitude : String,
    Longitude : String,
    LocationLink : String,
    createdAt: { type: Date, default: Date.now } 
});
const productModel = mongoose.model('Product', productSchema);
module.exports = productModel;