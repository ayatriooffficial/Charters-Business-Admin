const jwt = require('jsonwebtoken');

const SERVICE_HEADER = 'x-service-key';
const ACTING_ADMIN_TOKEN_HEADER = 'x-acting-admin-token';
const ALLOWED_ACTING_ROLES = new Set(['admin', 'recruiter']);

const parseCsvValues = (value) => String(value || '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

const getValidServiceKeys = () => {
  const keys = [
    ...parseCsvValues(process.env.INTERNAL_SERVICE_KEYS),
    ...parseCsvValues(process.env.CHARTERS_SERVICE_KEYS),
    process.env.CHARTERS_SERVICE_KEY,
    process.env.INTERNAL_SERVICE_KEY,
    process.env.SERVICE_KEY,
  ]
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);

  return new Set(keys);
};

const getSharedSecret = () => (
  process.env.INTERNAL_SHARED_SECRET ||
  process.env.JWT_SECRET ||
  ''
);

exports.requireInternalService = (req, res, next) => {
  const validKeys = getValidServiceKeys();

  if (validKeys.size === 0) {
    return res.status(500).json({
      success: false,
      message: 'Internal service key is not configured',
    });
  }

  const suppliedKey = req.headers[SERVICE_HEADER];
  if (typeof suppliedKey !== 'string' || !validKeys.has(suppliedKey)) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden',
    });
  }

  return next();
};

exports.verifyOptionalActingToken = (req, res, next) => {
  const token = req.headers[ACTING_ADMIN_TOKEN_HEADER];
  if (!token) {
    return next();
  }

  const sharedSecret = getSharedSecret();
  if (!sharedSecret) {
    return res.status(500).json({
      success: false,
      message: 'Internal shared secret is not configured',
    });
  }

  try {
    const claims = jwt.verify(token, sharedSecret, {
      issuer: process.env.INTERNAL_ACTING_TOKEN_ISSUER || 'profile-branding',
    });

    if (!ALLOWED_ACTING_ROLES.has(String(claims?.role || '').toLowerCase())) {
      return res.status(403).json({
        success: false,
        message: 'Invalid acting role',
      });
    }

    req.internalActor = claims;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid acting token',
    });
  }
};
