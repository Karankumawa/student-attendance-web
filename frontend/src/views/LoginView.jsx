import React, { useState } from 'react';
import {
  GraduationCap,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  User,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  KeyRound,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SnitLogo from '../components/SnitLogo';

export const LoginView = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);

  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please provide both institutional email and password.');
      return;
    }

    setLoading(true);
    // Unified login: authenticate with database without manual role tab selection
    const result = await login(trimmedEmail, password);
    setLoading(false);

    if (!result.success) {
      setErrorMessage(
        result.message ||
          'Database verification failed. Please check your email and password.'
      );
    }
  };

  const handleFillDemo = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-slate-950 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Ambient Glow Mesh */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-600/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b18_1px,transparent_1px),linear-gradient(to_bottom,#1e293b18_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl rounded-[2.2rem] shadow-2xl p-7 sm:p-10 border border-white/60">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-3.5 transform hover:scale-105 transition-transform duration-300">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-violet-50 border border-indigo-100 shadow-md">
              <SnitLogo size={52} className="w-13 h-13" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            SNIT College Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium max-w-sm">
            Unified Academic & Administration Gateway
          </p>

          {/* Unified Gateway Smart Badge */}
          <div className="mt-3.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 via-violet-50 to-indigo-50 border border-indigo-100/90 text-[11px] font-bold text-indigo-700 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Single Portal • Auto-detects Admin & Student</span>
          </div>
        </div>

        {/* Database Verification Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-rose-50 border border-rose-200/90 flex items-start gap-3 text-rose-800 text-xs sm:text-sm animate-shake shadow-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">
              <p className="font-bold text-rose-900 mb-0.5">Authentication Failed</p>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Unified Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Institutional Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={handleInputChange(setEmail)}
                placeholder="admin@gmail.com or student@student.edu"
                required
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <span className="text-[11px] font-medium text-slate-400">
                Database Verified
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handleInputChange(setPassword)}
                placeholder="Enter your account password"
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer focus:outline-none"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:via-indigo-800 hover:to-violet-800 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.99] cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </>
            )}
          </button>
        </form>

        {/* Dynamic Role Guidance & Protection Info */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50/90 border border-slate-200/70">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Admin Login</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Connects directly to Faculty Attendance & Roster Management.
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50/90 border border-slate-200/70">
              <div className="flex items-center gap-1.5 text-xs font-bold text-violet-700 mb-1">
                <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                <span>Student Login</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Connects directly to Student Attendance, Timetable & Notes.
              </p>
            </div>
          </div>

          {/* Quick Demo Credentials Helper */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowDemoCredentials(!showDemoCredentials)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showDemoCredentials ? 'Hide' : 'Quick'} Demo Credentials</span>
            </button>

            {showDemoCredentials && (
              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">Admin Account:</span>{' '}
                    <span className="text-slate-600 font-mono text-[11px]">admin@gmail.com</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFillDemo('admin@gmail.com', 'karan@123')}
                    className="px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] border border-indigo-200 cursor-pointer"
                  >
                    Auto-Fill
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">Student Account:</span>{' '}
                    <span className="text-slate-600 font-mono text-[11px]">aarav@student.edu</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFillDemo('aarav@student.edu', 'student123')}
                    className="px-2 py-0.5 rounded-md bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold text-[10px] border border-violet-200 cursor-pointer"
                  >
                    Auto-Fill
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-200/60">
                  Password and email are verified directly against the MongoDB database.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
