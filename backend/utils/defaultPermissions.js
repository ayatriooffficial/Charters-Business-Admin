const defaultPermissions = Object.freeze({
  profileBranding: {
    headlineGenerator: false,
    aboutGenerator: false,
    keywordOptimizer: false,
  },
  aiInterview: {
    mockInterview: false,
    feedbackAnalysis: false,
  },
});

const cloneDefaultPermissions = () => JSON.parse(JSON.stringify(defaultPermissions));

module.exports = {
  defaultPermissions,
  cloneDefaultPermissions,
};
