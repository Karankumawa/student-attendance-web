const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
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
 * @desc    Authenticate admin/teacher and get token
 * @access  Public (Strict Single User)
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

    // Strict Single Admin Access check
    if (normalizedEmail !== adminEmail) {
      return res.status(401).json({
        success: false,
        message: 'Access denied: Only authorized administrator/teacher can log in',
      });
    }

    // Find admin user in database
    let user = await User.findOne({ email: normalizedEmail });

    // Fallback if not found (seed on the fly)
    if (!user) {
      user = new User({
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD || 'admin@gmail.com',
        name: 'Dr. Evelyn Reed (Dept. Head)',
        role: 'admin',
      });
      await user.save();
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your password.',
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
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
 * @desc    Get currently logged in admin user info
 * @access  Private (Admin only)
 */
router.get('/me', protect, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
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
 * @route   POST /api/auth/register
 * @desc    Explicitly disabled registration endpoint
 * @access  Blocked
 */
router.post('/register', (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Public registration is disabled. Strict single-user teacher portal.',
  });
});

module.exports = router;
