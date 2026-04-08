const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ALLOWED_ADMIN_ROLES = new Set(['admin', 'recruiter']);

// Protect routes
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please log in.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Admin tokens minted by /api/admin/auth/login carry Charters identity only.
    if (decoded.tokenType === 'pb_admin') {
      const role = String(decoded.role || '').toLowerCase();

      if (!ALLOWED_ADMIN_ROLES.has(role) || !decoded.chartersUserId) {
        return res.status(401).json({
          success: false,
          message: 'Invalid admin session.',
        });
      }

      req.user = {
        _id: decoded.chartersUserId,
        chartersUserId: decoded.chartersUserId,
        email: decoded.email || null,
        name: decoded.name || 'Admin',
        role,
        tokenType: 'pb_admin',
      };

      return next();
    }

    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not valid',
      });
    }

    // Token invalidation check for local PB candidate users.
    if (decoded.permissionsVersion !== user.permissionsVersion) {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.',
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

// Admin only
exports.requireAdmin = (req, res, next) => {
  if (!ALLOWED_ADMIN_ROLES.has(String(req.user?.role || '').toLowerCase())) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }
  next();
};

// Feature-level access
exports.checkFeatureAccess = (tool, feature) => {
  return (req, res, next) => {
    if (ALLOWED_ADMIN_ROLES.has(String(req.user?.role || '').toLowerCase())) {
      return next();
    }

    const hasAccess =
      req.user.permissions &&
      req.user.permissions[tool] &&
      req.user.permissions[tool][feature];

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: `Access denied: ${tool}.${feature}`,
      });
    }

    next();
  };
};
