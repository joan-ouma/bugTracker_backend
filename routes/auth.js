const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Debug mode
const DEBUG = true;

const log = (message, data = null) => {
    if (DEBUG) {
        console.log(`🔐 [AUTH ROUTE] ${message}`, data || '');
    }
};

const logError = (message, error = null) => {
    if (DEBUG) {
        console.error(`🔐 [AUTH ROUTE ERROR] ${message}`, error || '');
    }
};

// POST /api/auth/register - Register new user
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, username, email, password, role } = req.body;

        log('Registration attempt', { email, username });

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            logError('User already exists', { email, username });
            return res.status(400).json({
                error: existingUser.email === email ? 'Email already registered' : 'Username already taken'
            });
        }

        // Create new user
        const user = new User({
            firstName,
            lastName,
            username,
            email,
            password,
            role: role || 'user'
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        log('Registration successful', { userId: user._id, email: user.email });

        res.status(201).json({
            token,
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                isActive: user.isActive
            }
        });
    } catch (error) {
        logError('Registration failed', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ error: 'Validation failed', details: errors });
        }

        res.status(500).json({ error: 'Server error during registration' });
    }
});

// POST /api/auth/login - Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        log('Login attempt', { email });

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            logError('User not found', { email });
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Check if user is active
        if (!user.isActive) {
            logError('User account deactivated', { email });
            return res.status(400).json({ error: 'Account is deactivated' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logError('Invalid password', { email });
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        log('Login successful', { userId: user._id, email: user.email });

        res.json({
            token,
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                isActive: user.isActive
            }
        });
    } catch (error) {
        logError('Login failed', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// GET /api/auth/me - Get current user
router.get('/me', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        log('Get current user request', { hasToken: !!token });

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        if (!user.isActive) {
            return res.status(401).json({ error: 'Account deactivated' });
        }

        log('Current user fetched', { userId: user._id, email: user.email });

        res.json({
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                isActive: user.isActive,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        logError('Get current user failed', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { firstName, lastName, username, email, avatar } = req.body;

        // Check if username or email is already taken by another user
        if (username && username !== user.username) {
            const existingUser = await User.findOne({ username, _id: { $ne: user._id } });
            if (existingUser) {
                return res.status(400).json({ error: 'Username already taken' });
            }
        }

        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already registered' });
            }
        }

        // Update user fields
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (username) user.username = username;
        if (email) user.email = email;
        if (avatar !== undefined) user.avatar = avatar;

        await user.save();

        log('Profile updated', { userId: user._id });

        res.json({
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                isActive: user.isActive
            }
        });
    } catch (error) {
        logError('Profile update failed', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ error: 'Validation failed', details: errors });
        }

        res.status(500).json({ error: 'Server error during profile update' });
    }
});

// PUT /api/auth/password - Change password
router.put('/password', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { currentPassword, newPassword } = req.body;

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        log('Password changed', { userId: user._id });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        logError('Password change failed', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ error: 'Validation failed', details: errors });
        }

        res.status(500).json({ error: 'Server error during password change' });
    }
});

module.exports = router;