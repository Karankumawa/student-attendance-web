const User = require('../models/User');
const Student = require('../models/Student');
const Timetable = require('../models/Timetable');
const Note = require('../models/Note');
const Attendance = require('../models/Attendance');

const seedInitialData = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin@gmail.com';

    // 1. Ensure Single Admin User exists
    let admin = await User.findOne({ email: adminEmail.toLowerCase() });
    if (!admin) {
      console.log(`[Seed] Creating default Admin/Teacher: ${adminEmail}`);
      admin = new User({
        email: adminEmail.toLowerCase(),
        password: adminPassword,
        name: 'Dr. Evelyn Reed (Dept. Head)',
        role: 'admin',
      });
      await admin.save();
      console.log('[Seed] Admin user successfully created.');
    } else {
      console.log(`[Seed] Admin user already exists: ${admin.email}`);
    }

    // 2. Seed Students if none exist
    const studentCount = await Student.countDocuments();
    let seededStudents = [];
    if (studentCount === 0) {
      console.log('[Seed] Seeding sample student roster...');
      const sampleStudents = [
        { name: 'Aarav Sharma', rollNumber: 'CS2024-001', department: 'Computer Science & Engineering', semester: 'Semester 4' },
        { name: 'Ananya Verma', rollNumber: 'CS2024-002', department: 'Computer Science & Engineering', semester: 'Semester 4' },
        { name: 'Rohan Patel', rollNumber: 'CS2024-003', department: 'Computer Science & Engineering', semester: 'Semester 4' },
        { name: 'Priya Nair', rollNumber: 'CS2024-004', department: 'Computer Science & Engineering', semester: 'Semester 4' },
        { name: 'Vikram Aditya', rollNumber: 'CS2024-005', department: 'Computer Science & Engineering', semester: 'Semester 4' },
        { name: 'Sneha Kulkarni', rollNumber: 'CS2024-006', department: 'Computer Science & Engineering', semester: 'Semester 4' },
        { name: 'Devendra Rao', rollNumber: 'CS2024-007', department: 'Computer Science & Engineering', semester: 'Semester 4' },
        { name: 'Ishita Sen', rollNumber: 'CS2024-008', department: 'Computer Science & Engineering', semester: 'Semester 4' },
        { name: 'Kavya Deshmukh', rollNumber: 'CS2024-009', department: 'Computer Science & Engineering', semester: 'Semester 6' },
        { name: 'Manish Gupta', rollNumber: 'CS2024-010', department: 'Computer Science & Engineering', semester: 'Semester 6' },
        { name: 'Tanvi Joshi', rollNumber: 'CS2024-011', department: 'Information Technology', semester: 'Semester 2' },
        { name: 'Rahul Roy', rollNumber: 'CS2024-012', department: 'Information Technology', semester: 'Semester 2' },
      ];
      seededStudents = await Student.insertMany(sampleStudents);
      console.log(`[Seed] Seeded ${seededStudents.length} students.`);
    } else {
      seededStudents = await Student.find({ semester: 'Semester 4' });
    }

    // 3. Seed Timetable if none exist
    const timetableCount = await Timetable.countDocuments();
    if (timetableCount === 0) {
      console.log('[Seed] Seeding weekly timetable schedule...');
      const sampleTimetable = [
        { dayOfWeek: 'Monday', startTime: '09:00 AM', endTime: '10:00 AM', subject: 'Data Structures & Algorithms', semester: 'Semester 4', roomNumber: 'Lab 301' },
        { dayOfWeek: 'Monday', startTime: '10:15 AM', endTime: '11:15 AM', subject: 'Database Management Systems', semester: 'Semester 4', roomNumber: 'Hall 102' },
        { dayOfWeek: 'Monday', startTime: '01:30 PM', endTime: '02:30 PM', subject: 'Operating Systems', semester: 'Semester 4', roomNumber: 'Hall 204' },
        { dayOfWeek: 'Tuesday', startTime: '09:00 AM', endTime: '10:00 AM', subject: 'Computer Networks', semester: 'Semester 4', roomNumber: 'Hall 102' },
        { dayOfWeek: 'Tuesday', startTime: '11:30 AM', endTime: '12:30 PM', subject: 'Software Engineering', semester: 'Semester 4', roomNumber: 'Room 205' },
        { dayOfWeek: 'Wednesday', startTime: '09:00 AM', endTime: '10:00 AM', subject: 'Data Structures & Algorithms', semester: 'Semester 4', roomNumber: 'Lab 301' },
        { dayOfWeek: 'Wednesday', startTime: '10:15 AM', endTime: '11:15 AM', subject: 'Database Management Systems', semester: 'Semester 4', roomNumber: 'Hall 102' },
        { dayOfWeek: 'Thursday', startTime: '10:00 AM', endTime: '11:00 AM', subject: 'Operating Systems', semester: 'Semester 4', roomNumber: 'Hall 204' },
        { dayOfWeek: 'Thursday', startTime: '02:00 PM', endTime: '03:00 PM', subject: 'Computer Networks Lab', semester: 'Semester 4', roomNumber: 'Network Lab' },
        { dayOfWeek: 'Friday', startTime: '09:00 AM', endTime: '10:00 AM', subject: 'Database Management Systems', semester: 'Semester 4', roomNumber: 'Hall 102' },
        { dayOfWeek: 'Friday', startTime: '11:00 AM', endTime: '12:00 PM', subject: 'Data Structures & Algorithms', semester: 'Semester 4', roomNumber: 'Lab 301' },
        { dayOfWeek: 'Saturday', startTime: '10:00 AM', endTime: '11:30 AM', subject: 'Seminar & Project Mentorship', semester: 'Semester 4', roomNumber: 'Seminar Hall B' },
      ];
      await Timetable.insertMany(sampleTimetable);
      console.log(`[Seed] Seeded ${sampleTimetable.length} timetable slots.`);
    }

    // 4. Seed Notes if none exist
    const noteCount = await Note.countDocuments();
    if (noteCount === 0) {
      console.log('[Seed] Seeding lecture notes and study material...');
      const sampleNotes = [
        {
          title: 'Unit 1: B-Trees and AVL Tree Balancing Algorithms',
          subject: 'Data Structures & Algorithms',
          semester: 'Semester 4',
          content: '### Core Topics Covered:\n- Balanced search trees vs unbalanced binary trees\n- AVL rotation cases (LL, RR, LR, RL) with balance factors\n- B-Tree insertion and node splitting rules\n- Time complexities: Search $O(\\log N)$, Insert $O(\\log N)$',
          resourceUrl: 'https://drive.google.com/file/d/sample-dsa-avl-notes/view',
        },
        {
          title: 'ACID Properties and Transaction Isolation Levels',
          subject: 'Database Management Systems',
          semester: 'Semester 4',
          content: '### Key Concepts in Transaction Processing:\n1. **Atomicity**: All-or-nothing execution via Write-Ahead Logging (WAL).\n2. **Consistency**: Preserving database integrity constraints.\n3. **Isolation**: Preventing dirty reads, non-repeatable reads, and phantom reads.\n4. **Durability**: Guaranteed state preservation after commit.',
          resourceUrl: 'https://drive.google.com/file/d/sample-dbms-acid/view',
        },
        {
          title: 'Process Synchronization and Peterson\'s Solution',
          subject: 'Operating Systems',
          semester: 'Semester 4',
          content: 'Critical Section Problem requirements:\n- Mutual Exclusion\n- Progress\n- Bounded Waiting\nIncludes code diagrams and hardware atomic test-and-set instructions.',
          resourceUrl: 'https://drive.google.com/file/d/sample-os-sync/view',
        },
      ];
      await Note.insertMany(sampleNotes);
      console.log(`[Seed] Seeded ${sampleNotes.length} notes.`);
    }

    // 5. Seed Attendance records if none exist
    const attendanceCount = await Attendance.countDocuments();
    if (attendanceCount === 0 && seededStudents.length > 0) {
      console.log('[Seed] Seeding initial attendance sessions for analytics...');
      const sem4Students = await Student.find({ semester: 'Semester 4' });
      
      const session1 = {
        date: '2026-10-27',
        subject: 'Data Structures & Algorithms',
        semester: 'Semester 4',
        records: sem4Students.map((s, idx) => ({
          studentId: s._id,
          rollNumber: s.rollNumber,
          name: s.name,
          status: idx === 2 || idx === 6 ? 'Absent' : 'Present',
        })),
      };

      const session2 = {
        date: '2026-10-28',
        subject: 'Database Management Systems',
        semester: 'Semester 4',
        records: sem4Students.map((s, idx) => ({
          studentId: s._id,
          rollNumber: s.rollNumber,
          name: s.name,
          status: idx === 4 ? 'Absent' : 'Present',
        })),
      };

      const session3 = {
        date: '2026-10-29',
        subject: 'Operating Systems',
        semester: 'Semester 4',
        records: sem4Students.map((s, idx) => ({
          studentId: s._id,
          rollNumber: s.rollNumber,
          name: s.name,
          status: 'Present',
        })),
      };

      await Attendance.insertMany([session1, session2, session3]);
      console.log('[Seed] Seeded sample attendance records.');
    }

    console.log('[Seed] Initialization completed successfully.');
  } catch (error) {
    console.error('[Seed] Error seeding initial data:', error);
  }
};

module.exports = { seedInitialData };
