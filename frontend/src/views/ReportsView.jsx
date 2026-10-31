import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  BookOpen,
  Building2,
  ShieldAlert,
  GraduationCap,
  Sparkles,
  Layers,
  Clock,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';

export const ReportsView = ({ showToast }) => {
  // Filter states
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [reportType, setReportType] = useState('all'); // 'all' | 'defaulters' | 'eligible'
  const [minAttendance, setMinAttendance] = useState(75);

  // Dynamic filter options from DB
  const [filterOptions, setFilterOptions] = useState({
    years: ['2026', '2025', '2024', '2023', '2022'],
    departments: ['Computer Science & Engineering', 'Information Technology'],
    semesters: [
      'Semester 1',
      'Semester 2',
      'Semester 3',
      'Semester 4',
      'Semester 5',
      'Semester 6',
      'Semester 7',
      'Semester 8',
    ],
    subjects: [
      'Data Structures & Algorithms',
      'Database Management Systems',
      'Operating Systems',
      'Computer Networks',
      'Web Technologies',
    ],
  });

  // Preview data states
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    matchedStudents: 0,
    totalSessions: 0,
    overallAvg: 0,
    defaultersCount: 0,
    eligibleCount: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch initial filter options from database
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Fetch report data when filter options load or when manual refresh triggered
  useEffect(() => {
    fetchReportPreview();
  }, [selectedYear, selectedSemester, selectedDepartment, selectedSubject, reportType, minAttendance]);

  const fetchFilterOptions = async () => {
    try {
      const res = await axiosClient.get('/reports/filters');
      if (res.data?.success && res.data?.data) {
        setFilterOptions(res.data.data);
        if (res.data.data.years && res.data.data.years.length > 0) {
          // If current year is in list, select it; else pick first
          const currentYearStr = String(new Date().getFullYear());
          if (res.data.data.years.includes(currentYearStr)) {
            setSelectedYear(currentYearStr);
          } else {
            setSelectedYear(res.data.data.years[0]);
          }
        }
      }
    } catch (err) {
      console.warn('Could not load dynamic report filters, fallback to defaults:', err);
    }
  };

  const fetchReportPreview = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/reports/preview', {
        params: {
          year: selectedYear,
          semester: selectedSemester,
          department: selectedDepartment,
          subject: selectedSubject,
          reportType: reportType,
          minAttendance: minAttendance,
        },
      });

      if (res.data?.success) {
        setStudents(res.data.students || []);
        setStats(
          res.data.stats || {
            totalStudents: 0,
            matchedStudents: 0,
            totalSessions: 0,
            overallAvg: 0,
            defaultersCount: 0,
            eligibleCount: 0,
          }
        );
      }
    } catch (err) {
      console.error('Failed to load report preview:', err);
      if (showToast) {
        showToast({
          message: 'Failed to load attendance preview from database.',
          type: 'error',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Excel Download directly from database
  const handleDownloadExcel = async () => {
    setDownloading(true);
    try {
      const response = await axiosClient.get('/reports/export-excel', {
        params: {
          year: selectedYear,
          semester: selectedSemester,
          department: selectedDepartment,
          subject: selectedSubject,
          reportType: reportType,
          minAttendance: minAttendance,
        },
        responseType: 'blob',
      });

      // Extract filename from Content-Disposition header if available
      let filename = `Attendance_Report_${selectedYear}_${selectedSemester}.xlsx`;
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Create download anchor and trigger download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      if (showToast) {
        showToast({
          message: `📊 Excel report "${filename}" downloaded successfully!`,
          type: 'success',
        });
      }
    } catch (err) {
      console.error('Excel export failed:', err);
      if (showToast) {
        showToast({
          message: 'Error downloading Excel report. Please try again.',
          type: 'error',
        });
      }
    } finally {
      setDownloading(false);
    }
  };

  // Filter students by local search query
  const filteredStudents = students.filter((s) => {
    const q = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.rollNumber.toLowerCase().includes(q) ||
      (s.registrationId && s.registrationId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold text-emerald-100 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>Admin Exclusive Feature</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Attendance Reports & 1-Click Excel Export
            </h1>
            <p className="text-sm md:text-base text-emerald-100 leading-relaxed">
              Export past years' and current student attendance records directly from your live MongoDB
              database in native Excel (.xlsx) format with multiple sheets, defaulter analyses, and session breakdowns.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchReportPreview}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>

            <button
              onClick={handleDownloadExcel}
              disabled={downloading}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 text-sm font-bold shadow-lg shadow-black/10 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>{downloading ? 'Generating Excel...' : '1-Click Download Excel (.xlsx)'}</span>
              <Download className="w-4 h-4 text-emerald-600" />
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Filter Selection Panel */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Customize Report Parameters</h2>
              <p className="text-xs text-slate-500">
                Choose academic years, semesters, or departments to customize your Excel report
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
            Total Sessions in DB: {stats.totalSessions}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Year Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Academic Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            >
              <option value="All">All Years (Cumulative)</option>
              {filterOptions.years.map((yr) => (
                <option key={yr} value={yr}>
                  Year {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            >
              <option value="All">All Semesters</option>
              {filterOptions.semesters.map((sem) => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
            </select>
          </div>

          {/* Department Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            >
              <option value="All">All Departments</option>
              {filterOptions.departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            >
              <option value="All">All Subjects (Combined)</option>
              {filterOptions.subjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Report Type & Threshold Selection Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 mr-1">Report View:</span>
            <button
              onClick={() => setReportType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                reportType === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Students ({stats.totalStudents})
            </button>
            <button
              onClick={() => setReportType('defaulters')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                reportType === 'defaulters'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Defaulters Only ({stats.defaultersCount})</span>
            </button>
            <button
              onClick={() => setReportType('eligible')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                reportType === 'eligible'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Eligible Only ({stats.eligibleCount})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">Threshold:</span>
            <select
              value={minAttendance}
              onChange={(e) => setMinAttendance(Number(e.target.value))}
              className="px-2.5 py-1 text-xs font-bold bg-slate-100 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
            >
              <option value={75}>Min 75% (Mandatory Standard)</option>
              <option value={60}>Min 60% (Condonation Limit)</option>
              <option value={80}>Min 80% (Distinction)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Live Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Students In Filter</p>
            <h3 className="text-2xl font-black text-slate-800">{stats.matchedStudents}</h3>
          </div>
        </div>

        {/* Classes Held */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lectures Held</p>
            <h3 className="text-2xl font-black text-slate-800">{stats.totalSessions}</h3>
          </div>
        </div>

        {/* Overall Average */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cohort Average</p>
            <h3 className="text-2xl font-black text-emerald-600">{stats.overallAvg}%</h3>
          </div>
        </div>

        {/* Defaulters Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Defaulters (&lt;75%)</p>
            <h3 className="text-2xl font-black text-rose-600">{stats.defaultersCount}</h3>
          </div>
        </div>
      </div>

      {/* Preview Table Header & Search */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Attendance Preview (Live Database)</h3>
            <p className="text-xs text-slate-500">
              Showing preview for {selectedYear} ({selectedSemester}) • Click Excel button above to download full file
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student or roll no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <button
              onClick={handleDownloadExcel}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs shrink-0"
              title="Download Excel Spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-sm font-semibold">Calculating attendance metrics from MongoDB...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-700">No Student Records Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No students or attendance records match the selected filter parameters. Try choosing "All Years" or a
                different semester.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Registration ID</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Held</th>
                  <th className="py-3 px-4 text-center">Attended</th>
                  <th className="py-3 px-4 text-center">Absent</th>
                  <th className="py-3 px-4 text-center">Attendance %</th>
                  <th className="py-3 px-4">Eligibility Status</th>
                  <th className="py-3 px-4 text-right">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.map((s, index) => {
                  const isEligible = s.percentage >= 75;
                  const isWarning = s.percentage >= 60 && s.percentage < 75;

                  return (
                    <tr key={s.studentId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-medium">{index + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{s.rollNumber}</td>
                      <td className="py-3 px-4 font-mono text-indigo-600 font-semibold">{s.registrationId}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                      <td className="py-3 px-4 text-slate-600 truncate max-w-[160px]">{s.department}</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">{s.totalClasses}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-700">{s.attendedClasses}</td>
                      <td className="py-3 px-4 text-center font-semibold text-rose-600">{s.absentClasses}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full font-bold text-xs ${
                            isEligible
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isWarning
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {s.percentage}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isEligible ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Eligible</span>
                          </span>
                        ) : isWarning ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Warning</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Defaulter</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-500">
                        {s.classesNeededFor75 > 0 ? (
                          <span className="text-rose-600 text-[11px] font-semibold">
                            Needs {s.classesNeededFor75} classes for 75%
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-[11px] font-semibold">Clear</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-700">{filteredStudents.length}</span> students across{' '}
            <span className="font-bold text-slate-700">{stats.totalSessions}</span> sessions
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Eligible (≥75%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Warning (60-74%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Defaulter (&lt;60%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
