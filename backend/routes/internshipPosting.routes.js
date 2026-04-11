const express = require("express");
const internshipPostingController = require("../controllers/internshipPosting.controller");
const { requireInternalService, verifyRequiredActingToken } = require('../middleware/internalServiceAuth');

const router = express.Router();

// Public routes
router.get("/", internshipPostingController.getAllInternshipPostings);
router.get("/:id", internshipPostingController.getInternshipPostingById);

// Protected routes - Admin/Recruiter only
router.post(
  "/",
  requireInternalService,
  verifyRequiredActingToken,
  internshipPostingController.createInternshipPosting
);

router.get(
  "/my/postings",
  requireInternalService,
  verifyRequiredActingToken,
  internshipPostingController.getMyInternshipPostings
);

router.put(
  "/:id",
  requireInternalService,
  verifyRequiredActingToken,
  internshipPostingController.updateInternshipPosting
);

router.patch(
  '/:id',
  requireInternalService,
  verifyRequiredActingToken,
  internshipPostingController.updateInternshipPosting
);

router.delete(
  "/:id",
  requireInternalService,
  verifyRequiredActingToken,
  internshipPostingController.deleteInternshipPosting
);

// Admin only
router.get(
  "/admin/stats",
  requireInternalService,
  verifyRequiredActingToken,
  internshipPostingController.getInternshipStats
);

// Get applications for a specific internship
router.get(
  "/:id/applications",
  requireInternalService,
  verifyRequiredActingToken,
  internshipPostingController.getAllApplicationsForInternship
);

module.exports = router;