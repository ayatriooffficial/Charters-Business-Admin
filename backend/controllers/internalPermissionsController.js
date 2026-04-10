const CandidateAccess = require('../models/CandidateAccess');
const { cloneDefaultPermissions } = require('../utils/defaultPermissions');

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

exports.getInternalPermissions = async (req, res, next) => {
  try {
    const { chartersUserId } = req.params;
    const access = await CandidateAccess.findOne({ chartersUserId }).lean();

    return res.status(200).json({
      success: true,
      chartersUserId,
      permissions: deepMerge(cloneDefaultPermissions(), access?.permissions || {}),
      mirrorStatus: access?.status || null,
      source: 'profile-branding-metadata',
      updatedAt: access?.updatedAt || null,
    });
  } catch (error) {
    return next(error);
  }
};
