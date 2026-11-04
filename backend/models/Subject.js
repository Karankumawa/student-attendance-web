const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject/Course name is required'],
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    department: {
      type: String,
      trim: true,
      default: 'Computer Science & Engineering',
    },
    semester: {
      type: String,
      trim: true,
      default: 'Semester 1',
    },
    academicYear: {
      type: String,
      trim: true,
      default: '2026',
    },
    credits: {
      type: Number,
      default: 3,
      min: [1, 'Credits must be at least 1'],
      max: [10, 'Credits cannot exceed 10'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

subjectSchema.index({ semester: 1, department: 1 });
subjectSchema.index({ code: 1 });
subjectSchema.index({ name: 1, semester: 1, department: 1 });

module.exports = mongoose.model('Subject', subjectSchema);
