const express = require('express');
const XLSX = require('xlsx');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Timetable = require('../models/Timetable');
const Subject = require('../models/Subject');
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const { getLocalDateString } = require('../utils/timeHelper');

const router = express.Router();

// Apply auth protection & Admin check strictly to all report routes
router.use(protect);
router.use(requireAdmin);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Helper to compute date & filter queries
 * Supports:
 * - 'day': specific date (YYYY-MM-DD)
 * - 'month': specific month (1-12) and year
 * - 'all' / cumulative: whole year or all records
 */
const buildReportFilter = (query) => {
  const { year, semester, department, subject, startDate, endDate, reportPeriod, date, month } = query;

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

  let period = reportPeriod || 'all'; // 'all' | 'month' | 'day'
  let periodLabel = 'Full Session / Cumulative';
  let resolvedDate = date || null;
  let resolvedMonth = month || null;

  if (period === 'day') {
    if (!resolvedDate) {
      resolvedDate = getLocalDateString();
    }
    attendanceQuery.date = resolvedDate;
    periodLabel = `Day-wise: ${resolvedDate}`;
  } else if (period === 'month') {
    const yyyy = year && year !== 'All' ? String(year) : String(new Date().getFullYear());
    const rawMonthNum = resolvedMonth ? parseInt(resolvedMonth, 10) : new Date().getMonth() + 1;
    const monthNum = Number.isInteger(rawMonthNum) && rawMonthNum >= 1 && rawMonthNum <= 12
      ? rawMonthNum
      : new Date().getMonth() + 1;
    const mm = String(monthNum).padStart(2, '0');
    resolvedMonth = mm;
    const lastDay = new Date(parseInt(yyyy, 10), monthNum, 0).getDate();
    const startDateOfMonth = `${yyyy}-${mm}-01`;
    const endDateOfMonth = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
    attendanceQuery.date = { $gte: startDateOfMonth, $lte: endDateOfMonth };

    const monthName = MONTH_NAMES[monthNum - 1] || `Month ${mm}`;
    periodLabel = `Month-wise: ${monthName} ${yyyy}`;
  } else if (startDate && endDate) {
    attendanceQuery.date = { $gte: startDate, $lte: endDate };
    periodLabel = `Custom Range: ${startDate} to ${endDate}`;
  } else if (year && year !== 'All') {
    attendanceQuery.date = { $gte: `${year}-01-01`, $lte: `${year}-12-31` };
    periodLabel = `Academic Year ${year}`;
  }

  return {
    studentQuery,
    attendanceQuery,
    meta: {
      reportPeriod: period,
      date: resolvedDate,
      month: resolvedMonth,
      year: year || null,
      periodLabel,
    },
  };
};

/**
 * Helper: Aggregate Attendance Metrics from Database
 */
const computeReportData = async (filters, reportType = 'all', minAttendance = 75) => {
  const { studentQuery, attendanceQuery, meta } = buildReportFilter(filters);

  // Parallel fetch students & sessions as lean plain objects
  const [students, sessions] = await Promise.all([
    Student.find(studentQuery).sort({ rollNumber: 1 }).lean(),
    Attendance.find(attendanceQuery).sort({ date: 1, subject: 1 }).lean(),
  ]);

  // Pre-index session records into fast lookup maps: O(S * R) setup vs O(N * S * R) repeated search
  const sessionLookups = sessions.map((sess) => {
    const statusByStudentId = new Map();
    const statusByRoll = new Map();
    const sessionSem = (sess.semester || '').trim().toLowerCase();

    for (const rec of sess.records || []) {
      if (rec.studentId) statusByStudentId.set(String(rec.studentId), rec.status);
      if (rec.rollNumber) statusByRoll.set(String(rec.rollNumber).toUpperCase(), rec.status);
    }

    return {
      date: sess.date,
      subject: sess.subject,
      semester: sess.semester,
      sessionSem,
      statusByStudentId,
      statusByRoll,
    };
  });

  // Map student attendance scoped specifically to each student with O(1) record lookups
  const studentReports = students.map((student, index) => {
    const studentIdStr = String(student._id);
    const studentRollUpper = (student.rollNumber || '').toUpperCase();
    const studentSem = (student.semester || '').trim().toLowerCase();

    let attended = 0;
    let absent = 0;
    let totalClasses = 0;
    const sessionDetails = [];

    for (const sess of sessionLookups) {
      const isSameSemester = sess.sessionSem && studentSem && sess.sessionSem === studentSem;
      const recordStatus =
        sess.statusByStudentId.get(studentIdStr) ||
        sess.statusByRoll.get(studentRollUpper);

      if (isSameSemester || recordStatus !== undefined) {
        totalClasses += 1;
        const status = recordStatus || 'Absent';
        if (status === 'Present') {
          attended++;
        } else {
          absent++;
        }

        sessionDetails.push({
          date: sess.date,
          subject: sess.subject,
          semester: sess.semester,
          status: status,
        });
      }
    }
    const percentage = totalClasses > 0 ? Number(((attended / totalClasses) * 100).toFixed(1)) : 0;

    let statusLabel = 'Eligible';
    let isDefaulter = false;
    let classesNeededFor75 = 0;
    let dayStatus = 'No Classes';

    if (meta.reportPeriod === 'day') {
      if (totalClasses === 0) {
        statusLabel = 'No Classes Held';
        dayStatus = 'No Classes';
        isDefaulter = false;
      } else if (attended === totalClasses) {
        statusLabel = 'Present';
        dayStatus = 'Present';
        isDefaulter = false;
      } else if (attended === 0) {
        statusLabel = 'Absent';
        dayStatus = 'Absent';
        isDefaulter = true;
      } else {
        statusLabel = `Partial (${attended}/${totalClasses})`;
        dayStatus = 'Partial';
        isDefaulter = false;
      }
      classesNeededFor75 = absent > 0 ? absent : 0;
    } else {
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
      dayStatus,
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
  let defaultersCount = 0;
  let eligibleCount = 0;
  let noClassesCount = 0;
  let dayPresentCount = 0;
  let dayAbsentCount = 0;

  if (meta.reportPeriod === 'day') {
    dayPresentCount = studentReports.filter((s) => s.attendedClasses > 0).length;
    dayAbsentCount = studentReports.filter((s) => s.totalClasses > 0 && s.attendedClasses === 0).length;
    noClassesCount = studentReports.filter((s) => s.totalClasses === 0).length;
    defaultersCount = dayAbsentCount;
    eligibleCount = dayPresentCount;
  } else {
    defaultersCount = studentReports.filter((s) => s.isDefaulter).length;
    eligibleCount = studentReports.filter((s) => s.totalClasses > 0 && !s.isDefaulter).length;
    noClassesCount = studentReports.filter((s) => s.totalClasses === 0).length;
  }

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
    meta,
    stats: {
      totalStudents,
      matchedStudents: filteredStudents.length,
      totalSessions: sessions.length,
      overallAvg,
      defaultersCount,
      eligibleCount,
      noClassesCount,
      dayPresentCount,
      dayAbsentCount,
      minAttendanceThreshold: minAttendance,
      reportPeriod: meta.reportPeriod,
      periodLabel: meta.periodLabel,
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
    const [
      distinctDates,
      totalRecordsInDb,
      departments,
      semesters,
      catalogSubjects,
      attendanceSubjects,
      timetableSubjects,
    ] = await Promise.all([
      Attendance.distinct('date'),
      Attendance.countDocuments(),
      Student.distinct('department'),
      Student.distinct('semester'),
      Subject.distinct('name'),
      Attendance.distinct('subject'),
      Timetable.distinct('subject'),
    ]);

    const dbYears = Array.from(
      new Set(
        distinctDates
          .map((d) => (d ? String(d).slice(0, 4) : null))
          .filter((y) => y && /^\d{4}$/.test(y))
      )
    );

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
        totalRecordsInDb,
        months: [
          { value: '01', label: 'January' },
          { value: '02', label: 'February' },
          { value: '03', label: 'March' },
          { value: '04', label: 'April' },
          { value: '05', label: 'May' },
          { value: '06', label: 'June' },
          { value: '07', label: 'July' },
          { value: '08', label: 'August' },
          { value: '09', label: 'September' },
          { value: '10', label: 'October' },
          { value: '11', label: 'November' },
          { value: '12', label: 'December' },
        ],
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
 * @desc    Generate attendance report preview with statistics (supports day-wise, month-wise, cumulative)
 * @access  Private (Admin Only)
 */
router.get('/preview', async (req, res) => {
  try {
    const { year, semester, department, subject, reportType, minAttendance, startDate, endDate, reportPeriod, date, month } = req.query;

    const threshold = minAttendance ? Number(minAttendance) : 75;
    const { students, stats, sessions, meta } = await computeReportData(
      { year, semester, department, subject, startDate, endDate, reportPeriod, date, month },
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
      meta,
      sessionHeaders,
      students,
      filtersApplied: {
        year: year || 'All',
        semester: semester || 'All',
        department: department || 'All',
        subject: subject || 'All',
        reportPeriod: meta.reportPeriod,
        date: meta.date,
        month: meta.month,
        periodLabel: meta.periodLabel,
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
 * @desc    Export attendance report into Excel (.xlsx) supporting Day-wise, Month-wise, and Cumulative scopes
 * @access  Private (Admin Only)
 */
router.get('/export-excel', async (req, res) => {
  try {
    const { year, semester, department, subject, reportType, minAttendance, startDate, endDate, reportPeriod, date, month } = req.query;
    const threshold = minAttendance ? Number(minAttendance) : 75;

    const { students, allStudents, sessions, stats, meta } = await computeReportData(
      { year, semester, department, subject, startDate, endDate, reportPeriod, date, month },
      reportType || 'all',
      threshold
    );

    const workbook = XLSX.utils.book_new();
    const formattedDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const safeYear = year && year !== 'All' ? year : 'AllYears';
    const safeSem = semester && semester !== 'All' ? semester.replace(/\s+/g, '_') : 'AllSem';

    // ----------------------------------------------------
    // Scenario A: DAY-WISE EXCEL REPORT
    // ----------------------------------------------------
    if (meta.reportPeriod === 'day') {
      const daySummaryRows = [
        ['SHRINATHJI INSTITUTE OF TECHNOLOGY & ENGINEERING (SNITN - NATHDWARA)'],
        [`DAILY ATTENDANCE & AUDIT REPORT • DATE: ${meta.date}`],
        ['Approved by AICTE, New Delhi | Affiliated to RTU | Nathdwara, Rajasthan'],
        [
          `Scope: Day-wise [${meta.date}] | Academic Year [${year || 'All'}] | Semester [${semester || 'All'}] | Department [${
            department || 'All'
          }] | Subject [${subject || 'All'}]`,
        ],
        [`Report Generated On: ${formattedDate} | Total Lectures Held Today: ${sessions.length}`],
        [],
        ['EXECUTIVE DAILY METRICS DASHBOARD', '', '', '', '', '', '', '', '', '', '', ''],
        [
          'Total Students Enrolled',
          stats.totalStudents,
          'Classes Held Today',
          stats.totalSessions,
          'Daily Attendance Rate',
          `${stats.overallAvg}%`,
          'Present Students Today',
          stats.dayPresentCount,
          'Absent Students Today',
          stats.dayAbsentCount,
          'Daily Audit Status',
          stats.dayAbsentCount > 0 ? 'Absences Recorded' : '100% Attendance',
        ],
        [],
        [
          'S.No',
          'Roll Number',
          'Registration ID',
          'Student Name',
          'Department',
          'Semester',
          'Classes Held Today',
          'Classes Attended',
          'Classes Absent',
          'Daily Turnout (%)',
          'Daily Status',
          'Remarks / Academic Action',
        ],
      ];

      students.forEach((s, idx) => {
        let remarks = 'Full Day Attendance Recorded';
        if (s.totalClasses === 0) {
          remarks = 'No lectures scheduled for this student today';
        } else if (s.dayStatus === 'Absent') {
          remarks = 'Absent in all lectures today (Debarment flag logged)';
        } else if (s.dayStatus === 'Partial') {
          remarks = `Partial Turnout: Attended ${s.attendedClasses} of ${s.totalClasses} classes`;
        }

        daySummaryRows.push([
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
          s.dayStatus,
          remarks,
        ]);
      });

      const daySummarySheet = XLSX.utils.aoa_to_sheet(daySummaryRows);
      daySummarySheet['!cols'] = [
        { wch: 8 },  // S.No
        { wch: 16 }, // Roll Number
        { wch: 20 }, // Registration ID
        { wch: 28 }, // Student Name
        { wch: 34 }, // Department
        { wch: 16 }, // Semester
        { wch: 20 }, // Classes Today
        { wch: 18 }, // Attended
        { wch: 16 }, // Absent
        { wch: 20 }, // Daily Turnout %
        { wch: 22 }, // Daily Status
        { wch: 48 }, // Remarks
      ];

      daySummarySheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 11 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 11 } },
        { s: { r: 4, c: 0 }, e: { r: 4, c: 11 } },
        { s: { r: 6, c: 0 }, e: { r: 6, c: 11 } },
      ];

      daySummarySheet['!autofilter'] = {
        ref: `A10:L${daySummaryRows.length}`,
      };

      XLSX.utils.book_append_sheet(workbook, daySummarySheet, `Day-wise (${meta.date})`);

      // Sheet 2: Sessions conducted on that day
      if (sessions.length > 0) {
        const daySessionRows = [
          ['SHRINATHJI INSTITUTE OF TECHNOLOGY & ENGINEERING (SNITN) - DAILY LECTURES LOG'],
          [`Lectures Conducted on [${meta.date}] | Total Sessions: ${sessions.length}`],
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
          const recList = sess.records || [];
          let total = recList.length;
          recList.forEach((r) => {
            if (r.status === 'Present') present++;
          });
          const sessPct = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0;

          daySessionRows.push([
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

        const daySessionSheet = XLSX.utils.aoa_to_sheet(daySessionRows);
        daySessionSheet['!cols'] = [
          { wch: 8 },
          { wch: 16 },
          { wch: 34 },
          { wch: 16 },
          { wch: 18 },
          { wch: 18 },
          { wch: 16 },
          { wch: 26 },
        ];
        daySessionSheet['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
          { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
        ];
        daySessionSheet['!autofilter'] = {
          ref: `A5:H${daySessionRows.length}`,
        };
        XLSX.utils.book_append_sheet(workbook, daySessionSheet, 'Today Lectures');
      }

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      const filename = `Attendance_Report_DayWise_${meta.date}_${safeSem}.xlsx`;

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Length', excelBuffer.length);
      return res.send(excelBuffer);
    }

    // ----------------------------------------------------
    // Scenario B & C: MONTH-WISE OR CUMULATIVE EXCEL REPORT
    // ----------------------------------------------------
    const isMonthWise = meta.reportPeriod === 'month';
    const mainTitle = isMonthWise
      ? `MONTHLY ATTENDANCE & AUDIT REPORT • ${meta.periodLabel}`
      : 'ATTENDANCE & AUDIT COMPLIANCE REPORT';

    const summaryRows = [
      ['SHRINATHJI INSTITUTE OF TECHNOLOGY & ENGINEERING (SNITN - NATHDWARA)'],
      [mainTitle],
      ['Approved by AICTE, New Delhi | Affiliated to RTU | Nathdwara, Rajasthan'],
      [
        `Audit Parameters: Scope [${meta.periodLabel}] | Academic Year [${year || 'All'}] | Semester [${semester || 'All'}] | Department [${
          department || 'All'
        }] | Subject [${subject || 'All'}]`,
      ],
      [
        `Report Generated On: ${formattedDate} | Statutory Standard: Minimum ${threshold}% Attendance Required`,
      ],
      [],
      ['EXECUTIVE METRICS DASHBOARD', '', '', '', '', '', '', '', '', '', '', ''],
      [
        'Total Students Enrolled',
        stats.totalStudents,
        isMonthWise ? 'Classes Held in Month' : 'Total Sessions Conducted',
        stats.totalSessions,
        isMonthWise ? 'Monthly Average Turnout' : 'Overall Institutional Average',
        `${stats.overallAvg}%`,
        'Eligible Candidates',
        stats.eligibleCount,
        `Defaulters (< ${threshold}%)`,
        stats.defaultersCount,
        'Audit Status',
        stats.defaultersCount > 0 ? 'Action Required' : 'Fully Compliant',
      ],
      [],
      [
        'S.No',
        'Roll Number',
        'Registration ID',
        'Student Name',
        'Department',
        'Semester',
        isMonthWise ? 'Month Classes Held' : 'Total Classes Held',
        'Classes Attended',
        'Classes Absent',
        isMonthWise ? 'Month Turnout (%)' : 'Attendance Rate (%)',
        'Compliance Status',
        'Academic Action / Remarks',
      ],
    ];

    students.forEach((s, idx) => {
      let remarks = 'Eligible for Semester Examinations';
      if (s.totalClasses === 0) {
        remarks = isMonthWise ? 'No classes conducted this month' : 'No classes conducted for this semester';
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
      { wch: 8 },
      { wch: 16 },
      { wch: 20 },
      { wch: 28 },
      { wch: 34 },
      { wch: 16 },
      { wch: 20 },
      { wch: 18 },
      { wch: 16 },
      { wch: 20 },
      { wch: 26 },
      { wch: 48 },
    ];

    summarySheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 11 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 11 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 11 } },
      { s: { r: 6, c: 0 }, e: { r: 6, c: 11 } },
    ];

    summarySheet['!autofilter'] = {
      ref: `A10:L${summaryRows.length}`,
    };

    const summarySheetName = isMonthWise ? `Monthly (${meta.month || 'M'})` : 'Attendance Summary';
    XLSX.utils.book_append_sheet(workbook, summarySheet, summarySheetName);

    // Sheet 2: Session Matrix
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
        [`SHRINATHJI INSTITUTE OF TECHNOLOGY & ENGINEERING (SNITN) - ${isMonthWise ? 'MONTHLY' : 'SESSION'} MATRIX`],
        [`Academic Filter: Scope [${meta.periodLabel}] | Total Sessions: ${sessions.length}`],
        [`Generated On: ${formattedDate}`],
        [],
        matrixHeaders,
      ];

      const matrixSessionLookups = sessions.map((sess) => {
        const statusByStudentId = new Map();
        const statusByRoll = new Map();
        const sessionSem = (sess.semester || '').trim().toLowerCase();
        for (const rec of sess.records || []) {
          if (rec.studentId) statusByStudentId.set(String(rec.studentId), rec.status);
          if (rec.rollNumber) statusByRoll.set(String(rec.rollNumber).toUpperCase(), rec.status);
        }
        return { sessionSem, statusByStudentId, statusByRoll };
      });

      allStudents.forEach((student) => {
        const row = [student.rollNumber, student.registrationId, student.name, student.semester];
        const studentIdStr = String(student.studentId || '');
        const rollUpper = String(student.rollNumber || '').toUpperCase();
        const studentSem = (student.semester || '').trim().toLowerCase();

        matrixSessionLookups.forEach((sess) => {
          const isSameSemester = sess.sessionSem && studentSem && sess.sessionSem === studentSem;
          const status =
            sess.statusByStudentId.get(studentIdStr) ||
            sess.statusByRoll.get(rollUpper);

          if (status !== undefined) {
            row.push(status === 'Present' ? 'P' : 'A');
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

    // Sheet 3: Defaulters List
    const defaulters = allStudents.filter((s) => s.isDefaulter);
    const defaulterRows = [
      ['SHRINATHJI INSTITUTE OF TECHNOLOGY & ENGINEERING (SNITN - NATHDWARA)'],
      [`OFFICIAL NOTICE: SHORT ATTENDANCE / BELOW MANDATORY ${threshold}% (${meta.periodLabel})`],
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
        `Excellent! No students found below the ${threshold}% mandatory attendance threshold.`,
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

    XLSX.utils.book_append_sheet(workbook, defaulterSheet, `Defaulters (<${threshold}%)`);

    // Sheet 4: Sessions Log
    if (sessions.length > 0) {
      const sessionLogRows = [
        ['SHRINATHJI INSTITUTE OF TECHNOLOGY & ENGINEERING (SNITN) - SESSIONS AUDIT LOG'],
        [`Sessions Log for [${meta.periodLabel}] | Total Sessions: ${sessions.length}`],
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
        const recList = sess.records || [];
        let total = recList.length;
        recList.forEach((r) => {
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

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer',
    });

    const filename = isMonthWise
      ? `Attendance_Report_MonthWise_${safeYear}_${meta.month || 'M'}_${safeSem}.xlsx`
      : `Attendance_Report_Cumulative_${safeYear}_${safeSem}_${Date.now()}.xlsx`;

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
