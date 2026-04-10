const jwt = require('jsonwebtoken');

const SERVICE_HEADER = 'x-service-key';
const SERVICE_KEY_ID_HEADER = 'x-service-key-id';
const ACTING_ADMIN_TOKEN_HEADER = 'x-acting-admin-token';
const ALLOWED_ACTING_ROLES = new Set(['admin', 'recruiter']);

const parseCsvValues = (value) => String(value || '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

const parseServiceKeyRingFromJson = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return new Map();

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return new Map();
    }

    const ring = new Map();
    for (const [keyId, keyValue] of Object.entries(parsed)) {
      const normalizedKeyId = String(keyId || '').trim();
      const normalizedKeyValue = String(keyValue || '').trim();
      if (normalizedKeyId && normalizedKeyValue) {
        ring.set(normalizedKeyId, normalizedKeyValue);
      }
    }

    return ring;
  } catch (error) {
    return new Map();
  }
};

const parseServiceKeyRingFromCsv = (value) => {
  const ring = new Map();
  for (const entry of parseCsvValues(value)) {
    const delimiterIndex = entry.indexOf(':');
    if (delimiterIndex <= 0) continue;

    const keyId = entry.slice(0, delimiterIndex).trim();
    const keyValue = entry.slice(delimiterIndex + 1).trim();
    if (keyId && keyValue) {
      ring.set(keyId, keyValue);
    }
  }

  return ring;
};

const getServiceKeyRing = () => {
  const ring = new Map();
  const sources = [
    process.env.INTERNAL_SERVICE_KEY_RING_JSON,
    process.env.CHARTERS_SERVICE_KEY_RING_JSON,
  ];

  for (const source of sources) {
    for (const [keyId, keyValue] of parseServiceKeyRingFromJson(source).entries()) {
      ring.set(keyId, keyValue);
    }
  }

  for (const [keyId, keyValue] of parseServiceKeyRingFromCsv(process.env.INTERNAL_SERVICE_KEYS).entries()) {
    ring.set(keyId, keyValue);
  }

  for (const [keyId, keyValue] of parseServiceKeyRingFromCsv(process.env.CHARTERS_SERVICE_KEYS).entries()) {
    ring.set(keyId, keyValue);
  }

  return ring;
};

const getLegacyServiceKeys = () => {
  const keys = [
    ...parseCsvValues(process.env.INTERNAL_SERVICE_KEYS).filter((entry) => !entry.includes(':')),
    ...parseCsvValues(process.env.CHARTERS_SERVICE_KEYS).filter((entry) => !entry.includes(':')),
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
  const keyRing = getServiceKeyRing();
  const suppliedKey = req.headers[SERVICE_HEADER];
  const suppliedKeyId = req.headers[SERVICE_KEY_ID_HEADER];

  if (keyRing.size > 0) {
    if (typeof suppliedKeyId !== 'string' || typeof suppliedKey !== 'string') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
      });
    }

    const expected = keyRing.get(String(suppliedKeyId || '').trim());
    if (!expected || suppliedKey !== expected) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
      });
    }
  } else {
    const validKeys = getLegacyServiceKeys();
    if (validKeys.size === 0) {
      return res.status(500).json({
        success: false,
        message: 'Internal service key is not configured',
      });
    }

    if (typeof suppliedKey !== 'string' || !validKeys.has(suppliedKey)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
      });
    }
  }

  req.internalService = {
    keyId: typeof suppliedKeyId === 'string' ? suppliedKeyId.trim() || null : null,
  };

  return next();
};

const verifyActingToken = (required) => (req, res, next) => {
  const token = req.headers[ACTING_ADMIN_TOKEN_HEADER];
  if (!token) {
    if (required) {
      return res.status(401).json({
        success: false,
        message: 'Missing acting admin token',
      });
    }

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

exports.verifyOptionalActingToken = verifyActingToken(false);
exports.verifyRequiredActingToken = verifyActingToken(true);
