const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const bugRoutes = require('./routes/bugs');
const projectRoutes = require('./routes/projects');
const projectBugsRoutes = require('./routes/projectBugs');


const app = express();

// Debug mode
const DEBUG = true;

const log = (message, data = null) => {
    if (DEBUG) {
        console.log(`🚀 [SERVER] ${message}`, data || '');
    }
};

const logError = (message, error = null) => {
    if (DEBUG) {
        console.error(`❌ [SERVER ERROR] ${message}`, error || '');
    }
};

// Middleware
log('Setting up middleware...');
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Logging middleware
app.use((req, res, next) => {
    log(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });
    next();
});

// Routes
log('Setting up routes...');
app.use('/api/auth', authRoutes);
app.use('/api/bugs', bugRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', projectBugsRoutes);

// Basic routes
app.get('/', (req, res) => {
    log('Root route accessed');
    res.json({
        message: 'Bug Tracker API is running!',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            bugs: '/api/bugs',
            health: '/api/health'
        }
    });
});

app.get('/api/health', (req, res) => {
    log('Health check accessed');
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        environment: process.env.NODE_ENV || 'development'
    });
});

// 404 handler
app.use('*', (req, res) => {
    logError('Route not found', { path: req.originalUrl, method: req.method });
    res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((error, req, res, next) => {
    logError('Unhandled error', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Database connection
const connectDB = async () => {
    try {
        log('Connecting to MongoDB...', {
            uri: process.env.MONGODB_URI ? '***' : 'using default',
            nodeEnv: process.env.NODE_ENV
        });

        const conn = await mongoose.connect(
            process.env.MONGODB_URI || 'mongodb://localhost:27017/bugtracker',
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            }
        );

        log(`MongoDB Connected: ${conn.connection.host}`, {
            database: conn.connection.name,
            readyState: conn.connection.readyState
        });
    } catch (error) {
        logError('Database connection error', error);
        process.exit(1);
    }
};

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            log(`Server is running on port ${PORT}`, {
                environment: process.env.NODE_ENV || 'development',
                url: `http://localhost:${PORT}`
            });

            console.log('\n' + '='.repeat(50));
            console.log('🚀 Bug Tracker Server Started Successfully!');
            console.log('='.repeat(50));
            console.log(`📍 Port: ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 API URL: http://localhost:${PORT}/api`);
            console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
            console.log(`🗄️ Database: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}`);
            console.log('='.repeat(50) + '\n');
        });
    } catch (error) {
        logError('Failed to start server', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;