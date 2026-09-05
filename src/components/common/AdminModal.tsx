import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lock, X, ShieldAlert, KeyRound } from 'lucide-react';
import { CourseEditor } from '../../pages/CourseEditor';
import { api } from '../../services/api';

interface AdminModalProps {
  onClose: () => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ onClose, onNotify }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const onNotifyRef = useRef(onNotify);
  onNotifyRef.current = onNotify;

  // 15-minute auto-lock timer
  const autoLockTimerRef = useRef<NodeJS.Timeout>();

  const resetAutoLockTimer = useCallback(() => {
    if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
    autoLockTimerRef.current = setTimeout(() => {
      setIsAuthenticated(false);
      setPin('');
      setErrorMsg('');
      onNotifyRef.current('Admin session locked due to inactivity.', 'info');
    }, 15 * 60 * 1000); // 15 minutes
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      resetAutoLockTimer();
      const handleUserActivity = () => resetAutoLockTimer();
      window.addEventListener('mousemove', handleUserActivity, { passive: true });
      window.addEventListener('keydown', handleUserActivity, { passive: true });
      window.addEventListener('click', handleUserActivity, { passive: true });

      return () => {
        if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
        window.removeEventListener('mousemove', handleUserActivity);
        window.removeEventListener('keydown', handleUserActivity);
        window.removeEventListener('click', handleUserActivity);
      };
    }
  }, [isAuthenticated, resetAutoLockTimer]);

  const handleVerifyPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin || pin.length < 4) {
      setErrorMsg('Please enter a valid 4-digit PIN');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    setIsVerifying(true);
    try {
      const isValid = await api.verifyAdminPin(pin);
      if (isValid) {
        setIsAuthenticated(true);
        setErrorMsg('');
        setPin('');
      } else {
        setErrorMsg('Incorrect PIN. Please try again.');
        setPin('');
        setTimeout(() => setErrorMsg(''), 3000);
      }
    } catch (err: any) {
      setErrorMsg('Verification error. Please try again.');
      setTimeout(() => setErrorMsg(''), 3000);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col animate-in fade-in duration-200">
      <div className="bg-white h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Instructor Admin Panel</h2>
              <p className="text-[10px] text-slate-400">Course authoring, curriculum builder & USB packager</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>

        {/* Body: PIN Screen or CourseEditor */}
        <div className="flex-1 overflow-hidden">
          {!isAuthenticated ? (
            <div className="flex items-center justify-center h-full bg-slate-50 p-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-sm w-full shadow-xl space-y-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 to-orange-400 text-white flex items-center justify-center mx-auto shadow-md shadow-orange-500/20">
                  <KeyRound className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900">Admin Authentication</h3>
                  <p className="text-xs text-slate-500">Enter master PIN to access Instructor Studio</p>
                </div>

                <form onSubmit={handleVerifyPin} className="space-y-4">
                  <div>
                    <input
                      type="password"
                      maxLength={8}
                      autoFocus
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="••••"
                      className="w-full text-center tracking-[0.6em] text-2xl font-bold py-3 px-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-slate-50 text-slate-900"
                    />
                  </div>

                  {errorMsg && (
                    <div className="flex items-center justify-center space-x-1.5 text-xs text-red-600 font-semibold bg-red-50 py-2 px-3 rounded-lg border border-red-200">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full py-2.5 rounded-full btn-brand-gradient text-xs font-bold tracking-wider shadow-md shadow-orange-500/20 disabled:opacity-50"
                  >
                    {isVerifying ? 'VERIFYING...' : 'UNLOCK INSTRUCTOR PANEL'}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <CourseEditor onNotify={onNotify} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
