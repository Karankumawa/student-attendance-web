import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Save,
  CheckCheck,
  RotateCcw,
  Users,
  Search,
  Filter,
  BarChart3,
  ClipboardCheck,
  Clock,
  Sparkles,
  BookOpen,
  ArrowRight,
  Trash2,
  AlertCircle,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import ConfirmModal from '../components/ConfirmModal';

const getLocalDateString = (d = new Date()) => {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const SEMESTERS = [
  'Semester 1',
  'Semester 2',
  'Semester 3',
  'Semester 4',
  'Semester 5',
  'Semester 6',
  'Semester 7',
  'Semester 8',
];

const DEFAULT_SUBJECTS = [
  'Data Structures & Algorithms',
  'Database Management Systems',
  'Operating Systems',
  'Computer Networks',
  'Software Engineering',
  'Web Development & Cloud',
  'Artificial Intelligence & ML',
  'Seminar & Project Mentorship',
];

export const AttendanceView = ({ initialSession, showToast, setActiveView }) => {
  const [activeTab, setActiveTab] = useState('take'); // 'take' or 'summary'

  // Take Attendance Controls
  const [date, setDate] = useState(
    initialSession?.date || getLocalDateString()
  );
  const [semester, setSemester] = useState(initialSession?.semester || 'Semester 4');
  const [subject, setSubject] = useState(
    initialSession?.subject || 'Data Structures & Algorithms'
  );
  const [customSubject, setCustomSubject] = useState('');

  // Attendance Roster State
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({}); // { [studentId]: 'Present' | 'Absent' }
  const [rosterSearch, setRosterSearch] = useState('');
  const [isSavedSession, setIsSavedSession] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);

  // Summary / Percentage Tab State
  const [summaryData, setSummaryData] = useState([]);
  const [summarySemester, setSummarySemester] = useState('All');
  const [summarySearch, setSummarySearch] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Past Sessions History & Delete Confirmation
  const [sessionsHistory, setSessionsHistory] = useState([]);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  // Load roster whenever date, semester, or subject changes
  useEffect(() => {
    if (activeTab === 'take') {
      loadSessionAttendance();
    }
  }, [date, semester, subject, activeTab]);

  // Load summary whenever switching to summary tab or changing summary filter
  useEffect(() => {
    if (activeTab === 'summary') {
      fetchSummary();
      fetchSessionsHistory();
    }
  }, [activeTab, summarySemester]);

  const effectiveSubject = customSubject.trim() || subject;

  const loadSessionAttendance = async () => {
    try {
      setLoadingRoster(true);
      // 1. Fetch all students for the chosen semester
      const studentRes = await axiosClient.get(`/students?semester=${semester}`);
      const semesterStudents = studentRes.data.data || [];
      setStudents(semesterStudents);

      // 2. Fetch if attendance already exists for this date, subject, and semester
      const attRes = await axiosClient.get(
        `/attendance?date=${date}&subject=${encodeURIComponent(
          effectiveSubject
        )}&semester=${semester}`
      );

      const existingRecord = attRes.data.data;
      const initialMap = {};

      if (existingRecord && existingRecord.records && existingRecord.records.length > 0) {
        setIsSavedSession(true);
        // Map saved statuses
        existingRecord.records.forEach((rec) => {
          initialMap[rec.studentId] = rec.status;
        });

        // Any newly added students not in the saved record default to Present
        semesterStudents.forEach((st) => {
          if (!initialMap[st._id]) {
            initialMap[st._id] = 'Present';
          }
        });
      } else {
        setIsSavedSession(false);
        // Fresh session: default all students to 'Present'
        semesterStudents.forEach((st) => {
          initialMap[st._id] = 'Present';
        });
      }

      setRecords(initialMap);
    } catch (err) {
      console.error('Error loading session attendance:', err);
      showToast?.({ message: 'Error loading attendance roster', type: 'error' });
    } finally {
      setLoadingRoster(false);
    }
  };

  const toggleStudentStatus = (studentId) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present',
    }));
  };

  const setStatus = (studentId, status) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const markAll = (status) => {
    const updated = {};
    students.forEach((s) => {
      updated[s._id] = status;
    });
    setRecords(updated);
    showToast?.({
      message: `Marked all students as ${status}`,
      type: 'info',
    });
  };

  const handleSaveAttendance = async () => {
    if (!effectiveSubject.trim()) {
      showToast?.({ message: 'Please specify a course subject name', type: 'error' });
      return;
    }

    if (students.length === 0) {
      showToast?.({ message: 'No students found for this semester to record', type: 'error' });
      return;
    }

    try {
      setSaving(true);
      const payloadRecords = students.map((s) => ({
        studentId: s._id,
        rollNumber: s.rollNumber,
        name: s.name,
        status: records[s._id] || 'Present',
      }));

      const res = await axiosClient.post('/attendance', {
        date,
        subject: effectiveSubject,
        semester,
        records: payloadRecords,
      });

      if (res.data.success) {
        setIsSavedSession(true);
        showToast?.({
          message: `Attendance saved successfully for ${effectiveSubject} on ${date}!`,
          type: 'success',
        });
      }
    } catch (err) {
      console.error('Error saving attendance:', err);
      showToast?.({
        message: err.response?.data?.message || 'Failed to save attendance',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const fetchSummary = async () => {
    try {
      setLoadingSummary(true);
      const res = await axiosClient.get(`/attendance/summary?semester=${summarySemester}`);
      if (res.data.success) {
        setSummaryData(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchSessionsHistory = async () => {
    try {
      const res = await axiosClient.get('/attendance/history');
      if (res.data.success) {
        setSessionsHistory(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    try {
      const res = await axiosClient.delete(`/attendance/${sessionToDelete._id}`);
      if (res.data.success) {
        showToast?.({ message: 'Attendance record deleted successfully', type: 'info' });
        setSessionToDelete(null);
        fetchSessionsHistory();
        fetchSummary();
      }
    } catch (err) {
      showToast?.({ message: 'Failed to delete record', type: 'error' });
    }
  };

  // Calculations for current active roster
  const presentCount = Object.values(records).filter((s) => s === 'Present').length;
  const absentCount = Object.values(records).filter((s) => s === 'Absent').length;
  const attendanceRate =
    students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

  // Filtered Roster for Taking Attendance
  const filteredRosterStudents = students.filter((s) => {
    if (!rosterSearch.trim()) return true;
    const term = rosterSearch.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.rollNumber.toLowerCase().includes(term) ||
      (s.registrationId && s.registrationId.toLowerCase().includes(term))
    );
  });

  // Filtered Summary for search
  const filteredSummary = summaryData.filter((st) => {
    if (!summarySearch.trim()) return true;
    const term = summarySearch.toLowerCase();
    return (
      st.name.toLowerCase().includes(term) ||
      st.rollNumber.toLowerCase().includes(term) ||
      st.department.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Modern Top Tab Navigator */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('take')}
            className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'take'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Mark Class Attendance</span>
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'summary'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Attendance History & Percentage Analytics</span>
          </button>
        </div>
        {setActiveView && (
          <button
            onClick={() => setActiveView('reports')}
            className="flex items-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/70 transition-all cursor-pointer shadow-xs ml-auto"
            title="Download Past Years Attendance in Excel format"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Reports Download</span>
          </button>
        )}
      </div>

      {activeTab === 'take' ? (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Session Configuration Parameters
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Attendance Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Semester Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Target Semester
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all cursor-pointer"
                >
                  {SEMESTERS.map((sem) => (
                    <option key={sem} value={sem}>
                      {sem}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Subject / Course
                </label>
                <select
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    setCustomSubject('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all cursor-pointer"
                >
                  {DEFAULT_SUBJECTS.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                  <option value="Other">Other / Custom Course...</option>
                </select>
              </div>

              {/* Optional Custom Subject or Session Status Indicator */}
              <div>
                {subject === 'Other' ? (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Enter Custom Subject
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Distributed Systems"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Database Sync Status
                    </label>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border bg-slate-50/80 text-xs font-semibold">
                      {isSavedSession ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-emerald-700">Existing Saved Session</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="text-amber-700">New Attendance Session</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Toolbar & Live Stats */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Quick Batch Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
                Batch Actions:
              </span>
              <button
                type="button"
                onClick={() => markAll('Present')}
                className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/70 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Mark All Present</span>
              </button>
              <button
                type="button"
                onClick={() => markAll('Absent')}
                className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/70 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <XCircle className="w-4 h-4" />
                <span>Mark All Absent</span>
              </button>
            </div>

            {/* Right: Live Counter Badges & Save Button */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                  Total: {students.length}
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                  Present: {presentCount}
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-100">
                  Absent: {absentCount}
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                  {attendanceRate}%
                </span>
              </div>

              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={saving || students.length === 0}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-98"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isSavedSession ? 'Update Attendance' : 'Save Attendance'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
            <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Class Student Roster ({students.length} Students)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click the toggle buttons to switch attendance status between Present and Absent
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search roster..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className="pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-44 sm:w-52"
                  />
                  {rosterSearch && (
                    <button
                      type="button"
                      onClick={() => setRosterSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 shrink-0 border border-slate-200/60">
                  {semester}
                </span>
              </div>
            </div>

            {loadingRoster ? (
              <div className="py-20 text-center">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">Loading students...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="py-20 text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No students found in {semester}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Add students to this semester in the Student Register view to take attendance.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                      <th className="py-3.5 px-6">#</th>
                      <th className="py-3.5 px-6">Roll Number</th>
                      <th className="py-3.5 px-6">Student Name</th>
                      <th className="py-3.5 px-6">Department</th>
                      <th className="py-3.5 px-6 text-center">Current Status</th>
                      <th className="py-3.5 px-6 text-right">Quick Toggle Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredRosterStudents.map((student, index) => {
                      const isPresent = records[student._id] !== 'Absent';
                      const initial = student.name ? student.name.charAt(0).toUpperCase() : '?';

                      return (
                        <tr
                          key={student._id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            !isPresent ? 'bg-rose-50/20' : ''
                          }`}
                        >
                          <td className="py-3.5 px-6 text-xs text-slate-400 font-medium">
                            {index + 1}
                          </td>
                          <td className="py-3.5 px-6 font-mono font-bold text-xs text-slate-900">
                            {student.rollNumber}
                          </td>
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                                {initial}
                              </div>
                              <div className="font-bold text-slate-800">{student.name}</div>
                            </div>
                          </td>
                          <td className="py-3.5 px-6 text-xs text-slate-500">
                            {student.department}
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                isPresent
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {isPresent ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <span>Present</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                                  <span>Absent</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200/80">
                              <button
                                type="button"
                                onClick={() => setStatus(student._id, 'Present')}
                                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                  isPresent
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-emerald-700'
                                }`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => setStatus(student._id, 'Absent')}
                                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                  !isPresent
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-rose-700'
                                }`}
                              >
                                Absent
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Secondary Tab: Attendance History & Percentage Analytics */
        <div className="space-y-6">
          {/* Summary Filters */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Semester Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Semester:
                </span>
                <select
                  value={summarySemester}
                  onChange={(e) => setSummarySemester(e.target.value)}
                  className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="All">All Semesters</option>
                  {SEMESTERS.map((sem) => (
                    <option key={sem} value={sem}>
                      {sem}
                    </option>
                  ))}
                </select>
              </div>

              {/* Threshold Legend */}
              <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-slate-200 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> &ge; 75% Eligible
                </span>
                <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> 60-74% Warning
                </span>
                <span className="flex items-center gap-1.5 text-rose-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> &lt; 60% Defaulter
                </span>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search student or roll #..."
                value={summarySearch}
                onChange={(e) => setSummarySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Student Compliance Summary Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Cumulative Student Attendance Compliance
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Total classes attended across all recorded lectures and sessions
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                {filteredSummary.length} Students Evaluated
              </span>
            </div>

            {loadingSummary ? (
              <div className="py-20 text-center">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">Calculating attendance summary...</p>
              </div>
            ) : filteredSummary.length === 0 ? (
              <div className="py-20 text-center">
                <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No attendance data found</p>
                <p className="text-xs text-slate-500 mt-1">Take class attendance to populate statistics.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                      <th className="py-3.5 px-6">Roll Number</th>
                      <th className="py-3.5 px-6">Student Name</th>
                      <th className="py-3.5 px-6">Semester</th>
                      <th className="py-3.5 px-6 text-center">Attended / Total</th>
                      <th className="py-3.5 px-6">Percentage</th>
                      <th className="py-3.5 px-6 text-right">Academic Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredSummary.map((item) => {
                      let colorClass = 'bg-emerald-500';
                      let badgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                      let statusText = 'Eligible (Good)';

                      if (item.totalClasses > 0 && item.percentage < 60) {
                        colorClass = 'bg-rose-500';
                        badgeBg = 'bg-rose-50 text-rose-800 border-rose-200';
                        statusText = 'Ineligible (Defaulter)';
                      } else if (item.totalClasses > 0 && item.percentage < 75) {
                        colorClass = 'bg-amber-500';
                        badgeBg = 'bg-amber-50 text-amber-800 border-amber-200';
                        statusText = 'Warning Zone';
                      }

                      return (
                        <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-6 font-mono font-bold text-xs text-slate-900">
                            {item.rollNumber}
                          </td>
                          <td className="py-3.5 px-6 font-bold text-slate-800">
                            {item.name}
                          </td>
                          <td className="py-3.5 px-6 text-xs text-slate-500 font-medium">
                            {item.semester}
                          </td>
                          <td className="py-3.5 px-6 text-center font-mono text-xs font-bold text-slate-700">
                            {item.attendedClasses} / {item.totalClasses}
                          </td>
                          <td className="py-3.5 px-6">
                            <div className="w-full max-w-[160px]">
                              <div className="flex items-center justify-between text-xs font-bold mb-1">
                                <span className="text-slate-800">{item.percentage}%</span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${badgeBg}`}
                            >
                              {statusText}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Past Attendance Sessions Log */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Recent Attendance Sessions Log
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Recorded sessions stored in MongoDB. Click "Load Session" to inspect or edit records.
            </p>

            {sessionsHistory.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No past sessions recorded yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessionsHistory.map((sess) => {
                  const present = sess.records.filter((r) => r.status === 'Present').length;
                  const total = sess.records.length;
                  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

                  return (
                    <div
                      key={sess._id}
                      className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100/70">
                            {sess.date}
                          </span>
                          <span className="text-[11px] font-bold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded-md">
                            {sess.semester}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1 mt-1">
                          {sess.subject}
                        </h4>
                        <div className="text-xs text-slate-500 mt-2">
                          Present: <span className="font-bold text-emerald-600">{present}</span> / {total} students ({rate}%)
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                        <button
                          onClick={() => {
                            setDate(sess.date);
                            setSemester(sess.semester);
                            setSubject(sess.subject);
                            setActiveTab('take');
                          }}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                        >
                          <span>Load Session</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSessionToDelete(sess)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Attendance Session Modal */}
      <ConfirmModal
        isOpen={Boolean(sessionToDelete)}
        title="Delete Attendance Session?"
        message={`Are you sure you want to delete the attendance record for "${sessionToDelete?.subject}" on ${sessionToDelete?.date}? All marked student records for this lecture will be permanently removed.`}
        onConfirm={confirmDeleteSession}
        onCancel={() => setSessionToDelete(null)}
        confirmText="Delete Session"
        isDanger={true}
      />
    </div>
  );
};

export default AttendanceView;
