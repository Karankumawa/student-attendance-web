const express = require('express');
const Student = require('../models/Student');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Timetable = require('../models/Timetable');
const Note = require('../models/Note');
const { protect, requireStudent } = require('../middleware/authMiddleware');

const router = express.Router();

// Strict protection: Only authenticated students can access these routes
router.use(protect);
router.use(requireStudent);

// Helper to get authenticated student profile
const getStudentProfile = async (userId, studentId) => {
  if (studentId) {
    const student = await Student.findById(studentId);
    if (student) return student;
  }
  // Fallback search by userId
  return Student.findOne({ userId });
};

/**
 * @route   GET /api/student-portal/dashboard
 * @desc    Get student's personal dashboard overview, live attendance score, and today's classes
 * @access  Private (Student only)
 */
router.get('/dashboard', async (req, res) => {
  try {
    const student = await getStudentProfile(req.user._id, req.user.studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not linked to this account',
      });
    }

    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[today.getDay()];

    // 1. Fetch all attendance sessions for student's semester
    const sessions = await Attendance.find({ semester: student.semester });

    let totalClasses = 0;
    let attendedClasses = 0;

    sessions.forEach((session) => {
      const myRecord = session.records.find(
        (rec) => rec.studentId && rec.studentId.toString() === student._id.toString()
      );

      if (myRecord) {
        totalClasses += 1;
        if (myRecord.status === 'Present') {
          attendedClasses += 1;
        }
      }
    });

    const percentage =
      totalClasses > 0 ? Number(((attendedClasses / totalClasses) * 100).toFixed(1)) : 100.0;

    let academicStanding = 'Good';
    if (percentage < 60) academicStanding = 'Defaulter';
    else if (percentage < 75) academicStanding = 'Warning';

    // 2. Fetch today's classes strictly for student's semester
    const todaysClasses = await Timetable.find({
      semester: student.semester,
      dayOfWeek: currentDay,
    }).sort({ startTime: 1 });

    // 3. Fetch recent notes for student's semester
    const recentNotes = await Note.find({
      semester: { $in: [student.semester, 'All'] },
    })
      .sort({ createdAt: -1 })
      .limit(3);

    return res.status(200).json({
      success: true,
      data: {
        student: {
          _id: student._id,
          name: student.name,
          rollNumber: student.rollNumber,
          department: student.department,
          semester: student.semester,
          email: student.email || req.user.email,
          registrationId: student.registrationId || `STU-${student.rollNumber}`,
        },
        currentDay,
        attendanceStats: {
          totalClasses,
          attendedClasses,
          absentClasses: totalClasses - attendedClasses,
          percentage,
          academicStanding,
        },
        todaysClasses,
        recentNotes,
      },
    });
  } catch (error) {
    console.error('[Student Dashboard Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load student dashboard',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/student-portal/attendance
 * @desc    Get detailed subject-wise and date-wise attendance records strictly for this student
 * @access  Private (Student only)
 */
router.get('/attendance', async (req, res) => {
  try {
    const student = await getStudentProfile(req.user._id, req.user.studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    const sessions = await Attendance.find({ semester: student.semester }).sort({
      date: -1,
      createdAt: -1,
    });

    let totalClasses = 0;
    let attendedClasses = 0;
    const subjectMap = {};
    const personalHistory = [];

    sessions.forEach((session) => {
      const myRecord = session.records.find(
        (rec) => rec.studentId && rec.studentId.toString() === student._id.toString()
      );

      if (myRecord) {
        totalClasses += 1;
        const isPresent = myRecord.status === 'Present';
        if (isPresent) attendedClasses += 1;

        // Subject breakdown
        if (!subjectMap[session.subject]) {
          subjectMap[session.subject] = { total: 0, attended: 0 };
        }
        subjectMap[session.subject].total += 1;
        if (isPresent) {
          subjectMap[session.subject].attended += 1;
        }

        // Add to personal history (STRICTLY only this student's data)
        personalHistory.push({
          sessionId: session._id,
          date: session.date,
          subject: session.subject,
          semester: session.semester,
          status: myRecord.status,
        });
      }
    });

    const overallPercentage =
      totalClasses > 0 ? Number(((attendedClasses / totalClasses) * 100).toFixed(1)) : 100.0;

    const subjectWise = Object.keys(subjectMap).map((subj) => {
      const stat = subjectMap[subj];
      const pct =
        stat.total > 0 ? Number(((stat.attended / stat.total) * 100).toFixed(1)) : 0;
      return {
        subject: subj,
        totalClasses: stat.total,
        attendedClasses: stat.attended,
        absentClasses: stat.total - stat.attended,
        percentage: pct,
        status: pct >= 75 ? 'Good' : pct >= 60 ? 'Warning' : 'Defaulter',
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        overall: {
          totalClasses,
          attendedClasses,
          absentClasses: totalClasses - attendedClasses,
          percentage: overallPercentage,
          status:
            overallPercentage >= 75
              ? 'Eligible (Good)'
              : overallPercentage >= 60
              ? 'Warning Zone'
              : 'Defaulter (Short Attendance)',
        },
        subjectWise,
        history: personalHistory,
      },
    });
  } catch (error) {
    console.error('[Student Attendance Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch personal attendance data',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/student-portal/timetable
 * @desc    Get timetable schedule strictly assigned to student's semester
 * @access  Private (Student only)
 */
router.get('/timetable', async (req, res) => {
  try {
    const student = await getStudentProfile(req.user._id, req.user.studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    const { dayOfWeek } = req.query;
    const filter = { semester: student.semester };

    if (dayOfWeek && dayOfWeek !== 'All') {
      filter.dayOfWeek = dayOfWeek;
    }

    const schedule = await Timetable.find(filter).sort({ startTime: 1 });

    return res.status(200).json({
      success: true,
      count: schedule.length,
      studentSemester: student.semester,
      data: schedule,
    });
  } catch (error) {
    console.error('[Student Timetable Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch class schedule',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/student-portal/notes
 * @desc    Get lecture notes and study material assigned to student's semester
 * @access  Private (Student only)
 */
router.get('/notes', async (req, res) => {
  try {
    const student = await getStudentProfile(req.user._id, req.user.studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    const { search, subject } = req.query;
    const filter = {
      semester: { $in: [student.semester, 'All'] },
    };

    if (subject && subject !== 'All') {
      filter.subject = subject;
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { content: searchRegex },
        { subject: searchRegex },
      ];
    }

    const notes = await Note.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: notes.length,
      studentSemester: student.semester,
      data: notes,
    });
  } catch (error) {
    console.error('[Student Notes Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch course study materials',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/student-portal/change-password
 * @desc    Allow student to change their password securely
 * @access  Private (Student only)
 */
router.put('/change-password', async (req, res) => {
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

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
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
      message: 'Password changed successfully! Please use your new password for future logins.',
    });
  } catch (error) {
    console.error('[Change Password Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message,
    });
  }
});

module.exports = router;
