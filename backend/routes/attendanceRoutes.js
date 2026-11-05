const express = require('express');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Timetable = require('../models/Timetable');
const Note = require('../models/Note');
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const { getLocalDateString, sortSlotsByTime } = require('../utils/timeHelper');

const router = express.Router();

// Apply auth protection & Admin check to all faculty attendance management routes
router.use(protect);
router.use(requireAdmin);

/**
 * @route   GET /api/attendance
 * @desc    Fetch existing attendance for a specific date, subject, and semester
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { date, subject, semester } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "date" (YYYY-MM-DD) is required',
      });
    }

    const query = { date };
    if (subject && subject.trim() !== '') {
      query.subject = subject.trim();
    }
    if (semester && semester !== 'All') {
      query.semester = semester;
    }

    // If specific subject & semester requested, fetch single document efficiently
    if (subject && semester && semester !== 'All') {
      const single = await Attendance.findOne({ date, subject: subject.trim(), semester });
      return res.status(200).json({
        success: true,
        data: single,
      });
    }

    const attendanceRecords = await Attendance.find(query).sort({ subject: 1 });

    return res.status(200).json({
      success: true,
      count: attendanceRecords.length,
      data: attendanceRecords,
    });
  } catch (error) {
    console.error('[Attendance GET Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/attendance
 * @desc    Save or update (upsert) attendance for a batch of students on a selected date, subject, and semester
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const { date, subject, semester, records } = req.body;

    if (!date || !subject || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Date, subject, and records array are required',
      });
    }

    const trimmedSubject = subject.trim();
    const targetSemester = semester || 'Semester 1';

    // Format and clean records - default to Absent unless explicitly marked Present
    const cleanedRecords = records.map((rec) => ({
      studentId: rec.studentId,
      rollNumber: rec.rollNumber,
      name: rec.name,
      status: rec.status === 'Present' ? 'Present' : 'Absent',
    }));

    // Upsert attendance record for this date + subject + semester
    const updatedAttendance = await Attendance.findOneAndUpdate(
      {
        date,
        subject: trimmedSubject,
        semester: targetSemester,
      },
      {
        date,
        subject: trimmedSubject,
        semester: targetSemester,
        records: cleanedRecords,
        updatedAt: new Date(),
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Attendance successfully saved',
      data: updatedAttendance,
    });
  } catch (error) {
    console.error('[Attendance POST Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save attendance',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/attendance/summary
 * @desc    Calculate and return overall attendance percentage and stats per student
 * @access  Private
 */
router.get('/summary', async (req, res) => {
  try {
    const { semester, department, subject } = req.query;

    // Filter students
    const studentQuery = {};
    if (semester && semester !== 'All') studentQuery.semester = semester;
    if (department && department !== 'All') studentQuery.department = department;

    const students = await Student.find(studentQuery).sort({ rollNumber: 1 });

    // Filter attendance sessions
    const attendanceQuery = {};
    if (semester && semester !== 'All') attendanceQuery.semester = semester;
    if (subject && subject !== 'All') attendanceQuery.subject = subject;

    const sessions = await Attendance.find(attendanceQuery);

    // Aggregate statistics per student
    const studentStats = students.map((student) => {
      let totalClasses = 0;
      let attendedClasses = 0;

      sessions.forEach((session) => {
        const studentRecord = session.records.find(
          (rec) =>
            (rec.studentId && rec.studentId.toString() === student._id.toString()) ||
            (rec.rollNumber && rec.rollNumber.toUpperCase() === student.rollNumber.toUpperCase())
        );

        if (studentRecord) {
          totalClasses += 1;
          if (studentRecord.status === 'Present') {
            attendedClasses += 1;
          }
        }
      });

      const percentage =
        totalClasses > 0
          ? Number(((attendedClasses / totalClasses) * 100).toFixed(1))
          : 0;

      let category = 'Good';
      if (totalClasses === 0) {
        category = 'No Classes Held';
      } else if (percentage < 60) {
        category = 'Defaulter'; // Low attendance (<60%)
      } else if (percentage < 75) {
        category = 'Average'; // Warning zone (60-74.9%)
      }

      return {
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        department: student.department,
        semester: student.semester,
        totalClasses,
        attendedClasses,
        absentClasses: totalClasses - attendedClasses,
        percentage,
        category,
      };
    });

    return res.status(200).json({
      success: true,
      count: studentStats.length,
      data: studentStats,
      totalSessionsHeld: sessions.length,
    });
  } catch (error) {
    console.error('[Attendance Summary Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate attendance summary',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/attendance/dashboard-stats
 * @desc    Aggregate quick stats for the dashboard overview cards
 * @access  Private
 */
router.get('/dashboard-stats', async (req, res) => {
  try {
    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[today.getDay()];
    const todayDateString = getLocalDateString(today);

    // Total Students
    const totalStudents = await Student.countDocuments();

    // Total Notes
    const totalNotes = await Note.countDocuments();

    // Today's classes from Timetable sorted chronologically
    const rawTodaysClasses = await Timetable.find({ dayOfWeek: currentDay });
    const todaysClasses = sortSlotsByTime(rawTodaysClasses);

    // Today's attendance sessions recorded
    const todaysAttendanceSessions = await Attendance.find({ date: todayDateString });

    // Overall attendance percentage calculation
    const allSessions = await Attendance.find({});
    let totalPresentCount = 0;
    let totalRecordsCount = 0;

    allSessions.forEach((sess) => {
      sess.records.forEach((r) => {
        totalRecordsCount++;
        if (r.status === 'Present') totalPresentCount++;
      });
    });

    const averageAttendance =
      totalRecordsCount > 0
        ? Number(((totalPresentCount / totalRecordsCount) * 100).toFixed(1))
        : 85.0;

    return res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        totalNotes,
        currentDay,
        todayDateString,
        todaysClassesCount: todaysClasses.length,
        todaysClasses,
        todaysAttendanceCount: todaysAttendanceSessions.length,
        todaysAttendanceSessions,
        averageAttendance,
      },
    });
  } catch (error) {
    console.error('[Dashboard Stats Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate dashboard statistics',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/attendance/history
 * @desc    Fetch recent attendance sessions list
 * @access  Private
 */
router.get('/history', async (req, res) => {
  try {
    const sessions = await Attendance.find({}).sort({ date: -1, createdAt: -1 }).limit(30);
    return res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    console.error('[Attendance History Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance history',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/attendance/:id
 * @desc    Update attendance records for an existing session by ID
 * @access  Private (Admin only)
 */
router.put('/:id', async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Records array is required',
      });
    }

    const session = await Attendance.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Attendance session not found',
      });
    }

    const cleanedRecords = records.map((rec) => ({
      studentId: rec.studentId,
      rollNumber: rec.rollNumber,
      name: rec.name,
      status: rec.status === 'Present' ? 'Present' : 'Absent',
    }));

    session.records = cleanedRecords;
    session.updatedAt = new Date();
    await session.save();

    return res.status(200).json({
      success: true,
      message: 'Attendance session records updated successfully',
      data: session,
    });
  } catch (error) {
    console.error('[Attendance PUT Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update attendance session',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/attendance/:id
 * @desc    Delete an attendance session
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const session = await Attendance.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Attendance session not found',
      });
    }

    await Attendance.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Attendance session deleted successfully',
      deletedId: req.params.id,
    });
  } catch (error) {
    console.error('[Attendance DELETE Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete attendance session',
      error: error.message,
    });
  }
});

module.exports = router;
