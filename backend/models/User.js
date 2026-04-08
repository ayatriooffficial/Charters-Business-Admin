const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AVAILABLE_COURSES = [
  'Certified Management Professional (CMP)',
  'Digital Growth Engineer',
  'Product Growth Engineering'
];

// 🔥 Default permissions (central place)
const defaultPermissions = {
  profileBranding: {
    headlineGenerator: false,
    aboutGenerator: false,
    keywordOptimizer: false
  },
  aiInterview: {
    mockInterview: false,
    feedbackAnalysis: false
  }
};

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email'
      ]
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false
    },

    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },

    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },

    phone: {
      type: String,
      trim: true
    },

    selectedCourse: {
      type: String,
      enum: AVAILABLE_COURSES,
      required: [true, 'Please choose one of the offered courses'],
      trim: true
    },

    role: {
      type: String,
      enum: ['candidate', 'admin'],
      default: 'candidate'
    },

    // 🔥 NEW: Permissions system
    permissions: {
      type: Object,
      default: defaultPermissions
    },

    // 🔥 NEW: Token invalidation version
    permissionsVersion: {
      type: Number,
      default: 0
    },

    // 🔥 NEW: Soft disable user
    isActive: {
      type: Boolean,
      default: true
    },

    profilePicture: {
      type: String,
      default: null
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    lastLogin: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// 🔐 Hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 🔐 Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 🔓 Public profile
userSchema.methods.toPublicProfile = function () {
  return {
    id: this._id,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    phone: this.phone,
    selectedCourse: this.selectedCourse,
    profilePicture: this.profilePicture,
    role: this.role,
    permissions: this.permissions,
    isActive: this.isActive,
    isVerified: this.isVerified,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);