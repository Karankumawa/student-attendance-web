const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretkey', {
    expiresIn: '7d',
  });
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate admin or student and return JWT with role
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
    const envPassword = process.env.ADMIN_PASSWORD || 'admin@gmail.com';

    // 1. Check if login attempt is for Admin / Teacher
    if (normalizedEmail === adminEmail) {
      let admin = await User.findOne({ email: adminEmail });

      if (!admin) {
        admin = new User({
          email: adminEmail,
          password: envPassword,
          name: 'Faculty Administrator',
          role: 'admin',
        });
        await admin.save();
      }

      let isMatch = await admin.comparePassword(password);
      if (!isMatch && password === envPassword) {
        admin.password = envPassword;
        await admin.save();
        isMatch = true;
      }

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid administrator credentials.',
        });
      }

      const token = generateToken(admin._id);
      return res.status(200).json({
        success: true,
        message: 'Admin login successful',
        token,
        user: {
          id: admin._id,
          email: admin.email,
          name: admin.name,
          role: 'admin',
        },
      });
    }

    // 2. Check if login attempt is for a Student
    const studentUser = await User.findOne({ email: normalizedEmail, role: 'student' });
    if (!studentUser) {
      return res.status(401).json({
        success: false,
        message: 'Account not found with this email. Please check your credentials.',
      });
    }

    const isStudentMatch = await studentUser.comparePassword(password);
    if (!isStudentMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Please verify your credentials.',
      });
    }

    // Fetch linked student profile
    const studentProfile = await Student.findById(studentUser.studentId);

    const token = generateToken(studentUser._id);
    return res.status(200).json({
      success: true,
      message: 'Student login successful',
      token,
      user: {
        id: studentUser._id,
        email: studentUser.email,
        name: studentProfile ? studentProfile.name : studentUser.name,
        role: 'student',
        studentId: studentUser.studentId,
        rollNumber: studentProfile ? studentProfile.rollNumber : '',
        semester: studentProfile ? studentProfile.semester : '',
        department: studentProfile ? studentProfile.department : '',
        registrationId: studentProfile ? studentProfile.registrationId : '',
      },
    });
  } catch (error) {
    console.error('[Auth Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged-in user profile (Admin or Student)
 * @access  Private
 */
router.get('/me', protect, async (req, res) => {
  try {
    const user = req.user;
    let extra = {};

    if (user.role === 'student' && user.studentId) {
      const student = await Student.findById(user.studentId);
      if (student) {
        extra = {
          studentId: student._id,
          rollNumber: student.rollNumber,
          semester: student.semester,
          department: student.department,
          registrationId: student.registrationId,
        };
      }
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        ...extra,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve current user',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change password for the logged-in user (strictly allowed for students)
 * @access  Private
 */
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    // Retrieve user with password field
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully!',
    });
  } catch (error) {
    console.error('[Change Password Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update password',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/auth/register
 * @desc    Explicitly disabled public registration endpoint
 * @access  Blocked
 */
router.post('/register', (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Public self-registration is disabled. Contact administrator for enrollment.',
  });
});

module.exports = router;
