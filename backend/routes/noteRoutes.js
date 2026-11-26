const express = require('express');
const Note = require('../models/Note');
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const { escapeRegex } = require('../utils/regexHelper');
const { isValidObjectId } = require('../utils/validationHelper');

const router = express.Router();

// Apply auth protection to all notes routes
router.use(protect);

/**
 * @route   GET /api/notes
 * @desc    Get all lecture notes with search and filter capabilities
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { subject, semester, search } = req.query;
    const filter = {};

    if (subject && subject !== 'All') {
      filter.subject = subject;
    }

    if (semester && semester !== 'All' && semester !== 'All Semesters') {
      filter.semester = { $in: [semester, 'All', 'All Semesters'] };
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [
        { title: searchRegex },
        { content: searchRegex },
        { subject: searchRegex },
      ];
    }

    const notes = await Note.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      count: notes.length,
      data: notes,
    });
  } catch (error) {
    console.error('[Note GET Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notes',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/notes
 * @desc    Create a new lecture note
 * @access  Private
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title, subject, semester, content, resourceUrl } = req.body || {};

    const cleanTitle = (title || '').toString().trim();
    const cleanSubject = (subject || '').toString().trim();
    const cleanSemester = (semester || 'Semester 1').toString().trim();
    const cleanContent = (content || '').toString().trim();
    let cleanResourceUrl = (resourceUrl || '').toString().trim();
    if (cleanResourceUrl && !/^https?:\/\//i.test(cleanResourceUrl)) {
      cleanResourceUrl = `https://${cleanResourceUrl}`;
    }

    if (!cleanTitle || !cleanSubject || !cleanContent) {
      return res.status(400).json({
        success: false,
        message: 'Title, subject, and content are required fields',
      });
    }

    const newNote = new Note({
      title: cleanTitle,
      subject: cleanSubject,
      semester: cleanSemester,
      content: cleanContent,
      resourceUrl: cleanResourceUrl,
    });

    const savedNote = await newNote.save();

    return res.status(201).json({
      success: true,
      message: 'Note created successfully',
      data: savedNote,
    });
  } catch (error) {
    console.error('[Note POST Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create note',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/notes/:id
 * @desc    Update an existing lecture note
 * @access  Private
 */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid note ID',
      });
    }

    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found',
      });
    }

    const { title, subject, semester, content, resourceUrl } = req.body || {};

    if (title !== undefined) {
      const cleanTitle = (title || '').toString().trim();
      if (!cleanTitle) {
        return res.status(400).json({ success: false, message: 'Note title cannot be empty' });
      }
      note.title = cleanTitle;
    }
    if (subject !== undefined) {
      const cleanSubject = (subject || '').toString().trim();
      if (!cleanSubject) {
        return res.status(400).json({ success: false, message: 'Subject cannot be empty' });
      }
      note.subject = cleanSubject;
    }
    if (semester !== undefined) note.semester = (semester || '').toString().trim();
    if (content !== undefined) {
      const cleanContent = (content || '').toString().trim();
      if (!cleanContent) {
        return res.status(400).json({ success: false, message: 'Note content cannot be empty' });
      }
      note.content = cleanContent;
    }
    if (resourceUrl !== undefined) {
      let cleanUrl = (resourceUrl || '').toString().trim();
      if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = `https://${cleanUrl}`;
      }
      note.resourceUrl = cleanUrl;
    }

    const updatedNote = await note.save();

    return res.status(200).json({
      success: true,
      message: 'Note updated successfully',
      data: updatedNote,
    });
  } catch (error) {
    console.error('[Note PUT Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update note',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/notes/:id
 * @desc    Delete a lecture note
 * @access  Private
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid note ID',
      });
    }

    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found',
      });
    }

    await Note.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Note deleted successfully',
      deletedId: req.params.id,
    });
  } catch (error) {
    console.error('[Note DELETE Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete note',
      error: error.message,
    });
  }
});

module.exports = router;
