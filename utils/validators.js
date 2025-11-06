const { body } = require('express-validator');

const validateBug = [
    body('title')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Title must be between 1 and 100 characters'),
    body('description')
        .trim()
        .isLength({ min: 1 })
        .withMessage('Description is required'),
    body('status')
        .optional()
        .isIn(['open', 'in-progress', 'resolved'])
        .withMessage('Invalid status'),
    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('Invalid priority'),
    body('reporter')
        .trim()
        .isLength({ min: 1 })
        .withMessage('Reporter name is required')
];

const sanitizeInput = (input) => {
    if (typeof input === 'string') {
        return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    return input;
};

module.exports = { validateBug, sanitizeInput };