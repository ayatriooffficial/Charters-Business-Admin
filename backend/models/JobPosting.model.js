const mongoose = require('mongoose');

const jobPostingSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Job title is required'],
            trim: true,
            maxlength: [100, 'Title cannot exceed 100 characters'],
            index: true, // Index for faster queries
        },
        company: {
            type: String,
            required: [true, 'Company name is required'],
            trim: true,
            default: 'Charters Business',
        },
        location: {
            type: String,
            required: [true, 'Location is required'],
            trim: true,
            index: true, // Index for location filtering
        },
        jobType: {
            type: String,
            enum: {
                values: ['Full-time', 'Part-time', 'Contract'],
                message: 'Job type must be Full-time, Part-time, or Contract'
            },
            required: [true, 'Job type is required'],
            index: true,
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            trim: true,
            index: true, // Index for category filtering
        },
        salary: {
            type: String,
            required: [true, 'Salary range is required'],
        },
        experience: {
            type: String,
            required: [true, 'Experience level is required'],
        },
        // Rich text HTML content from editor
        description: {
            type: String,
            required: [true, 'Job description is required'],
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true, // Index for active job filtering
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            required: true,
            index: true,
        },
        views: {
            type: Number,
            default: 0,
        },
        applicationsCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for common queries (Performance optimization)
jobPostingSchema.index({ location: 1, isActive: 1 });
jobPostingSchema.index({ category: 1, isActive: 1 });
jobPostingSchema.index({ createdAt: -1, isActive: 1 });

// Text index for search functionality
jobPostingSchema.index({
    title: 'text',
    description: 'text',
    category: 'text'
}, {
    weights: {
        title: 10,
        category: 5,
        description: 1
    }
});

// Virtual for application count (if needed)
jobPostingSchema.virtual('applications', {
    ref: 'JobApplication',
    localField: '_id',
    foreignField: 'jobPosting',
});

const JobPosting = mongoose.model('JobPosting', jobPostingSchema);

module.exports = JobPosting;
