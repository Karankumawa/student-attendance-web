const express = require('express');
const Note = require('../models/Note');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

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

    if (semester && semester !== 'All') {
      filter.semester = semester;
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
    const { title, subject, semester, content, resourceUrl } = req.body;

    if (!title || !subject || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title, subject, and content are required',
      });
    }

    const newNote = new Note({
      title: title.trim(),
      subject: subject.trim(),
      semester: semester ? semester.trim() : 'Semester 1',
      content: content.trim(),
      resourceUrl: resourceUrl ? resourceUrl.trim() : '',
    });

    await newNote.save();

    return res.status(201).json({
      success: true,
      message: 'Note created successfully',
      data: newNote,
    });
  } catch (error) {
    console.error('[Note POST Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create note',
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
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found',
      });
    }

    const { title, subject, semester, content, resourceUrl } = req.body;

    if (title) note.title = title.trim();
    if (subject) note.subject = subject.trim();
    if (semester) note.semester = semester.trim();
    if (content) note.content = content.trim();
    if (resourceUrl !== undefined) note.resourceUrl = resourceUrl.trim();

    await note.save();

    return res.status(200).json({
      success: true,
      message: 'Note updated successfully',
      data: note,
    });
  } catch (error) {
    console.error('[Note PUT Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update note',
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
