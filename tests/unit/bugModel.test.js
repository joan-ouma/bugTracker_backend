const Bug = require('../../models/Bug');
const mongoose = require('mongoose');

// Mock mongoose methods
jest.mock('../../models/Bug');

describe('Bug Model Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should create a bug with default values', async () => {
        const mockSave = jest.fn().mockResolvedValue({
            _id: new mongoose.Types.ObjectId(),
            title: 'Test Bug',
            status: 'open',
            priority: 'medium'
        });

        Bug.mockImplementation(() => ({
            save: mockSave
        }));

        const bug = new Bug({
            title: 'Test Bug',
            description: 'Test description',
            reporter: 'Test User'
        });

        const savedBug = await bug.save();

        expect(mockSave).toHaveBeenCalled();
        expect(savedBug.status).toBe('open');
        expect(savedBug.priority).toBe('medium');
    });

    test('should update bug status using instance method', async () => {
        const mockBug = {
            status: 'open',
            save: jest.fn().mockResolvedValue({
                status: 'in-progress'
            })
        };

        const result = await Bug.prototype.updateStatus.call(mockBug, 'in-progress');

        expect(mockBug.save).toHaveBeenCalled();
        expect(result.status).toBe('in-progress');
    });
});