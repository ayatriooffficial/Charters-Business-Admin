const jwt = require('jsonwebtoken');
const chartersAdminService = require('../services/chartersAdminService');

const TOKEN_EXPIRY = process.env.ADMIN_TOKEN_EXPIRE || '15m';
const ALLOWED_ADMIN_ROLES = new Set(['admin', 'recruiter']);

const generateAdminToken = (payload) => jwt.sign(
  {
    tokenType: 'pb_admin',
    chartersUserId: payload.chartersUserId,
    email: payload.email || null,
    name: payload.name || null,
    role: payload.role,
  },
  process.env.JWT_SECRET,
  { expiresIn: TOKEN_EXPIRY }
);

const splitName = (fullName = '') => {
  const value = (fullName || '').trim();
  if (!value) {
    return { firstName: 'Admin', lastName: '' };
  }

  const [firstName, ...rest] = value.split(/\s+/);
  return {
    firstName,
    lastName: rest.join(' '),
  };
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const result = await chartersAdminService.loginAdmin(email, password, {
      requestId: req.requestId,
    });

    const user = result.user;
    const role = String(user.role || '').toLowerCase();

    if (!ALLOWED_ADMIN_ROLES.has(role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const token = generateAdminToken({
      chartersUserId: user.id,
      email: user.email,
      name: user.name,
      role,
    });

    const names = splitName(user.name);

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      token,
      user: {
        id: user.id,
        chartersUserId: user.id,
        email: user.email,
        firstName: names.firstName,
        lastName: names.lastName,
        role,
      },
    });
  } catch (error) {
    if ((error?.status || error?.response?.status) === 429) {
      const upstream = error?.upstream || {};
      console.warn(
        JSON.stringify({
          level: 'warn',
          type: 'admin_login_upstream_throttled',
          requestId: req.requestId || null,
          email: req.body?.email || null,
          code: error?.code || 'UPSTREAM_RATE_LIMITED',
          upstreamStatus: upstream.status || 429,
          upstreamMethod: upstream.method || null,
          upstreamUrl: upstream.url || null,
          upstreamRetryAfter: upstream.retryAfter || null,
          timestamp: new Date().toISOString(),
        })
      );

      return res.status(429).json({
        success: false,
        requestId: req.requestId || null,
        code: error?.code || 'UPSTREAM_RATE_LIMITED',
        message: 'Admin login validation is temporarily rate-limited by Charters upstream. Please retry in about 60 seconds.',
        ...(upstream.retryAfter ? { retryAfterSeconds: upstream.retryAfter } : {}),
      });
    }

    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    if (!req.user || !ALLOWED_ADMIN_ROLES.has(String(req.user.role || '').toLowerCase())) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const names = splitName(req.user.name);

    res.status(200).json({
      success: true,
      user: {
        id: req.user.chartersUserId || req.user._id,
        chartersUserId: req.user.chartersUserId || req.user._id,
        email: req.user.email || null,
        firstName: names.firstName,
        lastName: names.lastName,
        role: req.user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
