import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Play,
  CheckCircle2,
  RefreshCw,
  Layers,
  GraduationCap,
  HardDrive
} from 'lucide-react';
import type { Course } from '../types/electron.d.ts';
import { api } from '../services/api';
import { SkeletonCard } from '../components/common/SkeletonCard';
import { resolveMediaPath } from '../components/video/VideoPlayer';

interface CourseLibraryProps {
  onOpenCourse: (courseId: string, lessonId?: string) => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CourseLibrary: React.FC<CourseLibraryProps> = ({ onOpenCourse, onNotify }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);

  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCourses();
      setCourses(data);
    } catch (err: any) {
      console.error('Error loading courses:', err);
      onNotify('Failed to load courses', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleInstallPackage = async () => {
    setIsInstalling(true);
    try {
      const result = await api.installCoursePackage();
      if (result.success) {
        onNotify(result.message || 'Course package installed successfully from drive!', 'success');
        await loadCourses();
      } else if (result.message && result.message !== 'Package selection cancelled') {
        onNotify(result.error || result.message || 'Installation cancelled', 'error');
      }
    } catch (err: any) {
      onNotify(err.message || 'Error installing course package', 'error');
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto overflow-y-auto h-full bg-slate-50">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200 flex items-center space-x-1">
              <GraduationCap className="w-3 h-3 text-orange-600 inline mr-1" />
              <span>TRAINING ACADEMY</span>
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-poppins">
            Your Courses
          </h1>
          <div className="accent-bar mt-1.5" />
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadCourses}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all shadow-sm flex items-center space-x-1.5 text-xs font-semibold"
            title="Refresh Courses"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleInstallPackage}
            disabled={isInstalling}
            className="px-5 py-2.5 rounded-full btn-brand-gradient text-xs font-bold tracking-wider flex items-center space-x-2 shadow-sm disabled:opacity-50"
          >
            <HardDrive className="w-4 h-4" />
            <span>{isInstalling ? 'Installing...' : '+ Install Course (.i3dpack)'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : courses.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center space-y-6 max-w-lg mx-auto shadow-sm my-12">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto border border-orange-200">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 font-poppins">No Courses Available</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              No training courses have been installed yet. Connect a USB drive with a <span className="font-mono text-orange-600 font-bold">.i3dpack</span> bundle or create courses in the Instructor Studio.
            </p>
          </div>
          <div className="flex justify-center pt-2">
            <button
              onClick={handleInstallPackage}
              disabled={isInstalling}
              className="px-6 py-3 rounded-full btn-brand-gradient text-xs font-bold tracking-wider flex items-center space-x-2 shadow-md shadow-orange-500/20"
            >
              <HardDrive className="w-4 h-4" />
              <span>+ INSTALL COURSE FROM DRIVE (.i3dpack)</span>
            </button>
          </div>
        </div>
      ) : (
        /* Course Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const pct = course.progress_percentage || 0;
            const isCompleted = pct === 100;

            return (
              <div
                key={course.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Thumbnail Banner */}
                  <div className="relative aspect-video bg-gradient-to-tr from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden">
                    {course.thumbnail_path ? (
                      <img
                        src={resolveMediaPath(course.thumbnail_path)}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-orange-600 via-orange-500 to-red-600 flex items-center justify-center text-white">
                        <div className="text-center space-y-1 p-4">
                          <Layers className="w-10 h-10 mx-auto text-white/90" />
                          <span className="text-xs font-mono font-bold tracking-wider text-white/80 block uppercase">
                            {course.category}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Category Pill */}
                    <div className="absolute top-3 right-3">
                      <span className="text-[10px] font-mono font-bold uppercase text-white bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
                        {course.category}
                      </span>
                    </div>

                    {/* Completed Badge on Thumbnail */}
                    {isCompleted && (
                      <div className="absolute bottom-3 left-3 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-md">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Completed</span>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-3">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug font-poppins">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {course.description || 'Comprehensive industrial curriculum with step-by-step procedures and assessments.'}
                    </p>

                    {/* Meta row */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span className="font-medium text-slate-600">
                        {course.total_lessons || 0} Lessons
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {course.difficulty || 'Intermediate'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress & Launch Button */}
                <div className="p-5 pt-0 space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono font-semibold">
                      <span className="text-slate-400">Progress</span>
                      <span className="text-slate-800">{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenCourse(course.id)}
                    className="w-full py-2.5 rounded-full btn-brand-gradient text-xs font-bold tracking-wider flex items-center justify-center space-x-2 shadow-sm"
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Review Course</span>
                      </>
                    ) : pct > 0 ? (
                      <>
                        <Play className="w-3.5 h-3.5" fill="currentColor" />
                        <span>Continue</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" fill="currentColor" />
                        <span>Start Course</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
