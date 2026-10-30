import React from 'react';
import { Menu, Calendar, LogOut, Clock, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({ activeView, setIsMobileOpen }) => {
  const { logout, user } = useAuth();

  const getTitle = () => {
    switch (activeView) {
      case 'dashboard':
        return { title: 'Dashboard Overview', subtitle: 'Live metrics, today\'s classes, and faculty summary' };
      case 'attendance':
        return { title: 'Attendance Management', subtitle: 'Record student attendance and inspect compliance rates' };
      case 'students':
        return { title: 'Student Roster', subtitle: 'Manage student profiles across departments and semesters' };
      case 'timetable':
        return { title: 'Timetable & Schedule', subtitle: 'Plan and organize weekly class periods and lecture halls' };
      case 'notes':
        return { title: 'Notes & Study Material', subtitle: 'Publish lecture notes, summaries, and downloadable references' };
      default:
        return { title: 'Faculty Portal', subtitle: 'College Management System' };
    }
  };

  const { title, subtitle } = getTitle();

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 h-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 flex items-center justify-between">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 md:hidden transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
            {title}
          </h2>
          <p className="text-xs text-slate-600 hidden sm:block font-medium">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Date badge, Quick Status & Logout */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/60 shadow-xs">
          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
          <span>{currentDate}</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/60">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Semester Active</span>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors border border-transparent hover:border-rose-100"
          title="Log out of session"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
