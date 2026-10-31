const express = require('express');
const Student = require('../models/Student');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Strict Admin-only protection for student roster management
router.use(protect);
router.use(requireAdmin);

/**
 * @route   GET /api/students
 * @desc    Get all students with optional filters (semester, department, search)
 * @access  Private (Admin only)
 */
router.get('/', async (req, res) => {
  try {
    const { semester, department, search } = req.query;
    const filter = {};

    if (semester && semester !== 'All') {
      filter.semester = semester;
    }

    if (department && department !== 'All') {
      filter.department = department;
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { rollNumber: searchRegex },
        { email: searchRegex },
        { registrationId: searchRegex },
      ];
    }

    const students = await Student.find(filter).sort({ rollNumber: 1 });
    return res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    console.error('[Student GET Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/students
 * @desc    Add a new student & automatically provision student portal login account
 * @access  Private (Admin only)
 */
router.post('/', async (req, res) => {
  try {
    const { name, rollNumber, department, semester, email, password } = req.body;

    if (!name || !rollNumber) {
      return res.status(400).json({
        success: false,
        message: 'Student name and roll number are required',
      });
    }

    const trimmedRoll = rollNumber.trim().toUpperCase();
    const studentEmail = email
      ? email.trim().toLowerCase()
      : `${trimmedRoll.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.edu`;
    const studentPassword = password && password.trim() ? password.trim() : 'student123';

    // 1. Check if rollNumber already exists
    const existingStudent = await Student.findOne({ rollNumber: trimmedRoll });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: `Student with roll number "${trimmedRoll}" already exists`,
      });
    }

    // 2. Check if email already exists in User accounts
    const existingUser = await User.findOne({ email: studentEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: `An account with email "${studentEmail}" already exists. Please choose a different email.`,
      });
    }

    // Generate unique Registration ID
    const registrationId = `STU-${trimmedRoll.replace(/[^A-Za-z0-9]/g, '')}`;

    // 3. Create Student profile
    const student = new Student({
      name: name.trim(),
      rollNumber: trimmedRoll,
      department: department ? department.trim() : 'Computer Science & Engineering',
      semester: semester ? semester.trim() : 'Semester 1',
      email: studentEmail,
      registrationId,
    });
    await student.save();

    // 4. Create linked User login account with student role
    const studentUser = new User({
      email: studentEmail,
      password: studentPassword,
      name: name.trim(),
      role: 'student',
      studentId: student._id,
    });
    await studentUser.save();

    // Link user back to student
    student.userId = studentUser._id;
    await student.save();

    return res.status(201).json({
      success: true,
      message: `Student registered successfully with login email: ${studentEmail}`,
      data: student,
      loginDetails: {
        email: studentEmail,
        defaultPassword: studentPassword,
        registrationId,
      },
    });
  } catch (error) {
    console.error('[Student POST Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create student and login account',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/students/:id
 * @desc    Update student details & sync login account
 * @access  Private (Admin only)
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, rollNumber, department, semester, email, password } = req.body;
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    if (rollNumber) {
      const trimmedRoll = rollNumber.trim().toUpperCase();
      if (trimmedRoll !== student.rollNumber) {
        const duplicate = await Student.findOne({ rollNumber: trimmedRoll });
        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: `Roll number "${trimmedRoll}" is already assigned to another student`,
          });
        }
        student.rollNumber = trimmedRoll;
      }
    }

    if (name) student.name = name.trim();
    if (department) student.department = department.trim();
    if (semester) student.semester = semester.trim();

    if (email) {
      const newEmail = email.trim().toLowerCase();
      if (newEmail !== student.email) {
        const duplicateEmail = await User.findOne({ email: newEmail });
        if (duplicateEmail && duplicateEmail.studentId?.toString() !== student._id.toString()) {
          return res.status(400).json({
            success: false,
            message: `Email "${newEmail}" is already in use by another user`,
          });
        }
        student.email = newEmail;
      }
    }

    await student.save();

    // Update associated User account if exists
    let studentUser = await User.findOne({ studentId: student._id });
    if (studentUser) {
      if (name) studentUser.name = name.trim();
      if (student.email) studentUser.email = student.email;
      if (password && password.trim().length >= 6) {
        studentUser.password = password.trim();
      }
      await studentUser.save();
    } else if (student.email) {
      // Create user account if missing
      studentUser = new User({
        email: student.email,
        password: password && password.trim() ? password.trim() : 'student123',
        name: student.name,
        role: 'student',
        studentId: student._id,
      });
      await studentUser.save();
      student.userId = studentUser._id;
      await student.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Student and credentials updated successfully',
      data: student,
    });
  } catch (error) {
    console.error('[Student PUT Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update student',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/students/:id
 * @desc    Delete a student & their associated login account and attendance entries
 * @access  Private (Admin only)
 */
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Delete Student profile
    await Student.findByIdAndDelete(req.params.id);

    // Delete linked User login account
    await User.deleteMany({ studentId: req.params.id });

    // Clean up student's past records from attendance
    await Attendance.updateMany(
      {},
      { $pull: { records: { studentId: req.params.id } } }
    );

    return res.status(200).json({
      success: true,
      message: 'Student and login account deleted successfully',
      deletedId: req.params.id,
    });
  } catch (error) {
    console.error('[Student DELETE Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete student',
      error: error.message,
    });
  }
});

module.exports = router;
