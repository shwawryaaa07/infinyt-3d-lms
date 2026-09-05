import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronRight,
  CheckCircle2,
  Circle,
  Lock,
  FileText,
  HelpCircle,
  Award,
  AlertTriangle,
  ArrowLeft,
  CheckSquare,
  Square,
  ShieldCheck,
  BookOpen,
  Video
} from 'lucide-react';
import type { Course, Lesson } from '../types/electron.d.ts';
import { api } from '../services/api';
import { VideoPlayer } from '../components/video/VideoPlayer';
import { PdfViewer } from '../components/pdf/PdfViewer';
import { QuizRunner } from '../components/quiz/QuizRunner';

interface CourseViewProps {
  courseId?: string;
  initialLessonId?: string;
  onBackToLibrary: () => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CourseView: React.FC<CourseViewProps> = ({
  courseId,
  initialLessonId,
  onBackToLibrary,
  onNotify
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | undefined>(courseId);
  const [course, setCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);

  // Debounced Video Progress Ref
  const progressDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestProgressRef = useRef<{ lessonId: string; position: number; isCompleted: boolean } | null>(null);

  // Sync courseId prop if passed from parent
  useEffect(() => {
    if (courseId) {
      setActiveCourseId(courseId);
    }
  }, [courseId]);

  // Load all courses and auto-select first available if activeCourseId is undefined
  useEffect(() => {
    api.getCourses().then((list) => {
      setCourses(list);
      if (!activeCourseId && list.length > 0) {
        setActiveCourseId(list[0].id);
      }
    });
  }, [activeCourseId]);

  // Load active course data
  useEffect(() => {
    if (!activeCourseId) return;

    api.getCourseById(activeCourseId).then((data) => {
      setCourse(data);
      if (data && data.modules && data.modules.length > 0) {
        // Find initial lesson or first available uncompleted lesson
        let targetLesson: Lesson | null = null;
        if (initialLessonId) {
          for (const m of data.modules) {
            const found = m.lessons?.find((l) => l.id === initialLessonId);
            if (found) {
              targetLesson = found;
              break;
            }
          }
        }

        if (!targetLesson) {
          for (const m of data.modules) {
            if (m.is_locked) continue;
            for (const l of m.lessons || []) {
              if (!l.is_completed) {
                targetLesson = l;
                break;
              }
            }
            if (targetLesson) break;
          }
        }

        if (!targetLesson && data.modules[0].lessons && data.modules[0].lessons.length > 0) {
          targetLesson = data.modules[0].lessons[0];
        }

        setActiveLesson(targetLesson);
      }
    });
  }, [activeCourseId, initialLessonId]);

  // Flush video playback position to database
  const flushVideoProgress = useCallback(async () => {
    if (latestProgressRef.current) {
      const { lessonId, position, isCompleted } = latestProgressRef.current;
      try {
        await api.saveLessonProgress(lessonId, isCompleted, Math.floor(position), !isCompleted);
      } catch (err) {
        console.error('Error saving debounced video progress:', err);
      }
    }
  }, []);

  // Debounced Video Progress Update Handler
  const handleVideoProgressUpdate = useCallback((positionSeconds: number, isCompleted: boolean) => {
    if (!activeLesson) return;

    latestProgressRef.current = {
      lessonId: activeLesson.id,
      position: positionSeconds,
      isCompleted
    };

    if (progressDebounceTimerRef.current) {
      clearTimeout(progressDebounceTimerRef.current);
    }

    progressDebounceTimerRef.current = setTimeout(() => {
      flushVideoProgress();
    }, 5000); // 5-second debounce window
  }, [activeLesson, flushVideoProgress]);

  // Flush on unmount or lesson change
  useEffect(() => {
    return () => {
      if (progressDebounceTimerRef.current) {
        clearTimeout(progressDebounceTimerRef.current);
      }
      flushVideoProgress();
    };
  }, [activeLesson, flushVideoProgress]);

  const handleSelectLesson = (lesson: Lesson, isLocked: boolean) => {
    if (isLocked) {
      onNotify('This module is locked. Pass the preceding module to unlock.', 'error');
      return;
    }
    flushVideoProgress();
    setActiveLesson(lesson);
  };

  const handleNextLesson = useCallback(() => {
    if (!course || !activeLesson) return;

    let foundCurrent = false;
    let nextLesson: Lesson | null = null;

    for (const m of course.modules || []) {
      for (const l of m.lessons || []) {
        if (foundCurrent && !m.is_locked) {
          nextLesson = l;
          break;
        }
        if (l.id === activeLesson.id) {
          foundCurrent = true;
        }
      }
      if (nextLesson) break;
    }

    if (nextLesson) {
      flushVideoProgress();
      setActiveLesson(nextLesson);
    }
  }, [course, activeLesson, flushVideoProgress]);

  const handleLessonCompleted = async () => {
    if (!activeLesson || !activeCourseId) return;
    setIsMarkingComplete(true);
    try {
      await api.saveLessonProgress(activeLesson.id, true, activeLesson.duration_minutes * 60, false);
      onNotify(`Unit '${activeLesson.title}' completed!`, 'success');

      // Refresh course state
      const updated = await api.getCourseById(activeCourseId);
      setCourse(updated);

      if (updated) {
        // Find next lesson
        let foundCurrent = false;
        let nextLesson: Lesson | null = null;

        for (const m of updated.modules || []) {
          for (const l of m.lessons || []) {
            if (foundCurrent && !m.is_locked) {
              nextLesson = l;
              break;
            }
            if (l.id === activeLesson.id) {
              foundCurrent = true;
            }
          }
          if (nextLesson) break;
        }

        if (nextLesson) {
          setActiveLesson(nextLesson);
        }

        // Auto-issue certificate on 100% completion
        if (updated.progress_percentage === 100) {
          await api.saveCertificate(updated.id, updated.title);
          onNotify('🎉 Certificate earned! Check My Certificates.', 'success');
        }
      }
    } catch (err: any) {
      onNotify(err.message || 'Error updating lesson progress', 'error');
    } finally {
      setIsMarkingComplete(false);
    }
  };

  const handleQuizPassed = async (_score: number, _passed: boolean) => {
    await handleLessonCompleted();
  };

  const toggleChecklist = (itemId: string) => {
    setCheckedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // If no courses exist in system
  if (!activeCourseId || (!course && courses.length === 0)) {
    return (
      <div className="p-12 text-center space-y-6 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto border border-orange-200">
          <BookOpen className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 font-poppins">No Course Selected</h2>
          <p className="text-xs text-slate-500">
            Please select a course from the Course Library to launch the training player.
          </p>
        </div>
        <button
          onClick={onBackToLibrary}
          className="px-6 py-2.5 rounded-full btn-brand-gradient text-xs font-bold shadow-md"
        >
          ← Return to Courses
        </button>
      </div>
    );
  }

  // Parse SOP structured JSON if available
  let sopData: any = null;
  if (activeLesson && activeLesson.content_type === 'rich_text' && activeLesson.content_body) {
    try {
      sopData = JSON.parse(activeLesson.content_body);
    } catch {
      sopData = null;
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* 1. Top Sub-Header: Course Navigation & Progress Tracker */}
      <div className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToLibrary}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
            title="Back to Course Library"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                {course?.category || 'Curriculum'}
              </span>
              <h1 className="text-xs font-bold text-slate-900 truncate max-w-md font-poppins">
                {course?.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Global Progress Gauge */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="text-right">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">Syllabus Progress</div>
              <div className="text-xs font-bold text-slate-900">{course?.progress_percentage || 0}% Complete</div>
            </div>
            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-500"
                style={{ width: `${course?.progress_percentage || 0}%` }}
              />
            </div>
          </div>

          {course?.progress_percentage === 100 && (
            <div className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-bold flex items-center space-x-1.5 shadow-sm">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              <span>Certified</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Course Workspace: Left Syllabus Sidebar + Right Active Engine */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Syllabus & Prerequisite Modules Tree */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col justify-between overflow-y-auto shrink-0 shadow-sm">
          <div className="p-4 space-y-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Course Syllabus & Modules
            </div>

            <div className="space-y-4">
              {course?.modules?.map((mod, modIdx) => {
                const isLocked = Boolean(mod.is_locked);
                const isCompleted = Boolean(mod.is_completed);

                return (
                  <div
                    key={mod.id}
                    className={`rounded-2xl border transition-all ${
                      isLocked
                        ? 'bg-slate-50/70 border-slate-200 opacity-60'
                        : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    {/* Module Title Banner */}
                    <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          M{modIdx + 1}
                        </span>
                        <h3 className="text-xs font-bold text-slate-800 truncate font-poppins">{mod.title}</h3>
                      </div>
                      {isLocked ? (
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : null}
                    </div>

                    {/* Module Lessons List */}
                    <div className="p-1.5 space-y-1">
                      {mod.lessons?.map((les) => {
                        const isActive = activeLesson?.id === les.id;
                        const isDone = Boolean(les.is_completed);

                        let IconComponent = FileText;
                        if (les.content_type === 'video') IconComponent = Video;
                        if (les.content_type === 'quiz') IconComponent = HelpCircle;

                        return (
                          <div
                            key={les.id}
                            onClick={() => handleSelectLesson(les, isLocked)}
                            className={`p-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all ${
                              isActive
                                ? 'bg-orange-50 border border-orange-300 text-orange-950 font-bold shadow-sm'
                                : isLocked
                                ? 'cursor-not-allowed text-slate-400'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 truncate">
                              <IconComponent
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isActive ? 'text-orange-600' : 'text-slate-400'
                                }`}
                              />
                              <span className="truncate text-[11px]">{les.title}</span>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0">
                              <span className="text-[9px] font-mono text-slate-400">
                                {les.duration_minutes}m
                              </span>
                              {isDone ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Circle className="w-3 h-3 text-slate-300" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Engine Lesson Viewport */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50">
          {activeLesson ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Unit Sub-Header Banner */}
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                      {activeLesson.content_type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Estimated: {activeLesson.duration_minutes} Mins
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 mt-1 font-poppins">
                    {activeLesson.title}
                  </h2>
                </div>

                {activeLesson.is_completed && (
                  <div className="flex items-center space-x-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Unit Completed</span>
                  </div>
                )}
              </div>

              {/* ENGINE 1: Standard Operating Procedure (SOP) or Plain Text Guide */}
              {activeLesson.content_type === 'rich_text' && (
                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
                  {sopData ? (
                    <>
                      {/* Safety Alert Callout */}
                      {sopData.introduction && (
                        <div className="p-4 bg-orange-50/70 border-l-4 border-orange-600 rounded-r-2xl space-y-1">
                          <div className="flex items-center space-x-1.5 text-xs font-bold text-orange-950">
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                            <span>MANDATORY OPERATIONAL PROTOCOL</span>
                          </div>
                          <p className="text-xs text-orange-900 leading-relaxed font-sans">
                            {sopData.introduction}
                          </p>
                        </div>
                      )}

                      {/* Step-by-Step Sections */}
                      {sopData.sections?.map((sec: any, sIdx: number) => (
                        <div key={sIdx} className="space-y-2">
                          <h3 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-wider">
                            {sec.heading}
                          </h3>
                          <div className="text-xs text-slate-600 leading-relaxed font-sans whitespace-pre-wrap bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            {sec.content}
                          </div>
                        </div>
                      ))}

                      {/* Technical Parameter Calibration Matrix */}
                      {sopData.parameters && sopData.parameters.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-wider">
                            Engineering Calibration Parameters
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            {sopData.parameters.map((p: any, pIdx: number) => (
                              <div
                                key={pIdx}
                                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                              >
                                <span className="text-xs text-slate-500 font-medium">{p.label}</span>
                                <span className="font-mono font-bold text-xs text-orange-600">
                                  {p.value} {p.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Interactive Pre-Flight Inspection Checklists */}
                      {sopData.checklists && sopData.checklists.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-wider">
                            Machine Pre-Flight Inspection Checklist
                          </h4>
                          <div className="space-y-2">
                            {sopData.checklists.map((chk: any) => {
                              const isChecked = checkedItems[chk.id] || false;
                              return (
                                <div
                                  key={chk.id}
                                  onClick={() => toggleChecklist(chk.id)}
                                  className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                                    isChecked
                                      ? 'bg-emerald-50/70 border-emerald-300 text-slate-900'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  {isChecked ? (
                                    <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-400 shrink-0" />
                                  )}
                                  <span className="text-xs font-medium">{chk.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                      {activeLesson.content_body || 'Standard operational procedures and technical guidelines.'}
                    </div>
                  )}
                </div>
              )}

              {/* ENGINE 2: Video Player with exact resume & auto-advance */}
              {activeLesson.content_type === 'video' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <VideoPlayer
                    mediaPath={activeLesson.media_path}
                    initialPositionSeconds={activeLesson.last_position_seconds || 0}
                    onProgressUpdate={handleVideoProgressUpdate}
                    onComplete={handleLessonCompleted}
                    onNextLesson={handleNextLesson}
                    traineeName="Infinyt 3D Learner"
                    title={activeLesson.title}
                  />
                </div>
              )}

              {/* ENGINE 3: Technical PDF Sheet Viewer */}
              {activeLesson.content_type === 'pdf' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <PdfViewer
                    mediaPath={activeLesson.media_path}
                    title={activeLesson.title}
                  />
                </div>
              )}

              {/* ENGINE 4: Competency Quiz Runner */}
              {activeLesson.content_type === 'quiz' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <QuizRunner
                    lessonId={activeLesson.id}
                    onQuizCompleted={handleQuizPassed}
                  />
                </div>
              )}

              {/* Bottom Action Footer */}
              {activeLesson.content_type !== 'quiz' && (
                <div className="flex justify-between items-center bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Progress is automatically recorded into local storage</span>
                  </div>

                  <button
                    onClick={handleLessonCompleted}
                    disabled={isMarkingComplete}
                    className="px-6 py-2.5 rounded-full btn-brand-gradient text-xs font-bold flex items-center space-x-2 shadow-md shadow-orange-500/20 disabled:opacity-50"
                  >
                    <span>{isMarkingComplete ? 'SAVING...' : 'MARK COMPLETE & CONTINUE'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
              Select a lesson from the syllabus on the left to begin training.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
