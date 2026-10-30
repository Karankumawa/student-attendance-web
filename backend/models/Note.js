const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Note title is required'],
    trim: true,
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
  },
  semester: {
    type: String,
    trim: true,
    default: 'Semester 1',
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
  },
  resourceUrl: {
    type: String,
    trim: true,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

noteSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Note', noteSchema);
