const User = require('../models/User');
const ProfileBranding = require('../models/ProfileBranding');
const CandidateLink = require('../models/CandidateLink');
const CandidateAccess = require('../models/CandidateAccess');
const AuditLog = require('../models/AuditLog');
const chartersAdminService = require('../services/chartersAdminService');
const { cloneDefaultPermissions } = require('../utils/defaultPermissions');

const getSafeNumber = (value) => (Number.isFinite(value) ? value : 0);

const mapProfileScores = (profile) => {
  if (!profile) return null;

  const scores = profile.scores || {};

  return {
    total: getSafeNumber(scores.total),
    level: scores.level || 'Beginner',
    percentile: getSafeNumber(scores.percentile),
    personalPresence: getSafeNumber(scores.personalPresence),
    professionalProfiles: getSafeNumber(scores.professionalProfiles),
    networking: getSafeNumber(scores.networking),
    credentials: getSafeNumber(scores.credentials),
    thoughtLeadership: getSafeNumber(scores.thoughtLeadership),
    lastCalculated: profile.lastCalculated || null,
  };
};

const deepMerge = (target, source) => {
  const output = { ...(target || {}) };
  Object.keys(source || {}).forEach((key) => {
    const nextValue = source[key];
    const currentValue = output[key];

    if (
      nextValue &&
      typeof nextValue === 'object' &&
      !Array.isArray(nextValue) &&
      currentValue &&
      typeof currentValue === 'object' &&
      !Array.isArray(currentValue)
    ) {
      output[key] = deepMerge(currentValue, nextValue);
      return;
    }

    output[key] = nextValue;
  });

  return output;
};

const getServiceActor = (req) => ({
  adminId: req.user?.chartersUserId || String(req.user?._id || ''),
  role: req.user?.role || 'admin',
  requestId: req.requestId || null,
});

const normalizeCandidateStatus = (candidate, access) => {
  if (candidate?.status) return candidate.status;
  if (access?.status) return access.status;
  return candidate?.isActive === false ? 'disabled' : 'active';
};

const writeAuditLog = async ({
  req,
  actionType = 'OTHER',
  action,
  targetChartersUserId,
  before = null,
  after = null,
  meta = null,
}) => {
  try {
    await AuditLog.create({
      actor: {
        chartersUserId: req.user?.chartersUserId || String(req.user?._id || ''),
        email: req.user?.email || null,
        role: req.user?.role || null,
      },
      actionType,
      action,
      targetChartersUserId: targetChartersUserId || null,
      before,
      after,
      meta: {
        ...(meta || {}),
        requestId: req.requestId || null,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to write audit log:', error.message);
  }
};

const ensureCandidateLink = async (candidate) => {
  const chartersUserId = String(candidate._id);
  let link = await CandidateLink.findOne({ chartersUserId });

  if (link) {
    let changed = false;

    if (candidate.email && link.email !== candidate.email.toLowerCase()) {
      link.email = candidate.email.toLowerCase();
      changed = true;
    }

    if ((candidate.phoneNumber || null) !== (link.phone || null)) {
      link.phone = candidate.phoneNumber || null;
      changed = true;
    }

    if (changed) {
      await link.save();
    }

    return link;
  }

  // Link-time fallback only: match local PB user by email first, then phone.
  let pbUser = null;

  if (candidate.email) {
    pbUser = await User.findOne({ email: candidate.email.toLowerCase() }).select('_id email phone');
  }

  if (!pbUser && candidate.phoneNumber) {
    pbUser = await User.findOne({ phone: candidate.phoneNumber }).select('_id email phone');
  }

  link = await CandidateLink.create({
    chartersUserId,
    pbUserId: pbUser?._id || null,
    email: candidate.email ? candidate.email.toLowerCase() : null,
    phone: candidate.phoneNumber || null,
    linkedAt: new Date(),
  });

  return link;
};

const shapeAdminUser = ({ candidate, link, access, profile }) => {
  const mergedPermissions = deepMerge(cloneDefaultPermissions(), access?.permissions || {});
  const status = normalizeCandidateStatus(candidate, access);

  return {
    _id: String(candidate._id),
    chartersUserId: String(candidate._id),
    pbUserId: link?.pbUserId || null,
    name: candidate.name || null,
    firstName: candidate.firstName || '',
    lastName: candidate.lastName || '',
    email: candidate.email || link?.email || null,
    phone: candidate.phoneNumber || link?.phone || null,
    role: 'candidate',
    status,
    isActive: status === 'active',
    permissions: mergedPermissions,
    profileScores: mapProfileScores(profile),
    createdAt: candidate.createdAt || null,
    updatedAt: candidate.updatedAt || null,
    lastLogin: candidate.lastLogin || null,
  };
};

exports.getUsers = async (req, res, next) => {
  try {
    const payload = await chartersAdminService.getCandidates(getServiceActor(req), req.query || {});
    const candidates = payload.candidates || [];
    const chartersIds = candidates.map((candidate) => String(candidate._id)).filter(Boolean);

    const existingLinks = await CandidateLink.find({ chartersUserId: { $in: chartersIds } });
    const linkMap = new Map(existingLinks.map((entry) => [entry.chartersUserId, entry]));

    const missingCandidates = candidates.filter((candidate) => !linkMap.has(String(candidate._id)));
    for (const candidate of missingCandidates) {
      const link = await ensureCandidateLink(candidate);
      linkMap.set(link.chartersUserId, link);
    }

    const accessEntries = await CandidateAccess.find({ chartersUserId: { $in: chartersIds } });
    const accessMap = new Map(accessEntries.map((entry) => [entry.chartersUserId, entry]));

    const pbUserIds = Array.from(linkMap.values())
      .map((entry) => entry.pbUserId)
      .filter(Boolean);

    const profiles = await ProfileBranding.find({ userId: { $in: pbUserIds } }).select('userId scores lastCalculated');
    const profileMap = new Map(profiles.map((profile) => [String(profile.userId), profile]));

    const users = candidates.map((candidate) => {
      const chartersUserId = String(candidate._id);
      const link = linkMap.get(chartersUserId) || null;
      const access = accessMap.get(chartersUserId) || null;
      const profile = link?.pbUserId ? profileMap.get(String(link.pbUserId)) : null;
      return shapeAdminUser({ candidate, link, access, profile });
    });

    res.status(200).json({
      success: true,
      users,
      pagination: payload.pagination || null,
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePermissions = async (req, res, next) => {
  try {
    const { id: chartersUserId } = req.params;
    const requestedPermissions = req.body?.permissions;

    if (!requestedPermissions || typeof requestedPermissions !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'permissions object is required',
      });
    }

    const candidate = await chartersAdminService.getCandidateById(getServiceActor(req), chartersUserId);

    const existing = await CandidateAccess.findOne({ chartersUserId });
    const beforePermissions = deepMerge(cloneDefaultPermissions(), existing?.permissions || {});
    const mergedPermissions = deepMerge(beforePermissions, requestedPermissions);

    const updated = await CandidateAccess.findOneAndUpdate(
      { chartersUserId },
      {
        $set: {
          permissions: mergedPermissions,
          status: candidate?.status || existing?.status || 'active',
          updatedBy: req.user.chartersUserId || String(req.user._id),
          updatedAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    await writeAuditLog({
      req,
      actionType: 'PERMISSION_UPDATE',
      action: 'permissions.updated',
      targetChartersUserId: chartersUserId,
      before: { permissions: beforePermissions },
      after: { permissions: updated.permissions },
    });

    res.status(200).json({
      success: true,
      message: 'Permissions updated',
      user: {
        _id: chartersUserId,
        chartersUserId,
        permissions: updated.permissions,
        status: candidate?.status || updated.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteCandidate = async (req, res, next) => {
  try {
    const { id: chartersUserId } = req.params;

    if (String(req.user.chartersUserId || req.user._id) === String(chartersUserId)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot remove your own account',
      });
    }

    const previousAccess = await CandidateAccess.findOne({ chartersUserId }).lean();

    await chartersAdminService.deactivateCandidate(
      getServiceActor(req),
      chartersUserId
    );

    await CandidateAccess.findOneAndUpdate(
      { chartersUserId },
      {
        $set: {
          status: 'disabled',
          updatedBy: req.user.chartersUserId || String(req.user._id),
          updatedAt: new Date(),
        },
        $setOnInsert: {
          permissions: cloneDefaultPermissions(),
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    await writeAuditLog({
      req,
      actionType: 'USER_DISABLE',
      action: 'candidate.deactivated',
      targetChartersUserId: chartersUserId,
      before: previousAccess ? { status: previousAccess.status } : null,
      after: { status: 'disabled' },
    });

    res.status(200).json({
      success: true,
      message: 'Candidate disabled successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.getPermissions = async (req, res, next) => {
  try {
    const { chartersUserId } = req.params;

    const [access, candidate] = await Promise.all([
      CandidateAccess.findOne({ chartersUserId }).lean(),
      chartersAdminService.getCandidateById(getServiceActor(req), chartersUserId),
    ]);

    res.status(200).json({
      success: true,
      chartersUserId,
      status: candidate?.status || null,
      permissions: deepMerge(cloneDefaultPermissions(), access?.permissions || {}),
    });
  } catch (error) {
    next(error);
  }
};

exports.getJobs = async (req, res, next) => {
  try {
    const payload = await chartersAdminService.getJobs(getServiceActor(req), req.query || {});

    res.status(200).json({
      success: true,
      jobPostings: payload.jobs || [],
      pagination: payload.pagination || null,
    });
  } catch (error) {
    next(error);
  }
};

exports.getJobById = async (req, res, next) => {
  try {
    const jobPosting = await chartersAdminService.getJobById(getServiceActor(req), req.params.id);

    res.status(200).json({
      success: true,
      jobPosting,
    });
  } catch (error) {
    next(error);
  }
};

exports.createJob = async (req, res, next) => {
  try {
    const jobPosting = await chartersAdminService.createJob(getServiceActor(req), req.body || {});

    await writeAuditLog({
      req,
      actionType: 'JOB_CREATE',
      action: 'job.created',
      targetChartersUserId: null,
      after: { jobId: jobPosting?._id || null },
    });

    res.status(201).json({
      success: true,
      jobPosting,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateJob = async (req, res, next) => {
  try {
    const jobPosting = await chartersAdminService.updateJob(getServiceActor(req), req.params.id, req.body || {});

    await writeAuditLog({
      req,
      actionType: 'JOB_UPDATE',
      action: 'job.updated',
      after: { jobId: jobPosting?._id || req.params.id },
    });

    res.status(200).json({
      success: true,
      jobPosting,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteJob = async (req, res, next) => {
  try {
    await chartersAdminService.deleteJob(getServiceActor(req), req.params.id);

    await writeAuditLog({
      req,
      actionType: 'JOB_DELETE',
      action: 'job.deleted',
      after: { jobId: req.params.id },
    });

    res.status(200).json({
      success: true,
      message: 'Job removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.getApplicationsForJob = async (req, res, next) => {
  try {
    const payload = await chartersAdminService.getApplicationsForJob(
      getServiceActor(req),
      req.params.id,
      req.query || {}
    );

    res.status(200).json({
      success: true,
      applications: payload.applications || [],
      pagination: payload.pagination || null,
    });
  } catch (error) {
    next(error);
  }
};

exports.getInternships = async (req, res, next) => {
  try {
    const payload = await chartersAdminService.getInternships(getServiceActor(req), req.query || {});

    res.status(200).json({
      success: true,
      internshipPostings: payload.internships || [],
      pagination: payload.pagination || null,
    });
  } catch (error) {
    next(error);
  }
};

exports.getInternshipById = async (req, res, next) => {
  try {
    const internshipPosting = await chartersAdminService.getInternshipById(getServiceActor(req), req.params.id);

    res.status(200).json({
      success: true,
      internshipPosting,
    });
  } catch (error) {
    next(error);
  }
};

exports.createInternship = async (req, res, next) => {
  try {
    const internshipPosting = await chartersAdminService.createInternship(getServiceActor(req), req.body || {});

    await writeAuditLog({
      req,
      actionType: 'INTERNSHIP_CREATE',
      action: 'internship.created',
      after: { internshipId: internshipPosting?._id || null },
    });

    res.status(201).json({
      success: true,
      internshipPosting,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateInternship = async (req, res, next) => {
  try {
    const internshipPosting = await chartersAdminService.updateInternship(getServiceActor(req), req.params.id, req.body || {});

    await writeAuditLog({
      req,
      actionType: 'INTERNSHIP_UPDATE',
      action: 'internship.updated',
      after: { internshipId: internshipPosting?._id || req.params.id },
    });

    res.status(200).json({
      success: true,
      internshipPosting,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteInternship = async (req, res, next) => {
  try {
    await chartersAdminService.deleteInternship(getServiceActor(req), req.params.id);

    await writeAuditLog({
      req,
      actionType: 'INTERNSHIP_DELETE',
      action: 'internship.deleted',
      after: { internshipId: req.params.id },
    });

    res.status(200).json({
      success: true,
      message: 'Internship removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.getApplicationsForInternship = async (req, res, next) => {
  try {
    const payload = await chartersAdminService.getApplicationsForInternship(
      getServiceActor(req),
      req.params.id,
      req.query || {}
    );

    res.status(200).json({
      success: true,
      applications: payload.applications || [],
      pagination: payload.pagination || null,
    });
  } catch (error) {
    next(error);
  }
};

exports.getApplications = async (req, res, next) => {
  try {
    const payload = await chartersAdminService.getApplications(getServiceActor(req), req.query || {});

    res.status(200).json({
      success: true,
      applications: payload.applications || [],
      pagination: payload.pagination || null,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'status is required',
      });
    }

    const application = await chartersAdminService.updateApplicationStatus(
      getServiceActor(req),
      req.params.id,
      status
    );

    await writeAuditLog({
      req,
      actionType: 'APPLICATION_STATUS_UPDATE',
      action: 'application.status.updated',
      after: { applicationId: req.params.id, status },
    });

    res.status(200).json({
      success: true,
      application,
    });
  } catch (error) {
    next(error);
  }
};

