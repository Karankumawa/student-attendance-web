const express = require('express');
const XLSX = require('xlsx');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Timetable = require('../models/Timetable');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply auth protection & Admin check strictly to all report routes
router.use(protect);
router.use(requireAdmin);

/**
 * Helper to compute date & filter queries
 */
const buildReportFilter = (query) => {
  const { year, semester, department, subject, startDate, endDate } = query;

  const studentQuery = {};
  if (semester && semester !== 'All') {
    studentQuery.semester = semester;
  }
  if (department && department !== 'All') {
    studentQuery.department = department;
  }

  const attendanceQuery = {};
  if (semester && semester !== 'All') {
    attendanceQuery.semester = semester;
  }
  if (subject && subject !== 'All') {
    attendanceQuery.subject = subject;
  }

  // Handle custom date range or year filter
  if (startDate && endDate) {
    attendanceQuery.date = { $gte: startDate, $lte: endDate };
  } else if (year && year !== 'All') {
    attendanceQuery.date = { $regex: `^${year}` };
  }

  return { studentQuery, attendanceQuery };
};

/**
 * Helper: Aggregate Attendance Metrics from Database
 */
const computeReportData = async (filters, reportType = 'all', minAttendance = 75) => {
  const { studentQuery, attendanceQuery } = buildReportFilter(filters);

  // Fetch Students & Sessions from MongoDB
  const students = await Student.find(studentQuery).sort({ rollNumber: 1 });
  const sessions = await Attendance.find(attendanceQuery).sort({ date: 1, subject: 1 });

  // Map student attendance
  const studentReports = students.map((student, index) => {
    let attended = 0;
    let absent = 0;
    const sessionDetails = [];

    sessions.forEach((session) => {
      const record = session.records.find(
        (rec) =>
          (rec.studentId && rec.studentId.toString() === student._id.toString()) ||
          (rec.rollNumber && rec.rollNumber.toUpperCase() === student.rollNumber.toUpperCase())
      );

      const status = record ? record.status : 'Absent';
      if (status === 'Present') {
        attended++;
      } else {
        absent++;
      }

      sessionDetails.push({
        date: session.date,
        subject: session.subject,
        semester: session.semester,
        status: status,
      });
    });

    const totalClasses = sessions.length;
    const percentage = totalClasses > 0 ? Number(((attended / totalClasses) * 100).toFixed(1)) : 0;

    let statusLabel = 'Eligible';
    if (percentage < 60) {
      statusLabel = 'Critical Defaulter (<60%)';
    } else if (percentage < minAttendance) {
      statusLabel = `Warning (${percentage}%)`;
    }

    const classesNeededFor75 = Math.max(0, Math.ceil(0.75 * totalClasses) - attended);

    return {
      sNo: index + 1,
      studentId: student._id,
      rollNumber: student.rollNumber,
      registrationId: student.registrationId || `STU-${student.rollNumber}`,
      name: student.name,
      department: student.department || 'Computer Science & Engineering',
      semester: student.semester || 'Semester 1',
      email: student.email || 'N/A',
      totalClasses,
      attendedClasses: attended,
      absentClasses: absent,
      percentage,
      status: statusLabel,
      classesNeededFor75,
      isDefaulter: percentage < minAttendance,
      sessionDetails,
    };
  });

  // Filter based on reportType if requested
  let filteredStudents = studentReports;
  if (reportType === 'defaulters') {
    filteredStudents = studentReports.filter((s) => s.isDefaulter);
  } else if (reportType === 'eligible') {
    filteredStudents = studentReports.filter((s) => !s.isDefaulter);
  }

  // Summary Metrics
  const totalStudents = students.length;
  const defaultersCount = studentReports.filter((s) => s.isDefaulter).length;
  const eligibleCount = totalStudents - defaultersCount;
  const overallAvg =
    totalStudents > 0
      ? Number((studentReports.reduce((acc, curr) => acc + curr.percentage, 0) / totalStudents).toFixed(1))
      : 0;

  return {
    students: filteredStudents,
    allStudents: studentReports,
    sessions,
    stats: {
      totalStudents,
      matchedStudents: filteredStudents.length,
      totalSessions: sessions.length,
      overallAvg,
      defaultersCount,
      eligibleCount,
      minAttendanceThreshold: minAttendance,
    },
  };
};

/**
 * @route   GET /api/reports/filters
 * @desc    Get dynamic filters based on actual data in database (past years, departments, semesters, subjects)
 * @access  Private (Admin Only)
 */
router.get('/filters', async (req, res) => {
  try {
    // Extract distinct years from attendance records in MongoDB
    const attendanceDates = await Attendance.find({}, { date: 1, _id: 0 });
    const dbYears = Array.from(
      new Set(
        attendanceDates
          .map((doc) => (doc.date ? doc.date.slice(0, 4) : null))
          .filter((y) => y && /^\d{4}$/.test(y))
      )
    );

    // Merge with past 5 years and current year so admin can filter any past or future years
    const currentYear = new Date().getFullYear();
    const standardYears = [
      currentYear + 1,
      currentYear,
      currentYear - 1,
      currentYear - 2,
      currentYear - 3,
      currentYear - 4,
    ].map(String);

    const mergedYears = Array.from(new Set([...dbYears, ...standardYears]))
      .sort()
      .reverse();

    // Distinct departments & semesters from Student collection
    const departments = await Student.distinct('department');
    const semesters = await Student.distinct('semester');

    // Distinct subjects from Attendance & Timetable
    const attendanceSubjects = await Attendance.distinct('subject');
    const timetableSubjects = await Timetable.distinct('subject');
    const mergedSubjects = Array.from(new Set([...attendanceSubjects, ...timetableSubjects]))
      .filter(Boolean)
      .sort();

    return res.status(200).json({
      success: true,
      data: {
        years: mergedYears,
        departments: departments.length > 0 ? departments : ['Computer Science & Engineering', 'Information Technology'],
        semesters: semesters.length > 0 ? semesters : [
          'Semester 1', 'Semester 2', 'Semester 3', 'Semester 4',
          'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8',
        ],
        subjects: mergedSubjects.length > 0 ? mergedSubjects : [
          'Data Structures & Algorithms',
          'Database Management Systems',
          'Operating Systems',
          'Computer Networks',
          'Web Technologies',
        ],
        totalRecordsInDb: attendanceDates.length,
      },
    });
  } catch (error) {
    console.error('[Report Filters Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch report filter parameters',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/reports/preview
 * @desc    Generate attendance report preview with statistics
 * @access  Private (Admin Only)
 */
router.get('/preview', async (req, res) => {
  try {
    const { year, semester, department, subject, reportType, minAttendance } = req.query;

    const threshold = minAttendance ? Number(minAttendance) : 75;
    const { students, stats, sessions } = await computeReportData(
      { year, semester, department, subject },
      reportType || 'all',
      threshold
    );

    // Session headers for detailed display
    const sessionHeaders = sessions.map((s) => ({
      date: s.date,
      subject: s.subject,
      semester: s.semester,
    }));

    return res.status(200).json({
      success: true,
      stats,
      sessionHeaders,
      students,
      filtersApplied: {
        year: year || 'All',
        semester: semester || 'All',
        department: department || 'All',
        subject: subject || 'All',
        reportType: reportType || 'all',
        minAttendance: threshold,
      },
    });
  } catch (error) {
    console.error('[Report Preview Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate attendance report preview',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/reports/export-excel
 * @desc    One-click export of attendance report directly from database into Excel (.xlsx) file format
 * @access  Private (Admin Only)
 */
router.get('/export-excel', async (req, res) => {
  try {
    const { year, semester, department, subject, reportType, minAttendance } = req.query;
    const threshold = minAttendance ? Number(minAttendance) : 75;

    const { students, allStudents, sessions, stats } = await computeReportData(
      { year, semester, department, subject },
      reportType || 'all',
      threshold
    );

    // Create a new Excel Workbook
    const workbook = XLSX.utils.book_new();

    // ----------------------------------------------------
    // Sheet 1: ATTENDANCE SUMMARY SHEET
    // ----------------------------------------------------
    const summaryRows = [
      ['COLLEGE ACADEMIC PORTAL - ATTENDANCE REPORT'],
      [`Report Generated On: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`],
      [
        `Filters: Year [${year || 'All'}] | Semester [${semester || 'All'}] | Department [${
          department || 'All'
        }] | Subject [${subject || 'All'}]`,
      ],
      [
        `Summary: Total Students: ${stats.totalStudents} | Classes Conducted: ${stats.totalSessions} | Overall Average: ${stats.overallAvg}% | Defaulters (<${threshold}%): ${stats.defaultersCount}`,
      ],
      [], // Blank row
      [
        'S.No',
        'Roll Number',
        'Registration ID',
        'Student Name',
        'Department',
        'Semester',
        'Total Classes Held',
        'Classes Attended',
        'Classes Absent',
        'Attendance %',
        'Eligibility Status',
        'Notice Remarks',
      ],
    ];

    students.forEach((s, idx) => {
      let remarks = 'Eligible for Examinations';
      if (s.percentage < 60) {
        remarks = `Critical Shortfall: Needs ${s.classesNeededFor75} extra lectures`;
      } else if (s.percentage < threshold) {
        remarks = `Warning: Needs ${s.classesNeededFor75} lectures for 75%`;
      }

      summaryRows.push([
        idx + 1,
        s.rollNumber,
        s.registrationId,
        s.name,
        s.department,
        s.semester,
        s.totalClasses,
        s.attendedClasses,
        s.absentClasses,
        `${s.percentage}%`,
        s.status,
        remarks,
      ]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [
      { wch: 6 },  // S.No
      { wch: 14 }, // Roll Number
      { wch: 18 }, // Registration ID
      { wch: 24 }, // Student Name
      { wch: 32 }, // Department
      { wch: 14 }, // Semester
      { wch: 18 }, // Total Classes
      { wch: 18 }, // Attended
      { wch: 16 }, // Absent
      { wch: 14 }, // %
      { wch: 26 }, // Eligibility Status
      { wch: 40 }, // Remarks
    ];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Attendance Summary');

    // ----------------------------------------------------
    // Sheet 2: DETAILED DATE-WISE SESSION MATRIX
    // ----------------------------------------------------
    if (sessions.length > 0) {
      const matrixHeaders = [
        'Roll Number',
        'Registration ID',
        'Student Name',
        ...sessions.map((sess) => `${sess.date} (${sess.subject})`),
        'Total Attended',
        'Total Held',
        'Percentage',
      ];

      const matrixRows = [
        ['DETAILED DATE-WISE SESSION ATTENDANCE MATRIX'],
        [`Year: ${year || 'All'} | Total Sessions: ${sessions.length}`],
        [],
        matrixHeaders,
      ];

      allStudents.forEach((student) => {
        const row = [student.rollNumber, student.registrationId, student.name];

        sessions.forEach((sess) => {
          const rec = sess.records.find(
            (r) =>
              (r.studentId && r.studentId.toString() === student.studentId.toString()) ||
              (r.rollNumber && r.rollNumber.toUpperCase() === student.rollNumber.toUpperCase())
          );
          row.push(rec ? (rec.status === 'Present' ? 'P' : 'A') : '-');
        });

        row.push(student.attendedClasses);
        row.push(student.totalClasses);
        row.push(`${student.percentage}%`);
        matrixRows.push(row);
      });

      const matrixSheet = XLSX.utils.aoa_to_sheet(matrixRows);
      matrixSheet['!cols'] = [
        { wch: 14 },
        { wch: 18 },
        { wch: 24 },
        ...sessions.map(() => ({ wch: 18 })),
        { wch: 14 },
        { wch: 12 },
        { wch: 14 },
      ];
      XLSX.utils.book_append_sheet(workbook, matrixSheet, 'Date-wise Matrix');
    }

    // ----------------------------------------------------
    // Sheet 3: SHORT ATTENDANCE / DEFAULTERS LIST (< 75%)
    // ----------------------------------------------------
    const defaulters = allStudents.filter((s) => s.isDefaulter);
    const defaulterRows = [
      ['ACADEMIC DISCIPLINE COMMITTEE - DEFAULTERS LIST (< 75% ATTENDANCE)'],
      [`Academic Requirement: Mandatory Minimum ${threshold}% Attendance`],
      [`Generated On: ${new Date().toLocaleString('en-IN')}`],
      [],
      [
        'S.No',
        'Roll Number',
        'Registration ID',
        'Student Name',
        'Department',
        'Semester',
        'Attended / Total Held',
        'Current %',
        'Shortfall Classes Needed',
        'Action Required',
      ],
    ];

    if (defaulters.length === 0) {
      defaulterRows.push([1, 'N/A', 'N/A', 'No students found below 75% attendance threshold!', '', '', '', '', '', '']);
    } else {
      defaulters.forEach((d, i) => {
        defaulterRows.push([
          i + 1,
          d.rollNumber,
          d.registrationId,
          d.name,
          d.department,
          d.semester,
          `${d.attendedClasses} / ${d.totalClasses}`,
          `${d.percentage}%`,
          d.classesNeededFor75,
          d.percentage < 60
            ? 'Parent Call & Debarment Notice'
            : 'Warning Letter & Extra Assignments',
        ]);
      });
    }

    const defaulterSheet = XLSX.utils.aoa_to_sheet(defaulterRows);
    defaulterSheet['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 18 },
      { wch: 24 },
      { wch: 30 },
      { wch: 14 },
      { wch: 22 },
      { wch: 12 },
      { wch: 24 },
      { wch: 35 },
    ];
    XLSX.utils.book_append_sheet(workbook, defaulterSheet, 'Defaulters Notice (<75%)');

    // ----------------------------------------------------
    // Sheet 4: SESSIONS LOG SHEET
    // ----------------------------------------------------
    if (sessions.length > 0) {
      const sessionLogRows = [
        ['LECTURE SESSIONS CONDUCTED IN SELECTED TIMEFRAME'],
        [],
        [
          'S.No',
          'Date',
          'Subject',
          'Semester',
          'Total Enrolled',
          'Students Present',
          'Students Absent',
          'Session Attendance %',
        ],
      ];

      sessions.forEach((sess, i) => {
        let present = 0;
        let total = sess.records.length;
        sess.records.forEach((r) => {
          if (r.status === 'Present') present++;
        });
        const sessPct = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0;

        sessionLogRows.push([
          i + 1,
          sess.date,
          sess.subject,
          sess.semester,
          total,
          present,
          total - present,
          `${sessPct}%`,
        ]);
      });

      const sessionSheet = XLSX.utils.aoa_to_sheet(sessionLogRows);
      sessionSheet['!cols'] = [
        { wch: 6 },
        { wch: 14 },
        { wch: 30 },
        { wch: 14 },
        { wch: 16 },
        { wch: 18 },
        { wch: 16 },
        { wch: 22 },
      ];
      XLSX.utils.book_append_sheet(workbook, sessionSheet, 'Sessions Log');
    }

    // Write binary buffer
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer',
    });

    const safeYear = year && year !== 'All' ? year : 'AllYears';
    const safeSem = semester && semester !== 'All' ? semester.replace(/\s+/g, '_') : 'AllSem';
    const filename = `Attendance_Report_${safeYear}_${safeSem}_${Date.now()}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Length', excelBuffer.length);

    return res.send(excelBuffer);
  } catch (error) {
    console.error('[Report Export Excel Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate Excel attendance report',
      error: error.message,
    });
  }
});

module.exports = router;
