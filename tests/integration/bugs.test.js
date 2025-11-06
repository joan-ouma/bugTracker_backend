const request = require('supertest');
const app = require('../../server');
const Bug = require('../../models/Bug');

// Mock data
const mockBug = {
    title: 'Test Bug',
    description: 'This is a test bug description',
    reporter: 'Test User',
    priority: 'high'
};

describe('Bug API Integration Tests', () => {
    beforeEach(async () => {
        await Bug.deleteMany({});
    });

    describe('GET /api/bugs', () => {
        test('should return all bugs', async () => {
            await Bug.create(mockBug);

            const response = await request(app)
                .get('/api/bugs')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].title).toBe(mockBug.title);
        });
    });

    describe('POST /api/bugs', () => {
        test('should create a new bug', async () => {
            const response = await request(app)
                .post('/api/bugs')
                .send(mockBug)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe(mockBug.title);
            expect(response.body.data.status).toBe('open');
        });

        test('should reject invalid bug data', async () => {
            const response = await request(app)
                .post('/api/bugs')
                .send({
                    title: '', // Invalid empty title
                    description: 'Valid description'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/bugs/:id', () => {
        test('should update bug status', async () => {
            const bug = await Bug.create(mockBug);

            const response = await request(app)
                .put(`/api/bugs/${bug._id}`)
                .send({
                    ...mockBug,
                    status: 'in-progress'
                })
                .expect(200);

            expect(response.body.data.status).toBe('in-progress');
        });
    });

    describe('DELETE /api/bugs/:id', () => {
        test('should delete a bug', async () => {
            const bug = await Bug.create(mockBug);

            const response = await request(app)
                .delete(`/api/bugs/${bug._id}`)
                .expect(200);

            expect(response.body.success).toBe(true);

            // Verify bug is deleted
            const deletedBug = await Bug.findById(bug._id);
            expect(deletedBug).toBeNull();
        });
    });
});