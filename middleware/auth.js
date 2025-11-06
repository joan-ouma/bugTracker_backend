const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Debug mode
const DEBUG = true;

const log = (message, data = null) => {
    if (DEBUG) {
        console.log(`🛡️ [AUTH MIDDLEWARE] ${message}`, data || '');
    }
};

const logError = (message, error = null) => {
    if (DEBUG) {
        console.error(`🛡️ [AUTH MIDDLEWARE ERROR] ${message}`, error || '');
    }
};

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        log('Auth middleware triggered', {
            hasToken: !!token,
            path: req.path,
            method: req.method
        });

        if (!token) {
            logError('No token provided');
            return res.status(401).json({ error: 'No token, authorization denied' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        log('Token decoded', { userId: decoded.userId });

        const user = await User.findById(decoded.userId);

        if (!user) {
            logError('User not found for token', { userId: decoded.userId });
            return res.status(401).json({ error: 'Token is not valid' });
        }

        if (!user.isActive) {
            logError('User account deactivated', { userId: decoded.userId });
            return res.status(401).json({ error: 'Account is deactivated' });
        }

        req.user = user;
        log('Authentication successful', { userId: user._id, email: user.email });

        next();
    } catch (error) {
        logError('Auth middleware error', error);
        res.status(401).json({ error: 'Token is not valid' });
    }
};

const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        log('Optional auth middleware', { hasToken: !!token });

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
            const user = await User.findById(decoded.userId);

            if (user && user.isActive) {
                req.user = user;
                log('Optional auth - user set', { userId: user._id });
            }
        }

        next();
    } catch (error) {
        log('Optional auth - token invalid, continuing without user');
        next();
    }
};

module.exports = auth;