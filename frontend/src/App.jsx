import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import AttendanceView from './views/AttendanceView';
import StudentsView from './views/StudentsView';
import TimetableView from './views/TimetableView';
import NotesView from './views/NotesView';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Toast from './components/Toast';

const MainApp = () => {
  const { isAuthenticated, loading } = useAuth();
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
          />
        );
      case 'students':
        return <StudentsView showToast={showToast} />;
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex">
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
};

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
