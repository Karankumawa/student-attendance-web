const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  dayOfWeek: {
    type: String,
    required: [true, 'Day of the week is required'],
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    trim: true,
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    trim: true,
  },
  subject: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true,
  },
  semester: {
    type: String,
    trim: true,
    default: 'Semester 1',
  },
  roomNumber: {
    type: String,
    trim: true,
    default: 'Room 101',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Timetable', timetableSchema);
