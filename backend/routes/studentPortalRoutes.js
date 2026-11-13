const express = require('express');
const Student = require('../models/Student');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Timetable = require('../models/Timetable');
const Note = require('../models/Note');
const { protect, requireStudent } = require('../middleware/authMiddleware');
const { sortSlotsByTime } = require('../utils/timeHelper');

const router = express.Router();

// Safe RegExp escape helper
const escapeRegex = (str) => (str ? str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '');

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
  const byUser = await Student.findOne({ userId });
  if (byUser) return byUser;

  // Fallback search by email
  const user = await User.findById(userId);
  if (user && user.email) {
    return Student.findOne({ email: user.email });
  }
  return null;
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

    // 1. Fetch all attendance sessions applicable to this student (matching semester or explicit record)
    const semClean = (student.semester || '').trim();
    const semRegex = new RegExp(`^${escapeRegex(semClean)}$`, 'i');
    const sessions = await Attendance.find({
      $or: [
        { semester: semRegex },
        { 'records.studentId': student._id },
        { 'records.rollNumber': new RegExp(`^${escapeRegex(student.rollNumber)}$`, 'i') },
      ],
    });

    let totalClasses = 0;
    let attendedClasses = 0;

    sessions.forEach((session) => {
      const isSameSemester =
        session.semester &&
        student.semester &&
        session.semester.trim().toLowerCase() === student.semester.trim().toLowerCase();

      const myRecord = session.records.find(
        (rec) =>
          (rec.studentId && rec.studentId.toString() === student._id.toString()) ||
          (rec.rollNumber && rec.rollNumber.toUpperCase() === student.rollNumber.toUpperCase())
      );

      if (isSameSemester || myRecord) {
        totalClasses += 1;
        if (myRecord && myRecord.status === 'Present') {
          attendedClasses += 1;
        }
      }
    });

    const percentage =
      totalClasses > 0 ? Number(((attendedClasses / totalClasses) * 100).toFixed(1)) : 0;

    let academicStanding = 'No Classes Yet';
    if (totalClasses > 0) {
      if (percentage < 60) academicStanding = 'Defaulter';
      else if (percentage < 75) academicStanding = 'Warning';
      else academicStanding = 'Good';
    }

    // 2. Fetch today's classes strictly for student's semester sorted chronologically
    const rawTodaysClasses = await Timetable.find({
      semester: student.semester,
      dayOfWeek: currentDay,
    });
    const todaysClasses = sortSlotsByTime(rawTodaysClasses);

    // 3. Fetch recent notes for student's semester
    const recentNotes = await Note.find({
      semester: { $in: [student.semester, 'All', 'All Semesters'] },
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

    const semClean = (student.semester || '').trim();
    const semRegex = new RegExp(`^${escapeRegex(semClean)}$`, 'i');
    const sessions = await Attendance.find({
      $or: [
        { semester: semRegex },
        { 'records.studentId': student._id },
        { 'records.rollNumber': new RegExp(`^${escapeRegex(student.rollNumber)}$`, 'i') },
      ],
    }).sort({
      date: -1,
      createdAt: -1,
    });

    let totalClasses = 0;
    let attendedClasses = 0;
    const subjectMap = {};
    const personalHistory = [];

    sessions.forEach((session) => {
      const isSameSemester =
        session.semester &&
        student.semester &&
        session.semester.trim().toLowerCase() === student.semester.trim().toLowerCase();

      const myRecord = session.records.find(
        (rec) =>
          (rec.studentId && rec.studentId.toString() === student._id.toString()) ||
          (rec.rollNumber && rec.rollNumber.toUpperCase() === student.rollNumber.toUpperCase())
      );

      if (isSameSemester || myRecord) {
        totalClasses += 1;
        const status = myRecord ? myRecord.status : 'Absent';
        const isPresent = status === 'Present';
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
          status,
        });
      }
    });

    const overallPercentage =
      totalClasses > 0 ? Number(((attendedClasses / totalClasses) * 100).toFixed(1)) : 0;

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
        status: stat.total === 0 ? 'No Classes Yet' : pct >= 75 ? 'Good' : pct >= 60 ? 'Warning' : 'Defaulter',
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
            totalClasses === 0
              ? 'No Classes Yet'
              : overallPercentage >= 75
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

    const rawSchedule = await Timetable.find(filter);
    const schedule = sortSlotsByTime(rawSchedule);

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
      semester: { $in: [student.semester, 'All', 'All Semesters'] },
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
 * @route   POST /api/student-portal/change-password
 * @desc    Allow student to change their password securely
 * @access  Private (Student only)
 */
const handleStudentChangePassword = async (req, res) => {
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
};

router.put('/change-password', handleStudentChangePassword);
router.post('/change-password', handleStudentChangePassword);

/**
 * @route   GET /api/student-portal/profile
 * @desc    Fetch complete personal profile of the logged-in student
 * @access  Private (Student only)
 */
router.get('/profile', async (req, res) => {
  try {
    const student = await getStudentProfile(req.user._id, req.user.studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    const user = await User.findById(req.user._id);

    return res.status(200).json({
      success: true,
      data: {
        _id: student._id,
        name: student.name,
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        email: student.email || user?.email || '',
        rollNumber: student.rollNumber,
        registrationId: student.registrationId || `STU-${student.rollNumber}`,
        department: student.department || 'Computer Science & Engineering',
        semester: student.semester || 'Semester 1',
        dob: student.dob || '',
        phone: student.phone || '',
        gender: student.gender || '',
        address: student.address || '',
        guardianName: student.guardianName || '',
        guardianPhone: student.guardianPhone || '',
        bloodGroup: student.bloodGroup || '',
        createdAt: student.createdAt,
      },
    });
  } catch (error) {
    console.error('[Student Profile GET Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch student profile',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/student-portal/profile
 * @desc    Update allowed details of the logged-in student (Name and Email are strictly immutable by student)
 * @access  Private (Student only)
 */
router.put('/profile', async (req, res) => {
  try {
    const student = await getStudentProfile(req.user._id, req.user.studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    const {
      dob,
      phone,
      gender,
      address,
      guardianName,
      guardianPhone,
      bloodGroup,
      currentPassword,
      newPassword,
    } = req.body;

    // Strict security: Student cannot modify Name, Email, Contact Phone, or Parent & Guardian details!
    // These official records are managed by college administration.
    if (dob !== undefined) student.dob = typeof dob === 'string' ? dob.trim() : dob;
    if (gender !== undefined) student.gender = typeof gender === 'string' ? gender.trim() : gender;
    if (address !== undefined) student.address = typeof address === 'string' ? address.trim() : address;
    if (bloodGroup !== undefined) student.bloodGroup = typeof bloodGroup === 'string' ? bloodGroup.trim() : bloodGroup;

    await student.save();

    // If student requested password update through profile form
    if (newPassword && newPassword.trim() !== '') {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to change password',
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
    }

    const user = await User.findById(req.user._id);

    return res.status(200).json({
      success: true,
      message: 'Student profile details updated successfully in database!',
      data: {
        _id: student._id,
        name: student.name,
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        email: student.email || user?.email || '',
        rollNumber: student.rollNumber,
        registrationId: student.registrationId || `STU-${student.rollNumber}`,
        department: student.department || 'Computer Science & Engineering',
        semester: student.semester || 'Semester 1',
        dob: student.dob || '',
        phone: student.phone || '',
        gender: student.gender || '',
        address: student.address || '',
        guardianName: student.guardianName || '',
        guardianPhone: student.guardianPhone || '',
        bloodGroup: student.bloodGroup || '',
        createdAt: student.createdAt,
      },
    });
  } catch (error) {
    console.error('[Student Profile Update Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update student profile',
      error: error.message,
    });
  }
});

module.exports = router;
