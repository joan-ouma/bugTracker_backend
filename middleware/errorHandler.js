const { logger } = require('./logger');

const errorHandler = (err, req, res, next) => {
    logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Internal Server Error';

    // Handle Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            error: 'Validation Error',
            details: errors
        });
    }

    // Handle Mongoose duplicate key error
    if (err.code === 11000) {
        return res.status(400).json({
            error: 'Duplicate field value entered'
        });
    }

    // Handle Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({
            error: 'Invalid resource ID'
        });
    }

    // Default error response with environment check
    if (process.env.NODE_ENV === 'production') {
        return res.status(statusCode).json({
            success: false,
            message: statusCode === 500 ? 'Internal Server Error' : message
        });
    }

    // Development error response (with stack trace)
    return res.status(statusCode).json({
        success: false,
        message,
        stack: err.stack
    });
};

module.exports = errorHandler;
