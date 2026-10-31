const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true,
  },
  rollNumber: {
    type: String,
    required: [true, 'Roll number is required'],
    unique: true,
    trim: true,
    uppercase: true,
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
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  registrationId: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-populate registrationId if not provided
studentSchema.pre('save', function () {
  if (!this.registrationId) {
    this.registrationId = `STU-${this.rollNumber.replace(/[^A-Za-z0-9]/g, '')}`;
  }
});

module.exports = mongoose.model('Student', studentSchema);
