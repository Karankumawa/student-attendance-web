import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginView from './views/LoginView';
import StudentPortalView from './views/StudentPortalView';
import DashboardView from './views/DashboardView';
import AttendanceView from './views/AttendanceView';
import ReportsView from './views/ReportsView';
import StudentsView from './views/StudentsView';
import SubjectsView from './views/SubjectsView';
import TimetableView from './views/TimetableView';
import NotesView from './views/NotesView';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Toast from './components/Toast';

const MainApp = () => {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedAttendanceSession, setSelectedAttendanceSession] = useState(null);

  const showToast = ({ message, type = 'info' }) => {
    setToast({ message, type });
  };

  const handleCloseToast = () => {
    setToast(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-300">Checking authenticated session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Role Protection: Students strictly render Student Portal
  if (user?.role === 'student') {
    return (
      <>
        <StudentPortalView showToast={showToast} />
        <Toast toast={toast} onClose={handleCloseToast} />
      </>
    );
  }

  // Active view renderer for Admin / Faculty
  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView
            setActiveView={setActiveView}
            setSelectedAttendanceSession={setSelectedAttendanceSession}
          />
        );
      case 'attendance':
        return (
          <AttendanceView
            initialSession={selectedAttendanceSession}
            showToast={showToast}
            setActiveView={setActiveView}
          />
        );
      case 'reports':
        return <ReportsView showToast={showToast} />;
      case 'students':
        return <StudentsView showToast={showToast} />;
      case 'subjects':
        return <SubjectsView showToast={showToast} />;
      case 'timetable':
        return (
          <TimetableView
            showToast={showToast}
            setActiveView={setActiveView}
            setSelectedAttendanceSession={setSelectedAttendanceSession}
          />
        );
      case 'notes':
        return <NotesView showToast={showToast} />;
      default:
        return (
          <DashboardView
            setActiveView={setActiveView}
            setSelectedAttendanceSession={setSelectedAttendanceSession}
          />
        );
    }
  };

  // Role Protection: Admin / Faculty strictly renders Admin Dashboard
  if (user?.role === 'admin') {
    return (
      <div className="min-h-screen bg-slate-100/60 text-slate-800 flex relative antialiased selection:bg-indigo-500 selection:text-white">
        {/* Sidebar Navigation */}
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />

        {/* Main Content Area */}
        <div className="flex-1 md:pl-72 flex flex-col min-w-0">
          <Navbar activeView={activeView} setIsMobileOpen={setIsMobileOpen} />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {renderActiveView()}
          </main>
        </div>

        {/* Notification Toast */}
        <Toast toast={toast} onClose={handleCloseToast} />
      </div>
    );
  }

  // Fallback for unauthorized roles
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
      <div className="bg-slate-900 p-8 rounded-2xl max-w-md w-full text-center border border-slate-800 shadow-2xl">
        <h2 className="text-xl font-bold text-rose-400 mb-2">Access Denied</h2>
        <p className="text-sm text-slate-300 mb-6">
          Your account role is not recognized or authorized. Please log in again.
        </p>
        <button
          onClick={logout}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white font-semibold text-sm transition"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
