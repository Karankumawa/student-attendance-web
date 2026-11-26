const express = require('express');
const StudentQuery = require('../models/StudentQuery');
const Student = require('../models/Student');
const User = require('../models/User');
const { protect, requireAdmin, requireStudent } = require('../middleware/authMiddleware');
const { escapeRegex } = require('../utils/regexHelper');
const { isValidObjectId } = require('../utils/validationHelper');

const router = express.Router();

// Helper to get authenticated student profile
const getStudentProfile = async (userId, studentId) => {
  if (studentId) {
    const student = await Student.findById(studentId);
    if (student) return student;
  }
  const byUser = await Student.findOne({ userId });
  if (byUser) return byUser;

  const user = await User.findById(userId);
  if (user) {
    if (user.studentId) {
      const byUserStudentId = await Student.findById(user.studentId);
      if (byUserStudentId) return byUserStudentId;
    }
    if (user.email) {
      return Student.findOne({ email: user.email });
    }
  }
  return null;
};

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/student-queries
 * @desc    Submit a new profile change query / message to admin
 * @access  Private (Student only)
 */
router.post('/', requireStudent, async (req, res) => {
  try {
    const student = await getStudentProfile(req.user._id, req.user.studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not linked to this account',
      });
    }

    const { fieldToChange, requestedChange, reason, message } = req.body;

    if (!fieldToChange || !fieldToChange.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please specify which field or detail you want to change',
      });
    }

    if (!requestedChange || !requestedChange.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please specify what you want to change (new value / requested change)',
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason why you need this change',
      });
    }

    const newQuery = new StudentQuery({
      studentId: student._id,
      userId: req.user._id,
      studentName: student.name,
      rollNumber: student.rollNumber,
      department: student.department || '',
      semester: student.semester || '',
      email: student.email || req.user.email || '',
      phone: student.phone || '',
      fieldToChange: fieldToChange.trim(),
      requestedChange: requestedChange.trim(),
      reason: reason.trim(),
      message: message ? message.trim() : '',
      status: 'Pending',
    });

    await newQuery.save();

    return res.status(201).json({
      success: true,
      message: 'Your query has been sent to the college administration successfully!',
      data: newQuery,
    });
  } catch (error) {
    console.error('[Student Query POST Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit profile query',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/student-queries/my-queries
 * @desc    Get all queries submitted by the logged-in student (Student can only view)
 * @access  Private (Student only)
 */
router.get('/my-queries', requireStudent, async (req, res) => {
  try {
    const student = await getStudentProfile(req.user._id, req.user.studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    const queries = await StudentQuery.find({
      $or: [
        { studentId: student._id },
        { rollNumber: student.rollNumber },
        { userId: req.user._id },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: queries.length,
      data: queries,
    });
  } catch (error) {
    console.error('[Student Query GET My Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch your profile queries',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/student-queries/stats
 * @desc    Lightweight counts for sidebar badges without transferring full query records
 * @access  Private (Admin only)
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [total, pending, reviewed, resolved] = await Promise.all([
      StudentQuery.countDocuments(),
      StudentQuery.countDocuments({ status: 'Pending' }),
      StudentQuery.countDocuments({ status: 'Reviewed' }),
      StudentQuery.countDocuments({ status: 'Resolved' }),
    ]);

    return res.status(200).json({
      success: true,
      stats: { total, pending, reviewed, resolved },
    });
  } catch (error) {
    console.error('[Admin Query Stats Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch query statistics',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/student-queries
 * @desc    Get all student queries & messages for Admin review
 * @access  Private (Admin only)
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { status, search, department, semester } = req.query;
    const filter = {};

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (department && department !== 'All') {
      filter.department = department;
    }

    if (semester && semester !== 'All') {
      filter.semester = semester;
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [
        { studentName: searchRegex },
        { rollNumber: searchRegex },
        { department: searchRegex },
        { email: searchRegex },
        { fieldToChange: searchRegex },
        { requestedChange: searchRegex },
        { reason: searchRegex },
        { message: searchRegex },
      ];
    }

    const [queries, totalCount, pendingCount, reviewedCount, resolvedCount] = await Promise.all([
      StudentQuery.find(filter)
        .populate('studentId', 'name firstName lastName rollNumber department semester email phone dob gender address guardianName guardianPhone bloodGroup registrationId')
        .sort({ createdAt: -1 })
        .lean(),
      StudentQuery.countDocuments(),
      StudentQuery.countDocuments({ status: 'Pending' }),
      StudentQuery.countDocuments({ status: 'Reviewed' }),
      StudentQuery.countDocuments({ status: 'Resolved' }),
    ]);

    return res.status(200).json({
      success: true,
      count: queries.length,
      stats: {
        total: totalCount,
        pending: pendingCount,
        reviewed: reviewedCount,
        resolved: resolvedCount,
      },
      data: queries,
    });
  } catch (error) {
    console.error('[Admin Query GET Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch student queries',
      error: error.message,
    });
  }
});

/**
 * @route   PATCH /api/student-queries/:id/status
 * @desc    Update query status (Pending / Reviewed / Resolved) and optional admin response
 * @access  Private (Admin only)
 */
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query ID',
      });
    }

    const { status, adminResponse } = req.body;
    const query = await StudentQuery.findById(req.params.id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found',
      });
    }

    if (status) {
      if (!['Pending', 'Reviewed', 'Resolved'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be Pending, Reviewed, or Resolved',
        });
      }
      query.status = status;
    }

    if (adminResponse !== undefined) {
      query.adminResponse = adminResponse.trim();
    }

    await query.save();

    return res.status(200).json({
      success: true,
      message: `Query marked as ${query.status} successfully`,
      data: query,
    });
  } catch (error) {
    console.error('[Admin Query Status Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update query status',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/student-queries/:id
 * @desc    Delete a student query / message
 * @access  Private (Admin only)
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query ID',
      });
    }

    const query = await StudentQuery.findById(req.params.id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found',
      });
    }

    await StudentQuery.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Student query / message deleted successfully from database',
    });
  } catch (error) {
    console.error('[Admin Query DELETE Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete student query',
      error: error.message,
    });
  }
});

module.exports = router;
