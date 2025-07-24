const mongoose = require('mongoose');
const categorySchema = new mongoose.Schema({
    state: { type: String, required: true, unique: true
     },
    districts: [String]
})
const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
