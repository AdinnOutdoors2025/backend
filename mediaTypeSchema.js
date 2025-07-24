const mongoose = require('mongoose');

const mediaTypeSchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true }
});

const MediaType = mongoose.model('MediaType', mediaTypeSchema);
module.exports = MediaType;
