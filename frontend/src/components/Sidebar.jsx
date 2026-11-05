import React from 'react';
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  CalendarClock,
  BookOpenCheck,
  FileSpreadsheet,
  LogOut,
  ChevronRight,
  ShieldCheck,
  BookOpen,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SnitLogo from './SnitLogo';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
  { id: 'attendance', label: 'Take & View Attendance', icon: ClipboardCheck, badge: 'Live' },
  { id: 'reports', label: 'Attendance Reports', icon: FileSpreadsheet, badge: 'Excel' },
  { id: 'students', label: 'Student Register', icon: Users },
  { id: 'subjects', label: 'Subjects & Courses', icon: BookOpen },
  { id: 'timetable', label: 'Timetable Manager', icon: CalendarClock, badge: 'Weekly' },
  { id: 'notes', label: 'Notes & Materials', icon: BookOpenCheck },
];

export const Sidebar = ({ activeView, setActiveView, isMobileOpen, setIsMobileOpen }) => {
  const { user, logout } = useAuth();

  const handleNavClick = (viewId) => {
    setActiveView(viewId);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-slate-950 border-r border-slate-800/80 text-white flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 shadow-2xl ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div>
          <div className="h-20 px-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/90 backdrop-blur-md">
            <div className="flex items-center gap-3.5">
              <div className="p-1.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-inner">
                <SnitLogo className="w-9 h-9" size={36} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-extrabold text-white text-xl tracking-tight leading-none">
                    SNIT
                  </h1>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="System Online" />
                </div>
                <p className="text-[11px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                  Academic Portal
                </p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-900 transition-colors cursor-pointer"
              aria-label="Close navigation sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="p-4 space-y-1.5">
            <div className="px-3 py-2 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center justify-between">
              <span>Main Navigation</span>
              <span className="text-[10px] font-mono text-indigo-400/80">v2.0</span>
            </div>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 group cursor-pointer relative overflow-hidden ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30 font-semibold ring-1 ring-white/20'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.badge && !isActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-indigo-400 border border-slate-800">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${
                        isActive
                          ? 'text-white/90 translate-x-0.5'
                          : 'text-slate-600 opacity-0 group-hover:opacity-100 group-hover:text-slate-300'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Profile & Logout Card */}
        <div className="p-4 border-t border-slate-800/70 bg-slate-950/80 backdrop-blur-md">
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 mb-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                {user?.name?.slice(0, 2).toUpperCase() || 'FA'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-100 truncate leading-tight">
                    {user?.name || 'Faculty Admin'}
                  </p>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" title="Verified Faculty Admin" />
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{user?.email || 'admin@college.edu'}</p>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-300 hover:text-white hover:bg-rose-600/20 text-xs font-bold transition-all cursor-pointer active:scale-98"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
