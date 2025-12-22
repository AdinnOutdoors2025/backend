const mongoose = require('mongoose');
const additionalFileSchema = new mongoose.Schema({
  url: String,
  type: String,
  public_id: String
});
const productSchema = new mongoose.Schema({
  name: String,
  description: String, 
  price: Number,
  printingCost: Number,
  mountingCost: Number,
  image: String,
  imagePublicId: String,
  additionalFiles: [additionalFileSchema], 
  prodCode: String,
  lighting: String,
  from: String,
  to: String,
  rating: Number,
  width: Number,
  height: Number,
  side: Number,
   sizeCalculation :{
                        sizeWidth1 : Number,
                        sizeWidth2 : Number,
                        sizeWidth3 : Number,
                        sizeQuantity1 : Number,
                        sizeQuantity2 : Number,
                        sizeQuantity3 : Number,
                    },
  fixedAmount: Number,
  fixedOffer: Number,
  mediaType: String,
  productsquareFeet: Number,
  location: {
    state: String,
    district: String
  }, 
  // NEW FIELD ADDED 
  isPrime: {  
    type: Number,
    default: 0, // 0 = Not Prime, 1 = Prime
    enum: [0, 1]
  },
   // Track when prime status was updated
  primeUpdatedAt: {
    type: Date,
    default: null
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
      ProdMountingCost: Number,
      ProdPrintingCost: Number,
      ProdPrice: Number
    }],
    required: [true, "Similar products array is required"]
  },
  Latitude: String,
  Longitude: String,
  LocationLink: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }

});
// Update timestamp before saving
productSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const productModel = mongoose.model('Product', productSchema);
module.exports = productModel;