const mongoose = require("mongoose");

const OrderStatusSchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: null }
});

module.exports = mongoose.model("orderstatus", OrderStatusSchema);
