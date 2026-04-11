const JobPosting = require('../models/JobPosting.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

const getActorId = (req) =>
    req.user?.id ||
    req.user?._id?.toString() ||
    req.internalActor?.adminId ||
    null;

const getActorRole = (req) =>
    req.user?.role ||
    req.internalActor?.role ||
    null;

// Create job posting (Admin/Recruiter only)
const createJobPosting = asyncHandler(async (req, res) => {
    const {
        title,
        company,
        location,
        jobType,
        category,
        salary,
        experience,
        description,
    } = req.body;

    if (!title || !location || !jobType || !category || !salary || !experience || !description) {
        throw new ApiError(400, 'All fields are required');
    }

    const jobPosting = await JobPosting.create({
        title: title.trim(),
        company: company?.trim() || 'Charters Business',
        location: location.trim(),
        jobType,
        category: category.trim(),
        salary: salary.trim(),
        experience: experience.trim(),
        description,
        createdBy: getActorId(req),
    });

    res.status(201).json(
        new ApiResponse(201, jobPosting, 'Job posting created successfully')
    );
});

// Get all job postings
const getAllJobPostings = asyncHandler(async (req, res) => {
    const {
        location,
        category,
        jobType,
        search,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        order = 'desc'
    } = req.query;

    const query = { isActive: true };

    if (location && location !== 'All') query.location = location;
    if (category) query.category = category;
    if (jobType) query.jobType = jobType;

    if (search) {
        query.$text = { $search: search };
    }

    const sortOptions = {};
    sortOptions[sortBy] = order === 'desc' ? -1 : 1;

    const [jobPostings, count] = await Promise.all([
        JobPosting.find(query)
            .populate('createdBy', 'name email')
            .sort(sortOptions)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean(),
        JobPosting.countDocuments(query)
    ]);

    res.status(200).json(
        new ApiResponse(200, {
            jobs: jobPostings,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit),
                limit: parseInt(limit),
            }
        }, 'Job postings retrieved successfully')
    );
});

// Get single job
const getJobPostingById = asyncHandler(async (req, res) => {
    const jobPosting = await JobPosting.findById(req.params.id)
        .populate('createdBy', 'name email');

    if (!jobPosting) {
        throw new ApiError(404, 'Job posting not found');
    }

    JobPosting.findByIdAndUpdate(
        req.params.id,
        { $inc: { views: 1 } }
    ).exec();

    res.status(200).json(
        new ApiResponse(200, jobPosting, 'Job posting retrieved successfully')
    );
});

// Update job
const updateJobPosting = asyncHandler(async (req, res) => {
    const jobPosting = await JobPosting.findById(req.params.id);

    if (!jobPosting) {
        throw new ApiError(404, 'Job posting not found');
    }

    if (
        jobPosting.createdBy.toString() !== getActorId(req) &&
        getActorRole(req) !== 'admin'
    ) {
        throw new ApiError(403, 'Not authorized');
    }

    const allowedFields = [
        'title', 'company', 'location', 'jobType',
        'category', 'salary', 'experience', 'description', 'isActive'
    ];

    const updates = {};
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
        }
    });

    const updatedJobPosting = await JobPosting.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    res.status(200).json(
        new ApiResponse(200, updatedJobPosting, 'Updated successfully')
    );
});

// Delete job
const deleteJobPosting = asyncHandler(async (req, res) => {
    const jobPosting = await JobPosting.findById(req.params.id);

    if (!jobPosting) {
        throw new ApiError(404, 'Job posting not found');
    }

    if (
        jobPosting.createdBy.toString() !== getActorId(req) &&
        getActorRole(req) !== 'admin'
    ) {
        throw new ApiError(403, 'Not authorized');
    }

    await JobPosting.findByIdAndUpdate(req.params.id, { isActive: false });

    res.status(200).json(
        new ApiResponse(200, null, 'Deleted successfully')
    );
});

// My jobs
const getMyJobPostings = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const query = { createdBy: getActorId(req) };

    const [jobPostings, count] = await Promise.all([
        JobPosting.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean(),
        JobPosting.countDocuments(query)
    ]);

    res.status(200).json(
        new ApiResponse(200, {
            jobPostings,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit),
            }
        }, 'Your jobs retrieved')
    );
});

// Stats
const getJobStats = asyncHandler(async (req, res) => {
    const [totalJobs, activeJobs, inactiveJobs, totalApplications] = await Promise.all([
        JobPosting.countDocuments(),
        JobPosting.countDocuments({ isActive: true }),
        JobPosting.countDocuments({ isActive: false }),
        JobPosting.aggregate([
            { $group: { _id: null, total: { $sum: '$applicationsCount' } } }
        ])
    ]);

    res.status(200).json(
        new ApiResponse(200, {
            totalJobs,
            activeJobs,
            inactiveJobs,
            totalApplications: totalApplications[0]?.total || 0
        }, 'Stats retrieved')
    );
});

module.exports = {
    createJobPosting,
    getAllJobPostings,
    getJobPostingById,
    updateJobPosting,
    deleteJobPosting,
    getMyJobPostings,
    getJobStats
};