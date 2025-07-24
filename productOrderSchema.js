const mongoose = require('mongoose');
const productOrderSchema = new mongoose.Schema({
    client: {
      userId: { type: String, required: true },
      name: { type: String, required: true },
      email: { type: String, required: true, match: /.+\@.+\..+/ },
      contact: { type: String, required: true },
      company: { type: String, required: true },
      //  // Additional user fields
        address: { type: String },
        pincode: { type: String },
        state: { type: String },
        city: { type: String },
        paidAmount: { type: Number, required: true },
    },
    products: [{
       // Added product reference for conflict checking
  //  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      id: { type: String, required: true },
      prodCode: { type: String, required: true },
      name: { type: String, required: true },
      image: { type: String, required: true },
      price: { type: Number, required: true, min: 0 },
      printingCost: { type: Number },
        mountingCost: { type: Number },
      lighting: { type: String, },
      fixedAmount : {type: Number, required: true, min: 0 },
      fixedAmountOffer : {type: Number, required: true, min: 0 },
        // enum: ['Lightning', 'Lid', 'Non-Lid'], default: 'Lightning'
       
      size: {
        width: { type: Number, required: true, min: 0 },
        height: { type: Number, required: true, min: 0 },
        squareFeet: { type: Number, required: true, min: 0 }
      },
   
    fromLocation: { type: String },
    toLocation: { type: String },
    rating: { type: Number, min: 0, max: 5 },
    mediaType: { type: String, required: true },
      location: {
        state: { type: String, required: true },
        district: { type: String, required: true }
      },
       booking: {
      // startDate: { type: String, required: true },
      // endDate: { type: String, required: true },
       startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      // currentDate:{
      //   type: String,  required: true
      // },
      totalDays: { type: Number, required: true, min: 1 },
      totalPrice: { type: Number, required: true, min: 0 }
    },
     bookedDates: {
          type: [Date],
          required: true,
          default: []
        }
    }],
   
   
     orderId: { 
      type: String, 
      required: true,
      unique: true,
      index:true,
      default: 'AD0001' // Default value, will be overridden
  },
    status:{
        type: String,
        required: true,
        enum: ["Added Manually", "UserSideOrder", "Confirmed", "Completed", "Cancelled"],
        default: "Added Manually"
    },
  
         createdAt: {
      type: Date,
      default: Date.now
    },
     orderType: {
        type: String,
        enum: ["single", "cart"],
        default: "single"
    }
    // cartItems: [{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Cart'
    // }],
  });

const productOrderModel = mongoose.model('ProductOrder', productOrderSchema);
module.exports = productOrderModel;
  






// previous schema 


// const mongoose = require('mongoose');
// const productOrderSchema = new mongoose.Schema({
//     client: {
//       name: { type: String, required: true },
//       email: { type: String, required: true, match: /.+\@.+\..+/ },
//       contact: { type: String, required: true },
//       company: { type: String, required: true },
//       paidAmount: { type: String, required: true },
//     },
//     product: {
//       id: { type: String, required: true },
//       name: { type: String, required: true },
//       image: { type: String },
//       price: { type: Number, required: true, min: 0 },
//       lighting: { type: String, },
//       fixedAmount : {type: Number, required: true, min: 0 },
//       fixedAmountOffer : {type: Number, required: true, min: 0 },
//         // enum: ['Lightning', 'Lid', 'Non-Lid'], default: 'Lightning'
       
//       size: {
//         width: { type: Number, required: true, min: 0 },
//         height: { type: Number, required: true, min: 0 },
//         squareFeet: { type: Number, required: true, min: 0 }
//       },
//     //   location: {
//     //     from: { type: String },
//     //     to: { type: String }
//     //   },
//     fromLocation: { type: String },
//     toLocation: { type: String },
//       rating: { type: Number, min: 0, max: 5 },
//       mediaType: { type: String, required: true },
//       location: {
//         state: { type: String, required: true },
//         district: { type: String, required: true }
//       }
//     },
//     booking: {
//       startDate: { type: String, required: true },
//       endDate: { type: String, required: true },
//       currentDate:{
//         type: String, required: true
//       },
//       totalDays: { type: Number, required: true, min: 1 },
//       totalPrice: { type: Number, required: true, min: 0 }
//     },
//     status:String,
//     createdAt: {
//       type: Date,
//       default: Date.now
//     }
//     // ,
//     //     bookedDates: {
//     //       type: [Date],
//     //       required: true,
//     //       default: []
//     //     }
//   });

// const productOrderModel = mongoose.model('ProductOrder', productOrderSchema);
// module.exports = productOrderModel;
  












