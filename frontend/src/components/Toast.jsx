import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3.5 px-4.5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl transition-all duration-300 animate-fade-in border border-slate-200/90 bg-white/95 max-w-md">
      <div className="shrink-0">
        {isSuccess && (
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-4.5 h-4.5" />
          </div>
        )}
        {isError && (
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
            <AlertCircle className="w-4.5 h-4.5" />
          </div>
        )}
        {!isSuccess && !isError && (
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
            <Info className="w-4.5 h-4.5" />
          </div>
        )}
      </div>
      <div className="text-xs sm:text-sm font-semibold text-slate-800 flex-1 leading-snug">
        {toast.message}
      </div>
      <button
        onClick={onClose}
        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
