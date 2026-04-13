const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('../config/database');
const User = require('../models/Admin');

const createAdmin = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@chartersbusiness.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

    // 🔍 Check if admin exists
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log('ℹ️ Admin already exists');

      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        existingAdmin.isActive = true;

        // 🔥 Ensure permissions exist
        if (!existingAdmin.permissions) {
          existingAdmin.permissions = {};
        }

        await existingAdmin.save();

        console.log('✅ Updated user to admin');
      } else {
        console.log('✅ Already an admin');
      }

    } else {
      // 🆕 Create new admin
      const admin = await User.create({
        email: adminEmail,
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        selectedCourse: 'Digital Growth Engineer', // required field

        role: 'admin',
        isActive: true,

        // 🔥 Give full access
        permissions: {
          profileBranding: {
            headlineGenerator: true,
            aboutGenerator: true,
            keywordOptimizer: true
          },
          aiInterview: {
            mockInterview: true,
            feedbackAnalysis: true
          }
        }
      });

      console.log('\n✅ Admin created successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 Email:', admin.email);
      console.log('🔑 Password:', adminPassword);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createAdmin();
