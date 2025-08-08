const mongoose = require('mongoose');
// const SimilarProductSchema = new mongoose.Schema({
//     Prodname: String,
//     ProdCode: String,
//     image: String
//   }, { _id: false }); // prevent MongoDB from creating _id for nested
const productSchema = new mongoose.Schema({
    name: String,
    description:String, // Update if you use
    price: Number,
    printingCost: Number,
    mountingCost: Number,
    image : String,
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
    LocationLink : String
});
const productModel = mongoose.model('Product', productSchema);
module.exports = productModel;