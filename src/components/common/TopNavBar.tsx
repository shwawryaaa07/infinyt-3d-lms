import React from 'react';
import { BookOpen, Award, X } from 'lucide-react';

export type ActiveView = 'library' | 'player' | 'certificates';

interface TopNavBarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  onLogoClick?: () => void;
  onOpenAdmin?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeView,
  onNavigate,
  onLogoClick
}) => {
  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-30 titlebar-drag-region select-none">
      {/* Left: Logo */}
      <div className="flex items-center space-x-5">
        <button
          onClick={onLogoClick}
          className="flex items-center space-x-2.5 no-drag select-none focus:outline-none text-left group"
          title="Infinyt 3D Platform"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-600 to-orange-400 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <span className="text-white font-black text-sm">∞</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-extrabold text-slate-900 text-base tracking-tight font-poppins">
              Infinyt<span className="text-orange-500">3D</span>
            </span>
            <span className="text-[9px] text-slate-400 font-medium tracking-wide">Training Academy</span>
          </div>
        </button>
      </div>

      {/* Center: Navigation Tabs */}
      <nav className="flex items-center space-x-1 no-drag">
        {[
          { id: 'library' as ActiveView, label: 'Courses', icon: BookOpen },
          { id: 'certificates' as ActiveView, label: 'My Certificates', icon: Award }
        ].map(({ id, label, icon: Icon }) => {
          const isSelected = activeView === id || (activeView === 'player' && id === 'library');
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`relative flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                isSelected
                  ? 'text-orange-600 bg-orange-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
              {isSelected && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-orange-500 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Right: Window Controls */}
      <div className="flex items-center no-drag">
        <button
          onClick={handleClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 transition-colors"
          title="Close Window"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
