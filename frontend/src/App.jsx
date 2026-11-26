import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Toast from './components/Toast';

// Code-splitting with dynamic lazy loading for optimal initial bundle size & load speed
const LoginView = lazy(() => import('./views/LoginView'));
const StudentPortalView = lazy(() => import('./views/StudentPortalView'));
const DashboardView = lazy(() => import('./views/DashboardView'));
const AttendanceView = lazy(() => import('./views/AttendanceView'));
const ReportsView = lazy(() => import('./views/ReportsView'));
const StudentsView = lazy(() => import('./views/StudentsView'));
const StudentQueriesView = lazy(() => import('./views/StudentQueriesView'));
const SubjectsView = lazy(() => import('./views/SubjectsView'));
const TimetableView = lazy(() => import('./views/TimetableView'));
const NotesView = lazy(() => import('./views/NotesView'));

const ViewLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[55vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-semibold text-slate-500">Loading module...</p>
    </div>
  </div>
);

const MainApp = () => {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedAttendanceSession, setSelectedAttendanceSession] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [studentAction, setStudentAction] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeView]);

  // Stable callback references to prevent cascading child re-renders & fetch loops
  const showToast = useCallback(({ message, type = 'info' }) => {
    setToast({ message, type });
  }, []);

  const handleCloseToast = useCallback(() => {
    setToast(null);
  }, []);

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
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <LoginView />
      </Suspense>
    );
  }

  // Role Protection: Students strictly render Student Portal
  if (user?.role === 'student') {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <StudentPortalView showToast={showToast} />
        <Toast toast={toast} onClose={handleCloseToast} />
      </Suspense>
    );
  }

  // Active view renderer for Admin / Faculty with Suspense
  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView
            setActiveView={setActiveView}
            setSelectedAttendanceSession={setSelectedAttendanceSession}
            setSelectedNoteId={setSelectedNoteId}
            setStudentAction={setStudentAction}
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
        return (
          <StudentsView
            showToast={showToast}
            initialAction={studentAction}
            onActionHandled={() => setStudentAction(null)}
          />
        );
      case 'queries':
        return <StudentQueriesView showToast={showToast} setActiveView={setActiveView} />;
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
        return (
          <NotesView
            showToast={showToast}
            initialNoteId={selectedNoteId}
            onNoteOpened={() => setSelectedNoteId(null)}
          />
        );
      default:
        return (
          <DashboardView
            setActiveView={setActiveView}
            setSelectedAttendanceSession={setSelectedAttendanceSession}
            setSelectedNoteId={setSelectedNoteId}
            setStudentAction={setStudentAction}
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
            <Suspense fallback={<ViewLoadingFallback />}>
              {renderActiveView()}
            </Suspense>
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
