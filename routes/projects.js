const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Project = require('../models/Project');
const Bug = require('../models/Bug');
const auth = require('../middleware/auth');

// GET /api/projects - Get all projects for user
router.get('/', auth, async (req, res) => {
    try {
        console.log('Fetching projects for user:', req.user._id);

        const projects = await Project.find({
            $or: [
                { createdBy: req.user._id },
                { teamMembers: req.user._id }
            ],
            status: 'active'
        })
            .populate('createdBy', 'firstName lastName username avatar')
            .populate('teamMembers', 'firstName lastName username avatar')
            .sort({ createdAt: -1 });

        // Get bug counts for each project
        const projectsWithBugCounts = await Promise.all(
            projects.map(async (project) => {
                const bugCount = await Bug.countDocuments({ project: project._id });
                const openBugCount = await Bug.countDocuments({
                    project: project._id,
                    status: { $in: ['open', 'in-progress'] }
                });

                return {
                    ...project.toObject(),
                    bugCount,
                    openBugCount
                };
            })
        );

        console.log('Projects fetched successfully:', projectsWithBugCounts.length);
        res.json(projectsWithBugCounts);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/projects - Create new project with custom bug types
router.post('/', auth, async (req, res) => {
    try {
        const { name, description, projectKey, teamMembers, bugTypes } = req.body;

        console.log('Creating new project:', { name, projectKey, userId: req.user._id });

        // Check if project key already exists
        const existingProject = await Project.findOne({ projectKey: projectKey.toUpperCase() });
        if (existingProject) {
            return res.status(400).json({ error: 'Project key already exists' });
        }

        const projectData = {
            name,
            description,
            projectKey: projectKey.toUpperCase(),
            createdBy: req.user._id,
            teamMembers: teamMembers || []
        };

        // Add custom bug types if provided
        if (bugTypes && bugTypes.length > 0) {
            projectData.bugTypes = bugTypes;
        }

        const project = new Project(projectData);
        await project.save();

        await project.populate('createdBy', 'firstName lastName username avatar');
        await project.populate('teamMembers', 'firstName lastName username avatar');

        console.log('Project created successfully:', project._id);
        res.status(201).json(project);
    } catch (error) {
        console.error('Error creating project:', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ error: 'Validation failed', details: errors });
        }

        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/projects/:id - Get single project details
router.get('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        // Validate project ID
        if (!id || id === 'undefined' || id === 'null') {
            console.error('Invalid project ID received:', id);
            return res.status(400).json({ error: 'Invalid project ID' });
        }

        // Check if ID is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error('Invalid project ID format:', id);
            return res.status(400).json({ error: 'Invalid project ID format' });
        }

        console.log('Fetching project details for ID:', id);

        const project = await Project.findById(id)
            .populate('createdBy', 'firstName lastName username avatar')
            .populate('teamMembers', 'firstName lastName username avatar');

        if (!project) {
            console.error('Project not found for ID:', id);
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check if user has access to this project
        const hasAccess = project.createdBy._id.toString() === req.user._id.toString() ||
            project.teamMembers.some(member => member._id.toString() === req.user._id.toString());

        if (!hasAccess) {
            console.error('Access denied for user:', req.user._id, 'to project:', id);
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get bug statistics
        const bugStats = await Bug.aggregate([
            { $match: { project: project._id } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalBugs = await Bug.countDocuments({ project: project._id });

        console.log('Project details fetched successfully:', project.name);
        res.json({
            ...project.toObject(),
            bugStats,
            totalBugs
        });
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/projects/:id - Update project
router.put('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        // Validate project ID
        if (!id || id === 'undefined' || id === 'null' || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid project ID' });
        }

        const { name, description, teamMembers, bugTypes, status } = req.body;

        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check if user is the creator
        if (project.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Only project creator can update the project' });
        }

        // Update fields
        if (name) project.name = name;
        if (description) project.description = description;
        if (teamMembers) project.teamMembers = teamMembers;
        if (bugTypes) project.bugTypes = bugTypes;
        if (status) project.status = status;

        await project.save();
        await project.populate('createdBy', 'firstName lastName username avatar');
        await project.populate('teamMembers', 'firstName lastName username avatar');

        res.json(project);
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        // Validate project ID
        if (!id || id === 'undefined' || id === 'null' || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid project ID' });
        }

        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check if user is the creator
        if (project.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Only project creator can delete the project' });
        }

        // Delete all bugs associated with this project
        await Bug.deleteMany({ project: id });

        // Delete the project
        await Project.findByIdAndDelete(id);

        res.json({ message: 'Project and associated bugs deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;