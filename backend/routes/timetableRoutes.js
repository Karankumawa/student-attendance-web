const express = require('express');
const Timetable = require('../models/Timetable');
const Subject = require('../models/Subject');
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const { sortSlotsByTime, parseTimeToMinutes, isValidTimeFormat } = require('../utils/timeHelper');
const { escapeRegex } = require('../utils/regexHelper');
const { isValidObjectId } = require('../utils/validationHelper');

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

    const rawSlots = await Timetable.find(filter).lean();
    const slots = sortSlotsByTime(rawSlots);
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
router.post('/', requireAdmin, async (req, res) => {
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

    const targetSemester = semester ? semester.trim() : 'Semester 1';
    const cleanStartTime = startTime.trim();
    const cleanEndTime = endTime.trim();
    const cleanRoom = roomNumber ? roomNumber.trim() : 'Room 101';

    if (!isValidTimeFormat(cleanStartTime) || !isValidTimeFormat(cleanEndTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format. Use standard format like "09:00 AM" or "14:30".',
      });
    }

    const startMin = parseTimeToMinutes(cleanStartTime);
    const endMin = parseTimeToMinutes(cleanEndTime);

    if (endMin <= startMin) {
      return res.status(400).json({
        success: false,
        message: `Invalid period duration: End time ("${cleanEndTime}") must be later than start time ("${cleanStartTime}")`,
      });
    }

    // Check for semester time overlap
    const semesterSlots = await Timetable.find({
      dayOfWeek,
      semester: targetSemester,
    }).lean();

    for (const s of semesterSlots) {
      const sStart = parseTimeToMinutes(s.startTime);
      const sEnd = parseTimeToMinutes(s.endTime);
      if (startMin < sEnd && endMin > sStart) {
        return res.status(400).json({
          success: false,
          message: `Schedule Conflict: A class for "${s.subject}" is already scheduled (${s.startTime} - ${s.endTime}) on ${dayOfWeek} for ${targetSemester}`,
        });
      }
    }

    // Check for room conflict (prevent double booking of same lecture hall/lab)
    const roomSlots = await Timetable.find({
      dayOfWeek,
      roomNumber: cleanRoom,
    }).lean();

    for (const s of roomSlots) {
      const sStart = parseTimeToMinutes(s.startTime);
      const sEnd = parseTimeToMinutes(s.endTime);
      if (startMin < sEnd && endMin > sStart) {
        return res.status(400).json({
          success: false,
          message: `Lecture Hall Conflict: "${cleanRoom}" is already booked for "${s.subject}" (${s.semester}) from ${s.startTime} to ${s.endTime} on ${dayOfWeek}`,
        });
      }
    }

    // Verify that the subject exists in Subject & Course Management
    const cleanSubject = subject.trim();
    const totalSubjectsInDb = await Subject.countDocuments();
    if (totalSubjectsInDb > 0) {
      const subjectDoc = await Subject.findOne({
        name: new RegExp(`^${escapeRegex(cleanSubject)}$`, 'i'),
      });
      if (!subjectDoc) {
        return res.status(400).json({
          success: false,
          message: `Cannot schedule class: "${cleanSubject}" is not registered in Subject & Course Management. Please add this subject first in Subject Management.`,
        });
      }
    }

    const newSlot = new Timetable({
      dayOfWeek,
      startTime: cleanStartTime,
      endTime: cleanEndTime,
      subject: subject.trim(),
      semester: targetSemester,
      roomNumber: cleanRoom,
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
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timetable slot ID',
      });
    }

    const slot = await Timetable.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Timetable slot not found',
      });
    }

    const { dayOfWeek, startTime, endTime, subject, semester, roomNumber } = req.body;

    const checkDay = dayOfWeek || slot.dayOfWeek;
    const checkSem = semester ? semester.trim() : slot.semester;
    const checkStart = startTime ? startTime.trim() : slot.startTime;
    const checkEnd = endTime ? endTime.trim() : slot.endTime;
    const checkRoom = roomNumber !== undefined ? (roomNumber ? String(roomNumber).trim() : 'Room 101') : slot.roomNumber;

    if (!isValidTimeFormat(checkStart) || !isValidTimeFormat(checkEnd)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format. Use standard format like "09:00 AM" or "14:30".',
      });
    }

    const startMin = parseTimeToMinutes(checkStart);
    const endMin = parseTimeToMinutes(checkEnd);

    if (endMin <= startMin) {
      return res.status(400).json({
        success: false,
        message: `Invalid period duration: End time ("${checkEnd}") must be later than start time ("${checkStart}")`,
      });
    }

    // Check for semester conflict excluding current slot
    const semesterSlots = await Timetable.find({
      _id: { $ne: slot._id },
      dayOfWeek: checkDay,
      semester: checkSem,
    }).lean();

    for (const s of semesterSlots) {
      const sStart = parseTimeToMinutes(s.startTime);
      const sEnd = parseTimeToMinutes(s.endTime);
      if (startMin < sEnd && endMin > sStart) {
        return res.status(400).json({
          success: false,
          message: `Schedule Conflict: A class for "${s.subject}" is already scheduled (${s.startTime} - ${s.endTime}) on ${checkDay} for ${checkSem}`,
        });
      }
    }

    // Check for room conflict excluding current slot
    const roomSlots = await Timetable.find({
      _id: { $ne: slot._id },
      dayOfWeek: checkDay,
      roomNumber: checkRoom,
    }).lean();

    for (const s of roomSlots) {
      const sStart = parseTimeToMinutes(s.startTime);
      const sEnd = parseTimeToMinutes(s.endTime);
      if (startMin < sEnd && endMin > sStart) {
        return res.status(400).json({
          success: false,
          message: `Lecture Hall Conflict: "${checkRoom}" is already booked for "${s.subject}" (${s.semester}) from ${s.startTime} to ${s.endTime} on ${checkDay}`,
        });
      }
    }

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
    if (subject) {
      const cleanSubject = subject.trim();
      const totalSubjectsInDb = await Subject.countDocuments();
      if (totalSubjectsInDb > 0) {
        const subjectDoc = await Subject.findOne({
          name: new RegExp(`^${escapeRegex(cleanSubject)}$`, 'i'),
        });
        if (!subjectDoc) {
          return res.status(400).json({
            success: false,
            message: `Cannot schedule class: "${cleanSubject}" is not registered in Subject & Course Management. Please add this subject first in Subject Management.`,
          });
        }
      }
      slot.subject = cleanSubject;
    }
    if (semester) slot.semester = semester.trim();
    if (roomNumber !== undefined) slot.roomNumber = roomNumber ? String(roomNumber).trim() : 'Room 101';

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
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timetable slot ID',
      });
    }

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
