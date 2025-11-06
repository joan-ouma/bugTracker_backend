import request from 'supertest';
import app from '../../app.js';
import Bug from '../../models/Bug.js';

// Mock the Bug model
jest.mock('../../models/Bug.js');

describe('Bug API Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/bugs', () => {
        test('should fetch all bugs', async () => {
            const mockBugs = [
                { _id: '1', title: 'Bug 1', status: 'open' },
                { _id: '2', title: 'Bug 2', status: 'in-progress' }
            ];

            Bug.find.mockResolvedValue(mockBugs);

            const response = await request(app)
                .get('/api/bugs')
                .expect(200);

            expect(response.body).toEqual(mockBugs);
            expect(Bug.find).toHaveBeenCalledTimes(1);
        });

        test('should handle errors when fetching bugs', async () => {
            Bug.find.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/bugs')
                .expect(500);

            expect(response.body).toHaveProperty('error', 'Failed to fetch bugs');
        });
    });

    describe('POST /api/bugs', () => {
        test('should create a new bug', async () => {
            const newBug = {
                title: 'New Bug',
                description: 'Bug description',
                priority: 'high'
            };

            const savedBug = { _id: '123', ...newBug, status: 'open' };
            Bug.prototype.save = jest.fn().mockResolvedValue(savedBug);

            const response = await request(app)
                .post('/api/bugs')
                .send(newBug)
                .expect(201);

            expect(response.body).toHaveProperty('_id', '123');
            expect(response.body.title).toBe('New Bug');
        });

        test('should validate required fields', async () => {
            const invalidBug = { description: 'Missing title' };

            const response = await request(app)
                .post('/api/bugs')
                .send(invalidBug)
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('PUT /api/bugs/:id', () => {
        test('should update a bug', async () => {
            const updatedData = { status: 'resolved' };
            const mockBug = { _id: '123', title: 'Test Bug', status: 'open' };

            Bug.findByIdAndUpdate.mockResolvedValue({ ...mockBug, ...updatedData });

            const response = await request(app)
                .put('/api/bugs/123')
                .send(updatedData)
                .expect(200);

            expect(response.body.status).toBe('resolved');
        });

        test('should return 404 for non-existent bug', async () => {
            Bug.findByIdAndUpdate.mockResolvedValue(null);

            const response = await request(app)
                .put('/api/bugs/invalid-id')
                .send({ status: 'resolved' })
                .expect(404);

            expect(response.body).toHaveProperty('error', 'Bug not found');
        });
    });

    describe('DELETE /api/bugs/:id', () => {
        test('should delete a bug', async () => {
            Bug.findByIdAndDelete.mockResolvedValue({ _id: '123' });

            const response = await request(app)
                .delete('/api/bugs/123')
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Bug deleted successfully');
        });
    });
});