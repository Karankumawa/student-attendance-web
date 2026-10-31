import React from 'react';
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  CalendarClock,
  BookOpenCheck,
  FileSpreadsheet,
  GraduationCap,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SnitLogo from './SnitLogo';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
  { id: 'attendance', label: 'Take & View Attendance', icon: ClipboardCheck },
  { id: 'reports', label: 'Attendance Reports (Excel)', icon: FileSpreadsheet },
  { id: 'students', label: 'Student Roster', icon: Users },
  { id: 'timetable', label: 'Timetable Manager', icon: CalendarClock },
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
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 md:w-72 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div>
          <div className="h-20 px-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SnitLogo className="w-10 h-10 shadow-md shadow-indigo-100" size={40} />
              <div>
                <h1 className="font-extrabold text-slate-900 text-xl tracking-tight leading-none">
                  SNIT
                </h1>
                <p className="text-[11px] font-semibold text-slate-500 mt-1 uppercase tracking-wider">Academic Portal</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-4 space-y-1.5">
            <div className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Main Menu
            </div>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 font-semibold'
                      : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${
                      isActive ? 'text-white/80 translate-x-0.5' : 'text-slate-300 opacity-0 group-hover:opacity-100'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Profile & Logout Card */}
        <div className="p-4 border-t border-slate-100">
          <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100/80 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 border border-indigo-200">
                {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-slate-800 truncate leading-tight">
                    {user?.name || 'Faculty Admin'}
                  </p>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" title="Verified Admin" />
                </div>
                <p className="text-xs text-slate-600 truncate">{user?.email || 'admin@gmail.com'}</p>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-sm font-medium transition-colors"
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
