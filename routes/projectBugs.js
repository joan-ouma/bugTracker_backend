const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Bug = require('../models/Bug');
const Project = require('../models/Project');
const auth = require('../middleware/auth');

// GET /api/projects/:projectId/bugs - Get all bugs for a specific project
router.get('/:projectId/bugs', auth, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { status, priority, type, search } = req.query;

        console.log('Fetching project bugs:', { projectId, query: req.query });

        // Validate project ID
        if (!projectId || projectId === 'undefined' || projectId === 'null' || !mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ error: 'Invalid project ID' });
        }

        // Verify project exists and user has access
        const project = await Project.findById(projectId)
            .populate('createdBy', 'firstName lastName username avatar')
            .populate('teamMembers', 'firstName lastName username avatar');

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check if user has access to this project
        const hasAccess = project.createdBy._id.toString() === req.user._id.toString() ||
            project.teamMembers.some(member => member._id.toString() === req.user._id.toString());

        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Build filter object
        const filter = { project: projectId };

        if (status && status !== 'all') {
            filter.status = status;
        }

        if (priority && priority !== 'all') {
            filter.priority = priority;
        }

        if (type && type !== 'all') {
            filter.type = type;
        }

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
            .sort({ createdAt: -1 });

        console.log('Project bugs fetched successfully:', { projectId, count: bugs.length });

        res.json({
            project: {
                _id: project._id,
                name: project.name,
                projectKey: project.projectKey,
                description: project.description,
                bugTypes: project.bugTypes
            },
            bugs,
            totalCount: bugs.length
        });
    } catch (error) {
        console.error('Error fetching project bugs:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/projects/:projectId/bugs/stats - Get project bug statistics
router.get('/:projectId/bugs/stats', auth, async (req, res) => {
    try {
        const { projectId } = req.params;

        // Validate project ID
        if (!projectId || projectId === 'undefined' || projectId === 'null' || !mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ error: 'Invalid project ID' });
        }

        const stats = await Bug.aggregate([
            { $match: { project: mongoose.Types.ObjectId(projectId) } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalBugs = await Bug.countDocuments({ project: projectId });

        const priorityStats = await Bug.aggregate([
            { $match: { project: mongoose.Types.ObjectId(projectId) } },
            {
                $group: {
                    _id: '$priority',
                    count: { $sum: 1 }
                }
            }
        ]);

        const typeStats = await Bug.aggregate([
            { $match: { project: mongoose.Types.ObjectId(projectId) } },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            statusStats: stats,
            priorityStats,
            typeStats,
            totalBugs
        });
    } catch (error) {
        console.error('Error fetching project bug stats:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;