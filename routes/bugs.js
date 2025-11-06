const express = require('express');
const Bug = require('../models/Bug');
const Project=require('../models/Project');

// Create router instance
const router = express.Router();

// Debug mode
const DEBUG = true;

const log = (message, data = null) => {
    if (DEBUG) {
        console.log(`🐛 [BUGS ROUTE] ${message}`, data || '');
    }
};

const logError = (message, error = null) => {
    if (DEBUG) {
        console.error(`🐛 [BUGS ROUTE ERROR] ${message}`, error || '');
    }
};

// GET /api/bugs - Get all bugs with filtering and project support
router.get('/', async (req, res) => {
    try {
        const { status, priority, search, project } = req.query;

        log('Fetching bugs', { status, priority, search, project });

        let filter = {};

        if (status && status !== 'all') filter.status = status;
        if (priority && priority !== 'all') filter.priority = priority;
        if (project && project !== 'all') filter.project = project;

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { bugNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const bugs = await Bug.find(filter)
            .populate('reportedBy', 'firstName lastName username avatar')
            .populate('assignedTo', 'firstName lastName username avatar')
            .populate('project', 'name projectKey')
            .sort({ createdAt: -1 });

        log('Bugs fetched successfully', { count: bugs.length });

        res.json(bugs);
    } catch (error) {
        logError('Failed to fetch bugs', error);
        res.status(500).json({ error: 'Failed to fetch bugs' });
    }
});

// GET /api/bugs/:id - Get single bug
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        log('Fetching single bug', { bugId: id });

        const bug = await Bug.findById(id)
            .populate('reportedBy', 'firstName lastName username avatar')
            .populate('assignedTo', 'firstName lastName username avatar')
            .populate('project', 'name projectKey bugTypes');

        if (!bug) {
            logError('Bug not found', { bugId: id });
            return res.status(404).json({ error: 'Bug not found' });
        }

        log('Bug fetched successfully', { bugId: id });

        res.json(bug);
    } catch (error) {
        logError('Failed to fetch bug', error);
        res.status(500).json({ error: 'Failed to fetch bug' });
    }
});

// POST /api/bugs - Create new bug with project support
router.post('/', async (req, res) => {
    try {
        log('Creating new bug', { data: req.body });

        const bugData = {
            ...req.body,
            // Let the model handle bug number generation based on project
            bugNumber: undefined // Remove this line to let the model handle it
        };

        // If project is specified and Project model exists, validate bug type
        if (bugData.project && Project) {
            const project = await Project.findById(bugData.project);
            if (project) {
                // Check if the bug type is valid for this project
                const validTypes = project.bugTypes && project.bugTypes.length > 0
                    ? project.bugTypes.map(t => t.name)
                    : ['Functional', 'Visual', 'Performance', 'Security', 'Usability', 'Compatibility'];

                if (bugData.type && !validTypes.includes(bugData.type)) {
                    return res.status(400).json({
                        error: `Invalid bug type. Available types: ${validTypes.join(', ')}`
                    });
                }
            }
        }

        const bug = new Bug(bugData);
        const savedBug = await bug.save();

        // Populate the created bug
        await savedBug.populate('reportedBy', 'firstName lastName username avatar');
        await savedBug.populate('assignedTo', 'firstName lastName username avatar');
        if (savedBug.project && Project) {
            await savedBug.populate('project', 'name projectKey');
        }

        log('Bug created successfully', {
            bugId: savedBug._id,
            bugNumber: savedBug.bugNumber,
            project: savedBug.project
        });

        res.status(201).json(savedBug);
    } catch (error) {
        logError('Failed to create bug', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ error: 'Validation failed', details: errors });
        }

        res.status(500).json({ error: 'Failed to create bug' });
    }
});

// PUT /api/bugs/:id - Update bug
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        log('Updating bug', { bugId: id, updates: req.body });

        // If updating type and project exists and Project model exists, validate the type
        if (req.body.type && req.body.project && Project) {
            const project = await Project.findById(req.body.project);
            if (project) {
                const validTypes = project.bugTypes && project.bugTypes.length > 0
                    ? project.bugTypes.map(t => t.name)
                    : ['Functional', 'Visual', 'Performance', 'Security', 'Usability', 'Compatibility'];

                if (!validTypes.includes(req.body.type)) {
                    return res.status(400).json({
                        error: `Invalid bug type. Available types: ${validTypes.join(', ')}`
                    });
                }
            }
        }

        const bug = await Bug.findByIdAndUpdate(
            id,
            req.body,
            { new: true, runValidators: true }
        )
            .populate('reportedBy', 'firstName lastName username avatar')
            .populate('assignedTo', 'firstName lastName username avatar')
            .populate('project', 'name projectKey');

        if (!bug) {
            logError('Bug not found for update', { bugId: id });
            return res.status(404).json({ error: 'Bug not found' });
        }

        log('Bug updated successfully', { bugId: id });

        res.json(bug);
    } catch (error) {
        logError('Failed to update bug', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ error: 'Validation failed', details: errors });
        }

        res.status(500).json({ error: 'Failed to update bug' });
    }
});

// DELETE /api/bugs/:id - Delete bug
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        log('Deleting bug', { bugId: id });

        const bug = await Bug.findByIdAndDelete(id);

        if (!bug) {
            logError('Bug not found for deletion', { bugId: id });
            return res.status(404).json({ error: 'Bug not found' });
        }

        log('Bug deleted successfully', { bugId: id });

        res.json({ message: 'Bug deleted successfully', deletedBug: bug });
    } catch (error) {
        logError('Failed to delete bug', error);
        res.status(500).json({ error: 'Failed to delete bug' });
    }
});

module.exports = router;