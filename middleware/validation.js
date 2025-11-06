import { body, validationResult } from 'express-validator';

export const validateBug = [
    body('title')
        .notEmpty()
        .withMessage('Title is required')
        .isLength({ max: 200 })
        .withMessage('Title must be less than 200 characters'),

    body('description')
        .notEmpty()
        .withMessage('Description is required'),

    body('priority')
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('Priority must be one of: low, medium, high, critical'),

    body('status')
        .optional()
        .isIn(['open', 'in-progress', 'resolved', 'closed'])
        .withMessage('Invalid status'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }
        next();
    }
];