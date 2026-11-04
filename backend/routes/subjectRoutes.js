const express = require('express');
const Subject = require('../models/Subject');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// All subject routes require authenticated user
router.use(protect);

/**
 * @route   GET /api/subjects
 * @desc    Fetch all subjects/courses from database with optional filters
 * @access  Private (Admin & Students)
 */
router.get('/', async (req, res) => {
  try {
    const { semester, department, academicYear, search } = req.query;
    const query = {};

    if (semester && semester !== 'All') {
      query.semester = semester;
    }
    if (department && department !== 'All') {
      query.department = department;
    }
    if (academicYear && academicYear !== 'All') {
      query.academicYear = academicYear;
    }
    if (search && search.trim() !== '') {
      const reg = new RegExp(search.trim(), 'i');
      query.$or = [{ name: reg }, { code: reg }, { description: reg }];
    }

    const subjects = await Subject.find(query).sort({ semester: 1, name: 1 });

    return res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects,
    });
  } catch (error) {
    console.error('[Subject GET Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subjects from database',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/subjects/:id
 * @desc    Get single subject by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found in database',
      });
    }

    return res.status(200).json({
      success: true,
      data: subject,
    });
  } catch (error) {
    console.error('[Subject GET by ID Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve subject',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/subjects
 * @desc    Add a new subject/course to database
 * @access  Private (Admin only)
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, code, department, semester, academicYear, credits, description } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Subject/Course name is required',
      });
    }

    const trimmedName = name.trim();
    const targetSemester = semester ? semester.trim() : 'Semester 1';
    const targetDept = department ? department.trim() : 'Computer Science & Engineering';

    // Check for duplicate in same department & semester
    const duplicate = await Subject.findOne({
      name: new RegExp(`^${trimmedName}$`, 'i'),
      semester: targetSemester,
      department: targetDept,
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Subject "${trimmedName}" already exists for ${targetSemester} (${targetDept})`,
      });
    }

    const newSubject = new Subject({
      name: trimmedName,
      code: code ? code.trim().toUpperCase() : '',
      department: targetDept,
      semester: targetSemester,
      academicYear: academicYear ? academicYear.trim() : new Date().getFullYear().toString(),
      credits: credits ? Number(credits) : 3,
      description: description ? description.trim() : '',
    });

    await newSubject.save();

    return res.status(201).json({
      success: true,
      message: `Course "${trimmedName}" added successfully to database!`,
      data: newSubject,
    });
  } catch (error) {
    console.error('[Subject POST Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add subject to database',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/subjects/:id
 * @desc    Edit/modify an existing subject/course in database
 * @access  Private (Admin only)
 */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, code, department, semester, academicYear, credits, description } = req.body;
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found in database',
      });
    }

    if (name && name.trim() !== '') {
      const trimmedName = name.trim();
      const targetSemester = semester ? semester.trim() : subject.semester;
      const targetDept = department ? department.trim() : subject.department;

      // Duplicate check (excluding itself)
      const duplicate = await Subject.findOne({
        _id: { $ne: subject._id },
        name: new RegExp(`^${trimmedName}$`, 'i'),
        semester: targetSemester,
        department: targetDept,
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Another course with name "${trimmedName}" already exists in ${targetSemester}`,
        });
      }

      subject.name = trimmedName;
    }

    if (code !== undefined) subject.code = code ? code.trim().toUpperCase() : '';
    if (department !== undefined) subject.department = department.trim();
    if (semester !== undefined) subject.semester = semester.trim();
    if (academicYear !== undefined) subject.academicYear = academicYear.trim();
    if (credits !== undefined) subject.credits = Number(credits);
    if (description !== undefined) subject.description = description.trim();

    await subject.save();

    return res.status(200).json({
      success: true,
      message: `Subject "${subject.name}" updated successfully in database!`,
      data: subject,
    });
  } catch (error) {
    console.error('[Subject PUT Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update subject in database',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/subjects/:id
 * @desc    Remove/delete a subject from database
 * @access  Private (Admin only)
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found in database',
      });
    }

    const subjectName = subject.name;
    await Subject.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: `Subject "${subjectName}" removed successfully from database!`,
    });
  } catch (error) {
    console.error('[Subject DELETE Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove subject from database',
      error: error.message,
    });
  }
});

module.exports = router;
