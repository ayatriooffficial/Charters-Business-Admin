const mongoose = require('mongoose');
const User = require('../models/Admin');
const ProfileBranding = require('../models/ProfileBranding');
const CandidateLink = require('../models/CandidateLink');
const CandidateAccess = require('../models/CandidateAccess');
const AuditLog = require('../models/AuditLog');
const chartersAdminService = require('../services/chartersAdminService');
const {
  cloneDefaultPermissions,
  normalizePermissions,
} = require('../utils/defaultPermissions');

const getSafeNumber = (value) => (Number.isFinite(value) ? value : 0);
const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const NETWORK_FALLBACK_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'ECONNABORTED',
  'ECONNRESET',
]);
const ACCESS_USER_CATEGORIES = new Set(['user', 'candidate']);
const CHARTERS_DB_NAMES = ['charters-business', 'charters_business'];

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

const shouldFallbackToLocal = (error, options = {}) => {
  const allowRateLimitedFallback = Boolean(options.allowRateLimitedFallback);
  const forceUpstreamFallback = Boolean(options.forceUpstreamFallback);
  const status = error?.status || error?.response?.status || null;
  const code = String(error?.code || '').toUpperCase();
  const message = String(
    error?.message ||
    error?.response?.data?.message ||
    ''
  ).toLowerCase();
  const isUpstreamUnavailable = (
    error?.isNetworkError ||
    NETWORK_FALLBACK_CODES.has(code) ||
    status === 404 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes('route not found') ||
    message.includes('upstream') ||
    message.includes('service unavailable')
  );

  // Always allow read-fallback for upstream throttling to keep admin list usable.
  if (status === 429 && allowRateLimitedFallback) {
    return true;
  }

  // Writes can explicitly force fallback when upstream candidate lookup is unavailable.
  if (forceUpstreamFallback && isUpstreamUnavailable) {
    return true;
  }

  if (!isLocalFallbackEnabled()) return false;

  return isUpstreamUnavailable;
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

const mapLocalUserRole = (role) => {
  const normalized = String(role || '').toLowerCase();

  if (normalized === 'admin' || normalized === 'recruiter') {
    return 'admin';
  }

  if (normalized === 'candidate') {
    return 'candidate';
  }

  return 'user';
};

const mapLocalUserStatus = (isActive) => (isActive === false ? 'disabled' : 'active');

const splitName = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return { firstName: '', lastName: '' };
  }

  const [firstName, ...rest] = normalized.split(/\s+/);
  return {
    firstName: firstName || '',
    lastName: rest.join(' '),
  };
};

const getMongoClient = () => {
  const model = CandidateAccess;
  return model?.db?.client || null;
};

const findChartersUsersCollection = async () => {
  const client = getMongoClient();
  if (!client) return null;

  for (const dbName of CHARTERS_DB_NAMES) {
    try {
      const db = client.db(dbName);
      const collections = await db.listCollections({ name: 'users' }, { nameOnly: true }).toArray();
      if (collections.length > 0) {
        return db.collection('users');
      }
    } catch (error) {
      // try next db alias
    }
  }

  return null;
};

const toObjectIdOrNull = (value) => {
  const raw = String(value || '').trim();
  if (!raw || !mongoose.Types.ObjectId.isValid(raw)) {
    return null;
  }
  return new mongoose.Types.ObjectId(raw);
};

const mapChartersUserDoc = (doc, access = null, link = null, profile = null) => {
  const chartersUserId = String(doc?._id || '');
  if (!chartersUserId) return null;

  const names = splitName(doc?.name || '');
  const status = doc?.status || mapLocalUserStatus(doc?.isActive);

  return {
    _id: chartersUserId,
    chartersUserId,
    pbUserId: link?.pbUserId || null,
    name: doc?.name || null,
    firstName: names.firstName,
    lastName: names.lastName,
    email: doc?.email || link?.email || null,
    phone: doc?.phoneNumber || link?.phone || null,
    role: resolveDisplayRole(doc?.role || 'user', access),
    userCategory: normalizeUserCategory(access?.userCategory) || null,
    status,
    isActive: status === 'active',
    permissions: normalizePermissions(access?.permissions || {}),
    profileScores: mapProfileScores(profile),
    createdAt: doc?.createdAt || null,
    updatedAt: doc?.updatedAt || null,
    lastLogin: doc?.lastLogin || null,
  };
};

const getCrossDbUsersForAdmin = async () => {
  const usersCollection = await findChartersUsersCollection();
  if (!usersCollection) return [];

  const docs = await usersCollection.find(
    { role: { $in: ['user', 'candidate', 'admin', 'recruiter'] } },
    {
      projection: {
        _id: 1,
        name: 1,
        email: 1,
        phoneNumber: 1,
        role: 1,
        status: 1,
        isActive: 1,
        createdAt: 1,
        updatedAt: 1,
        lastLogin: 1,
      },
    }
  ).sort({ createdAt: -1 }).toArray();

  if (!docs.length) return [];

  const chartersIds = docs.map((doc) => String(doc._id));
  const [links, accessEntries] = await Promise.all([
    CandidateLink.find({ chartersUserId: { $in: chartersIds } }),
    CandidateAccess.find({ chartersUserId: { $in: chartersIds } }),
  ]);

  const linkMap = new Map(links.map((entry) => [entry.chartersUserId, entry]));
  const accessMap = new Map(accessEntries.map((entry) => [entry.chartersUserId, entry]));

  const pbUserIds = links.map((entry) => entry.pbUserId).filter(Boolean);
  const profiles = pbUserIds.length
    ? await ProfileBranding.find({ userId: { $in: pbUserIds } }).select('userId scores lastCalculated')
    : [];
  const profileMap = new Map(profiles.map((entry) => [String(entry.userId), entry]));

  return docs
    .map((doc) => {
      const chartersUserId = String(doc._id);
      const link = linkMap.get(chartersUserId) || null;
      const access = accessMap.get(chartersUserId) || null;
      const profile = link?.pbUserId ? profileMap.get(String(link.pbUserId)) : null;
      return mapChartersUserDoc(doc, access, link, profile);
    })
    .filter(Boolean);
};

const getCrossDbUserById = async (chartersUserId) => {
  const usersCollection = await findChartersUsersCollection();
  const objectId = toObjectIdOrNull(chartersUserId);
  if (!usersCollection || !objectId) return null;

  const doc = await usersCollection.findOne(
    {
      _id: objectId,
      role: { $in: ['user', 'candidate', 'admin', 'recruiter'] },
    },
    {
      projection: {
        _id: 1,
        name: 1,
        email: 1,
        phoneNumber: 1,
        role: 1,
        status: 1,
        isActive: 1,
        createdAt: 1,
        updatedAt: 1,
        lastLogin: 1,
      },
    }
  );

  if (!doc) return null;

  const [link, access] = await Promise.all([
    CandidateLink.findOne({ chartersUserId }),
    CandidateAccess.findOne({ chartersUserId }),
  ]);

  const profile = link?.pbUserId
    ? await ProfileBranding.findOne({ userId: link.pbUserId }).select('userId scores lastCalculated')
    : null;

  return mapChartersUserDoc(doc, access, link, profile);
};

const mergeFallbackUsers = (...entryGroups) => {
  const seen = new Set();
  const merged = [];

  for (const entries of entryGroups) {
    for (const entry of entries || []) {
      const key = String(entry?.chartersUserId || entry?._id || '').trim();
      if (!key || seen.has(key)) {
        continue;
      }

      seen.add(key);
      merged.push(entry);
    }
  }

  return merged.sort((left, right) => {
    const leftTime = new Date(left?.updatedAt || left?.createdAt || 0).getTime();
    const rightTime = new Date(right?.updatedAt || right?.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
};

const hasEnabledPermissions = (permissions = {}) => {
  const profile = permissions?.profileBranding || {};
  const interview = permissions?.aiInterview || {};
  return (
    Object.values(profile).some(Boolean) ||
    Object.values(interview).some(Boolean)
  );
};

const normalizeUserCategory = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return ACCESS_USER_CATEGORIES.has(normalized) ? normalized : null;
};

const resolveDisplayRole = (sourceRole, access = null) => {
  const normalizedSourceRole = String(sourceRole || '').trim().toLowerCase();

  if (normalizedSourceRole === 'admin' || normalizedSourceRole === 'recruiter') {
    return 'admin';
  }

  if (normalizedSourceRole === 'candidate') {
    return 'candidate';
  }

  const explicitCategory = normalizeUserCategory(access?.userCategory);
  if (explicitCategory) {
    return explicitCategory;
  }

  return hasEnabledPermissions(access?.permissions) ? 'candidate' : 'user';
};

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

const toMirroredCandidateShape = ({ chartersUserId, link, access, localUser }) => {
  const baseName = localUser
    ? `${localUser.firstName || ''} ${localUser.lastName || ''}`.trim()
    : (link?.email ? String(link.email).split('@')[0] : 'Candidate');
  const names = splitName(baseName);
  const status = access?.status || mapLocalUserStatus(localUser?.isActive);

  return {
    _id: String(chartersUserId),
    id: String(chartersUserId),
    chartersUserId: String(chartersUserId),
    name: baseName || null,
    firstName: names.firstName,
    lastName: names.lastName,
    email: localUser?.email || link?.email || null,
    phoneNumber: localUser?.phone || link?.phone || null,
    courseInterestedIn: localUser?.selectedCourse || null,
    role: resolveDisplayRole(localUser?.role || 'user', access),
    userCategory: normalizeUserCategory(access?.userCategory) || null,
    status,
    isActive: status === 'active',
    createdAt: localUser?.createdAt || link?.createdAt || null,
    updatedAt: localUser?.updatedAt || link?.updatedAt || null,
    lastLogin: localUser?.lastLogin || null,
  };
};

const getMirroredCandidateById = async (chartersUserId) => {
  const link = await CandidateLink.findOne({ chartersUserId }).lean();
  const access = await CandidateAccess.findOne({ chartersUserId }).lean();
  const localUser = await User.findById(chartersUserId)
    .select('email firstName lastName phone selectedCourse role isActive createdAt updatedAt lastLogin')
    .lean();

  if (!link && !localUser && !access) {
    return null;
  }

  return toMirroredCandidateShape({
    chartersUserId,
    link,
    access,
    localUser,
  });
};

const getMirroredUsersForAdmin = async () => {
  const links = await CandidateLink.find({}).sort({ updatedAt: -1, createdAt: -1 });
  if (!links.length) return [];

  const chartersIds = links.map((entry) => entry.chartersUserId).filter(Boolean);
  const pbUserIds = links
    .map((entry) => entry.pbUserId)
    .filter(Boolean);

  const [accessEntries, pbUsers, profiles] = await Promise.all([
    CandidateAccess.find({ chartersUserId: { $in: chartersIds } }),
    pbUserIds.length
      ? User.find({ _id: { $in: pbUserIds } })
        .select('firstName lastName role isActive createdAt updatedAt lastLogin')
      : [],
    pbUserIds.length
      ? ProfileBranding.find({ userId: { $in: pbUserIds } }).select('userId scores lastCalculated')
      : [],
  ]);

  const accessMap = new Map(accessEntries.map((entry) => [entry.chartersUserId, entry]));
  const userMap = new Map(pbUsers.map((entry) => [String(entry._id), entry]));
  const profileMap = new Map(profiles.map((entry) => [String(entry.userId), entry]));

  return links.map((link) => {
    const chartersUserId = String(link.chartersUserId);
    const access = accessMap.get(chartersUserId) || null;
    const localUser = link.pbUserId ? userMap.get(String(link.pbUserId)) : null;
    const profile = link.pbUserId ? profileMap.get(String(link.pbUserId)) : null;

    const fullName = localUser
      ? `${localUser.firstName || ''} ${localUser.lastName || ''}`.trim()
      : '';
    const derivedName = fullName || (link.email ? String(link.email).split('@')[0] : 'Candidate');
    const names = splitName(derivedName);
    const status = access?.status || mapLocalUserStatus(localUser?.isActive);

    return {
      _id: chartersUserId,
      chartersUserId,
      pbUserId: link.pbUserId || null,
      name: derivedName || null,
      firstName: names.firstName,
      lastName: names.lastName,
      email: link.email || null,
      phone: link.phone || null,
      role: resolveDisplayRole(localUser?.role || 'user', access),
      userCategory: normalizeUserCategory(access?.userCategory) || null,
      status,
      isActive: status === 'active',
      permissions: normalizePermissions(access?.permissions || {}),
      profileScores: mapProfileScores(profile),
      createdAt: localUser?.createdAt || link.createdAt || null,
      updatedAt: localUser?.updatedAt || link.updatedAt || null,
      lastLogin: localUser?.lastLogin || null,
    };
  });
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
    const mergedPermissions = normalizePermissions(
      deepMerge(userDoc.permissions || {}, access?.permissions || {})
    );

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
      userCategory: normalizeUserCategory(access?.userCategory) || null,
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
  const mergedPermissions = normalizePermissions(access?.permissions || {});
  const status = normalizeCandidateStatus(candidate);
  const role = resolveDisplayRole(candidate?.role, access);

  return {
    _id: String(candidate._id),
    chartersUserId: String(candidate._id),
    pbUserId: link?.pbUserId || null,
    name: candidate.name || null,
    firstName: candidate.firstName || '',
    lastName: candidate.lastName || '',
    email: candidate.email || link?.email || null,
    phone: candidate.phoneNumber || link?.phone || null,
    role,
    userCategory: normalizeUserCategory(access?.userCategory) || null,
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
      if (!shouldFallbackToLocal(error, {
        allowRateLimitedFallback: true,
        forceUpstreamFallback: true,
      })) {
        throw error;
      }

      const [crossDbUsers, localUsers, mirroredUsers] = await Promise.all([
        getCrossDbUsersForAdmin(),
        getLocalUsersForAdmin(),
        getMirroredUsersForAdmin(),
      ]);
      const fallbackUsers = mergeFallbackUsers(crossDbUsers, localUsers, mirroredUsers);
      const sourceParts = [];
      if (crossDbUsers.length) sourceParts.push('crossdb');
      if (localUsers.length) sourceParts.push('local');
      if (mirroredUsers.length) sourceParts.push('mirror');
      const source = sourceParts.length === 0
        ? 'fallback-empty'
        : (sourceParts.length === 1 ? `${sourceParts[0]}-fallback` : 'merged-fallback');

      return res.status(200).json({
        success: true,
        users: fallbackUsers,
        pagination: {
          total: fallbackUsers.length,
          page: 1,
          limit: fallbackUsers.length,
        },
        source,
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

    const upstreamUsers = candidates.map((candidate) => {
      const chartersUserId = String(candidate._id);
      const link = linkMap.get(chartersUserId) || null;
      const access = accessMap.get(chartersUserId) || null;
      const profile = link?.pbUserId ? profileMap.get(String(link.pbUserId)) : null;
      return shapeAdminUser({ candidate, link, access, profile });
    });

    const [crossDbUsers, localUsers] = await Promise.all([
      getCrossDbUsersForAdmin(),
      getLocalUsersForAdmin(),
    ]);
    const users = mergeFallbackUsers(upstreamUsers, crossDbUsers, localUsers);
    const source = (crossDbUsers.length || localUsers.length) ? 'charters-enriched' : 'charters';

    res.status(200).json({
      success: true,
      users,
      pagination: {
        ...(payload.pagination || {}),
        total: users.length,
      },
      source,
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
      if (!shouldFallbackToLocal(error, {
        allowRateLimitedFallback: true,
        forceUpstreamFallback: true,
      })) {
        throw error;
      }

      const localUser = await User.findById(chartersUserId)
        .select('email firstName lastName phone selectedCourse role permissions permissionsVersion isActive createdAt updatedAt lastLogin');

      if (!localUser) {
        const crossDbCandidate = await getCrossDbUserById(chartersUserId);
        if (crossDbCandidate) {
          candidate = crossDbCandidate;
          usedLocalFallback = true;
        } else {
          const mirroredCandidate = await getMirroredCandidateById(chartersUserId);
          if (!mirroredCandidate) {
            return res.status(404).json({
              success: false,
              message: 'Candidate not found',
            });
          }

          candidate = mirroredCandidate;
          usedLocalFallback = true;
        }
      } else {
        candidate = toLocalCandidateShape(localUser);
        usedLocalFallback = true;
      }
    }

    const existing = await CandidateAccess.findOne({ chartersUserId });
    const beforePermissions = normalizePermissions(existing?.permissions || {});
    const mergedPermissions = normalizePermissions(
      deepMerge(beforePermissions, requestedPermissions)
    );

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
        localUser.permissions = mergedPermissions;
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
        role: resolveDisplayRole(candidate?.role, updated),
        userCategory: normalizeUserCategory(updated?.userCategory) || null,
        permissions: updated.permissions,
        status: candidate?.status || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.elevateUserToCandidate = async (req, res, next) => {
  try {
    const { id: chartersUserId } = req.params;

    let candidate = null;
    let usedLocalFallback = false;

    try {
      candidate = await chartersAdminService.getCandidateById(getServiceActor(req), chartersUserId);
    } catch (error) {
      if (!shouldFallbackToLocal(error, {
        allowRateLimitedFallback: true,
        forceUpstreamFallback: true,
      })) {
        throw error;
      }

      const localUser = await User.findById(chartersUserId)
        .select('email firstName lastName phone selectedCourse role permissions permissionsVersion isActive createdAt updatedAt lastLogin');

      if (!localUser) {
        const crossDbCandidate = await getCrossDbUserById(chartersUserId);
        if (crossDbCandidate) {
          candidate = crossDbCandidate;
          usedLocalFallback = true;
        } else {
          const mirroredCandidate = await getMirroredCandidateById(chartersUserId);
          if (!mirroredCandidate) {
            return res.status(404).json({
              success: false,
              message: 'User not found',
            });
          }

          candidate = mirroredCandidate;
          usedLocalFallback = true;
        }
      } else {
        candidate = toLocalCandidateShape(localUser);
        usedLocalFallback = true;
      }
    }

    const existing = await CandidateAccess.findOne({ chartersUserId });
    const existingPermissions = normalizePermissions(existing?.permissions || {});

    const updated = await CandidateAccess.findOneAndUpdate(
      { chartersUserId },
      {
        $set: {
          userCategory: 'candidate',
          permissions: existingPermissions,
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
      const localUser = await User.findById(chartersUserId).select('role permissionsVersion');
      if (localUser && String(localUser.role || '').toLowerCase() !== 'admin') {
        localUser.role = 'candidate';
        localUser.permissionsVersion = Number(localUser.permissionsVersion || 0) + 1;
        await localUser.save();
      }
    }

    await writeAuditLog({
      req,
      actionType: 'ROLE_UPDATE',
      action: 'user.elevated_to_candidate',
      targetChartersUserId: chartersUserId,
      before: {
        role: resolveDisplayRole(candidate?.role, existing),
        userCategory: normalizeUserCategory(existing?.userCategory) || null,
      },
      after: {
        role: 'candidate',
        userCategory: 'candidate',
      },
    });

    return res.status(200).json({
      success: true,
      message: 'User elevated to candidate successfully',
      user: {
        _id: chartersUserId,
        chartersUserId,
        role: 'candidate',
        userCategory: 'candidate',
        permissions: updated.permissions,
        status: candidate?.status || updated?.status || 'active',
      },
    });
  } catch (error) {
    return next(error);
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
      if (!shouldFallbackToLocal(error, { forceUpstreamFallback: true })) {
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
      if (!shouldFallbackToLocal(error, {
        allowRateLimitedFallback: true,
        forceUpstreamFallback: true,
      })) {
        throw error;
      }

      const localUser = await User.findById(chartersUserId).select('isActive');
      if (localUser) {
        candidate = {
          status: localUser.isActive === false ? 'disabled' : 'active',
        };
      } else {
        const crossDbCandidate = await getCrossDbUserById(chartersUserId);
        if (crossDbCandidate) {
          candidate = crossDbCandidate;
        }
      }
    }

    res.status(200).json({
      success: true,
      chartersUserId,
      role: resolveDisplayRole(candidate?.role || 'user', access),
      userCategory: normalizeUserCategory(access?.userCategory) || null,
      status: candidate?.status || null,
      permissions: normalizePermissions(access?.permissions || {}),
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
      source: 'charters',
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyJobs = async (req, res, next) => {
  try {
    const payload = await chartersAdminService.getMyJobs(getServiceActor(req), req.query || {});

    res.status(200).json({
      success: true,
      jobPostings: payload.jobs || [],
      pagination: payload.pagination || null,
      source: 'charters',
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

exports.getMyInternships = async (req, res, next) => {
  try {
    const payload = await chartersAdminService.getMyInternships(getServiceActor(req), req.query || {});

    res.status(200).json({
      success: true,
      internshipPostings: payload.internships || [],
      pagination: payload.pagination || null,
      source: 'charters',
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
