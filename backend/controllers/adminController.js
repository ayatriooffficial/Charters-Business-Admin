const User = require('../models/Admin');
const ProfileBranding = require('../models/ProfileBranding');
const CandidateLink = require('../models/CandidateLink');
const CandidateAccess = require('../models/CandidateAccess');
const AuditLog = require('../models/AuditLog');
const JobPosting = require('../models/JobPosting.model');
const InternshipPosting = require('../models/InternshipPosting.model');
const chartersAdminService = require('../services/chartersAdminService');
const { cloneDefaultPermissions } = require('../utils/defaultPermissions');

const getSafeNumber = (value) => (Number.isFinite(value) ? value : 0);
const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const NETWORK_FALLBACK_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'ECONNABORTED',
  'ECONNRESET',
]);

const readBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }

  return TRUE_VALUES.has(String(value).trim().toLowerCase());
};

const isLocalFallbackEnabled = () => readBoolean(
  process.env.CHARTERS_LOCAL_FALLBACK,
  false
);

const shouldFallbackToLocal = (error) => {
  if (!isLocalFallbackEnabled()) return false;

  const status = error?.status || error?.response?.status || null;
  const code = String(error?.code || '').toUpperCase();
  const message = String(
    error?.message ||
    error?.response?.data?.message ||
    ''
  ).toLowerCase();

  if (error?.isNetworkError || NETWORK_FALLBACK_CODES.has(code)) {
    return true;
  }

  // 429 means the upstream rate window is exhausted — serve local data instead.
  if (status === 429 || status === 404 || status === 502 || status === 503 || status === 504) {
    return true;
  }

  return (
    message.includes('route not found') ||
    message.includes('upstream') ||
    message.includes('service unavailable') ||
    message.includes('rate-limited')
  );
};

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

const mapLocalUserRole = (role) => (
  String(role || '').toLowerCase() === 'admin' ? 'admin' : 'candidate'
);

const mapLocalUserStatus = (isActive) => (isActive === false ? 'disabled' : 'active');

const toLocalCandidateShape = (userDoc) => {
  if (!userDoc) return null;

  const firstName = userDoc.firstName || '';
  const lastName = userDoc.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const role = mapLocalUserRole(userDoc.role);
  const status = userDoc.isActive === false ? 'disabled' : 'active';

  return {
    _id: String(userDoc._id),
    id: String(userDoc._id),
    chartersUserId: String(userDoc._id),
    name: fullName || null,
    firstName,
    lastName,
    email: userDoc.email || null,
    phoneNumber: userDoc.phone || null,
    courseInterestedIn: userDoc.selectedCourse || null,
    role,
    status,
    isActive: status === 'active',
    createdAt: userDoc.createdAt || null,
    updatedAt: userDoc.updatedAt || null,
    lastLogin: userDoc.lastLogin || null,
  };
};

const getLocalUsersForAdmin = async () => {
  const users = await User.find({})
    .select('email firstName lastName phone selectedCourse role permissions permissionsVersion isActive createdAt updatedAt lastLogin');

  if (!users.length) return [];

  const userIds = users.map((entry) => entry._id);
  const chartersIds = userIds.map((id) => String(id));

  const [profiles, accessEntries] = await Promise.all([
    ProfileBranding.find({ userId: { $in: userIds } }).select('userId scores lastCalculated'),
    CandidateAccess.find({ chartersUserId: { $in: chartersIds } }),
  ]);

  const profileMap = new Map(profiles.map((profile) => [String(profile.userId), profile]));
  const accessMap = new Map(accessEntries.map((access) => [access.chartersUserId, access]));

  return users.map((userDoc) => {
    const chartersUserId = String(userDoc._id);
    const access = accessMap.get(chartersUserId) || null;
    const profile = profileMap.get(chartersUserId) || null;
    const baseCandidate = toLocalCandidateShape(userDoc);
    const status = mapLocalUserStatus(userDoc.isActive);
    const defaultPermissions = deepMerge(cloneDefaultPermissions(), userDoc.permissions || {});
    const mergedPermissions = deepMerge(defaultPermissions, access?.permissions || {});

    return {
      _id: chartersUserId,
      chartersUserId,
      pbUserId: chartersUserId,
      name: baseCandidate.name,
      firstName: baseCandidate.firstName,
      lastName: baseCandidate.lastName,
      email: baseCandidate.email,
      phone: baseCandidate.phoneNumber,
      role: baseCandidate.role,
      status,
      isActive: status === 'active',
      permissions: mergedPermissions,
      profileScores: mapProfileScores(profile),
      createdAt: baseCandidate.createdAt,
      updatedAt: baseCandidate.updatedAt,
      lastLogin: baseCandidate.lastLogin,
    };
  });
};

const getServiceActor = (req) => ({
  adminId: req.user?.chartersUserId || String(req.user?._id || ''),
  role: req.user?.role || 'admin',
  requestId: req.requestId || null,
});

const normalizeCandidateStatus = (candidate) => {
  if (!candidate) return null;
  if (candidate?.status) return candidate.status;
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
  const status = normalizeCandidateStatus(candidate);

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
    let payload;
    try {
      payload = await chartersAdminService.getCandidates(getServiceActor(req), req.query || {});
    } catch (error) {
      if (!shouldFallbackToLocal(error)) {
        throw error;
      }

      const users = await getLocalUsersForAdmin();
      return res.status(200).json({
        success: true,
        users,
        pagination: {
          total: users.length,
          page: 1,
          limit: users.length,
        },
        source: 'local-fallback',
      });
    }

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

    let candidate;
    let usedLocalFallback = false;

    try {
      candidate = await chartersAdminService.getCandidateById(getServiceActor(req), chartersUserId);
    } catch (error) {
      if (!shouldFallbackToLocal(error)) {
        throw error;
      }

      const localUser = await User.findById(chartersUserId)
        .select('email firstName lastName phone selectedCourse role permissions permissionsVersion isActive createdAt updatedAt lastLogin');

      if (!localUser) {
        return res.status(404).json({
          success: false,
          message: 'Candidate not found',
        });
      }

      candidate = toLocalCandidateShape(localUser);
      usedLocalFallback = true;
    }

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

    if (usedLocalFallback) {
      const localUser = await User.findById(chartersUserId).select('permissions permissionsVersion');
      if (localUser) {
        localUser.permissions = deepMerge(cloneDefaultPermissions(), mergedPermissions);
        localUser.permissionsVersion = Number(localUser.permissionsVersion || 0) + 1;
        await localUser.save();
      }
    }

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
        status: candidate?.status || null,
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

    let usedLocalFallback = false;

    try {
      await chartersAdminService.deactivateCandidate(
        getServiceActor(req),
        chartersUserId
      );
    } catch (error) {
      if (!shouldFallbackToLocal(error)) {
        throw error;
      }

      const localUser = await User.findById(chartersUserId).select('role isActive permissionsVersion');
      if (!localUser) {
        return res.status(404).json({
          success: false,
          message: 'Candidate not found',
        });
      }

      if (mapLocalUserRole(localUser.role) === 'admin') {
        return res.status(400).json({
          success: false,
          message: 'Admin accounts cannot be removed',
        });
      }

      localUser.isActive = false;
      localUser.permissionsVersion = Number(localUser.permissionsVersion || 0) + 1;
      await localUser.save();
      usedLocalFallback = true;
    }

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
      after: { status: 'disabled', source: usedLocalFallback ? 'local-fallback' : 'charters' },
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

    const access = await CandidateAccess.findOne({ chartersUserId }).lean();

    let candidate = null;
    try {
      candidate = await chartersAdminService.getCandidateById(getServiceActor(req), chartersUserId);
    } catch (error) {
      if (!shouldFallbackToLocal(error)) {
        throw error;
      }

      const localUser = await User.findById(chartersUserId).select('isActive');
      if (localUser) {
        candidate = {
          status: localUser.isActive === false ? 'disabled' : 'active',
        };
      }
    }

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

// ─── Jobs — local-first, upstream fallback ───────────────────────────────────

exports.getJobs = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 20, search, location, category, jobType,
    } = req.query || {};

    const query = {};
    if (location && location !== 'All') query.location = location;
    if (category) query.category = category;
    if (jobType) query.jobType = jobType;
    if (search) query.$text = { $search: search };

    const [jobs, total] = await Promise.all([
      JobPosting.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean(),
      JobPosting.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      jobPostings: jobs,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) {
    next(error);
  }
};

exports.getJobById = async (req, res, next) => {
  try {
    const jobPosting = await JobPosting.findById(req.params.id).lean();
    if (!jobPosting) {
      return res.status(404).json({ success: false, message: 'Job posting not found' });
    }
    return res.status(200).json({ success: true, jobPosting });
  } catch (error) {
    next(error);
  }
};

exports.createJob = async (req, res, next) => {
  try {
    const actorId = req.user?.chartersUserId || String(req.user?._id || '');
    const {
      title, company, location, jobType, category, salary, experience, description,
    } = req.body || {};

    if (!title || !location || !jobType || !category || !salary || !experience || !description) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
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
      createdBy: actorId,
    });

    await writeAuditLog({
      req,
      actionType: 'JOB_CREATE',
      action: 'job.created',
      after: { jobId: jobPosting._id },
    });

    return res.status(201).json({ success: true, jobPosting });
  } catch (error) {
    next(error);
  }
};

exports.updateJob = async (req, res, next) => {
  try {
    const allowedFields = [
      'title', 'company', 'location', 'jobType',
      'category', 'salary', 'experience', 'description', 'isActive',
    ];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const jobPosting = await JobPosting.findByIdAndUpdate(
      req.params.id, updates, { new: true, runValidators: true }
    ).lean();

    if (!jobPosting) {
      return res.status(404).json({ success: false, message: 'Job posting not found' });
    }

    await writeAuditLog({
      req,
      actionType: 'JOB_UPDATE',
      action: 'job.updated',
      after: { jobId: jobPosting._id },
    });

    return res.status(200).json({ success: true, jobPosting });
  } catch (error) {
    next(error);
  }
};

exports.deleteJob = async (req, res, next) => {
  try {
    const jobPosting = await JobPosting.findByIdAndUpdate(
      req.params.id, { isActive: false }, { new: true }
    );

    if (!jobPosting) {
      return res.status(404).json({ success: false, message: 'Job posting not found' });
    }

    await writeAuditLog({
      req,
      actionType: 'JOB_DELETE',
      action: 'job.deleted',
      after: { jobId: req.params.id },
    });

    return res.status(200).json({ success: true, message: 'Job removed successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getApplicationsForJob = async (req, res, next) => {
  try {
    // Applications are stored upstream; attempt that. No local model exists for them.
    const payload = await chartersAdminService.getApplicationsForJob(
      getServiceActor(req), req.params.id, req.query || {}
    );
    return res.status(200).json({
      success: true,
      applications: payload.applications || [],
      pagination: payload.pagination || null,
    });
  } catch (error) {
    // Graceful degradation — return empty rather than crashing the page.
    if (shouldFallbackToLocal(error)) {
      return res.status(200).json({ success: true, applications: [], pagination: null, source: 'local-fallback' });
    }
    next(error);
  }
};

// ─── Internships — local-first ────────────────────────────────────────────────

exports.getInternships = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 20, search, location, category, internshipType,
    } = req.query || {};

    const query = {};
    if (location && location !== 'All') query.location = location;
    if (category) query.category = category;
    if (internshipType) query.internshipType = internshipType;
    if (search) query.$text = { $search: search };

    const [internships, total] = await Promise.all([
      InternshipPosting.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean(),
      InternshipPosting.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      internshipPostings: internships,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) {
    next(error);
  }
};

exports.getInternshipById = async (req, res, next) => {
  try {
    const internshipPosting = await InternshipPosting.findById(req.params.id).lean();
    if (!internshipPosting) {
      return res.status(404).json({ success: false, message: 'Internship posting not found' });
    }
    return res.status(200).json({ success: true, internshipPosting });
  } catch (error) {
    next(error);
  }
};

exports.createInternship = async (req, res, next) => {
  try {
    const actorId = req.user?.chartersUserId || String(req.user?._id || '');
    const {
      title, company, location, internshipType, category, stipend, duration, description,
    } = req.body || {};

    if (!title || !location || !internshipType || !category || !stipend || !duration || !description) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const internshipPosting = await InternshipPosting.create({
      title: title.trim(),
      company: company?.trim() || 'Charters Business',
      location: location.trim(),
      internshipType,
      category: category.trim(),
      stipend: stipend.trim(),
      duration: duration.trim(),
      description,
      createdBy: actorId,
    });

    await writeAuditLog({
      req,
      actionType: 'INTERNSHIP_CREATE',
      action: 'internship.created',
      after: { internshipId: internshipPosting._id },
    });

    return res.status(201).json({ success: true, internshipPosting });
  } catch (error) {
    next(error);
  }
};

exports.updateInternship = async (req, res, next) => {
  try {
    const allowedFields = [
      'title', 'company', 'location', 'internshipType',
      'category', 'stipend', 'duration', 'description', 'isActive',
    ];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const internshipPosting = await InternshipPosting.findByIdAndUpdate(
      req.params.id, updates, { new: true, runValidators: true }
    ).lean();

    if (!internshipPosting) {
      return res.status(404).json({ success: false, message: 'Internship posting not found' });
    }

    await writeAuditLog({
      req,
      actionType: 'INTERNSHIP_UPDATE',
      action: 'internship.updated',
      after: { internshipId: internshipPosting._id },
    });

    return res.status(200).json({ success: true, internshipPosting });
  } catch (error) {
    next(error);
  }
};

exports.deleteInternship = async (req, res, next) => {
  try {
    const internshipPosting = await InternshipPosting.findByIdAndUpdate(
      req.params.id, { isActive: false }, { new: true }
    );

    if (!internshipPosting) {
      return res.status(404).json({ success: false, message: 'Internship posting not found' });
    }

    await writeAuditLog({
      req,
      actionType: 'INTERNSHIP_DELETE',
      action: 'internship.deleted',
      after: { internshipId: req.params.id },
    });

    return res.status(200).json({ success: true, message: 'Internship removed successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getApplicationsForInternship = async (req, res, next) => {
  try {
    const payload = await chartersAdminService.getApplicationsForInternship(
      getServiceActor(req), req.params.id, req.query || {}
    );
    return res.status(200).json({
      success: true,
      applications: payload.applications || [],
      pagination: payload.pagination || null,
    });
  } catch (error) {
    if (shouldFallbackToLocal(error)) {
      return res.status(200).json({ success: true, applications: [], pagination: null, source: 'local-fallback' });
    }
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

