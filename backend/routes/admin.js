const express = require('express');
const router = express.Router();

const {
  getUsers,
  updatePermissions,
  elevateUserToCandidate,
  deleteCandidate,
  getJobs,
  getMyJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  getApplicationsForJob,
  getInternships,
  getMyInternships,
  getInternshipById,
  createInternship,
  updateInternship,
  deleteInternship,
  getApplicationsForInternship,
  getApplications,
  updateApplicationStatus,
} = require('../controllers/adminController');

const {
  protect,
  requireAdmin,
} = require('../middleware/auth');

router.use(protect, requireAdmin);

router.get('/users', getUsers);
router.patch('/users/:id/permissions', updatePermissions);
router.patch('/users/:id/elevate-candidate', elevateUserToCandidate);
router.delete('/users/:id', deleteCandidate);

router.get('/jobs', getJobs);
router.get('/jobs/my-postings', getMyJobs);
router.get('/jobs/:id', getJobById);
router.post('/jobs', createJob);
router.put('/jobs/:id', updateJob);
router.patch('/jobs/:id', updateJob);
router.delete('/jobs/:id', deleteJob);
router.get('/jobs/:id/applications', getApplicationsForJob);

router.get('/internships', getInternships);
router.get('/internships/my-postings', getMyInternships);
router.get('/internships/:id', getInternshipById);
router.post('/internships', createInternship);
router.put('/internships/:id', updateInternship);
router.patch('/internships/:id', updateInternship);
router.delete('/internships/:id', deleteInternship);
router.get('/internships/:id/applications', getApplicationsForInternship);

router.get('/applications', getApplications);
router.patch('/applications/:id/status', updateApplicationStatus);
router.put('/applications/:id/status', updateApplicationStatus);

module.exports = router;
