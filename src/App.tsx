import React, { useState, useEffect, useRef } from 'react';
import { TopNavBar, ActiveView } from './components/common/TopNavBar';
import { AdminModal } from './components/common/AdminModal';
import { CourseLibrary } from './pages/CourseLibrary';
import { CourseView } from './pages/CourseView';
import { CertificatesView } from './pages/CertificatesView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('library');
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>();
  const [selectedLessonId, setSelectedLessonId] = useState<string | undefined>();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Logo easter egg — 5 clicks within 2 seconds
  const logoClickCount = useRef(0);
  const logoClickTimer = useRef<NodeJS.Timeout>();
  const toastTimers = useRef<NodeJS.Timeout[]>([]);

  const handleLogoClick = React.useCallback(() => {
    logoClickCount.current += 1;
    clearTimeout(logoClickTimer.current);
    if (logoClickCount.current >= 5) {
      logoClickCount.current = 0;
      setShowAdminModal(true);
    } else {
      logoClickTimer.current = setTimeout(() => {
        logoClickCount.current = 0;
      }, 2000);
    }
  }, []);

  const addToast = React.useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = crypto.randomUUID().slice(0, 8);
    setToasts((prev) => [...prev, { id, message, type }]);
    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
    toastTimers.current.push(t);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Cleanup all toast timers on unmount
  useEffect(() => {
    return () => {
      toastTimers.current.forEach(clearTimeout);
    };
  }, []);

  const handleOpenCourse = React.useCallback((courseId: string, lessonId?: string) => {
    setSelectedCourseId(courseId);
    setSelectedLessonId(lessonId);
    setActiveView('player');
  }, []);

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <TopNavBar
        activeView={activeView}
        onNavigate={(view) => setActiveView(view)}
        onLogoClick={handleLogoClick}
        onOpenAdmin={() => setShowAdminModal(true)}
      />

      <main className="flex-1 overflow-hidden">
        <ErrorBoundary>
          {activeView === 'library' && (
            <CourseLibrary onOpenCourse={handleOpenCourse} onNotify={addToast} />
          )}
          {activeView === 'player' && (
            <CourseView
              courseId={selectedCourseId}
              initialLessonId={selectedLessonId}
              onBackToLibrary={() => setActiveView('library')}
              onNotify={addToast}
            />
          )}
          {activeView === 'certificates' && <CertificatesView onNotify={addToast} />}
        </ErrorBoundary>
      </main>

      {/* Admin Panel Modal */}
      {showAdminModal && (
        <AdminModal onClose={() => setShowAdminModal(false)} onNotify={addToast} />
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2.5 text-sm font-medium border max-w-sm ${
              toast.type === 'success'
                ? 'bg-white border-emerald-200 text-emerald-900'
                : toast.type === 'error'
                ? 'bg-white border-red-200 text-red-900'
                : 'bg-white border-orange-200 text-slate-900'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-orange-500 shrink-0" />}
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-300 hover:text-slate-500 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
export default App;
