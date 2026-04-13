const InternshipPosting = require("../models/InternshipPosting.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");

const getActorId = (req) =>
    req.user?.id ||
    req.user?._id?.toString() ||
    req.internalActor?.adminId ||
    null;

const getActorRole = (req) =>
    req.user?.role ||
    req.internalActor?.role ||
    null;

// Create internship posting
const createInternshipPosting = asyncHandler(async (req, res) => {
    const {
        title,
        company,
        location,
        internshipType,
        category,
        stipend,
        duration,
        description,
    } = req.body;

    if (
        !title ||
        !location ||
        !internshipType ||
        !category ||
        !stipend ||
        !duration ||
        !description
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const internshipPosting = await InternshipPosting.create({
        title: title.trim(),
        company: company?.trim() || "Charters Business",
        location: location.trim(),
        internshipType,
        category: category.trim(),
        stipend: stipend.trim(),
        duration: duration.trim(),
        description,
        createdBy: getActorId(req),
    });

    res.status(201).json(
        new ApiResponse(201, internshipPosting, "Internship posting created successfully")
    );
});

// Get all internship postings
const getAllInternshipPostings = asyncHandler(async (req, res) => {
    const {
        location,
        category,
        internshipType,
        search,
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        order = "desc",
    } = req.query;

    const query = { isActive: true };

    if (location && location !== "All") query.location = location;
    if (category) query.category = category;
    if (internshipType) query.internshipType = internshipType;
    if (search) query.$text = { $search: search };

    const sortOptions = {};
    sortOptions[sortBy] = order === "desc" ? -1 : 1;

    const [internshipPostings, count] = await Promise.all([
        InternshipPosting.find(query)
            .populate("createdBy", "name email")
            .sort(sortOptions)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean(),
        InternshipPosting.countDocuments(query),
    ]);

    res.status(200).json(
        new ApiResponse(200, {
            internships :internshipPostings,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit),
                limit: parseInt(limit),
            },
        }, "Internship postings retrieved successfully")
    );
});

// Get by ID
const getInternshipPostingById = asyncHandler(async (req, res) => {
    const internshipPosting = await InternshipPosting.findById(req.params.id)
        .populate("createdBy", "name email");

    if (!internshipPosting) {
        throw new ApiError(404, "Internship posting not found");
    }

    InternshipPosting.findByIdAndUpdate(
        req.params.id,
        { $inc: { views: 1 } },
        { new: false }
    ).exec();

    res.status(200).json(
        new ApiResponse(200, internshipPosting, "Internship posting retrieved successfully")
    );
});

// Update
const updateInternshipPosting = asyncHandler(async (req, res) => {
    const internshipPosting = await InternshipPosting.findById(req.params.id);

    if (!internshipPosting) {
        throw new ApiError(404, "Internship posting not found");
    }

    if (
        internshipPosting.createdBy.toString() !== getActorId(req) &&
        getActorRole(req) !== "admin"
    ) {
        throw new ApiError(403, "Not authorized");
    }

    const allowedFields = [
        "title",
        "company",
        "location",
        "internshipType",
        "category",
        "stipend",
        "duration",
        "description",
        "isActive",
    ];

    const updates = {};
    allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
        }
    });

    const updatedInternshipPosting = await InternshipPosting.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true }
    ).populate("createdBy", "name email");

    res.status(200).json(
        new ApiResponse(200, updatedInternshipPosting, "Updated successfully")
    );
});

// Delete (soft delete)
const deleteInternshipPosting = asyncHandler(async (req, res) => {
    const internshipPosting = await InternshipPosting.findById(req.params.id);

    if (!internshipPosting) {
        throw new ApiError(404, "Internship posting not found");
    }

    if (
        internshipPosting.createdBy.toString() !== getActorId(req) &&
        getActorRole(req) !== "admin"
    ) {
        throw new ApiError(403, "Not authorized");
    }

    await InternshipPosting.findByIdAndUpdate(req.params.id, { isActive: false });

    res.status(200).json(
        new ApiResponse(200, null, "Deleted successfully")
    );
});

// My postings
const getMyInternshipPostings = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const query = { createdBy: getActorId(req) };

    const [internshipPostings, count] = await Promise.all([
        InternshipPosting.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean(),
        InternshipPosting.countDocuments(query),
    ]);

    res.status(200).json(
        new ApiResponse(200, {
            internshipPostings,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit),
            },
        }, "Your internships retrieved")
    );
});

// Stats
const getInternshipStats = asyncHandler(async (req, res) => {
    const [
        totalInternships,
        activeInternships,
        inactiveInternships,
        totalApplications,
    ] = await Promise.all([
        InternshipPosting.countDocuments(),
        InternshipPosting.countDocuments({ isActive: true }),
        InternshipPosting.countDocuments({ isActive: false }),
        InternshipPosting.aggregate([
            { $group: { _id: null, total: { $sum: "$applicationsCount" } } },
        ]),
    ]);

    res.status(200).json(
        new ApiResponse(200, {
            totalInternships,
            activeInternships,
            inactiveInternships,
            totalApplications: totalApplications[0]?.total || 0,
        }, "Stats retrieved")
    );
});

// Applications
const getAllApplicationsForInternship = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;
    const { id } = req.params;

    if (!id) {
        throw new ApiError(400, "Internship ID is required");
    }

    const JobApplication = require("../models/JobApplication.model");

    const query = { internshipPosting: id };
    if (status) query.status = status;

    const [applications, count] = await Promise.all([
        JobApplication.find(query)
            .populate("user", "name email")
            .populate("internshipPosting", "title company")
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean(),
        JobApplication.countDocuments(query),
    ]);

    res.status(200).json(
        new ApiResponse(200, applications, "Applications retrieved successfully")
    );
});

// EXPORTS
module.exports = {
    createInternshipPosting,
    getAllInternshipPostings,
    getInternshipPostingById,
    updateInternshipPosting,
    deleteInternshipPosting,
    getMyInternshipPostings,
    getInternshipStats,
    getAllApplicationsForInternship,
};