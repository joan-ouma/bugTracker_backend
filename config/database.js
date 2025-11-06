const mongoose = require('mongoose');
const { logger } = require('../middleware/logger');

const connectDB = async () => {
    try {
        const options = {
            maxPoolSize: 10,
            minPoolSize: 5,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 5000,
        };

        const conn = await mongoose.connect(
            process.env.MONGODB_URI || 'mongodb://localhost:27017/bug-tracker',
            options
        );

        logger.info(`MongoDB Connected: ${conn.connection.host}`);

        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected. Attempting to reconnect...');
        });

    } catch (error) {
        logger.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
