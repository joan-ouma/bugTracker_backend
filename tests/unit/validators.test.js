import { validateBug, validateUser } from '../../middleware/validation.js';

describe('Validation Logic', () => {
    describe('validateBug', () => {
        test('should validate correct bug data', () => {
            const validBug = {
                title: 'Login page not loading',
                description: 'The login page returns 500 error',
                priority: 'high',
                status: 'open'
            };

            const errors = validateBug(validBug);
            expect(errors).toHaveLength(0);
        });

        test('should reject bug without title', () => {
            const invalidBug = {
                description: 'The login page returns 500 error',
                priority: 'high'
            };

            const errors = validateBug(invalidBug);
            expect(errors).toContain('Title is required');
        });

        test('should reject invalid priority', () => {
            const invalidBug = {
                title: 'Test bug',
                description: 'Test description',
                priority: 'invalid-priority'
            };

            const errors = validateBug(invalidBug);
            expect(errors).toContain('Priority must be one of: low, medium, high, critical');
        });
    });
});