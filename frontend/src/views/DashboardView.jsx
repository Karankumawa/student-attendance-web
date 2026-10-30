import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  CheckCircle,
  BookOpen,
  ArrowRight,
  Clock,
  MapPin,
  TrendingUp,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  ClipboardList,
  PlusCircle,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';

export const DashboardView = ({ setActiveView, setSelectedAttendanceSession }) => {
  const [stats, setStats] = useState(null);
  const [defaulters, setDefaulters] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
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
  };

  const handleQuickAttendance = (classSlot) => {
    if (setSelectedAttendanceSession) {
      setSelectedAttendanceSession({
        subject: classSlot.subject,
        semester: classSlot.semester,
        date: new Date().toISOString().split('T')[0],
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-semibold mb-3 border border-indigo-400/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Academic Year 2026-2027</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, Professor!
            </h1>
            <p className="text-indigo-200 text-sm mt-1.5 leading-relaxed">
              Here is your live daily schedule and attendance overview. You have{' '}
              <span className="font-bold text-white">{stats?.todaysClassesCount || 0} class sessions</span> scheduled for {stats?.currentDay}.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveView('attendance')}
              className="px-4 py-2.5 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <ClipboardList className="w-4 h-4 text-indigo-600" />
              <span>Mark Today's Attendance</span>
            </button>
            <button
              onClick={() => setActiveView('timetable')}
              className="px-4 py-2.5 rounded-xl bg-indigo-700/60 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm border border-indigo-400/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>View Weekly Timetable</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.action}
              className="group relative bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`p-2.5 rounded-xl ${card.bgLight} transition-transform group-hover:scale-110 duration-200`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {card.value}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">{card.subtext}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid: Today's Classes & Defaulters Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Today's Class Schedule */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <span>Today's Classes ({stats?.currentDay})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quickly take attendance for your scheduled lecture periods
              </p>
            </div>
            <button
              onClick={() => setActiveView('timetable')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
            >
              <span>Full Schedule</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats?.todaysClasses?.length === 0 ? (
            <div className="py-12 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">No classes scheduled for {stats?.currentDay}</p>
              <p className="text-xs text-slate-400 mt-1">Enjoy your prep time or add new slots in the Timetable manager.</p>
              <button
                onClick={() => setActiveView('timetable')}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors"
              >
                Add Timetable Slot
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {stats?.todaysClasses?.map((item) => (
                <div
                  key={item._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-indigo-100 bg-slate-50/50 hover:bg-indigo-50/30 transition-all gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-xs flex flex-col items-center justify-center shrink-0">
                      <span>{item.startTime.split(' ')[0]}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {item.subject}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {item.startTime} - {item.endTime}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {item.roomNumber}
                        </span>
                        <span>•</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                          {item.semester}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleQuickAttendance(item)}
                    className="self-start sm:self-auto px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>Take Attendance</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Attendance Alerts / Defaulter Watchlist */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>Attendance Watchlist</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold">
                &lt; 75% Criteria
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Students falling below the mandatory academic attendance threshold
            </p>

            {defaulters.length === 0 ? (
              <div className="py-8 text-center bg-emerald-50/50 rounded-xl border border-emerald-100">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-emerald-800">Excellent Attendance Compliance</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">All tracked students currently meet or exceed 75%.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {defaulters.map((stud) => (
                  <div
                    key={stud._id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">{stud.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {stud.rollNumber} • {stud.semester}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-rose-600">
                        {stud.percentage}%
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {stud.attendedClasses}/{stud.totalClasses} classes
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <button
              onClick={() => setActiveView('attendance')}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View Full Attendance Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Notes Section Preview */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>Recent Course Materials & Notes</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Study notes, assignments, and external cloud documents
            </p>
          </div>
          <button
            onClick={() => setActiveView('notes')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
          >
            <span>Explore All Notes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentNotes.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No study notes uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentNotes.map((note) => (
              <div
                key={note._id}
                onClick={() => setActiveView('notes')}
                className="p-4 rounded-xl border border-slate-100 hover:border-indigo-100 bg-slate-50/60 hover:bg-indigo-50/20 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-100 text-indigo-700">
                      {note.subject}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {note.semester}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mb-1">
                    {note.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {note.content.replace(/[#*`_]/g, '')}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-indigo-600 font-semibold">
                  <span>Read lecture details</span>
                  <ArrowRight className="w-3 h-3" />
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
