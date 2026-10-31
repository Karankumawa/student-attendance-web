import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  CalendarClock,
  BookOpenCheck,
  KeyRound,
  GraduationCap,
  LogOut,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  Search,
  ExternalLink,
  Eye,
  ShieldCheck,
  AlertCircle,
  FileText,
  User,
  Sparkles,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import SnitLogo from '../components/SnitLogo';

export const StudentPortalView = ({ showToast }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'timetable' | 'notes' | 'security'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data states
  const [dashboardData, setDashboardData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Timetable day selector
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const [selectedDay, setSelectedDay] = useState(
    daysOfWeek.includes(todayName) ? todayName : 'Monday'
  );

  // Notes state
  const [notesSearch, setNotesSearch] = useState('');
  const [viewingNote, setViewingNote] = useState(null);

  // Change Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      setLoading(true);

      // Fetch dashboard overview & stats
      const dashRes = await axiosClient.get('/student-portal/dashboard');
      if (dashRes.data.success) {
        setDashboardData(dashRes.data.data);
      }

      // Fetch personal attendance
      const attRes = await axiosClient.get('/student-portal/attendance');
      if (attRes.data.success) {
        setAttendanceData(attRes.data.data);
      }

      // Fetch timetable
      const ttRes = await axiosClient.get('/student-portal/timetable');
      if (ttRes.data.success) {
        setTimetableSlots(ttRes.data.data || []);
      }

      // Fetch notes
      const notesRes = await axiosClient.get('/student-portal/notes');
      if (notesRes.data.success) {
        setNotes(notesRes.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching student data:', err);
      showToast?.({ message: 'Error loading student portal data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    try {
      setPasswordSubmitting(true);
      const res = await axiosClient.put('/student-portal/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (res.data.success) {
        setPasswordSuccess('Your password has been changed successfully!');
        showToast?.({ message: 'Password updated successfully', type: 'success' });
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const student = dashboardData?.student || user;
  const overall = attendanceData?.overall;
  const filteredNotes = notes.filter((n) => {
    if (!notesSearch.trim()) return true;
    const term = notesSearch.toLowerCase();
    return (
      n.title.toLowerCase().includes(term) ||
      n.subject.toLowerCase().includes(term) ||
      n.content.toLowerCase().includes(term)
    );
  });

  const daySchedule = timetableSlots.filter((s) => s.dayOfWeek === selectedDay);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading student portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 h-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <SnitLogo className="w-10 h-10 shadow-md shadow-indigo-100" size={40} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-slate-900 text-lg leading-tight">SNIT</h1>
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                Student Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {student?.name} • <span className="font-mono font-semibold">{student?.rollNumber}</span> ({student?.semester})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-800">{student?.registrationId || 'STU-ACTIVE'}</span>
            <span className="text-[11px] text-slate-500">{student?.department}</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors border border-slate-200/70 hover:border-rose-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/70">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>My Attendance</span>
          </button>

          <button
            onClick={() => setActiveTab('timetable')}
            className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'timetable'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            <span>My Classes & Schedule</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <BookOpenCheck className="w-4 h-4" />
            <span>Study Notes ({notes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'security'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Change Password</span>
          </button>
        </div>

        {/* ================= VIEW 1: MY ATTENDANCE ================= */}
        {activeTab === 'attendance' && (
          <div className="space-y-6 animate-fade-in">
            {/* Attendance Overview Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Personal Academic Standing</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    Cumulative Attendance Report
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Your personal record across all lecture periods in {student?.semester}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                      {overall?.percentage || 0}%
                    </div>
                    <span
                      className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold ${
                        (overall?.percentage || 0) >= 75
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : (overall?.percentage || 0) >= 60
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {overall?.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stat Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-bold uppercase text-slate-500">Total Classes Held</span>
                  <div className="text-2xl font-extrabold text-slate-800 mt-1">{overall?.totalClasses || 0}</div>
                  <span className="text-[11px] text-slate-400">Recorded by faculty</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-xs font-bold uppercase text-emerald-700">Classes Attended</span>
                  <div className="text-2xl font-extrabold text-emerald-800 mt-1">{overall?.attendedClasses || 0}</div>
                  <span className="text-[11px] text-emerald-600">Present in lecture</span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100">
                  <span className="text-xs font-bold uppercase text-rose-700">Classes Absent</span>
                  <div className="text-2xl font-extrabold text-rose-800 mt-1">{overall?.absentClasses || 0}</div>
                  <span className="text-[11px] text-rose-600">Missed lectures</span>
                </div>
              </div>
            </div>

            {/* Subject-Wise Attendance Breakdown */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-1">Subject-Wise Attendance Breakdown</h3>
              <p className="text-xs text-slate-500 mb-5">Ensure each subject maintains the mandatory 75% threshold.</p>

              {attendanceData?.subjectWise?.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No subject attendance sessions recorded yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {attendanceData?.subjectWise?.map((sub, idx) => {
                    const isGood = sub.percentage >= 75;
                    const isWarn = sub.percentage >= 60 && sub.percentage < 75;

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{sub.subject}</h4>
                            <span
                              className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                                isGood
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isWarn
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {sub.percentage}%
                            </span>
                          </div>

                          <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden my-2">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isGood ? 'bg-emerald-500' : isWarn ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(sub.percentage, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60">
                          <span>
                            Attended: <strong className="text-slate-700">{sub.attendedClasses}</strong> / {sub.totalClasses}
                          </span>
                          <span className="font-semibold text-[11px]">{sub.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Date-Wise Personal History (Only THIS student's records) */}
            <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Your Class Session History</h3>
                  <p className="text-xs text-slate-500">Showing only your personal lecture attendances</p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                  {attendanceData?.history?.length || 0} Recorded Sessions
                </span>
              </div>

              {attendanceData?.history?.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No attendance entries recorded for your semester yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                        <th className="py-3 px-6">Date</th>
                        <th className="py-3 px-6">Subject Name</th>
                        <th className="py-3 px-6">Semester</th>
                        <th className="py-3 px-6 text-right">Your Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceData?.history?.map((rec, idx) => {
                        const isPresent = rec.status === 'Present';

                        return (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-6 font-mono text-xs font-bold text-slate-700">
                              {rec.date}
                            </td>
                            <td className="py-3.5 px-6 font-bold text-slate-800">{rec.subject}</td>
                            <td className="py-3.5 px-6 text-xs text-slate-500">{rec.semester}</td>
                            <td className="py-3.5 px-6 text-right">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                  isPresent
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {isPresent ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Present</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Absent</span>
                                  </>
                                )}
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
          </div>
        )}

        {/* ================= VIEW 2: MY TIMETABLE ================= */}
        {activeTab === 'timetable' && (
          <div className="space-y-6 animate-fade-in">
            {/* Days Tabs */}
            <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/70">
              {daysOfWeek.map((day) => {
                const isSelected = selectedDay === day;
                const isToday = day === todayName;
                const count = timetableSlots.filter((s) => s.dayOfWeek === day).length;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`flex-1 min-w-[120px] py-3 px-3 rounded-xl font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{day}</span>
                      {isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Today" />}
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-indigo-50 text-indigo-700 font-bold' : 'bg-slate-200/60 text-slate-500'
                      }`}
                    >
                      {count} {count === 1 ? 'Period' : 'Periods'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Schedule Cards for Selected Day */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>{selectedDay} Lecture Schedule</span>
                    {selectedDay === todayName && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                        Today
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Classes assigned to {student?.semester}
                  </p>
                </div>
              </div>

              {daySchedule.length === 0 ? (
                <div className="py-16 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">No classes scheduled on {selectedDay}</h4>
                  <p className="text-xs text-slate-400 mt-1">Enjoy your study time or review lecture notes.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {daySchedule.map((slot) => (
                    <div
                      key={slot._id}
                      className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{slot.startTime} - {slot.endTime}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                            {slot.semester}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-slate-900 leading-snug">{slot.subject}</h4>

                        <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{slot.roomNumber || 'Room 101'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= VIEW 3: MY NOTES ================= */}
        {activeTab === 'notes' && (
          <div className="space-y-6 animate-fade-in">
            {/* Search Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
              <div className="relative w-full max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search notes, chapters, topics..."
                  value={notesSearch}
                  onChange={(e) => setNotesSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <span className="text-xs font-bold text-slate-500 hidden sm:inline">
                {filteredNotes.length} Materials for {student?.semester}
              </span>
            </div>

            {/* Notes Grid */}
            {filteredNotes.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800">No notes found</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Your teachers have not uploaded notes for this topic yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredNotes.map((note) => (
                  <div
                    key={note._id}
                    className="group bg-white rounded-3xl border border-slate-200/80 hover:border-indigo-200 p-5 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {note.subject}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {note.semester}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2 mb-2">
                        {note.title}
                      </h3>

                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-4 whitespace-pre-line">
                        {note.content}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => setViewingNote(note)}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Read Note</span>
                      </button>

                      {note.resourceUrl && (
                        <a
                          href={note.resourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span>PDF / Drive</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= VIEW 4: CHANGE PASSWORD ================= */}
        {activeTab === 'security' && (
          <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
            {/* Student ID Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 font-bold text-xl flex items-center justify-center shrink-0 border border-indigo-200">
                {student?.name?.slice(0, 2).toUpperCase() || 'ST'}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{student?.name}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                  <span className="font-mono font-bold text-indigo-600">{student?.registrationId || 'STU-ACTIVE'}</span>
                  <span>•</span>
                  <span>{student?.email}</span>
                  <span>•</span>
                  <span>{student?.semester}</span>
                </div>
              </div>
            </div>

            {/* Password Change Form */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Change Your Password</h3>
                  <p className="text-xs text-slate-500">
                    Update your student portal login credentials securely
                  </p>
                </div>
              </div>

              {passwordError && (
                <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Current Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter current password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    New Password * (Min 6 characters)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter new password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter new password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={passwordSubmitting}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {passwordSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* View Full Note Modal */}
      {viewingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 my-8">
            <button
              onClick={() => setViewingNote(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {viewingNote.subject}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {viewingNote.semester}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                {viewingNote.title}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Published on {new Date(viewingNote.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="p-4 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/80 my-5 text-sm text-slate-800 leading-relaxed font-mono whitespace-pre-wrap overflow-x-auto">
              {viewingNote.content}
            </div>

            {viewingNote.resourceUrl && (
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between mb-5">
                <span className="text-xs font-semibold text-indigo-900">
                  External Course Reference Attached
                </span>
                <a
                  href={viewingNote.resourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <span>Open PDF / Drive</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setViewingNote(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPortalView;
