const mongoose = require('mongoose');

const candidateLinkSchema = new mongoose.Schema(
  {
    chartersUserId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    pbUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    linkedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CandidateLink', candidateLinkSchema);
