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
  Lock,
  Mail,
  Phone,
  Save,
  RotateCcw,
  HeartPulse,
  Users,
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

  // Profile data & edit form states
  const [profileData, setProfileData] = useState(null);
  const [profileForm, setProfileForm] = useState({
    dob: '',
    gender: '',
    address: '',
    bloodGroup: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

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

      // Fetch personal profile details
      try {
        const profileRes = await axiosClient.get('/student-portal/profile');
        if (profileRes.data.success && profileRes.data.data) {
          const p = profileRes.data.data;
          setProfileData(p);
          setProfileForm({
            dob: p.dob || '',
            gender: p.gender || '',
            address: p.address || '',
            bloodGroup: p.bloodGroup || '',
          });
        }
      } catch (pErr) {
        console.warn('Could not load student profile record:', pErr);
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

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    try {
      setProfileSaving(true);
      const res = await axiosClient.put('/student-portal/profile', {
        dob: profileForm.dob,
        gender: profileForm.gender,
        bloodGroup: profileForm.bloodGroup,
        address: profileForm.address,
      });

      if (res.data.success && res.data.data) {
        const updated = res.data.data;
        setProfileData(updated);
        setProfileForm({
          dob: updated.dob || '',
          gender: updated.gender || '',
          address: updated.address || '',
          bloodGroup: updated.bloodGroup || '',
        });
        setProfileSuccess('Profile details saved and updated successfully in database!');
        showToast?.({ message: 'Profile updated in database!', type: 'success' });
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to update profile';
      setProfileError(errMsg);
      showToast?.({ message: errMsg, type: 'error' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleResetProfile = () => {
    if (profileData) {
      setProfileForm({
        dob: profileData.dob || '',
        gender: profileData.gender || '',
        address: profileData.address || '',
        bloodGroup: profileData.bloodGroup || '',
      });
      setProfileError('');
      setProfileSuccess('');
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
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-100/60">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-700">Loading student portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-800 flex flex-col font-sans antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-30 h-20 bg-white/85 backdrop-blur-xl border-b border-slate-200/70 px-4 md:px-8 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3.5">
          <SnitLogo className="w-10 h-10 shadow-md shadow-indigo-100" size={40} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-slate-900 text-lg leading-tight">SNIT</h1>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100/80 text-indigo-700 text-[11px] font-bold uppercase tracking-wider">
                Student Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {student?.name} • <span className="font-mono font-semibold text-slate-700">{student?.rollNumber}</span> ({student?.semester})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-900">{student?.registrationId || 'STU-ACTIVE'}</span>
            <span className="text-[11px] text-slate-500 font-medium">{student?.department}</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all border border-slate-200/70 hover:border-rose-200 cursor-pointer active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>My Attendance</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <User className="w-4 h-4" />
            <span>My Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('timetable')}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'timetable'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            <span>Classes & Schedule</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <BookOpenCheck className="w-4 h-4" />
            <span>Study Notes ({notes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'security'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
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
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Personal Academic Standing</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    Cumulative Attendance Report
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Your personal record across all lecture periods in {student?.semester}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                      {overall && overall.totalClasses > 0 ? `${overall.percentage}%` : 'N/A'}
                    </div>
                    <span
                      className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold ${
                        !overall || overall.totalClasses === 0
                          ? 'bg-slate-100 text-slate-600 border border-slate-200'
                          : overall.percentage >= 75
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : overall.percentage >= 60
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
                <div className="p-5 rounded-3xl bg-slate-50/80 border border-slate-200/60">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Classes Held</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{overall?.totalClasses || 0}</div>
                  <span className="text-[11px] text-slate-400">Recorded by faculty</span>
                </div>

                <div className="p-5 rounded-3xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Classes Attended</span>
                  <div className="text-2xl font-black text-emerald-800 mt-1">{overall?.attendedClasses || 0}</div>
                  <span className="text-[11px] text-emerald-600">Present in lecture</span>
                </div>

                <div className="p-5 rounded-3xl bg-rose-50/60 border border-rose-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Classes Absent</span>
                  <div className="text-2xl font-black text-rose-800 mt-1">{overall?.absentClasses || 0}</div>
                  <span className="text-[11px] text-rose-600">Missed lectures</span>
                </div>
              </div>
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

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-200/60">
                          <span>
                            Attended: <strong className="text-slate-800">{sub.attendedClasses}</strong> / {sub.totalClasses}
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
            <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
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
                <div className="overflow-x-auto">
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
              )}
            </div>
          </div>
        )}

        {/* ================= VIEW 2: STUDENT PROFILE ================= */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            {/* Hero / ID Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-950 border border-slate-800 p-6 sm:p-8 text-white shadow-xl">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white font-extrabold text-2xl sm:text-3xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30 border border-white/20">
                    {student?.name?.charAt(0)?.toUpperCase() || 'S'}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight">{student?.name}</h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Enrolled Student</span>
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 font-mono flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{profileData?.email || student?.email || user?.email}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-300">
                      <span className="px-2.5 py-0.5 rounded-md bg-white/10 font-mono font-bold">
                        Roll: {student?.rollNumber}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                        {student?.registrationId || `STU-${student?.rollNumber}`}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-white/10 font-semibold">
                        {student?.department}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-white/10 font-semibold">
                        {student?.semester}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative background effects */}
              <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute left-1/3 -top-10 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Policy Notice Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-900 text-xs sm:text-sm flex items-start gap-3.5 shadow-xs">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-amber-950">Institutional Records & Permissions Notice</h4>
                <p className="text-xs text-amber-800/95 leading-relaxed">
                  In accordance with institutional guidelines, your <strong>Official Full Name</strong>, <strong>Assigned Email</strong>, <strong>Contact Phone Number</strong>, and <strong>Parent & Guardian Information</strong> are official administrative records and can only be modified by the college administration. You have permission to update your Date of Birth, Gender, Blood Group, and Residential Address.
                </p>
              </div>
            </div>

            {profileError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="font-medium">{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span className="font-medium">{profileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Section 1: Official Identity (Locked / Read-Only) */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Institutional Identity</h3>
                      <p className="text-xs text-slate-500">Official student credentials managed by college administration (Read-Only)</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Protected
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Name (Cannot be changed) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Full Name</span>
                      <span className="text-[10px] text-rose-500 font-semibold">Not Editable</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        disabled
                        value={profileData?.name || student?.name || ''}
                        className="w-full pl-3.5 pr-9 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 cursor-not-allowed select-none"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Official registered student name</p>
                  </div>

                  {/* Email (Cannot be changed) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Official Email</span>
                      <span className="text-[10px] text-rose-500 font-semibold">Not Editable</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        disabled
                        value={profileData?.email || student?.email || user?.email || ''}
                        className="w-full pl-3.5 pr-9 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 cursor-not-allowed select-none"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Institutional login email (@snitn.edu)</p>
                  </div>

                  {/* Roll Number (Read-only) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Roll Number</span>
                      <span className="text-[10px] text-slate-400 font-semibold">Permanent</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        disabled
                        value={profileData?.rollNumber || student?.rollNumber || ''}
                        className="w-full pl-3.5 pr-9 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-700 cursor-not-allowed select-none"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">University roll identifier</p>
                  </div>

                  {/* Registration ID (Read-only) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Registration ID
                    </label>
                    <input
                      type="text"
                      disabled
                      value={profileData?.registrationId || student?.registrationId || `STU-${student?.rollNumber}`}
                      className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono font-semibold text-indigo-700 cursor-not-allowed select-none"
                    />
                  </div>

                  {/* Department (Read-only) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Academic Department
                    </label>
                    <input
                      type="text"
                      disabled
                      value={profileData?.department || student?.department || ''}
                      className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 cursor-not-allowed select-none"
                    />
                  </div>

                  {/* Current Semester (Read-only) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Current Semester
                    </label>
                    <input
                      type="text"
                      disabled
                      value={profileData?.semester || student?.semester || ''}
                      className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 cursor-not-allowed select-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Personal & Contact Information (Editable by Student) */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Personal & Contact Details</h3>
                      <p className="text-xs text-slate-500">You can edit and update these personal details anytime in database</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Editable
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Date of Birth (DOB) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Date of Birth (Day / Month / Year)</span>
                    </label>
                    <input
                      type="date"
                      value={profileForm.dob}
                      onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Stored format: YYYY-MM-DD</p>
                  </div>

                  {/* Phone Number (Read-only for student) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>Contact Phone Number</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">Read Only</span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        disabled
                        value={profileData?.phone || 'Not Provided'}
                        className="w-full pl-3.5 pr-9 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 cursor-not-allowed select-none"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Managed by administration</p>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Gender
                    </label>
                    <select
                      value={profileForm.gender}
                      onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">Official gender identity</p>
                  </div>

                  {/* Blood Group */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                      <span>Blood Group</span>
                    </label>
                    <select
                      value={profileForm.bloodGroup}
                      onChange={(e) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">For campus medical records</p>
                  </div>

                  {/* Address */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Residential Address</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Enter permanent or current residential address..."
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all resize-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Full residential correspondence address</p>
                  </div>
                </div>
              </div>

              {/* Section 3: Parent & Guardian Information (Read-Only for Student) */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Parent & Guardian Information</h3>
                      <p className="text-xs text-slate-500">Contact information for parent or local guardian</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Read Only</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Guardian / Parent Name</span>
                      <span className="text-[10px] text-slate-400 font-semibold">Read Only</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        disabled
                        value={profileData?.guardianName || 'Not Provided'}
                        className="w-full pl-3.5 pr-9 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 cursor-not-allowed select-none"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Official guardian record (Admin editable)</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>Guardian Contact Phone</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">Read Only</span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        disabled
                        value={profileData?.guardianPhone || 'Not Provided'}
                        className="w-full pl-3.5 pr-9 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 cursor-not-allowed select-none"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Contact administration to update guardian details</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetProfile}
                  disabled={profileSaving}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Changes</span>
                </button>

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-6 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {profileSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Profile Details</span>
                    </>
                  )}
                </button>
              </div>
            </form>
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
                  <input
                    type="password"
                    required
                    placeholder="Enter current password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
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
      </div>

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
