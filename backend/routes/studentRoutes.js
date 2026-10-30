const express = require('express');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply auth protection to all student routes
router.use(protect);

/**
 * @route   GET /api/students
 * @desc    Get all students with optional filters (semester, department, search)
 * @access  Private
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
 * @desc    Add a new student
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const { name, rollNumber, department, semester } = req.body;

    if (!name || !rollNumber) {
      return res.status(400).json({
        success: false,
        message: 'Student name and roll number are required',
      });
    }

    const trimmedRoll = rollNumber.trim().toUpperCase();

    // Check if rollNumber already exists
    const existingStudent = await Student.findOne({ rollNumber: trimmedRoll });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: `Student with roll number "${trimmedRoll}" already exists`,
      });
    }

    const student = new Student({
      name: name.trim(),
      rollNumber: trimmedRoll,
      department: department ? department.trim() : 'Computer Science & Engineering',
      semester: semester ? semester.trim() : 'Semester 1',
    });

    await student.save();

    return res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: student,
    });
  } catch (error) {
    console.error('[Student POST Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create student',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/students/:id
 * @desc    Update student details
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, rollNumber, department, semester } = req.body;
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

    await student.save();

    return res.status(200).json({
      success: true,
      message: 'Student updated successfully',
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
 * @desc    Delete a student by ID
 * @access  Private
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

    await Student.findByIdAndDelete(req.params.id);

    // Also pull student's records from past attendance sessions
    await Attendance.updateMany(
      {},
      { $pull: { records: { studentId: req.params.id } } }
    );

    return res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
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
