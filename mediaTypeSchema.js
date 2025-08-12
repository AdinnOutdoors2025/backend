const mongoose = require('mongoose');

const mediaTypeSchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true },
    createdAt: {
      type: Date,
      default: Date.now
    }
});

const MediaType = mongoose.model('MediaType', mediaTypeSchema);
module.exports = MediaType;
