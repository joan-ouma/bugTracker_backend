const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    projectKey: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    teamMembers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    bugTypes: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        color: {
            type: String,
            default: '#6B7280'
        }
    }],
    status: {
        type: String,
        enum: ['active', 'archived', 'completed'],
        default: 'active'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);