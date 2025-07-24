const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/MainLoginSchema');

// Make sure these match exactly (case-sensitive)
const JWT_SECRET = 'adinn@2025';
const ADMIN_SECRET = 'ADMIN2025'; // Must match what you enter in frontend

// Admin registration
router.post('/register-admin', async (req, res) => {
    const { username, password, secretCode } = req.body;

    // Debugging: Log the received secret code
    console.log('Received secret code:', secretCode);
    console.log('Expected secret code:', ADMIN_SECRET);

    // if (secretCode !== ADMIN_SECRET) {
    //     return res.status(401).json({ 
    //         success: false,
    //         message: 'INVALID ADMIN SECRET CODE' 
    //     });
    // }

    try {
        // Validate username
        if (!/^[a-zA-Z0-9]{4,20}$/.test(username)) {
            return res.status(400).json({
                success: false,
                message: 'Username must be 4-20 alphanumeric characters'
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'USERNAME_ALREADY_EXISTS'
            });
        }

        // Hash password
        // const salt = await bcrypt.genSalt(10);
        // const hashedPassword = await bcrypt.hash(password, salt);

        // Create new admin user
        const newAdmin = new User({
            username,
            password,
            secretCode,
            // password: hashedPassword,
            role: 'admin'
        });

        await newAdmin.save();

        res.status(201).json({
            success: true,
            message: 'Admin registered successfully'
        });
    } catch (err) {
        console.error('Admin registration error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
});

// Admin login
router.post('/admin', async (req, res) => {
    const { username, password, secretCode } = req.body;
    try {
        // Find admin user
        const admin = await User.findOne({ username, role: 'admin' });
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'ADMIN_NOT_FOUND'
            });
        }


        let isAuthenticated = false;

        // Check if password is provided and matches
        if (password && !secretCode) {
            isAuthenticated = (password === admin.password);
            if (!isAuthenticated) {
                return res.status(401).json({
                    success: false,
                    message: 'INVALID_PASSWORD'
                });
            }
        }
        // Check if secretCode is provided and matches
        else if (secretCode && !password) {
            isAuthenticated = (secretCode === admin.secretCode);
            if (!isAuthenticated) {
                return res.status(401).json({
                    success: false,
                    message: 'INVALID_SECRET_CODE'
                });
            }
        }
        // Neither provided
        else {
            return res.status(400).json({
                success: false,
                message: 'PROVIDE_EITHER_PASSWORD_OR_SECRETCODE'
            });
        }

        // Create JWT token
        const token = jwt.sign(
            { id: admin._id, username: admin.username, role: admin.role },
            JWT_SECRET,
            { expiresIn: '2h' }
        );
        res.json({
            success: true,
            token,
            user: {
                id: admin._id,
                username: admin.username,
                role: admin.role
            }
        });
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }

    console.log('Received secret code:', secretCode);
    console.log('Expected secret code:', ADMIN_SECRET);

});


module.exports = router;

