import React, { useState } from 'react';
import { Menu, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({ activeView, setIsMobileOpen }) => {
  const { user, logout } = useAuth();

  const getTitle = () => {
    switch (activeView) {
      case 'dashboard':
        return { title: 'Dashboard Overview', subtitle: 'Live metrics, today\'s classes, and faculty summary' };
      case 'attendance':
        return { title: 'Attendance Management', subtitle: 'Record student attendance and inspect compliance rates' };
      case 'reports':
        return { title: 'Attendance Reports', subtitle: 'Export past years and semester student attendance directly into Excel format' };
      case 'students':
        return { title: 'Student Register', subtitle: 'Register and manage student profiles and portal accounts' };
      case 'subjects':
        return { title: 'Subjects & Courses', subtitle: 'Manage academic courses, syllabus codes, and credit schemes' };
      case 'timetable':
        return { title: 'Timetable & Schedule', subtitle: 'Plan and organize weekly class periods and lecture halls' };
      case 'notes':
        return { title: 'Notes & Study Material', subtitle: 'Publish lecture notes, summaries, and downloadable references' };
      default:
        return { title: 'Faculty Portal', subtitle: 'College Management System' };
    }
  };

  const { title, subtitle } = getTitle();

  const [currentDate] = useState(() =>
    new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  );

  return (
    <header className="sticky top-0 z-30 h-20 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-4 md:px-8 flex items-center justify-between transition-all">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 -ml-2 text-slate-700 hover:text-indigo-600 rounded-xl hover:bg-slate-100/80 md:hidden transition-colors cursor-pointer shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
              Faculty Portal
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] font-semibold text-slate-500 capitalize truncate">
              {activeView}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight truncate">
            {title}
          </h2>
          <p className="text-xs text-slate-500 hidden sm:block font-medium mt-0.5 truncate max-w-xl">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Date badge, User Pill & Quick Logout */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200/80 shadow-xs">
          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
          <span>{currentDate}</span>
        </div>

        {/* User Profile Chip */}
        <div className="hidden sm:flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-slate-50/90 border border-slate-200/80 shadow-xs">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
            {user?.name?.slice(0, 1).toUpperCase() || 'A'}
          </div>
          <div className="text-left leading-none">
            <p className="text-xs font-bold text-slate-800 truncate max-w-[110px]">
              {user?.name || 'Faculty Admin'}
            </p>
            <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">
              Admin
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all border border-slate-200 hover:border-rose-200 cursor-pointer shadow-xs active:scale-95"
          title="Log out of session"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
