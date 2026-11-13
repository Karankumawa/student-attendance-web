import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Calendar,
  CheckCircle,
  BookOpen,
  ArrowRight,
  Clock,
  MapPin,
  AlertTriangle,
  Sparkles,
  ClipboardList,
  FileSpreadsheet,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const clean = timeStr.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*([AaPp][Mm]))?$/);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3] ? match[3].toUpperCase() : null;

  if (modifier === 'PM' && hours < 12) {
    hours += 12;
  } else if (modifier === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
};

const getClassStatus = (startTime, endTime) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);

  if (currentMinutes >= startMin && currentMinutes <= endMin) {
    return {
      status: 'ongoing',
      label: 'Live Lecture Now',
      color: 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs',
      dotColor: 'bg-emerald-500 animate-ping',
    };
  } else if (currentMinutes < startMin) {
    return {
      status: 'upcoming',
      label: 'Upcoming Today',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      dotColor: 'bg-indigo-500',
    };
  } else {
    return {
      status: 'completed',
      label: 'Concluded',
      color: 'bg-slate-100 text-slate-600 border-slate-200',
      dotColor: 'bg-slate-400',
    };
  }
};

const getLocalDateString = (d = new Date()) => {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DashboardView = ({ setActiveView, setSelectedAttendanceSession }) => {
  const [stats, setStats] = useState(null);
  const [defaulters, setDefaulters] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  );

  // Live second-by-second clock for lecture routine
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch dashboard overview stats
      const statsRes = await axiosClient.get('/attendance/dashboard-stats');
      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }

      // Fetch attendance summary to identify defaulters (<75%)
      const summaryRes = await axiosClient.get('/attendance/summary');
      if (summaryRes.data.success) {
        const lowAttendanceStudents = summaryRes.data.data
          .filter((s) => s.totalClasses > 0 && s.percentage < 75)
          .slice(0, 5);
        setDefaulters(lowAttendanceStudents);
      }

      // Fetch recent notes
      const notesRes = await axiosClient.get('/notes');
      if (notesRes.data.success) {
        setRecentNotes(notesRes.data.data.slice(0, 3));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleQuickAttendance = (classSlot) => {
    if (setSelectedAttendanceSession) {
      setSelectedAttendanceSession({
        subject: classSlot.subject,
        semester: classSlot.semester,
        date: getLocalDateString(),
      });
    }
    setActiveView('attendance');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Loading faculty dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Enrolled Students',
      value: stats?.totalStudents || 0,
      subtext: 'Across all semesters',
      icon: Users,
      color: 'from-blue-600 to-indigo-600',
      bgLight: 'bg-blue-50 text-blue-700',
      action: () => setActiveView('students'),
    },
    {
      title: `Today's Classes (${stats?.currentDay || 'Today'})`,
      value: stats?.todaysClassesCount || 0,
      subtext: 'Scheduled in timetable',
      icon: Calendar,
      color: 'from-violet-600 to-purple-600',
      bgLight: 'bg-violet-50 text-violet-700',
      action: () => setActiveView('timetable'),
    },
    {
      title: "Today's Attendance Sessions",
      value: stats?.todaysAttendanceCount || 0,
      subtext: 'Sessions recorded today',
      icon: CheckCircle,
      color: 'from-emerald-600 to-teal-600',
      bgLight: 'bg-emerald-50 text-emerald-700',
      action: () => setActiveView('attendance'),
    },
    {
      title: 'Notes & Study Materials',
      value: stats?.totalNotes || 0,
      subtext: 'Uploaded course references',
      icon: BookOpen,
      color: 'from-amber-600 to-orange-600',
      bgLight: 'bg-amber-50 text-amber-700',
      action: () => setActiveView('notes'),
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white p-7 sm:p-9 shadow-2xl border border-slate-800/80">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-64 h-64 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-semibold border border-white/10">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>Academic Year 2026-2027</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/25 backdrop-blur-md text-indigo-200 text-xs font-semibold border border-indigo-400/30 font-mono shadow-xs">
                <Clock className="w-3.5 h-3.5 text-indigo-300" />
                <span>{currentTime}</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Welcome back, Professor!
            </h1>
            <p className="text-slate-300 text-sm mt-2 leading-relaxed font-medium">
              Daily schedule & attendance operations overview. You have{' '}
              <span className="font-bold text-white bg-indigo-500/30 px-2 py-0.5 rounded-md border border-indigo-400/30">
                {stats?.todaysClassesCount || 0} class sessions
              </span>{' '}
              scheduled for {stats?.currentDay}.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              onClick={() => setActiveView('attendance')}
              className="px-5 py-3 rounded-2xl bg-white text-slate-900 hover:bg-indigo-50 font-bold text-xs sm:text-sm shadow-xl hover:shadow-indigo-500/10 transition-all duration-200 flex items-center gap-2 cursor-pointer transform active:scale-95"
            >
              <ClipboardList className="w-4 h-4 text-indigo-600" />
              <span>Mark Attendance</span>
            </button>
            <button
              onClick={() => setActiveView('timetable')}
              className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/15 backdrop-blur-md transition-all duration-200 flex items-center gap-2 cursor-pointer transform active:scale-95"
            >
              <Calendar className="w-4 h-4" />
              <span>Timetable</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Access Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveView('attendance')}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white hover:bg-indigo-50/70 border border-slate-200/80 hover:border-indigo-200 transition-all shadow-xs group cursor-pointer text-left"
        >
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <ClipboardList className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">Mark Attendance</div>
            <div className="text-[10px] text-slate-500 font-medium">Daily lecture roster</div>
          </div>
        </button>

        <button
          onClick={() => setActiveView('reports')}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white hover:bg-indigo-50/70 border border-slate-200/80 hover:border-indigo-200 transition-all shadow-xs group cursor-pointer text-left"
        >
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">Export Reports</div>
            <div className="text-[10px] text-slate-500 font-medium">Excel & PDF sheets</div>
          </div>
        </button>

        <button
          onClick={() => setActiveView('students')}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white hover:bg-indigo-50/70 border border-slate-200/80 hover:border-indigo-200 transition-all shadow-xs group cursor-pointer text-left"
        >
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Student Roster</div>
            <div className="text-[10px] text-slate-500 font-medium">Enroll & ID cards</div>
          </div>
        </button>

        <button
          onClick={() => setActiveView('notes')}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white hover:bg-indigo-50/70 border border-slate-200/80 hover:border-indigo-200 transition-all shadow-xs group cursor-pointer text-left"
        >
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 group-hover:text-amber-700 transition-colors">Course Notes</div>
            <div className="text-[10px] text-slate-500 font-medium">Syllabus & references</div>
          </div>
        </button>
      </div>

      {/* 4 Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.action}
              className="group relative bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
            >
              {/* Subtle top accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`p-2.5 rounded-2xl ${card.bgLight} transition-all duration-300 group-hover:scale-110 shadow-xs`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {card.value}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-600 font-medium">{card.subtext}</span>
                  <div className="p-1 rounded-full bg-slate-50 group-hover:bg-indigo-50 text-slate-600 group-hover:text-indigo-600 transition-colors">
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid: Today's Classes & Defaulters Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Today's Class Schedule */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Clock className="w-4 h-4" />
                </div>
                <span>Today's Classes ({stats?.currentDay})</span>
              </h2>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Lecture periods scheduled in today's active curriculum
              </p>
            </div>
            <button
              onClick={() => setActiveView('timetable')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-xl hover:bg-indigo-50 cursor-pointer"
            >
              <span>Weekly View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats?.todaysClasses?.length === 0 ? (
            <div className="py-14 text-center rounded-2xl bg-slate-50/70 border border-dashed border-slate-200">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No classes scheduled for {stats?.currentDay}</p>
              <p className="text-xs text-slate-600 mt-1">Check timetable to schedule new periods or review study material.</p>
              <button
                onClick={() => setActiveView('timetable')}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer shadow-md shadow-indigo-200"
              >
                Add Timetable Slot
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {stats?.todaysClasses?.map((item) => {
                const statusInfo = getClassStatus(item.startTime, item.endTime);
                return (
                  <div
                    key={item._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 bg-slate-50/60 hover:bg-white hover:shadow-md transition-all gap-4 group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-700 font-extrabold text-xs flex flex-col items-center justify-center shrink-0 border border-indigo-200/60 shadow-xs">
                        <span>{item.startTime.split(' ')[0]}</span>
                        <span className="text-[10px] font-bold text-indigo-500">{item.startTime.split(' ')[1]}</span>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                            {item.subject}
                          </h4>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`} />
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-600 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {item.startTime} - {item.endTime}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {item.roomNumber}
                          </span>
                          <span>•</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 text-[10px] font-bold">
                            {item.semester}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleQuickAttendance(item)}
                      className="self-start sm:self-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span>Take Attendance</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Attendance Alerts / Defaulter Watchlist */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <span>Attendance Watchlist</span>
              </h2>
              <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-100">
                &lt; 75% Criteria
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-4 font-medium">
              Students falling below the mandatory academic attendance threshold
            </p>

            {defaulters.length === 0 ? (
              <div className="py-10 text-center bg-emerald-50/60 rounded-2xl border border-emerald-100">
                <CheckCircle className="w-9 h-9 text-emerald-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-emerald-800">Excellent Compliance</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">All students currently meet or exceed 75%.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {defaulters.map((stud) => (
                  <div
                    key={stud._id}
                    className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-slate-200 transition-all flex items-center justify-between shadow-2xs"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{stud.name}</div>
                      <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                        {stud.rollNumber} • {stud.semester}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-rose-600">
                        {stud.percentage}%
                      </div>
                      <div className="text-[10px] text-slate-600 font-medium">
                        {stud.attendedClasses}/{stud.totalClasses} classes
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-5 mt-5 border-t border-slate-100">
            <button
              onClick={() => setActiveView('attendance')}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100/80 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Notes Section Preview */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <BookOpen className="w-4 h-4" />
              </div>
              <span>Recent Course Materials & Notes</span>
            </h2>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Curriculum reference documents, summaries, and links
            </p>
          </div>
          <button
            onClick={() => setActiveView('notes')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-xl hover:bg-indigo-50 cursor-pointer"
          >
            <span>Explore Notes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentNotes.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-8">No study notes uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentNotes.map((note) => (
              <div
                key={note._id}
                onClick={() => setActiveView('notes')}
                className="p-5 rounded-2xl border border-slate-100 hover:border-indigo-200 bg-slate-50/60 hover:bg-white hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {note.subject}
                    </span>
                    <span className="text-[10px] text-slate-600 font-medium">
                      {note.semester}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-1.5">
                    {note.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                    {note.content.replace(/[#*`_]/g, '')}
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-indigo-600 font-bold">
                  <span>Read details</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardView;
