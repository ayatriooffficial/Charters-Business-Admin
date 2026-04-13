const mongoose = require('mongoose');

const internshipPostingSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Internship title is required'],
            trim: true,
            maxlength: [100, 'Title cannot exceed 100 characters'],
            index: true,
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
            index: true,
        },
        internshipType: {
            type: String,
            enum: {
                values: ['Remote', 'In-office', 'Hybrid'],
                message: 'Internship type must be Remote, In-office, or Hybrid'
            },
            required: [true, 'Internship type is required'],
            index: true,
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            trim: true,
            index: true,
        },
        stipend: {
            type: String,
            required: [true, 'Stipend is required'],
        },
        duration: {
            type: String,
            required: [true, 'Duration is required'],
        },
        // Rich text HTML content from editor
        description: {
            type: String,
            required: [true, 'Internship description is required'],
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
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

// Compound indexes for performance
internshipPostingSchema.index({ location: 1, isActive: 1 });
internshipPostingSchema.index({ category: 1, isActive: 1 });
internshipPostingSchema.index({ createdAt: -1, isActive: 1 });

// Text index for search
internshipPostingSchema.index({
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

// Virtual for applications
internshipPostingSchema.virtual('applications', {
    ref: 'JobApplication',
    localField: '_id',
    foreignField: 'internshipPosting',
});

const InternshipPosting = mongoose.model('InternshipPosting', internshipPostingSchema);

module.exports = InternshipPosting;
