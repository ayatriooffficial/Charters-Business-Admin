const mongoose = require('mongoose');

const ACTION_TYPES = [
  'PERMISSION_UPDATE',
  'USER_DISABLE',
  'JOB_CREATE',
  'JOB_UPDATE',
  'JOB_DELETE',
  'INTERNSHIP_CREATE',
  'INTERNSHIP_UPDATE',
  'INTERNSHIP_DELETE',
  'APPLICATION_STATUS_UPDATE',
  'OTHER',
];

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      chartersUserId: { type: String, default: null },
      email: { type: String, default: null },
      role: { type: String, default: null },
    },
    actionType: {
      type: String,
      enum: ACTION_TYPES,
      default: 'OTHER',
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    targetChartersUserId: {
      type: String,
      default: null,
      index: true,
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
