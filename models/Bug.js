const mongoose = require('mongoose');

const bugSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [200, 'Title cannot be more than 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Description is required']
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    projectKey: {
        type: String
    },

    status: {
        type: String,
        enum: ['open', 'in-progress', 'resolved', 'closed'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    severity: {
        type: String,
        enum: ['minor', 'major', 'blocker'],
        default: 'minor'
    },
    type: {
        type: String,
        enum: ['bug', 'feature', 'enhancement', 'task'],
        default: 'bug'
    },
    stepsToReproduce: [String],
    expectedBehavior: String,
    actualBehavior: String,
    reporter: {
        type: String,
        default: 'Anonymous'
    },
    assignee: String,
    dueDate: Date,
    estimatedHours: Number,
    actualHours: Number,
    tags: [String],
    environment: {
        os: String,
        browser: String,
        device: String,
        version: String
    },
    bugNumber: {
        type: String,
        unique: true
    }
}, {
    timestamps: true
});



// Update the bug number generation to include project key
bugSchema.pre('save', async function(next) {
    if (this.isNew) {
        if (this.project) {
            const project = await mongoose.model('Project').findById(this.project);
            if (project) {
                const bugCount = await mongoose.model('Bug').countDocuments({ project: this.project });
                this.bugNumber = `${project.projectKey}-${(bugCount + 1).toString().padStart(3, '0')}`;
                this.projectKey = project.projectKey;
            } else {
                // Fallback to original bug number generation
                this.bugNumber = `BUG-${Date.now()}`;
            }
        } else {
            // Fallback to original bug number generation
            this.bugNumber = `BUG-${Date.now()}`;
        }
    }
    next();
});

// Add index for better query performance
bugSchema.index({ status: 1, priority: 1, createdAt: -1 });

module.exports = mongoose.model('Bug', bugSchema);