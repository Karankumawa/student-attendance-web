import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardCheck,
  CalendarClock,
  BookOpenCheck,
  KeyRound,
  LogOut,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Search,
  ExternalLink,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  FileText,
  User,
  X,
  Lock,
  Phone,
  HeartPulse,
  Users,
  Printer,
  Target,
  MessageSquare,
  Send,
  RefreshCw,
  BadgeCheck,
  Copy,
  Check,
  IdCard,
  GraduationCap,
  Building2,
  QrCode,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import SnitLogo from '../components/SnitLogo';
import { printElementById } from '../utils/printUtils';

// Permanent Institutional Theme for Student Profile Card & Identity Showcase
const PROFILE_THEME = {
  id: 'indigo',
  name: 'Sapphire Academic',
  tag: 'Classic University',
  cardGradient: 'from-indigo-950 via-slate-900 to-slate-950',
  accentText: 'text-indigo-600',
  accentBg: 'bg-indigo-50',
  accentBorder: 'border-indigo-200',
  badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  primaryBtn: 'from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-500/20',
  ringColor: 'focus:ring-indigo-500/20 focus:border-indigo-600',
};

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const clean = timeStr.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*([AaPp][Mm]))?$/);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3] ? match[3].toUpperCase() : null;
  if (modifier === 'PM' && hours < 12) hours += 12;
  else if (modifier === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const formatDobDisplay = (dobStr) => {
  if (!dobStr) return 'Not Provided';
  try {
    const parts = String(dobStr).split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return `${parts[2]}/${parts[1]}/${parts[0]} (${d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })})`;
      }
    }
  } catch {}
  return dobStr;
};

const computeAge = (dobStr) => {
  if (!dobStr) return null;
  try {
    const parts = String(dobStr).split('-');
    if (parts.length === 3) {
      const birthYear = parseInt(parts[0], 10);
      const birthMonth = parseInt(parts[1], 10) - 1;
      const birthDay = parseInt(parts[2], 10);
      const today = new Date();
      let age = today.getFullYear() - birthYear;
      const m = today.getMonth() - birthMonth;
      if (m < 0 || (m === 0 && today.getDate() < birthDay)) {
        age--;
      }
      return age > 0 ? `${age} Years` : null;
    }
  } catch {}
  return null;
};

const getFieldPlaceholder = (field) => {
  switch (field) {
    case 'Contact Phone Number':
      return 'e.g., Update my phone to +91 98765 43210';
    case 'Residential Address':
      return 'e.g., H.No 123, Near City Center, Nathdwara, Rajasthan';
    case 'Date of Birth (DOB)':
      return 'e.g., 2004-05-15 (15 May 2004)';
    case 'Full Name / Spelling':
      return 'e.g., Correct spelling to: Karan Kumawat';
    case 'Gender':
      return 'e.g., Male / Female / Other';
    case 'Blood Group':
      return 'e.g., B+ or O+';
    case 'Parent / Guardian Name':
      return 'e.g., Rajesh Kumawat';
    case 'Guardian Contact Phone':
      return 'e.g., +91 91234 56789';
    case 'Email Address':
      return 'e.g., student.name@gmail.com';
    default:
      return 'Specify the exact new value or modification needed';
  }
};

export const StudentPortalView = ({ showToast }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'timetable' | 'notes' | 'security'

  // Data states
  const [dashboardData, setDashboardData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Timetable day selector
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [todayName] = useState(() =>
    new Date().toLocaleDateString('en-US', { weekday: 'long' })
  );
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].includes(today)
      ? today
      : 'Monday';
  });

  // Notes state
  const [notesSearch, setNotesSearch] = useState('');
  const [viewingNote, setViewingNote] = useState(null);

  // Change Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Profile data (Read-only for student)
  const [profileData, setProfileData] = useState(null);

  // Sub-Tab state for Profile Section
  const [profileSubTab, setProfileSubTab] = useState('overview'); // 'overview' | 'query' | 'history'
  const [copiedField, setCopiedField] = useState(null);

  // Permanent unified profile theme (Sapphire Academic)
  const activeTheme = PROFILE_THEME;

  const handleCopy = (field, value) => {
    if (!value) return;
    try {
      navigator.clipboard.writeText(value);
      setCopiedField(field);
      showToast?.({
        message: `${field} copied to clipboard!`,
        type: 'info',
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback if clipboard API is restricted
    }
  };

  // Student Query / Message states (New Feature)
  const [studentQueries, setStudentQueries] = useState([]);
  const [queriesLoading, setQueriesLoading] = useState(false);
  const [queryForm, setQueryForm] = useState({
    fieldToChange: 'Contact Phone Number',
    requestedChange: '',
    reason: '',
    message: '',
  });
  const [querySubmitting, setQuerySubmitting] = useState(false);
  const [queryError, setQueryError] = useState('');
  const [querySuccess, setQuerySuccess] = useState('');

  const fetchStudentQueries = useCallback(async () => {
    try {
      setQueriesLoading(true);
      const res = await axiosClient.get('/student-portal/queries');
      if (res.data.success) {
        setStudentQueries(res.data.data || []);
      }
    } catch (err) {
      console.warn('Could not load student queries:', err);
    } finally {
      setQueriesLoading(false);
    }
  }, []);

  const fetchStudentData = useCallback(async () => {
    try {
      setLoading(true);

      // Parallelize all student portal resources simultaneously
      const [dashRes, profileRes, attRes, ttRes, notesRes, queriesRes] =
        await Promise.allSettled([
          axiosClient.get('/student-portal/dashboard'),
          axiosClient.get('/student-portal/profile'),
          axiosClient.get('/student-portal/attendance'),
          axiosClient.get('/student-portal/timetable'),
          axiosClient.get('/student-portal/notes'),
          axiosClient.get('/student-portal/queries'),
        ]);

      if (dashRes.status === 'fulfilled' && dashRes.value.data?.success) {
        setDashboardData(dashRes.value.data.data);
      }
      if (profileRes.status === 'fulfilled' && profileRes.value.data?.success) {
        setProfileData(profileRes.value.data.data);
      }
      if (attRes.status === 'fulfilled' && attRes.value.data?.success) {
        setAttendanceData(attRes.value.data.data);
      }
      if (ttRes.status === 'fulfilled' && ttRes.value.data?.success) {
        setTimetableSlots(ttRes.value.data.data || []);
      }
      if (notesRes.status === 'fulfilled' && notesRes.value.data?.success) {
        setNotes(notesRes.value.data.data || []);
      }
      if (queriesRes.status === 'fulfilled' && queriesRes.value.data?.success) {
        setStudentQueries(queriesRes.value.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching student data:', err);
      showToast?.({ message: 'Error loading student portal data', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchStudentData();
      showToast?.({ message: 'Portal data refreshed successfully!', type: 'success' });
    } catch {
      // Handled in fetchStudentData
    } finally {
      setRefreshing(false);
    }
  };

  // Submit profile change query / message to admin
  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    setQueryError('');
    setQuerySuccess('');

    if (!queryForm.fieldToChange?.trim()) {
      setQueryError('Please select which field you want to change.');
      return;
    }
    if (!queryForm.requestedChange?.trim()) {
      setQueryError('Please describe what you want to change (new value / requested detail).');
      return;
    }
    if (!queryForm.reason?.trim()) {
      setQueryError('Please provide a reason why you need this change.');
      return;
    }

    try {
      setQuerySubmitting(true);
      const res = await axiosClient.post('/student-portal/queries', {
        fieldToChange: queryForm.fieldToChange.trim(),
        requestedChange: queryForm.requestedChange.trim(),
        reason: queryForm.reason.trim(),
        message: queryForm.message?.trim() || '',
      });

      if (res.data.success) {
        setQuerySuccess('Your query has been submitted to the administration successfully!');
        showToast?.({ message: 'Query sent to admin successfully!', type: 'success' });
        setQueryForm({
          fieldToChange: 'Contact Phone Number',
          requestedChange: '',
          reason: '',
          message: '',
        });
        fetchStudentQueries();
      }
    } catch (err) {
      console.error('Error submitting query:', err);
      const msg = err.response?.data?.message || 'Failed to submit query to administration';
      setQueryError(msg);
      showToast?.({ message: msg, type: 'error' });
    } finally {
      setQuerySubmitting(false);
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

  const daySchedule = [...timetableSlots.filter((s) => s.dayOfWeek === selectedDay)].sort(
    (a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)
  );

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-100/60">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-700">Loading student portal...</p>
        </div>
      </div>
    );
  }

  const pendingQueriesCount = studentQueries.filter((q) => q.status === 'Pending').length;

  const NAV_TABS = [
    {
      id: 'attendance',
      label: 'My Attendance',
      shortLabel: 'Attendance',
      icon: ClipboardCheck,
    },
    {
      id: 'profile',
      label: pendingQueriesCount > 0 ? `Student ID & Profile (${pendingQueriesCount})` : 'Student ID & Profile',
      shortLabel: 'ID & Profile',
      icon: IdCard,
      badgeCount: pendingQueriesCount,
    },
    {
      id: 'timetable',
      label: 'Classes & Schedule',
      shortLabel: 'Schedule',
      icon: CalendarClock,
    },
    {
      id: 'notes',
      label: `Study Notes (${notes.length})`,
      shortLabel: 'Notes',
      icon: BookOpenCheck,
      badgeCount: notes.length,
    },
    {
      id: 'security',
      label: 'Change Password',
      shortLabel: 'Password',
      icon: KeyRound,
    },
  ];

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans antialiased overflow-x-hidden">
      {/* Sticky Top Header & Responsive Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-xs transition-all">
        {/* Brand & User Topbar */}
        <div className="px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between border-b border-slate-100/80">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <SnitLogo className="w-8 h-8 sm:w-10 sm:h-10 shadow-md shadow-indigo-100 shrink-0" size={36} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-extrabold text-slate-900 text-xs sm:text-base leading-tight tracking-tight truncate">
                  Shrinathji Institute of Technology
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100/80 text-indigo-700 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  SNITN Portal
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                {student?.name} • <span className="font-mono font-semibold text-slate-700">{student?.rollNumber}</span> ({student?.semester})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Quick Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 shadow-2xs"
              title="Refresh portal data"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900">{student?.registrationId || 'STU-ACTIVE'}</span>
              <span className="text-[11px] text-slate-500 font-medium">{student?.department}</span>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all border border-slate-200/80 hover:border-rose-200 cursor-pointer active:scale-95 shadow-2xs"
              title="Logout from portal"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Tab Options Bar - Shown on Desktop / Tablets (>= md) */}
        <div className="hidden md:block px-3 sm:px-6 lg:px-8 py-2 bg-slate-50/75 border-b border-slate-100 overflow-x-auto no-scrollbar">
          <div className="max-w-7xl mx-auto flex items-center gap-1.5 sm:gap-2 min-w-max">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center gap-2 py-2 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-xs transition-all cursor-pointer select-none whitespace-nowrap active:scale-95 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Container with safe bottom spacing for mobile bottom dock */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 space-y-6 pb-28 md:pb-12">

        {/* ================= VIEW 1: MY ATTENDANCE ================= */}
        {activeTab === 'attendance' && (
          <div className="space-y-5 sm:space-y-6 animate-fade-in">
            {/* Attendance Overview Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Personal Academic Standing</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    Cumulative Attendance Overview
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your personal record across all lecture periods in {student?.semester}
                  </p>
                </div>

                <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2 bg-slate-50 sm:bg-transparent p-3.5 sm:p-0 rounded-2xl border sm:border-0 border-slate-200/80">
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block sm:hidden">
                      Cumulative Rate
                    </span>
                    <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                      {overall && overall.totalClasses > 0 ? `${overall.percentage}%` : 'N/A'}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                      !overall || overall.totalClasses === 0
                        ? 'bg-slate-100 text-slate-600 border border-slate-200'
                        : overall.percentage >= 75
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : overall.percentage >= 60
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        !overall || overall.totalClasses === 0
                          ? 'bg-slate-400'
                          : overall.percentage >= 75
                          ? 'bg-emerald-500'
                          : overall.percentage >= 60
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    <span>{overall?.status || 'Active'}</span>
                  </span>
                </div>
              </div>

              {/* Stat Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-6">
                <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-50/80 border border-slate-200/60">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Classes Held</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{overall?.totalClasses || 0}</div>
                  <span className="text-[11px] text-slate-400">Recorded by faculty</span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Classes Attended</span>
                  <div className="text-2xl font-black text-emerald-800 mt-1">{overall?.attendedClasses || 0}</div>
                  <span className="text-[11px] text-emerald-600">Present in lecture</span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-rose-50/60 border border-rose-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Classes Absent</span>
                  <div className="text-2xl font-black text-rose-800 mt-1">{overall?.absentClasses || 0}</div>
                  <span className="text-[11px] text-rose-600">Missed lectures</span>
                </div>
              </div>

              {/* 75% Attendance Target Planner Widget */}
              {overall && overall.totalClasses > 0 && (
                <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-slate-50 to-indigo-50/70 border border-indigo-100/90 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0 shadow-xs">
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-slate-900">
                            75% Attendance Target Planner
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                            RTU University Criterion
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {overall.percentage < 75 ? (
                            <>
                              You are currently below 75%. You need to attend the next{' '}
                              <strong className="text-rose-600 font-extrabold">
                                {Math.max(0, Math.ceil(3 * overall.totalClasses - 4 * overall.attendedClasses))} classes
                              </strong>{' '}
                              consecutively without absence to attain 75% attendance.
                            </>
                          ) : (
                            <>
                              Great job! You have satisfied the eligibility threshold. You can afford to miss up to{' '}
                              <strong className="text-emerald-700 font-extrabold">
                                {Math.max(0, Math.floor((4 * overall.attendedClasses - 3 * overall.totalClasses) / 3))} classes
                              </strong>{' '}
                              while maintaining ≥ 75% attendance.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Subject-Wise Attendance Breakdown */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-1">Subject-Wise Attendance Breakdown</h3>
              <p className="text-xs text-slate-500 mb-5">Ensure each subject maintains the mandatory 75% threshold.</p>

              {attendanceData?.subjectWise?.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No subject attendance sessions recorded yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {attendanceData?.subjectWise?.map((sub, idx) => {
                    const isGood = sub.percentage >= 75;
                    const isWarn = sub.percentage >= 60 && sub.percentage < 75;
                    const neededSub = Math.max(0, Math.ceil(3 * sub.totalClasses - 4 * sub.attendedClasses));
                    const canBunkSub = Math.max(0, Math.floor((4 * sub.attendedClasses - 3 * sub.totalClasses) / 3));

                    return (
                      <div
                        key={idx}
                        className="p-5 rounded-3xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{sub.subject}</h4>
                            <span
                              className={`text-xs font-extrabold px-2.5 py-0.5 rounded-lg ${
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

                          <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden my-2.5">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isGood ? 'bg-emerald-500' : isWarn ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(sub.percentage, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-200/60">
                            <span>
                              Attended: <strong className="text-slate-800">{sub.attendedClasses}</strong> / {sub.totalClasses}
                            </span>
                            <span className="font-semibold text-[11px]">{sub.status}</span>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200/70 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-medium">75% Target:</span>
                            {sub.percentage < 75 ? (
                              <span className="text-rose-600 font-bold">Attend next {neededSub} class{neededSub === 1 ? '' : 'es'}</span>
                            ) : (
                              <span className="text-emerald-700 font-bold">Can skip {canBunkSub} class{canBunkSub === 1 ? '' : 'es'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Date-Wise Personal History (Only THIS student's records) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
              <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Your Class Session History</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Showing only your personal lecture attendances</p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
                  {attendanceData?.history?.length || 0} Recorded Sessions
                </span>
              </div>

              {attendanceData?.history?.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  No attendance entries recorded for your semester yet.
                </div>
              ) : (
                <>
                  {/* Mobile-optimized card feed (< sm screens) */}
                  <div className="sm:hidden divide-y divide-slate-100">
                    {attendanceData?.history?.map((rec, idx) => {
                      const isPresent = rec.status === 'Present';
                      return (
                        <div key={idx} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                          <div className="min-w-0 space-y-1">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {rec.subject}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                              <span className="font-mono text-slate-700 font-semibold">{rec.date}</span>
                              <span>•</span>
                              <span>{rec.semester}</span>
                            </div>
                          </div>
                          <span
                            className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isPresent
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isPresent ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span>{rec.status}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tablet & Desktop structured table (>= sm screens) */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                          <th className="py-3.5 px-6">Date</th>
                          <th className="py-3.5 px-6">Subject Name</th>
                          <th className="py-3.5 px-6">Semester</th>
                          <th className="py-3.5 px-6 text-right">Your Attendance Status</th>
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
                              <td className="py-3.5 px-6 font-bold text-slate-900">{rec.subject}</td>
                              <td className="py-3.5 px-6 text-xs text-slate-500">{rec.semester}</td>
                              <td className="py-3.5 px-6 text-right">
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
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ================= VIEW 2: STUDENT PROFILE ================= */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-12">
            {/* Main Responsive 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* ================= LEFT COLUMN: DIGITAL STUDENT ID SMART CARD (5 Cols) ================= */}
              <div className="lg:col-span-5 space-y-5">
                {/* The Digital Student Smart ID Card */}
                <div
                  id="digital-student-id-card"
                  className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${activeTheme.cardGradient} border border-white/10 text-white p-6 sm:p-7 shadow-2xl transition-all duration-300`}
                >
                  {/* Institutional Top Header */}
                  <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10 relative z-10">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md">
                        <SnitLogo size={32} className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-[12px] sm:text-xs tracking-tight text-white leading-tight uppercase">
                          Shrinathji Institute of Technology
                        </h3>
                        <p className="text-[10px] text-slate-300 tracking-wider">
                          Nathdwara, Raj. • AICTE Approved & RTU Affiliated
                        </p>
                      </div>
                    </div>
                    {/* Realistic Holographic RFID Chip Graphic */}
                    <div className="shrink-0">
                      <div className="w-10 h-7 rounded-md bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500 shadow-inner border border-amber-200/60 p-0.5 flex flex-col justify-between">
                        <div className="flex justify-between h-1 border-b border-amber-600/30" />
                        <div className="text-[7px] font-mono font-black text-amber-950 text-center tracking-widest">
                          RFID
                        </div>
                        <div className="flex justify-between h-1 border-t border-amber-600/30" />
                      </div>
                    </div>
                  </div>

                  {/* Student Portrait & Primary Info */}
                  <div className="py-5 relative z-10 flex items-center gap-4">
                    <div className="relative shrink-0">
                      <div
                        className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr ${activeTheme.primaryBtn} text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg border-2 border-white/30`}
                      >
                        {student?.name?.charAt(0)?.toUpperCase() || 'S'}
                      </div>
                      <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-500 text-white shadow-md">
                        <BadgeCheck className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
                          {student?.name || 'Enrolled Student'}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-300">
                          Roll: {student?.rollNumber || 'N/A'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy('Roll Number', student?.rollNumber)}
                          className="no-print text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Copy Roll Number"
                        >
                          {copiedField === 'Roll Number' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-indigo-200 font-mono text-[11px] font-semibold border border-white/10">
                          {student?.registrationId || `STU-${student?.rollNumber}`}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              'Registration ID',
                              student?.registrationId || `STU-${student?.rollNumber}`
                            )
                          }
                          className="no-print text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Copy Registration ID"
                        >
                          {copiedField === 'Registration ID' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Academic Coordinates Matrix */}
                  <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md relative z-10 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Department
                      </span>
                      <span className="font-semibold text-slate-200 line-clamp-1">
                        {student?.department || 'Computer Science & Engg.'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Semester
                      </span>
                      <span className="font-semibold text-slate-200">
                        {student?.semester || 'Semester 1'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Blood Group
                      </span>
                      <span className="font-bold text-rose-300 inline-flex items-center gap-1">
                        <HeartPulse className="w-3 h-3 text-rose-400" />
                        <span>{profileData?.bloodGroup || 'Not Recorded'}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Date of Birth
                      </span>
                      <span className="font-semibold text-slate-200">
                        {profileData?.dob ? formatDobDisplay(profileData.dob).split(' ')[0] : 'Not Recorded'}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer: QR Badge & Verification Bar */}
                  <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-white/10 border border-white/20">
                        <QrCode className="w-7 h-7 text-white" />
                      </div>
                      <div className="text-[10px] text-slate-300 font-mono leading-tight">
                        <span className="font-bold text-white block">CAMPUS DIGITAL ID</span>
                        <span>SECURE-AUTH-2026</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Active Scholar</span>
                      </span>
                    </div>
                  </div>

                  {/* Decorative ambient lights */}
                  <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                </div>

                {/* Card Quick Actions: Print ID & Copy Info */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => printElementById('digital-student-id-card', `${student?.name || 'Student'}_ID_Card`)}
                    className="flex-1 py-2.5 px-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>Print Student ID Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        'Complete Student Credentials',
                        `Name: ${student?.name}\nRoll: ${student?.rollNumber}\nReg ID: ${student?.registrationId || 'STU-' + student?.rollNumber}\nDepartment: ${student?.department}\nSemester: ${student?.semester}\nEmail: ${profileData?.email || student?.email}`
                      )
                    }
                    className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 shadow-xs hover:shadow-md transition-all cursor-pointer"
                    title="Copy Full Credentials"
                  >
                    {copiedField === 'Complete Student Credentials' ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Academic Standing Metrics Card */}
                <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      <span>Academic Standing</span>
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        (dashboardData?.attendanceStats?.percentage ?? 0) >= 75
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : (dashboardData?.attendanceStats?.percentage ?? 0) >= 60
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {dashboardData?.attendanceStats?.academicStanding || 'Enrolled'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Attendance Rate
                      </span>
                      <span className="text-xl font-black text-slate-900">
                        {dashboardData?.attendanceStats?.percentage !== undefined
                          ? `${dashboardData.attendanceStats.percentage}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Lectures Attended
                      </span>
                      <span className="text-xl font-black text-slate-900">
                        {dashboardData?.attendanceStats?.attendedClasses ?? 0}
                        <span className="text-xs font-medium text-slate-500">
                          {' '}/ {dashboardData?.attendanceStats?.totalClasses ?? 0}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Institutional Policy Notice */}
                <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 text-white text-xs space-y-2 shadow-sm">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Administrative Record Protection</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    All records displayed are authenticated university records. To modify any personal, contact, or guardian details, please submit an official request via the <strong>Request Profile Change</strong> tab.
                  </p>
                </div>
              </div>

              {/* ================= RIGHT COLUMN: SUB-TABS (DOSSIER / REQUEST / QUERIES) (7 Cols) ================= */}
              <div className="lg:col-span-7 space-y-5">
                {/* Modern Segmented Navigation Sub-Tabs */}
                <div className="flex p-1.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs gap-1.5 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setProfileSubTab('overview')}
                    className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      profileSubTab === 'overview'
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <IdCard className="w-4 h-4" />
                    <span>Official Dossier</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProfileSubTab('query')}
                    className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      profileSubTab === 'query'
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>Request Change</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProfileSubTab('history')}
                    className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      profileSubTab === 'history'
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>My Queries</span>
                    {studentQueries.length > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        profileSubTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {studentQueries.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* SUB-TAB 1: OFFICIAL DOSSIER & RECORDS */}
                {profileSubTab === 'overview' && (
                  <div className="space-y-5 animate-fade-in">
                    {/* Group 1: Institutional Credentials */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl ${activeTheme.accentBg} ${activeTheme.accentText} border ${activeTheme.accentBorder}`}>
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">Institutional Credentials</h3>
                            <p className="text-[11px] text-slate-500">Official university identifiers and enrollment data</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Verified</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                        {/* Full Legal Name */}
                        <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:border-slate-300 transition-all">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                            Student Full Legal Name
                          </span>
                          <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{profileData?.name || student?.name || 'N/A'}</span>
                            <BadgeCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                          </span>
                        </div>

                        {/* University Roll Number */}
                        <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:border-slate-300 transition-all flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                              University Roll Number
                            </span>
                            <span className="text-sm font-mono font-bold text-slate-900">
                              {student?.rollNumber || 'N/A'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy('Roll Number', student?.rollNumber)}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                            title="Copy Roll Number"
                          >
                            {copiedField === 'Roll Number' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Registration ID */}
                        <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:border-slate-300 transition-all flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                              Institutional Registration ID
                            </span>
                            <span className="text-sm font-mono font-bold text-indigo-700">
                              {student?.registrationId || `STU-${student?.rollNumber}`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                'Registration ID',
                                student?.registrationId || `STU-${student?.rollNumber}`
                              )
                            }
                            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                            title="Copy Registration ID"
                          >
                            {copiedField === 'Registration ID' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Academic Department */}
                        <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:border-slate-300 transition-all">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                            Department / Academic Branch
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {student?.department || 'Computer Science & Engineering'}
                          </span>
                        </div>

                        {/* Current Semester */}
                        <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:border-slate-300 transition-all">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                            Current Semester
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {student?.semester || 'Semester 1'}
                          </span>
                        </div>

                        {/* Institutional Email */}
                        <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:border-slate-300 transition-all flex items-center justify-between">
                          <div className="min-w-0 pr-2">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                              Campus Login Email
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-900 truncate block">
                              {profileData?.email || student?.email || user?.email || 'N/A'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                'Official Email',
                                profileData?.email || student?.email || user?.email
                              )
                            }
                            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer shrink-0"
                            title="Copy Email"
                          >
                            {copiedField === 'Official Email' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Group 2: Personal Demographics & Health Profile */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl ${activeTheme.accentBg} ${activeTheme.accentText} border ${activeTheme.accentBorder}`}>
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">Demographic & Health Profile</h3>
                            <p className="text-[11px] text-slate-500">Student vital records & correspondence address</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                        {/* Date of Birth & Age */}
                        <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:border-slate-300 transition-all">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>Date of Birth</span>
                            </span>
                            {computeAge(profileData?.dob) && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 font-bold text-[10px]">
                                {computeAge(profileData?.dob)}
                              </span>
                            )}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            {formatDobDisplay(profileData?.dob)}
                          </span>
                        </div>

                        {/* Gender */}
                        <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:border-slate-300 transition-all">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                            Gender Identity
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            {profileData?.gender || 'Not Recorded'}
                          </span>
                        </div>

                        {/* Blood Group */}
                        <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:border-slate-300 transition-all">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1 flex items-center gap-1">
                            <HeartPulse className="w-3 h-3 text-rose-500" />
                            <span>Blood Group (Emergency Record)</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 font-extrabold text-xs border border-rose-200 flex items-center gap-1">
                              <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                              <span>{profileData?.bloodGroup || 'Not Recorded'}</span>
                            </span>
                            <span className="text-[11px] text-slate-400">Campus First-Aid Registry</span>
                          </div>
                        </div>

                        {/* Student Phone */}
                        <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:border-slate-300 transition-all flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>Student Contact Phone</span>
                            </span>
                            <span className="text-sm font-semibold text-slate-900">
                              {profileData?.phone || 'Not Recorded'}
                            </span>
                          </div>
                          {profileData?.phone && (
                            <a
                              href={`tel:${profileData.phone}`}
                              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-indigo-600 transition-colors"
                              title="Call Student"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        {/* Residential Address */}
                        <div className="sm:col-span-2 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:border-slate-300 transition-all">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>Permanent Residential Correspondence Address</span>
                          </span>
                          <span className="text-xs font-medium text-slate-800 leading-relaxed block">
                            {profileData?.address || 'No permanent correspondence address currently registered on file.'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Group 3: Guardian & Emergency Contacts */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl ${activeTheme.accentBg} ${activeTheme.accentText} border ${activeTheme.accentBorder}`}>
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">Parent & Guardian Information</h3>
                            <p className="text-[11px] text-slate-500">Authorized primary emergency correspondence contacts</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                        <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:border-slate-300 transition-all">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                            Parent / Guardian Full Name
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {profileData?.guardianName || 'Not Recorded'}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:border-slate-300 transition-all flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>Guardian Contact Phone</span>
                            </span>
                            <span className="text-sm font-semibold text-slate-900">
                              {profileData?.guardianPhone || 'Not Recorded'}
                            </span>
                          </div>
                          {profileData?.guardianPhone && (
                            <a
                              href={`tel:${profileData.guardianPhone}`}
                              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-emerald-600 transition-colors"
                              title="Call Guardian"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 2: REQUEST PROFILE CHANGE */}
                {profileSubTab === 'query' && (
                  <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5 animate-fade-in">
                    {/* Header */}
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                      <div className={`p-2.5 rounded-2xl bg-gradient-to-r ${activeTheme.primaryBtn} text-white shadow-md`}>
                        <Send className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Request Official Profile Correction</h3>
                        <p className="text-xs text-slate-500">
                          Submit a formal change ticket directly to college administration for review and approval
                        </p>
                      </div>
                    </div>

                    {queryError && (
                      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                        <span className="font-medium">{queryError}</span>
                      </div>
                    )}

                    {querySuccess && (
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                        <span className="font-medium">{querySuccess}</span>
                      </div>
                    )}

                    <form onSubmit={handleQuerySubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Field to change */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span>Field / Record to Modify</span>
                            <span className="text-[10px] text-rose-500 font-semibold">*Required</span>
                          </label>
                          <select
                            value={queryForm.fieldToChange}
                            onChange={(e) => setQueryForm({ ...queryForm, fieldToChange: e.target.value })}
                            className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 ${activeTheme.ringColor} transition-all cursor-pointer`}
                          >
                            <option value="Contact Phone Number">Contact Phone Number</option>
                            <option value="Residential Address">Residential Address</option>
                            <option value="Date of Birth (DOB)">Date of Birth (DOB)</option>
                            <option value="Full Name / Spelling">Full Name / Spelling Correction</option>
                            <option value="Gender">Gender</option>
                            <option value="Blood Group">Blood Group</option>
                            <option value="Parent / Guardian Name">Parent / Guardian Name</option>
                            <option value="Guardian Contact Phone">Guardian Contact Phone</option>
                            <option value="Email Address">Official Email Address</option>
                            <option value="Other Detail">Other Detail</option>
                          </select>
                        </div>

                        {/* What to change */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span>New Value / Requested Modification</span>
                            <span className="text-[10px] text-rose-500 font-semibold">*Required</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={getFieldPlaceholder(queryForm.fieldToChange)}
                            value={queryForm.requestedChange}
                            onChange={(e) => setQueryForm({ ...queryForm, requestedChange: e.target.value })}
                            className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${activeTheme.ringColor} transition-all`}
                          />
                        </div>

                        {/* Reason */}
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span>Official Reason for Modification</span>
                            <span className="text-[10px] text-rose-500 font-semibold">*Required</span>
                          </label>
                          <textarea
                            rows={2}
                            required
                            placeholder="e.g., Updated to new contact number / Recent change of residential address / Clerical spelling correction"
                            value={queryForm.reason}
                            onChange={(e) => setQueryForm({ ...queryForm, reason: e.target.value })}
                            className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${activeTheme.ringColor} transition-all resize-none`}
                          />
                        </div>

                        {/* Additional Note */}
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span>Additional Remarks / Supporting Notes</span>
                            <span className="text-[10px] text-slate-400 font-semibold">Optional</span>
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Any supplemental details or urgency notes for college authorities..."
                            value={queryForm.message}
                            onChange={(e) => setQueryForm({ ...queryForm, message: e.target.value })}
                            className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${activeTheme.ringColor} transition-all resize-none`}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end pt-2">
                        <button
                          type="submit"
                          disabled={querySubmitting}
                          className={`px-6 py-2.5 rounded-xl bg-gradient-to-r ${activeTheme.primaryBtn} text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50`}
                        >
                          {querySubmitting ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Transmitting Ticket to Admin...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Submit Change Ticket</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* SUB-TAB 3: MY QUERIES / RESOLUTION CENTER */}
                {profileSubTab === 'history' && (
                  <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">Profile Query History</h3>
                          <p className="text-xs text-slate-500">Track real-time status and administrative responses</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {studentQueries.length} {studentQueries.length === 1 ? 'Query' : 'Queries'}
                        </span>
                        <button
                          type="button"
                          onClick={fetchStudentQueries}
                          disabled={queriesLoading}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                          title="Refresh Queries"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${queriesLoading ? 'animate-spin text-indigo-600' : ''}`}
                          />
                        </button>
                      </div>
                    </div>

                    {queriesLoading ? (
                      <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <span>Checking ticket status...</span>
                      </div>
                    ) : studentQueries.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-slate-500 space-y-2">
                        <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                        <p className="text-xs font-bold text-slate-700">No Profile Queries Submitted</p>
                        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                          If you notice any discrepancies in your student record, submit a ticket under the "Request Change" tab.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {studentQueries.map((q) => {
                          const isPending = q.status === 'Pending';
                          const isReviewed = q.status === 'Reviewed';
                          const isResolved = q.status === 'Resolved';

                          return (
                            <div
                              key={q._id}
                              className={`p-4 sm:p-5 rounded-2xl border transition-all text-xs space-y-3 ${
                                isPending
                                  ? 'bg-amber-50/40 border-amber-200/80'
                                  : isReviewed
                                  ? 'bg-indigo-50/40 border-indigo-200/80'
                                  : 'bg-emerald-50/40 border-emerald-200/80'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/60">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-sm">{q.fieldToChange}</span>
                                  <span className="text-[10px] text-slate-400">•</span>
                                  <span className="text-[11px] text-slate-500 font-mono">
                                    {new Date(q.createdAt).toLocaleDateString('en-US', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>

                                {/* Status Pill */}
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border self-start sm:self-auto ${
                                    isPending
                                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                                      : isReviewed
                                      ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  }`}
                                >
                                  {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                                  {isReviewed && <Eye className="w-3 h-3 text-indigo-600" />}
                                  {isResolved && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                  <span>{q.status}</span>
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                                  <span className="font-bold text-slate-700 block text-[11px] mb-1">
                                    Requested Modification:
                                  </span>
                                  <p className="text-slate-900 font-semibold">{q.requestedChange}</p>
                                </div>

                                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                                  <span className="font-bold text-slate-700 block text-[11px] mb-1">
                                    Reason Submitted:
                                  </span>
                                  <p className="text-slate-800">{q.reason}</p>
                                </div>
                              </div>

                              {q.message && (
                                <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/60 text-slate-600 text-[11px]">
                                  <span className="font-bold text-slate-700 mr-1">Your Note:</span>
                                  <span>{q.message}</span>
                                </div>
                              )}

                              {q.adminResponse && (
                                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-emerald-950 text-xs">
                                  <span className="font-bold block mb-0.5 flex items-center gap-1.5 text-emerald-800">
                                    <BadgeCheck className="w-4 h-4 text-emerald-600" />
                                    <span>Administrative Action / Response:</span>
                                  </span>
                                  <span className="font-medium">{q.adminResponse}</span>
                                </div>
                              )}

                              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                                <span className="flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  <span>Stored in University Database</span>
                                </span>
                                <span>Ticket #{q._id?.slice(-8)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= VIEW 3: MY TIMETABLE ================= */}
        {activeTab === 'timetable' && (
          <div className="space-y-6 animate-fade-in">
            {/* Days Tabs */}
            <div className="flex overflow-x-auto gap-2 p-1.5 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs">
              {daysOfWeek.map((day) => {
                const isSelected = selectedDay === day;
                const isToday = day === todayName;
                const count = timetableSlots.filter((s) => s.dayOfWeek === day).length;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`flex-1 min-w-[120px] py-3 px-3 rounded-xl font-bold text-xs transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-950 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{day}</span>
                      {isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Today" />}
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/20 text-white font-bold' : 'bg-slate-200/60 text-slate-500'
                      }`}
                    >
                      {count} {count === 1 ? 'Period' : 'Periods'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Schedule Cards for Selected Day */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>{selectedDay} Lecture Schedule</span>
                    {selectedDay === todayName && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
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
                <div className="py-20 text-center rounded-3xl bg-slate-50/70 border border-dashed border-slate-200">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">No classes scheduled on {selectedDay}</h4>
                  <p className="text-xs text-slate-400 mt-1">Enjoy your study time or review lecture notes.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {daySchedule.map((slot) => (
                    <div
                      key={slot._id}
                      className="p-5 rounded-3xl border border-slate-200/90 bg-slate-50/40 hover:bg-white hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{slot.startTime} - {slot.endTime}</span>
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-200/70 text-slate-700">
                            {slot.semester}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-slate-900 leading-snug">{slot.subject}</h4>

                        <div className="flex items-center gap-1.5 mt-2.5 text-xs text-slate-500 font-medium">
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
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between gap-4">
              <div className="relative w-full max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
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
              <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/90 shadow-xs">
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
                    className="group bg-white rounded-3xl border border-slate-200/90 hover:border-indigo-200 p-6 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3.5">
                        <span className="px-3 py-1 text-[11px] font-bold rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {note.subject}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200/60">
                          {note.semester}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2 mb-2">
                        {note.title}
                      </h3>

                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-4 whitespace-pre-line font-normal">
                        {note.content}
                      </p>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => setViewingNote(note)}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Read Note</span>
                      </button>

                      {note.resourceUrl && (
                        <a
                          href={note.resourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
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
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 font-bold text-xl flex items-center justify-center shrink-0 border border-indigo-200/70">
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
                  {student?.dob && (
                    <>
                      <span>•</span>
                      <span>DOB: {student.dob.split('-').length === 3 ? `${student.dob.split('-')[2]}/${student.dob.split('-')[1]}/${student.dob.split('-')[0]}` : student.dob}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Password Change Form */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
              <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-100">
                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Current Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword.current ? 'text' : 'password'}
                      required
                      placeholder="Enter current password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                      }
                      className="w-full pl-3.5 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => ({ ...p, current: !p.current }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                      title={showPassword.current ? 'Hide password' : 'Show password'}
                    >
                      {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    New Password * (Min 6 characters)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword.new ? 'text' : 'password'}
                      required
                      placeholder="Enter new password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                      className="w-full pl-3.5 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => ({ ...p, new: !p.new }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                      title={showPassword.new ? 'Hide password' : 'Show password'}
                    >
                      {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword.confirm ? 'text' : 'password'}
                      required
                      placeholder="Re-enter new password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      }
                      className="w-full pl-3.5 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => ({ ...p, confirm: !p.confirm }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                      title={showPassword.confirm ? 'Hide password' : 'Show password'}
                    >
                      {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={passwordSubmitting}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
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
      </main>

      {/* Fixed Bottom Navigation Dock for Mobile Devices (< md) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-lg px-2 py-1.5 flex justify-around items-center">
        {NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative active:scale-90 ${
                isActive ? 'text-indigo-600 font-extrabold' : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive ? 'bg-indigo-50 text-indigo-600 shadow-2xs' : ''
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] leading-tight text-center truncate max-w-[64px]">
                {tab.shortLabel}
              </span>
              {tab.badgeCount > 0 && (
                <span className="absolute top-0.5 right-1/4 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {tab.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* View Full Note Modal */}
      {viewingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 my-8">
            <button
              onClick={() => setViewingNote(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {viewingNote.subject}
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200/60">
                  {viewingNote.semester}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                {viewingNote.title}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Published on {viewingNote.createdAt ? new Date(viewingNote.createdAt).toLocaleDateString() : 'Recent'}
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/80 my-5 text-sm text-slate-800 leading-relaxed font-mono whitespace-pre-wrap overflow-x-auto">
              {viewingNote.content}
            </div>

            {viewingNote.resourceUrl && (
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between mb-5">
                <span className="text-xs font-semibold text-indigo-900">
                  External Course Reference Attached
                </span>
                <a
                  href={viewingNote.resourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <span>Open PDF / Drive</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setViewingNote(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors cursor-pointer"
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
