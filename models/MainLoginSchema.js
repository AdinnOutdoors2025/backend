const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
         trim: true,
        minlength: [4, 'Username must be at least 4 characters'],
        maxlength: [20, 'Username cannot exceed 20 characters'],
        match: [/^[a-zA-Z0-9]+$/, 'Username can only contain letters and numbers']

    },
    password: {
        type: String,
        required: true,
                minlength: [6, 'Password must be at least 6 characters']

    },
      secretCode: {  // Add this field to store hashed secret code
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AdminUserLogin', userSchema);