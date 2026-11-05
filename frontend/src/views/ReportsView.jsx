import React, { useState, useEffect, useCallback } from 'react';
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
    subjects: [],
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

  const fetchFilterOptions = useCallback(async () => {
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
  }, []);

  const fetchReportPreview = useCallback(async () => {
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
  }, [selectedYear, selectedSemester, selectedDepartment, selectedSubject, reportType, minAttendance, showToast]);

  // Fetch initial filter options from database
  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  // Fetch report data when filter options load or when manual refresh triggered
  useEffect(() => {
    fetchReportPreview();
  }, [fetchReportPreview]);

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

      // Check if backend returned JSON error inside blob
      if (response.data && response.data.type === 'application/json') {
        const text = await response.data.text();
        const json = JSON.parse(text);
        throw new Error(json.message || 'Excel export failed on server');
      }

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
          message: err.message || 'Error downloading Excel report. Please try again.',
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
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Banner / Hero with Midnight Obsidian Theme */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 border border-slate-800 p-7 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 backdrop-blur-md text-xs font-bold text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Institutional Analytics Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Attendance Reports
            </h1>
            <p className="text-sm md:text-base text-slate-400 leading-relaxed">
              Export student attendance records for past and current academic years in clean Excel (.xlsx) format
              with percentage summaries and attendance lists.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchReportPreview}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-sm font-semibold transition-all hover:scale-102 active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>

            <button
              onClick={handleDownloadExcel}
              disabled={downloading}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-102 active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet className="w-5 h-5 text-white" />
              <span>{downloading ? 'Generating Excel...' : '1-Click Export (.xlsx)'}</span>
              <Download className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Decorative background glows */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -top-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Filter Selection Panel */}
      <div className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/90 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Report Parameters & Filter Criteria</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose academic years, semesters, or departments to customize your Excel report
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200/60">
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all cursor-pointer"
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all cursor-pointer"
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all cursor-pointer"
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all cursor-pointer"
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
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Report View:</span>
            <button
              onClick={() => setReportType('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                reportType === 'all'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Students ({stats.totalStudents})
            </button>
            <button
              onClick={() => setReportType('defaulters')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                reportType === 'defaulters'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Below 75% ({stats.defaultersCount})</span>
            </button>
            <button
              onClick={() => setReportType('eligible')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                reportType === 'eligible'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Above 75% ({stats.eligibleCount})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Threshold:</span>
            <select
              value={minAttendance}
              onChange={(e) => setMinAttendance(Number(e.target.value))}
              className="px-3 py-1.5 text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value={75}>Min 75% (Mandatory Standard)</option>
              <option value={60}>Min 60% (Condonation Limit)</option>
              <option value={80}>Min 80% (Distinction)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Live Statistics Bento Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Students</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.matchedStudents}</h3>
          </div>
        </div>

        {/* Classes Held */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {selectedSemester === 'All' ? 'Total Sessions' : 'Semester Classes'}
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.totalSessions}</h3>
          </div>
        </div>

        {/* Overall Average */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Attendance</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-0.5">{stats.overallAvg}%</h3>
          </div>
        </div>

        {/* Defaulters Count */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Students Below 75%</p>
            <h3 className="text-2xl font-black text-rose-600 mt-0.5">{stats.defaultersCount}</h3>
          </div>
        </div>
      </div>

      {/* Preview Table Header & Search */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Attendance Preview</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing preview for {selectedYear} ({selectedSemester === 'All' ? 'All Semesters - Scoped Per Semester' : selectedSemester}) • Click Excel button above to download full file
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student or roll no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <button
              onClick={handleDownloadExcel}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
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
            <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-sm font-semibold">Calculating attendance metrics from MongoDB...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-2">
              <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-700">No Student Records Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No students or attendance records match the selected filter parameters. Try choosing "All Years" or a
                different semester.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">#</th>
                  <th className="py-3.5 px-4">Roll No</th>
                  <th className="py-3.5 px-4">Registration ID</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Semester</th>
                  <th className="py-3.5 px-4 text-center">Classes</th>
                  <th className="py-3.5 px-4 text-center">Present</th>
                  <th className="py-3.5 px-4 text-center">Absent</th>
                  <th className="py-3.5 px-4 text-center">Attendance %</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.map((s, index) => {
                  const hasHeldClasses = s.totalClasses > 0;
                  const isEligible = hasHeldClasses && s.percentage >= minAttendance;
                  const isWarning = hasHeldClasses && s.percentage >= 60 && s.percentage < minAttendance;

                  return (
                    <tr key={s.studentId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 font-medium">{index + 1}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{s.rollNumber}</td>
                      <td className="py-3.5 px-4 font-mono text-indigo-600 font-semibold">{s.registrationId}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{s.name}</td>
                      <td className="py-3.5 px-4 text-slate-600 truncate max-w-[160px]">{s.department}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                          {s.semester}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-700">{s.totalClasses}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-700">{s.attendedClasses}</td>
                      <td className="py-3.5 px-4 text-center font-semibold text-rose-600">{s.absentClasses}</td>
                      <td className="py-3.5 px-4 text-center">
                        {!hasHeldClasses ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-xs bg-slate-100 text-slate-500 border border-slate-200">
                            N/A
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full font-bold text-xs ${
                              isEligible
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isWarning
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {s.percentage}%
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {!hasHeldClasses ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-500 font-semibold">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>No Classes</span>
                          </span>
                        ) : isEligible ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Eligible</span>
                          </span>
                        ) : isWarning ? (
                          <span className="inline-flex items-center gap-1.5 text-amber-700 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Warning</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-rose-700 font-bold">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Defaulter</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-500">
                        {!hasHeldClasses ? (
                          <span className="text-slate-400 text-[11px] font-medium">No sessions held</span>
                        ) : s.classesNeededFor75 > 0 ? (
                          <span className="text-rose-600 text-[11px] font-semibold">
                            Needs {s.classesNeededFor75} classes for {minAttendance}%
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
            <span className="font-bold text-slate-700">{stats.totalSessions}</span> sessions{' '}
            {selectedSemester === 'All' && (
              <span className="text-slate-400 font-normal">(classes calculated per student's semester)</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Eligible (≥{minAttendance}%)
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-amber-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Warning (60-{minAttendance - 1}%)
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-rose-700">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Defaulter (&lt;60%)
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              No Classes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
