const mongoose = require('mongoose');
const { cloneDefaultPermissions } = require('../utils/defaultPermissions');

const candidateAccessSchema = new mongoose.Schema(
  {
    chartersUserId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    permissions: {
      type: Object,
      default: cloneDefaultPermissions,
    },
    status: {
      type: String,
      enum: ['active', 'disabled', 'blocked'],
      default: 'active',
      index: true,
    },
    updatedBy: {
      type: String,
      default: null,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

candidateAccessSchema.pre('save', function saveHook(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('CandidateAccess', candidateAccessSchema);
