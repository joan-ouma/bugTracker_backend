const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const setupSecurity = (app) => {
    // Helmet for secure HTTP headers
    app.use(helmet({
        contentSecurityPolicy: process.env.NODE_ENV === 'production',
        crossOriginEmbedderPolicy: false,
    }));

    // CORS configuration
    const corsOptions = {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
        optionsSuccessStatus: 200
    };
    app.use(cors(corsOptions));

    // Rate limiting
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windows
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
    });
    app.use('/api/', limiter);

    // Data sanitization against NoSQL injection
    app.use(mongoSanitize());
};

module.exports = { setupSecurity };