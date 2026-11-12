const express = require('express');
const XLSX = require('xlsx');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Timetable = require('../models/Timetable');
const Subject = require('../models/Subject');
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

  // Map student attendance scoped specifically to each student's semester / enrolled sessions
  const studentReports = students.map((student, index) => {
    // Determine which sessions apply to this specific student:
    // 1) Session belongs to the student's semester, OR
    // 2) Student has an explicit record in that session (cross-enrolled/elective)
    const studentApplicableSessions = sessions.filter((sess) => {
      const isSameSemester =
        sess.semester &&
        student.semester &&
        sess.semester.trim().toLowerCase() === student.semester.trim().toLowerCase();

      const hasRecord =
        sess.records &&
        sess.records.some(
          (rec) =>
            (rec.studentId && rec.studentId.toString() === student._id.toString()) ||
            (rec.rollNumber && rec.rollNumber.toUpperCase() === student.rollNumber.toUpperCase())
        );

      return isSameSemester || hasRecord;
    });

    let attended = 0;
    let absent = 0;
    const sessionDetails = [];

    // Calculate attendance only on sessions applicable to this student
    studentApplicableSessions.forEach((session) => {
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

    const totalClasses = studentApplicableSessions.length;
    const percentage = totalClasses > 0 ? Number(((attended / totalClasses) * 100).toFixed(1)) : 0;

    let statusLabel = 'Eligible';
    let isDefaulter = false;
    let classesNeededFor75 = 0;

    if (totalClasses === 0) {
      statusLabel = 'No Classes Held';
      isDefaulter = false;
      classesNeededFor75 = 0;
    } else {
      if (percentage < 60) {
        statusLabel = 'Critical Defaulter (<60%)';
      } else if (percentage < minAttendance) {
        statusLabel = `Warning (${percentage}%)`;
      }
      isDefaulter = percentage < minAttendance;
      classesNeededFor75 = Math.max(0, Math.ceil((minAttendance / 100) * totalClasses) - attended);
    }

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
      isDefaulter,
      sessionDetails,
    };
  });

  // Filter based on reportType if requested
  let filteredStudents = studentReports;
  if (reportType === 'defaulters') {
    filteredStudents = studentReports.filter((s) => s.isDefaulter);
  } else if (reportType === 'eligible') {
    filteredStudents = studentReports.filter((s) => s.totalClasses > 0 && !s.isDefaulter);
  }

  // Summary Metrics
  const totalStudents = students.length;
  const defaultersCount = studentReports.filter((s) => s.isDefaulter).length;
  const eligibleCount = studentReports.filter((s) => s.totalClasses > 0 && !s.isDefaulter).length;
  const noClassesCount = studentReports.filter((s) => s.totalClasses === 0).length;

  const studentsWithClasses = studentReports.filter((s) => s.totalClasses > 0);
  const overallAvg =
    studentsWithClasses.length > 0
      ? Number(
          (
            studentsWithClasses.reduce((acc, curr) => acc + curr.percentage, 0) /
            studentsWithClasses.length
          ).toFixed(1)
        )
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
      noClassesCount,
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

    // Distinct subjects from database Subject collection, Attendance & Timetable
    const catalogSubjects = await Subject.distinct('name');
    const attendanceSubjects = await Attendance.distinct('subject');
    const timetableSubjects = await Timetable.distinct('subject');
    const mergedSubjects = Array.from(
      new Set([...catalogSubjects, ...attendanceSubjects, ...timetableSubjects])
    )
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
        subjects: mergedSubjects,
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
    const { year, semester, department, subject, reportType, minAttendance, startDate, endDate } = req.query;

    const threshold = minAttendance ? Number(minAttendance) : 75;
    const { students, stats, sessions } = await computeReportData(
      { year, semester, department, subject, startDate, endDate },
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
    const { year, semester, department, subject, reportType, minAttendance, startDate, endDate } = req.query;
    const threshold = minAttendance ? Number(minAttendance) : 75;

    const { students, allStudents, sessions, stats } = await computeReportData(
      { year, semester, department, subject, startDate, endDate },
      reportType || 'all',
      threshold
    );

    // Create a new Excel Workbook
    const workbook = XLSX.utils.book_new();

    const formattedDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // ----------------------------------------------------
    // Sheet 1: ATTENDANCE SUMMARY & AUDIT COMPLIANCE
    // ----------------------------------------------------
    const summaryRows = [
      ['SHREE NAVCHETAN INSTITUTE OF TECHNOLOGY (SNIT)'],
      ['OFFICIAL ATTENDANCE COMPLIANCE & PERFORMANCE AUDIT REPORT'],
      ['Approved by AICTE, New Delhi | Affiliated to RTU | NAAC Accredited A+ Grade'],
      [
        `Audit Parameters: Academic Year [${year || 'All'}] | Semester [${semester || 'All'}] | Department [${
          department || 'All'
        }] | Subject [${subject || 'All'}]`,
      ],
      [
        `Report Generated On: ${formattedDate} | Statutory Standard: Minimum ${threshold}% Attendance Required`,
      ],
      [], // Blank row 5
      ['EXECUTIVE METRICS DASHBOARD', '', '', '', '', '', '', '', '', '', '', ''],
      [
        'Total Students Enrolled',
        stats.totalStudents,
        'Classes Conducted',
        stats.totalSessions,
        'Overall Institutional Average',
        `${stats.overallAvg}%`,
        'Eligible Candidates',
        stats.eligibleCount,
        'Defaulters (< ' + threshold + '%)',
        stats.defaultersCount,
        'Audit Status',
        stats.defaultersCount > 0 ? 'Action Required' : 'Fully Compliant',
      ],
      [], // Blank row 8
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
        'Attendance Rate (%)',
        'Compliance Status',
        'Academic Action / Remarks',
      ],
    ];

    students.forEach((s, idx) => {
      let remarks = 'Eligible for Semester Examinations';
      if (s.totalClasses === 0) {
        remarks = 'No classes conducted for this semester';
      } else if (s.percentage < 60) {
        remarks = `Critical Shortfall: Needs ${s.classesNeededFor75} extra lectures (Debarment Warning)`;
      } else if (s.percentage < threshold) {
        remarks = `Warning Zone: Needs ${s.classesNeededFor75} lectures for ${threshold}% compliance`;
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
        s.totalClasses === 0 ? 'N/A' : `${s.percentage}%`,
        s.status,
        remarks,
      ]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [
      { wch: 8 },  // S.No
      { wch: 16 }, // Roll Number
      { wch: 20 }, // Registration ID
      { wch: 28 }, // Student Name
      { wch: 34 }, // Department
      { wch: 16 }, // Semester
      { wch: 20 }, // Total Classes Held
      { wch: 18 }, // Attended
      { wch: 16 }, // Absent
      { wch: 20 }, // Attendance %
      { wch: 26 }, // Compliance Status
      { wch: 48 }, // Remarks
    ];

    // Merged headers for professional institutional presentation
    summarySheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }, // Main Title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }, // Subtitle
      { s: { r: 2, c: 0 }, e: { r: 2, c: 11 } }, // Accreditation
      { s: { r: 3, c: 0 }, e: { r: 3, c: 11 } }, // Filters
      { s: { r: 4, c: 0 }, e: { r: 4, c: 11 } }, // Generated Info
      { s: { r: 6, c: 0 }, e: { r: 6, c: 11 } }, // Executive Metrics Dashboard Header
    ];

    // Enable native Excel AutoFilter dropdown on table header row (row index 9 -> Row 10)
    summarySheet['!autofilter'] = {
      ref: `A10:L${summaryRows.length}`,
    };

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Attendance Summary');

    // ----------------------------------------------------
    // Sheet 2: DETAILED DATE-WISE SESSION MATRIX
    // ----------------------------------------------------
    if (sessions.length > 0) {
      const matrixHeaders = [
        'Roll Number',
        'Registration ID',
        'Student Name',
        'Semester',
        ...sessions.map((sess) => `${sess.date} (${sess.subject})`),
        'Total Attended',
        'Total Held',
        'Percentage (%)',
      ];

      const matrixRows = [
        ['SHREE NAVCHETAN INSTITUTE OF TECHNOLOGY - ATTENDANCE MATRIX'],
        [`Academic Filter: Year [${year || 'All'}] | Total Sessions Conducted: ${sessions.length}`],
        [`Generated On: ${formattedDate}`],
        [],
        matrixHeaders,
      ];

      allStudents.forEach((student) => {
        const row = [student.rollNumber, student.registrationId, student.name, student.semester];

        sessions.forEach((sess) => {
          const isSameSemester =
            sess.semester &&
            student.semester &&
            sess.semester.trim().toLowerCase() === student.semester.trim().toLowerCase();

          const rec = sess.records.find(
            (r) =>
              (r.studentId && r.studentId.toString() === student.studentId.toString()) ||
              (r.rollNumber && r.rollNumber.toUpperCase() === student.rollNumber.toUpperCase())
          );

          if (rec) {
            row.push(rec.status === 'Present' ? 'P' : 'A');
          } else if (isSameSemester) {
            row.push('A');
          } else {
            row.push('-');
          }
        });

        row.push(student.attendedClasses);
        row.push(student.totalClasses);
        row.push(student.totalClasses === 0 ? 'N/A' : `${student.percentage}%`);
        matrixRows.push(row);
      });

      const matrixSheet = XLSX.utils.aoa_to_sheet(matrixRows);
      const totalMatrixCols = matrixHeaders.length;
      matrixSheet['!cols'] = [
        { wch: 16 },
        { wch: 20 },
        { wch: 28 },
        { wch: 16 },
        ...sessions.map(() => ({ wch: 22 })),
        { wch: 16 },
        { wch: 14 },
        { wch: 16 },
      ];

      matrixSheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalMatrixCols - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: totalMatrixCols - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: totalMatrixCols - 1 } },
      ];

      matrixSheet['!autofilter'] = {
        ref: `A5:${XLSX.utils.encode_col(totalMatrixCols - 1)}${matrixRows.length}`,
      };

      XLSX.utils.book_append_sheet(workbook, matrixSheet, 'Date-wise Matrix');
    }

    // ----------------------------------------------------
    // Sheet 3: SHORT ATTENDANCE / DEFAULTERS LIST (< 75%)
    // ----------------------------------------------------
    const defaulters = allStudents.filter((s) => s.isDefaulter);
    const defaulterRows = [
      ['SHREE NAVCHETAN INSTITUTE OF TECHNOLOGY (SNIT)'],
      ['OFFICIAL NOTICE: STUDENTS DEBARRED / BELOW MANDATORY 75% ATTENDANCE'],
      [`Statutory Requirement: Minimum ${threshold}% Attendance as per University Academic Regulations`],
      [`Generated On: ${formattedDate} | Total Shortfall Students: ${defaulters.length}`],
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
        'Shortfall Lectures Needed',
        'Regulatory Action Required',
      ],
    ];

    if (defaulters.length === 0) {
      defaulterRows.push([
        1,
        'N/A',
        'N/A',
        'Excellent! No students found below the 75% mandatory attendance threshold.',
        '-',
        '-',
        '-',
        '-',
        '0',
        'All students eligible for examinations',
      ]);
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
            ? 'DEBARRED: Formal Notice to Parents & Dean Condonation Required'
            : 'ACADEMIC WARNING: Submission of Compensatory Assignments Required',
        ]);
      });
    }

    const defaulterSheet = XLSX.utils.aoa_to_sheet(defaulterRows);
    defaulterSheet['!cols'] = [
      { wch: 8 },
      { wch: 16 },
      { wch: 20 },
      { wch: 28 },
      { wch: 34 },
      { wch: 16 },
      { wch: 24 },
      { wch: 14 },
      { wch: 26 },
      { wch: 48 },
    ];

    defaulterSheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 9 } },
    ];

    defaulterSheet['!autofilter'] = {
      ref: `A6:J${defaulterRows.length}`,
    };

    XLSX.utils.book_append_sheet(workbook, defaulterSheet, 'Defaulters Notice (<75%)');

    // ----------------------------------------------------
    // Sheet 4: SESSIONS LOG SHEET
    // ----------------------------------------------------
    if (sessions.length > 0) {
      const sessionLogRows = [
        ['SHREE NAVCHETAN INSTITUTE OF TECHNOLOGY - SESSIONS AUDIT LOG'],
        [`Sessions Log for Academic Year [${year || 'All'}] | Total Sessions: ${sessions.length}`],
        [`Generated On: ${formattedDate}`],
        [],
        [
          'S.No',
          'Date',
          'Subject Name',
          'Semester',
          'Total Enrolled',
          'Students Present',
          'Students Absent',
          'Session Attendance Rate (%)',
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
        { wch: 8 },
        { wch: 16 },
        { wch: 34 },
        { wch: 16 },
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
        { wch: 26 },
      ];

      sessionSheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
      ];

      sessionSheet['!autofilter'] = {
        ref: `A5:H${sessionLogRows.length}`,
      };

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
