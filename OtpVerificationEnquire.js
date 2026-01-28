//CORRECTLY HANDLE THE BOTH LOGGED IN AND LOGOUT USER ADMIN MAIL 
const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
    phone: { 
        type: String, 
        required: true 
    },
    productId: { 
        type: String, 
        required: true 
    },
    prodCode: { 
        type: String, 
        required: true 
    },
    printingCost: { 
        type: Number, 
        required: true 
    },
    mountingCost: { 
        type: Number, 
        required: true 
    },
    prodLighting: { 
        type: String, 
        required: true 
    },
    productFrom: { 
        type: String, 
        required: true 
    },
    productTo: { 
        type: String, 
        required: true 
    },
    productFixedAmount: { 
        type: Number, 
        required: true 
    },
    productFixedOffer: { 
        type: Number, 
        required: true 
    },
    category: { 
        type: String, 
        required: true 
    },
    rating: { 
        type: Number, 
        required: true 
    },
    imageUrl: { 
        type: String, 
        required: true 
    },
    prodName: { 
        type: String, 
        required: true 
    },
    location: { 
        type: String, 
        required: true 
    },
    price: { 
        type: Number, 
        required: true 
    },
    size: { 
        type: String, 
        required: true 
    },
    dimensions: { 
        type: String, 
        required: true 
    },
    enquiryDate: { 
        type: Date, 
        default: Date.now 
    },
    userId: { 
        type: String, 
        default: null 
    },
    userName: { 
        type: String, 
        default: null 
    },
    userEmail: { 
        type: String, 
        default: null 
    },
    enquiryType: { 
        type: String, 
        default: 'normal_enquiry' 
    },
    userStatus: { 
        type: String, 
        enum: ['guest', 'logged_in'],
        default: 'guest' 
    },
    verified: { 
        type: Boolean, 
        default: false 
    }
});

// Add indexes for better performance
enquirySchema.index({ phone: 1, prodCode: 1, enquiryDate: -1 });
enquirySchema.index({ userStatus: 1 });
enquirySchema.index({ verified: 1 });

module.exports = mongoose.model('OtpEnquiryVerification', enquirySchema);