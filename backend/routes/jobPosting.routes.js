const express = require('express');
const jobPostingController = require('../controllers/jobPosting.controller');
const { requireInternalService, verifyRequiredActingToken } = require('../middleware/internalServiceAuth');


const router = express.Router();

// Public routes
router.get('/', jobPostingController.getAllJobPostings);
router.get('/:id', jobPostingController.getJobPostingById);

// Protected routes - Admin/Recruiter only
router.post(
  '/',
  requireInternalService,
  verifyRequiredActingToken,
  jobPostingController.createJobPosting
);

router.get(
  '/my-postings',
  requireInternalService,
  verifyRequiredActingToken,
  jobPostingController.getMyJobPostings
);

router.put(
  '/:id',
  requireInternalService,
  verifyRequiredActingToken,
  jobPostingController.updateJobPosting
);

router.patch(
  '/:id',
  requireInternalService,
  verifyRequiredActingToken,
  jobPostingController.updateJobPosting
);

router.delete(
  '/:id',
  requireInternalService,
  verifyRequiredActingToken,
  jobPostingController.deleteJobPosting
);

// Admin only
router.get(
  '/admin/stats',
  requireInternalService,
  verifyRequiredActingToken,
  jobPostingController.getJobStats
);

module.exports = router;