import React, { useState } from 'react';
import {
  GraduationCap,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  User,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SnitLogo from '../components/SnitLogo';

export const LoginView = () => {
  const { login } = useAuth();
  const [activeRole, setActiveRole] = useState('faculty'); // 'faculty' or 'student'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRoleSwitch = (role) => {
    setActiveRole(role);
    setErrorMessage('');
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setLoading(true);
    const result = await login(
      email.trim(),
      password,
      activeRole === 'faculty' ? 'admin' : 'student'
    );
    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.message || 'Login failed. Please verify your credentials.');
    }
  };

  const isStudent = activeRole === 'student';

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Ambient Glow Mesh */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-600/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-2xl p-7 sm:p-9 border border-white/60">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-3 transform hover:scale-105 transition-transform duration-300">
            <div className="p-2 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 shadow-md">
              <SnitLogo size={52} className="w-13 h-13" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            SNIT Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            {isStudent
              ? 'Student Academic Dashboard & Attendance'
              : 'Teacher & Faculty Administration Suite'}
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50/80 border border-indigo-100 text-xs font-bold text-indigo-700">
            {isStudent ? <User className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            <span>{isStudent ? 'Student Access' : 'Faculty Access'}</span>
          </div>
        </div>

        {/* Portal Role Switcher Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl mb-6 border border-slate-200/80">
          <button
            type="button"
            onClick={() => handleRoleSwitch('faculty')}
            className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              !isStudent
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Faculty Login</span>
          </button>
          <button
            type="button"
            onClick={() => handleRoleSwitch('student')}
            className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isStudent
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Student Login</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start gap-2.5 text-rose-700 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 font-semibold">{errorMessage}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              {isStudent ? 'Student Institutional Email' : 'Faculty Email Address'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isStudent ? 'student@college.edu' : 'faculty@college.edu'}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Account Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-98 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isStudent ? 'Sign In as Student' : 'Sign In to Faculty Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security / Help Notice Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            {isStudent
              ? 'Students: Use your registered institutional email & default password.'
              : 'Authorized institutional faculty and departmental administration.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
