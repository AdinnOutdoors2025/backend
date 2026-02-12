const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    contactInfo: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: "footercontacts" // 👈 MongoDB collection name
  }
);

// ✅ Model name changed, collection same
module.exports =
  mongoose.models.OverallFooterContacts ||
  mongoose.model("OverallFooterContacts", contactSchema);
