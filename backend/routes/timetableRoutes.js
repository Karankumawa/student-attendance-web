const express = require('express');
const Timetable = require('../models/Timetable');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply auth protection to all timetable routes
router.use(protect);

/**
 * @route   GET /api/timetable
 * @desc    Get all timetable slots, optional filter by dayOfWeek or semester
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { dayOfWeek, semester } = req.query;
    const filter = {};

    if (dayOfWeek && dayOfWeek !== 'All') {
      filter.dayOfWeek = dayOfWeek;
    }

    if (semester && semester !== 'All') {
      filter.semester = semester;
    }

    const slots = await Timetable.find(filter).sort({ startTime: 1 });
    return res.status(200).json({
      success: true,
      count: slots.length,
      data: slots,
    });
  } catch (error) {
    console.error('[Timetable GET Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch timetable slots',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/timetable
 * @desc    Create a new timetable class slot
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const { dayOfWeek, startTime, endTime, subject, semester, roomNumber } = req.body;

    if (!dayOfWeek || !startTime || !endTime || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Day of week, start time, end time, and subject are required',
      });
    }

    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (!validDays.includes(dayOfWeek)) {
      return res.status(400).json({
        success: false,
        message: `Invalid dayOfWeek. Must be one of: ${validDays.join(', ')}`,
      });
    }

    const newSlot = new Timetable({
      dayOfWeek,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      subject: subject.trim(),
      semester: semester ? semester.trim() : 'Semester 1',
      roomNumber: roomNumber ? roomNumber.trim() : 'Room 101',
    });

    await newSlot.save();

    return res.status(201).json({
      success: true,
      message: 'Timetable slot created successfully',
      data: newSlot,
    });
  } catch (error) {
    console.error('[Timetable POST Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create timetable slot',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/timetable/:id
 * @desc    Update an existing timetable slot
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  try {
    const slot = await Timetable.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Timetable slot not found',
      });
    }

    const { dayOfWeek, startTime, endTime, subject, semester, roomNumber } = req.body;

    if (dayOfWeek) {
      const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      if (!validDays.includes(dayOfWeek)) {
        return res.status(400).json({
          success: false,
          message: `Invalid dayOfWeek. Must be one of: ${validDays.join(', ')}`,
        });
      }
      slot.dayOfWeek = dayOfWeek;
    }

    if (startTime) slot.startTime = startTime.trim();
    if (endTime) slot.endTime = endTime.trim();
    if (subject) slot.subject = subject.trim();
    if (semester) slot.semester = semester.trim();
    if (roomNumber !== undefined) slot.roomNumber = roomNumber.trim();

    await slot.save();

    return res.status(200).json({
      success: true,
      message: 'Timetable slot updated successfully',
      data: slot,
    });
  } catch (error) {
    console.error('[Timetable PUT Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update timetable slot',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/timetable/:id
 * @desc    Delete a timetable slot
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const slot = await Timetable.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Timetable slot not found',
      });
    }

    await Timetable.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Timetable slot deleted successfully',
      deletedId: req.params.id,
    });
  } catch (error) {
    console.error('[Timetable DELETE Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete timetable slot',
      error: error.message,
    });
  }
});

module.exports = router;
