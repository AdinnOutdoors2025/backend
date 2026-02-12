const mongoose = require("mongoose");

const usersSchema = new mongoose.Schema(
  {
    userName: { type: String, required: true },
    userEmail: { type: String, required: true, unique: true },
    userPhone: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  {
    collection: "users" // 👈 existing MongoDB collection
  }
);

// ✅ Safe model creation
module.exports =
  mongoose.models.OverallUsers ||
  mongoose.model("OverallUsers", usersSchema);
