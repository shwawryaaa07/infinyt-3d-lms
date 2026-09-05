import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Save,
  Package,
  FileText,
  Trash2,
  Video,
  HelpCircle,
  HardDrive,
  Upload,
  Image as ImageIcon,
  AlertTriangle,
  CheckSquare,
  Sliders,
  Film,
  Edit2,
  Check,
  X,
  Settings,
  Layers
} from 'lucide-react';
import type { Course, Module, Lesson } from '../types/electron.d.ts';
import { api } from '../services/api';
import { QuizEditor } from '../components/quiz/QuizEditor';
import { resolveMediaPath } from '../components/video/VideoPlayer';

interface CourseEditorProps {
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CourseEditor: React.FC<CourseEditorProps> = ({ onNotify }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Course Settings Modal (Clean overlay, never displaces the curriculum)
  const [showCourseSettingsModal, setShowCourseSettingsModal] = useState(false);
  const [editingCourseData, setEditingCourseData] = useState<Partial<Course>>({});

  // Module creation & renaming
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState('');

  // Lesson creation
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonType, setNewLessonType] = useState<Lesson['content_type']>('video');
  const [newLessonDuration, setNewLessonDuration] = useState(10);

  // USB Packaging
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Active Lesson Edit State
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonType, setLessonType] = useState<Lesson['content_type']>('video');
  const [lessonDuration, setLessonDuration] = useState(5);
  const [lessonMediaPath, setLessonMediaPath] = useState('');

  // Hidden file inputs for universal file picker support
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const thumbInputRef = useRef<HTMLInputElement | null>(null);

  // SOP Builder State
  const [sopIntro, setSopIntro] = useState('');
  const [sopBody, setSopBody] = useState('');
  const [sopImage, setSopImage] = useState('');
  const [sopParameters, setSopParameters] = useState<{ label: string; value: string; unit: string }[]>([]);
  const [sopChecklists, setSopChecklists] = useState<{ id: string; label: string; required: boolean }[]>([]);

  // Load all courses from SQLite
  const loadCourses = async (targetCourseId?: string) => {
    try {
      const data = await api.getCourses();
      setCourses(data);

      const activeId = targetCourseId || selectedCourse?.id || (data.length > 0 ? data[0].id : null);
      if (activeId) {
        const full = await api.getCourseById(activeId);
        setSelectedCourse(full);
        if (full?.modules && full.modules.length > 0) {
          const currentMod = selectedModule
            ? full.modules.find((m) => m.id === selectedModule.id) || full.modules[0]
            : full.modules[0];
          setSelectedModule(currentMod);

          if (currentMod?.lessons && currentMod.lessons.length > 0) {
            const currentLes = selectedLesson
              ? currentMod.lessons.find((l) => l.id === selectedLesson.id) || currentMod.lessons[0]
              : currentMod.lessons[0];
            handleSelectLesson(currentLes);
          } else {
            setSelectedLesson(null);
          }
        } else {
          setSelectedModule(null);
          setSelectedLesson(null);
        }
      }
    } catch (err) {
      console.error('Error loading courses:', err);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleSelectCourse = async (courseId: string) => {
    try {
      const full = await api.getCourseById(courseId);
      setSelectedCourse(full);
      setIsAddingModule(false);
      setIsAddingLesson(false);

      if (full?.modules && full.modules.length > 0) {
        const firstMod = full.modules[0];
        setSelectedModule(firstMod);
        if (firstMod?.lessons && firstMod.lessons.length > 0) {
          handleSelectLesson(firstMod.lessons[0]);
        } else {
          setSelectedLesson(null);
        }
      } else {
        setSelectedModule(null);
        setSelectedLesson(null);
      }
    } catch (err) {
      console.error('Error selecting course:', err);
    }
  };

  const handleSelectModule = (mod: Module) => {
    setSelectedModule(mod);
    setIsAddingLesson(false);
    if (mod.lessons && mod.lessons.length > 0) {
      handleSelectLesson(mod.lessons[0]);
    } else {
      setSelectedLesson(null);
    }
  };

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setLessonTitle(lesson.title);
    setLessonType(lesson.content_type);
    setLessonDuration(lesson.duration_minutes || 5);
    setLessonMediaPath(lesson.media_path || '');

    if (lesson.content_type === 'rich_text') {
      try {
        const parsed = JSON.parse(lesson.content_body || '{}');
        setSopIntro(parsed.introduction || '');
        setSopBody(parsed.body || parsed.sections?.[0]?.content || lesson.content_body || '');
        setSopImage(parsed.diagram_url || '');
        setSopParameters(parsed.parameters || []);
        setSopChecklists(parsed.checklists || []);
      } catch {
        setSopIntro('');
        setSopBody(lesson.content_body || '');
        setSopImage('');
        setSopParameters([]);
        setSopChecklists([]);
      }
    }
  };

  // Course Actions
  const handleCreateCourse = async () => {
    try {
      const newCourse = await api.createCourse({
        title: 'New Industrial Course ' + (courses.length + 1),
        category: 'Industrial 3D Printing',
        difficulty: 'Beginner',
        is_sequential: 0,
        description: 'Comprehensive industrial training curriculum with step-by-step procedures.'
      });

      onNotify('New course created. You can now add curriculum modules.', 'success');
      await loadCourses(newCourse.id);
    } catch (err: any) {
      onNotify(err.message || 'Error creating course', 'error');
    }
  };

  const handleOpenCourseSettings = () => {
    if (!selectedCourse) return;
    setEditingCourseData({ ...selectedCourse });
    setShowCourseSettingsModal(true);
  };

  const handleSaveCourseSettings = async () => {
    if (!selectedCourse || !editingCourseData) return;
    try {
      await api.updateCourse({
        ...selectedCourse,
        ...editingCourseData
      });
      onNotify('Course details updated successfully', 'success');
      setShowCourseSettingsModal(false);
      await loadCourses(selectedCourse.id);
    } catch (err: any) {
      onNotify(err.message || 'Error updating course details', 'error');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course and all attached media? This action cannot be undone.')) return;
    try {
      await api.deleteCourse(courseId);
      onNotify('Course deleted successfully', 'info');
      setSelectedCourse(null);
      setSelectedModule(null);
      setSelectedLesson(null);
      await loadCourses();
    } catch (err: any) {
      onNotify(err.message || 'Error deleting course', 'error');
    }
  };

  // Module Actions
  const handleAddModule = async () => {
    if (!selectedCourse || !newModuleTitle.trim()) return;
    try {
      const sortOrder = (selectedCourse.modules?.length || 0) + 1;
      const mod = await api.createModule({
        course_id: selectedCourse.id,
        title: newModuleTitle.trim(),
        sort_order: sortOrder
      });
      onNotify(`Module '${newModuleTitle.trim()}' created successfully`, 'success');
      setNewModuleTitle('');
      setIsAddingModule(false);

      // Re-fetch full course from database
      const updatedCourse = await api.getCourseById(selectedCourse.id);
      setSelectedCourse(updatedCourse);
      const freshlyCreatedMod = updatedCourse?.modules?.find((m) => m.id === mod.id) || mod;
      setSelectedModule(freshlyCreatedMod);
      setSelectedLesson(null);

      // Refresh global courses list
      const allCourses = await api.getCourses();
      setCourses(allCourses);
    } catch (err: any) {
      onNotify(err.message || 'Error creating module', 'error');
    }
  };

  const handleStartEditModule = (mod: Module) => {
    setEditingModuleId(mod.id);
    setEditingModuleTitle(mod.title);
  };

  const handleSaveModuleTitle = async (moduleId: string) => {
    if (!selectedCourse) return;
    if (!editingModuleTitle.trim()) {
      setEditingModuleId(null);
      return;
    }
    try {
      await api.updateModule({
        id: moduleId,
        title: editingModuleTitle.trim()
      });
      onNotify('Module renamed successfully', 'success');
      setEditingModuleId(null);

      const updatedCourse = await api.getCourseById(selectedCourse.id);
      setSelectedCourse(updatedCourse);
      const refreshedMod = updatedCourse?.modules?.find((m) => m.id === moduleId);
      if (refreshedMod) setSelectedModule(refreshedMod);
    } catch (err: any) {
      onNotify(err.message || 'Error renaming module', 'error');
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!selectedCourse || !confirm('Are you sure you want to delete this module and all its units?')) return;
    try {
      await api.deleteModule(moduleId);
      onNotify('Module deleted', 'info');

      const updatedCourse = await api.getCourseById(selectedCourse.id);
      setSelectedCourse(updatedCourse);

      const nextMod = updatedCourse?.modules?.[0] || null;
      setSelectedModule(nextMod);
      if (nextMod?.lessons && nextMod.lessons.length > 0) {
        handleSelectLesson(nextMod.lessons[0]);
      } else {
        setSelectedLesson(null);
      }

      const allCourses = await api.getCourses();
      setCourses(allCourses);
    } catch (err: any) {
      onNotify(err.message || 'Error deleting module', 'error');
    }
  };

  // Unit / Lesson Actions
  const handleAddLesson = async (typeOverride?: Lesson['content_type'], titleOverride?: string) => {
    if (!selectedModule || !selectedCourse) return;
    const finalTitle = (titleOverride || newLessonTitle || '').trim();
    if (!finalTitle) {
      onNotify('Please enter a title for the unit', 'error');
      return;
    }
    const finalType = typeOverride || newLessonType;

    try {
      const sortOrder = (selectedModule.lessons?.length || 0) + 1;
      const les = await api.createLesson({
        module_id: selectedModule.id,
        title: finalTitle,
        content_type: finalType,
        duration_minutes: newLessonDuration || 10,
        sort_order: sortOrder,
        content_body: '',
        media_path: ''
      });

      if (finalType === 'quiz') {
        await api.saveQuizWithQuestions(
          {
            lesson_id: les.id,
            title: `${finalTitle} Assessment`,
            passing_score: 80,
            time_limit_minutes: 15
          },
          []
        );
      }

      onNotify(`Unit '${finalTitle}' created. Configure media on the right.`, 'success');
      setNewLessonTitle('');
      setIsAddingLesson(false);

      // Re-fetch course to get complete updated hierarchy
      const updatedCourse = await api.getCourseById(selectedCourse.id);
      setSelectedCourse(updatedCourse);

      const refreshedMod = updatedCourse?.modules?.find((m) => m.id === selectedModule.id);
      setSelectedModule(refreshedMod || null);

      const createdLesson = refreshedMod?.lessons?.find((l) => l.id === les.id) || les;
      handleSelectLesson(createdLesson);

      const allCourses = await api.getCourses();
      setCourses(allCourses);
    } catch (err: any) {
      onNotify(err.message || 'Error creating unit', 'error');
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!selectedCourse || !selectedModule || !confirm('Delete this lesson unit?')) return;
    try {
      await api.deleteLesson(lessonId);
      onNotify('Lesson unit deleted', 'info');

      const updatedCourse = await api.getCourseById(selectedCourse.id);
      setSelectedCourse(updatedCourse);

      const refreshedMod = updatedCourse?.modules?.find((m) => m.id === selectedModule.id);
      setSelectedModule(refreshedMod || null);

      if (refreshedMod?.lessons && refreshedMod.lessons.length > 0) {
        handleSelectLesson(refreshedMod.lessons[0]);
      } else {
        setSelectedLesson(null);
      }

      const allCourses = await api.getCourses();
      setCourses(allCourses);
    } catch (err: any) {
      onNotify(err.message || 'Error deleting unit', 'error');
    }
  };

  const handleSaveLessonDetails = async () => {
    if (!selectedLesson || !selectedCourse) return;
    try {
      let serializedContentBody = '';
      if (lessonType === 'rich_text') {
        serializedContentBody = JSON.stringify({
          introduction: sopIntro,
          body: sopBody,
          diagram_url: sopImage,
          parameters: sopParameters,
          checklists: sopChecklists
        });
      }

      await api.updateLesson({
        id: selectedLesson.id,
        title: lessonTitle,
        content_type: lessonType,
        duration_minutes: lessonDuration,
        content_body: serializedContentBody,
        media_path: lessonMediaPath
      });

      onNotify('Unit details and media updated successfully', 'success');

      const updatedCourse = await api.getCourseById(selectedCourse.id);
      setSelectedCourse(updatedCourse);
      const refreshedMod = updatedCourse?.modules?.find((m) => m.id === selectedModule?.id);
      if (refreshedMod) setSelectedModule(refreshedMod);
      const refreshedLesson = refreshedMod?.lessons?.find((l) => l.id === selectedLesson.id);
      if (refreshedLesson) {
        setSelectedLesson(refreshedLesson);
      }
    } catch (err: any) {
      onNotify(err.message || 'Error saving unit', 'error');
    }
  };

  // Attach Media via Native File Dialog or fallback
  const handleAttachMedia = async (category: 'video' | 'pdf' | 'image') => {
    if (!selectedCourse) {
      onNotify('Please select a course first', 'error');
      return;
    }
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.importMediaFile) {
        const res = await window.electronAPI.importMediaFile(selectedCourse.id, category);
        if (res && res.success) {
          if (category === 'image' && lessonType === 'rich_text') {
            setSopImage(res.mediaUrl);
          } else {
            setLessonMediaPath(res.mediaUrl);
          }
          onNotify(`Attached ${category.toUpperCase()}: ${res.originalName}`, 'success');

          if (selectedLesson) {
            await api.updateLesson({
              id: selectedLesson.id,
              media_path: res.mediaUrl
            });
          }
          return;
        }
      }

      // Fallback to hidden HTML5 file input
      if (category === 'video') videoInputRef.current?.click();
      else if (category === 'pdf') pdfInputRef.current?.click();
      else if (category === 'image') imageInputRef.current?.click();
    } catch (err: any) {
      console.warn('Native dialog error, falling back to file input:', err);
      if (category === 'video') videoInputRef.current?.click();
      else if (category === 'pdf') pdfInputRef.current?.click();
      else if (category === 'image') imageInputRef.current?.click();
    }
  };

  // Direct Path Import
  const handleImportManualPath = async (category: 'video' | 'pdf' | 'image', rawPath: string) => {
    if (!selectedCourse) {
      onNotify('Please select a course first', 'error');
      return;
    }
    if (!rawPath || !rawPath.trim()) {
      onNotify('Please enter a valid file path or app-media:// URI', 'error');
      return;
    }
    const cleanPath = rawPath.trim();
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.importMediaFromPath) {
        const res = await window.electronAPI.importMediaFromPath(selectedCourse.id, cleanPath, category);
        if (res && res.success) {
          const targetUrl = res.mediaUrl || cleanPath;
          if (category === 'image' && lessonType === 'rich_text') {
            setSopImage(targetUrl);
          } else {
            setLessonMediaPath(targetUrl);
          }
          onNotify(`Attached ${category.toUpperCase()}: ${res.originalName || targetUrl}`, 'success');

          if (selectedLesson) {
            await api.updateLesson({
              id: selectedLesson.id,
              media_path: targetUrl
            });
          }
          return;
        }
      }

      if (category === 'image' && lessonType === 'rich_text') {
        setSopImage(cleanPath);
      } else {
        setLessonMediaPath(cleanPath);
      }
      onNotify(`Applied ${category.toUpperCase()} path`, 'success');

      if (selectedLesson) {
        await api.updateLesson({
          id: selectedLesson.id,
          media_path: cleanPath
        });
      }
    } catch (err: any) {
      onNotify(`Error attaching path: ${err.message}`, 'error');
    }
  };

  // Thumbnail Import for Course
  const handleAttachCourseThumbnail = async () => {
    if (!selectedCourse) return;
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.importMediaFile) {
        const res = await window.electronAPI.importMediaFile(selectedCourse.id, 'image');
        if (res && res.success) {
          setEditingCourseData((prev) => ({ ...prev, thumbnail_path: res.mediaUrl }));
          onNotify(`Attached thumbnail: ${res.originalName}`, 'success');
          return;
        }
      }
      thumbInputRef.current?.click();
    } catch (err) {
      thumbInputRef.current?.click();
    }
  };

  const handleBrowserFileSelected = async (e: React.ChangeEvent<HTMLInputElement>, category: 'video' | 'pdf' | 'image') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (category === 'image' && lessonType === 'rich_text') {
      setSopImage(url);
    } else {
      setLessonMediaPath(url);
    }
    onNotify(`Attached ${category.toUpperCase()}: ${file.name}`, 'success');
    if (selectedLesson) {
      await api.updateLesson({
        id: selectedLesson.id,
        media_path: url
      });
    }
  };

  const handleBrowserThumbSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setEditingCourseData((prev) => ({ ...prev, thumbnail_path: url }));
    onNotify(`Selected thumbnail: ${file.name}`, 'success');
  };

  // USB Packaging
  const handleExportUsb = async (courseId: string) => {
    setIsExporting(true);
    try {
      const result = await api.exportCoursePackage(courseId);
      if (result.success) {
        onNotify(result.message || 'Course packaged and exported successfully to .i3dpack bundle!', 'success');
      } else if (result.message && result.message !== 'Export destination cancelled') {
        onNotify(result.error || result.message || 'Export failed', 'error');
      }
    } catch (err: any) {
      onNotify(err.message || 'Error packaging course', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleInstallDrive = async () => {
    setIsImporting(true);
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
      setIsImporting(false);
    }
  };

  // SOP Matrix Helpers
  const addParameter = () => {
    setSopParameters((prev) => [...prev, { label: 'New Parameter', value: '100', unit: 'mm/s' }]);
  };

  const removeParameter = (idx: number) => {
    setSopParameters((prev) => prev.filter((_, i) => i !== idx));
  };

  const addChecklist = () => {
    setSopChecklists((prev) => [
      ...prev,
      { id: 'chk_' + Math.random().toString(36).substring(2, 7), label: 'Inspect machine calibration and safety interlocks.', required: true }
    ]);
  };

  const removeChecklist = (idx: number) => {
    setSopChecklists((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex h-full w-full bg-slate-100 overflow-hidden font-sans text-slate-800">
      {/* ========================================================================= */}
      {/* COLUMN 1: COURSES MANAGEMENT (LEFT)                                      */}
      {/* ========================================================================= */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-sm z-10">
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                INSTRUCTOR STUDIO
              </span>
              <h2 className="text-sm font-black text-slate-900 mt-1 font-poppins">Courses ({courses.length})</h2>
            </div>
            <button
              onClick={handleCreateCourse}
              className="p-1.5 rounded-xl btn-brand-gradient text-white shadow-sm hover:scale-105 transition-transform"
              title="Create New Course"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Courses List */}
          <div className="space-y-2">
            {courses.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border-2 border-dashed rounded-2xl">
                No courses created yet. Click "+" above to create your first course.
              </div>
            ) : (
              courses.map((c) => {
                const isSelected = selectedCourse?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCourse(c.id)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-orange-50/80 border-orange-400 text-orange-950 font-bold shadow-sm ring-1 ring-orange-300/50'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5 truncate">
                        <div className="text-xs font-bold truncate font-poppins">{c.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {c.category} • {c.total_lessons || 0} Units
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex items-center space-x-1 pt-2.5 mt-2 border-t border-orange-200/70">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCourseSettings();
                          }}
                          className="text-[10px] font-bold text-orange-700 hover:text-orange-900 bg-white px-2 py-1 rounded-lg border border-orange-200 flex items-center space-x-1 shadow-2xs"
                          title="Course Settings"
                        >
                          <Settings className="w-3 h-3" />
                          <span>Settings</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportUsb(c.id);
                          }}
                          disabled={isExporting}
                          className="text-[10px] font-bold text-slate-700 hover:text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200 flex items-center space-x-1 shadow-2xs"
                          title="Export to USB Drive (.i3dpack)"
                        >
                          <Package className="w-3 h-3 text-orange-600" />
                          <span>.i3dpack</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCourse(c.id);
                          }}
                          className="text-[10px] text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 ml-auto"
                          title="Delete Course"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* USB Drive Ingest */}
        <div className="p-3 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleInstallDrive}
            disabled={isImporting}
            className="w-full py-2 rounded-xl bg-white border border-slate-200 hover:border-orange-300 text-slate-700 text-xs font-bold flex items-center justify-center space-x-2 shadow-2xs transition-colors"
          >
            <HardDrive className="w-3.5 h-3.5 text-orange-600" />
            <span className="truncate">{isImporting ? 'Importing...' : 'Install from USB Drive'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COLUMN 2: CURRICULUM MODULES & UNITS TREE (MIDDLE)                        */}
      {/* ========================================================================= */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 overflow-y-auto">
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                CURRICULUM MODULES
              </span>
              <h3 className="text-xs font-bold text-slate-900 font-poppins">
                {selectedCourse?.modules?.length || 0} Modules Available
              </h3>
            </div>
            {selectedCourse && (
              <button
                onClick={() => {
                  setIsAddingModule(true);
                  setNewModuleTitle(`Module ${(selectedCourse.modules?.length || 0) + 1}: `);
                }}
                className="px-2.5 py-1 rounded-full btn-brand-gradient text-white text-xs font-bold flex items-center space-x-1 shadow-sm hover:scale-105 transition-transform"
                title="Create New Module"
              >
                <Plus className="w-3 h-3" />
                <span>+ Module</span>
              </button>
            )}
          </div>

          {/* Add Module Box */}
          {isAddingModule && (
            <div className="p-3 bg-white border-2 border-orange-400 rounded-2xl space-y-2 shadow-md">
              <label className="text-[10px] font-bold font-mono uppercase text-orange-700 block">
                Create New Module
              </label>
              <input
                type="text"
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddModule();
                  }
                  if (e.key === 'Escape') setIsAddingModule(false);
                }}
                placeholder="e.g. Module 1: Safety & Calibration"
                className="w-full text-xs p-2 border border-slate-300 rounded-xl focus:outline-none focus:border-orange-500 font-medium bg-slate-50"
                autoFocus
              />
              <div className="flex justify-end space-x-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingModule(false);
                    setNewModuleTitle('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddModule}
                  className="px-3 py-1 rounded-lg btn-brand-gradient text-xs font-bold text-white shadow-sm"
                >
                  Create Module
                </button>
              </div>
            </div>
          )}

          {/* Empty Modules State */}
          {selectedCourse && (!selectedCourse.modules || selectedCourse.modules.length === 0) && !isAddingModule && (
            <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-3 bg-slate-50">
              <Sliders className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-700 font-poppins">No Curriculum Modules Yet</p>
                <p className="text-[11px] text-slate-400">Add modules to organize your video, PDF, SOP & quizzes.</p>
              </div>
              <button
                onClick={() => {
                  setIsAddingModule(true);
                  setNewModuleTitle('Module 1: Getting Started');
                }}
                className="px-3.5 py-1.5 rounded-xl btn-brand-gradient text-xs font-bold text-white shadow-sm flex items-center space-x-1.5 mx-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Module 1</span>
              </button>
            </div>
          )}

          {/* Module List */}
          <div className="space-y-3">
            {selectedCourse?.modules?.map((mod, mIdx) => {
              const isModSelected = selectedModule?.id === mod.id;
              const isEditingThisMod = editingModuleId === mod.id;

              return (
                <div
                  key={mod.id}
                  className={`bg-white border rounded-2xl overflow-hidden shadow-2xs transition-all ${
                    isModSelected ? 'border-orange-400 ring-2 ring-orange-200/70' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Module Header / Rename Controls */}
                  <div
                    onClick={() => handleSelectModule(mod)}
                    className="p-2.5 border-b border-slate-100 flex items-center justify-between cursor-pointer bg-slate-50/80"
                  >
                    {isEditingThisMod ? (
                      <div className="flex items-center space-x-1.5 w-full" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingModuleTitle}
                          onChange={(e) => setEditingModuleTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveModuleTitle(mod.id);
                            }
                            if (e.key === 'Escape') setEditingModuleId(null);
                          }}
                          className="text-xs p-1 border-2 border-orange-400 rounded-lg flex-1 bg-white font-bold focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveModuleTitle(mod.id)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-200 bg-white"
                          title="Save Module Title"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingModuleId(null)}
                          className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg border border-slate-200 bg-white"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2 truncate">
                          <span className="text-[10px] font-mono font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded border border-orange-200 shrink-0">
                            M{mIdx + 1}
                          </span>
                          <h4 className="text-xs font-bold text-slate-800 truncate font-poppins" title={mod.title}>
                            {mod.title}
                          </h4>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditModule(mod);
                            }}
                            className="p-1 text-slate-400 hover:text-orange-600 rounded hover:bg-orange-50 transition-colors"
                            title="Rename Module"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedModule(mod);
                              setIsAddingLesson(true);
                              setNewLessonTitle('');
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold text-orange-700 hover:text-orange-950 bg-white hover:bg-orange-50 rounded-lg border border-orange-200 flex items-center space-x-0.5 shadow-2xs"
                            title="Add Lesson Unit"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Unit</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteModule(mod.id);
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                            title="Delete Module"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Units inside this Module */}
                  <div className="p-1.5 space-y-1">
                    {(!mod.lessons || mod.lessons.length === 0) && !isAddingLesson && (
                      <div className="p-2 text-center text-[11px] text-slate-400">
                        No units yet. Click "+ Unit" above.
                      </div>
                    )}

                    {mod.lessons?.map((les) => {
                      const isLesSelected = selectedLesson?.id === les.id;
                      let Icon = FileText;
                      let badge = 'PDF';
                      if (les.content_type === 'video') {
                        Icon = Video;
                        badge = 'VIDEO';
                      } else if (les.content_type === 'quiz') {
                        Icon = HelpCircle;
                        badge = 'QUIZ';
                      } else if (les.content_type === 'rich_text') {
                        Icon = Sliders;
                        badge = 'SOP';
                      }

                      return (
                        <div
                          key={les.id}
                          onClick={() => {
                            setSelectedModule(mod);
                            handleSelectLesson(les);
                          }}
                          className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all ${
                            isLesSelected
                              ? 'bg-orange-50 border border-orange-400 text-orange-950 font-bold shadow-2xs'
                              : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${isLesSelected ? 'text-orange-600' : 'text-slate-400'}`} />
                            <span className="truncate text-[11px]">{les.title}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0">
                            <span className="text-[9px] font-mono uppercase bg-slate-100 text-slate-500 px-1 py-0.5 rounded">
                              {badge}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLesson(les.id);
                              }}
                              className="text-slate-300 hover:text-red-600 p-0.5 rounded hover:bg-red-50"
                              title="Delete Unit"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Inline Add Lesson Unit Form */}
                    {isAddingLesson && isModSelected && (
                      <div className="p-3 bg-orange-50/90 border-2 border-orange-300 rounded-2xl space-y-2.5 mt-1.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold font-mono uppercase text-orange-800">
                            Add Curriculum Unit
                          </label>
                          <span className="text-[10px] text-orange-700 font-bold">
                            {newLessonDuration} Mins
                          </span>
                        </div>

                        <input
                          type="text"
                          value={newLessonTitle}
                          onChange={(e) => setNewLessonTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddLesson();
                            }
                            if (e.key === 'Escape') setIsAddingLesson(false);
                          }}
                          placeholder="e.g. Bed Leveling SOP..."
                          className="w-full text-xs p-2 border border-slate-300 rounded-xl focus:outline-none focus:border-orange-500 bg-white font-medium"
                          autoFocus
                        />

                        {/* Content Engine Selection Buttons */}
                        <div className="grid grid-cols-2 gap-1">
                          {[
                            { id: 'video' as const, label: '🎬 Video' },
                            { id: 'pdf' as const, label: '📄 PDF' },
                            { id: 'rich_text' as const, label: '📝 SOP' },
                            { id: 'quiz' as const, label: '⚡ Quiz' }
                          ].map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setNewLessonType(t.id)}
                              className={`py-1 px-1.5 rounded-lg text-center text-[10px] font-bold border transition-all ${
                                newLessonType === t.id
                                  ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-orange-200">
                          <button
                            type="button"
                            onClick={() => setIsAddingLesson(false)}
                            className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 font-bold"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddLesson()}
                            className="px-3 py-1 rounded-lg btn-brand-gradient text-xs font-bold text-white shadow-sm"
                          >
                            Create Unit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COLUMN 3: MEDIA UPLOADER & CONTENT STUDIO (RIGHT)                         */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/70">
        {selectedLesson ? (
          /* Active Unit Content & Media Studio */
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
              {/* Unit Header Bar */}
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                      UNIT STUDIO
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {selectedModule?.title}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 font-poppins mt-0.5">
                    {lessonTitle || 'Untitled Unit'}
                  </h3>
                </div>

                <button
                  onClick={handleSaveLessonDetails}
                  className="px-6 py-2 rounded-full btn-brand-gradient text-xs font-bold flex items-center space-x-1.5 shadow-sm hover:scale-105 transition-transform"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Unit Details</span>
                </button>
              </div>

              {/* Title & Duration */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700">Unit Title</label>
                  <input
                    type="text"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-xs focus:outline-none focus:border-orange-500 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Duration (Mins)</label>
                  <input
                    type="number"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(parseInt(e.target.value, 10) || 5)}
                    className="w-full p-2.5 border rounded-xl text-xs focus:outline-none focus:border-orange-500 font-medium"
                  />
                </div>
              </div>

              {/* Content Type Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-700">Content Format & Engine</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'video' as const, label: 'Video Lesson', icon: Film, desc: 'Local .mp4 / .webm' },
                    { id: 'pdf' as const, label: 'PDF Manual', icon: FileText, desc: 'Local .pdf document' },
                    { id: 'rich_text' as const, label: 'SOP Guide', icon: Sliders, desc: 'Safety & parameters' },
                    { id: 'quiz' as const, label: 'Assessment Quiz', icon: HelpCircle, desc: 'Timed examination' }
                  ].map((tab) => {
                    const isTabActive = lessonType === tab.id;
                    const TabIcon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setLessonType(tab.id)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isTabActive
                            ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-200 text-orange-950 font-bold shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <TabIcon className={`w-4 h-4 ${isTabActive ? 'text-orange-600' : 'text-slate-400'}`} />
                          <span className="text-xs font-bold font-poppins">{tab.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block">{tab.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ========================================================================= */}
              {/* ENGINE 1: VIDEO ATTACHMENT & LIVE PREVIEW                                 */}
              {/* ========================================================================= */}
              {lessonType === 'video' && (
                <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-slate-900 flex items-center space-x-1.5 font-poppins">
                        <Video className="w-4 h-4 text-orange-600" />
                        <span>Offline Video Media</span>
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Attach local .mp4 or .webm files. Media will be copied into offline storage.
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleAttachMedia('video')}
                        className="px-4 py-2 bg-white border border-slate-200 hover:border-orange-300 rounded-xl text-xs font-bold text-slate-700 flex items-center space-x-1.5 shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5 text-orange-600" />
                        <span>Browse Video File...</span>
                      </button>
                      {lessonMediaPath && (
                        <button
                          type="button"
                          onClick={() => {
                            setLessonMediaPath('');
                            if (selectedLesson) {
                              api.updateLesson({ id: selectedLesson.id, media_path: '' });
                            }
                          }}
                          className="text-[11px] text-red-500 hover:text-red-700 font-bold px-2 py-1"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={lessonMediaPath}
                      onChange={(e) => setLessonMediaPath(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleImportManualPath('video', lessonMediaPath);
                        }
                      }}
                      placeholder="Paste file path (e.g. C:\Videos\lesson.mp4) or app-media://..."
                      className="flex-1 p-2.5 border rounded-xl text-xs bg-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleImportManualPath('video', lessonMediaPath)}
                      className="px-4 py-2.5 bg-white border border-slate-200 hover:border-orange-300 rounded-xl text-xs font-bold text-orange-600 shrink-0 shadow-sm"
                    >
                      Apply Path
                    </button>
                  </div>

                  {lessonMediaPath ? (
                    <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-300 shadow-sm">
                      <video
                        controls
                        key={lessonMediaPath}
                        src={resolveMediaPath(lessonMediaPath)}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-slate-100 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 space-y-2">
                      <Video className="w-8 h-8 text-slate-300" />
                      <span className="text-xs font-medium">No video file selected yet. Click "Browse Video File..." or enter a path above.</span>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* ENGINE 2: PDF DOCUMENT ATTACHMENT & EMBEDDED VIEWER                      */}
              {/* ========================================================================= */}
              {lessonType === 'pdf' && (
                <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-slate-900 flex items-center space-x-1.5 font-poppins">
                        <FileText className="w-4 h-4 text-orange-600" />
                        <span>Technical PDF Document</span>
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Attach local PDF engineering manuals, blueprints, and equipment datasheets.
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleAttachMedia('pdf')}
                        className="px-4 py-2 bg-white border border-slate-200 hover:border-orange-300 rounded-xl text-xs font-bold text-slate-700 flex items-center space-x-1.5 shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5 text-orange-600" />
                        <span>Browse PDF Document...</span>
                      </button>
                      {lessonMediaPath && (
                        <button
                          type="button"
                          onClick={() => {
                            setLessonMediaPath('');
                            if (selectedLesson) {
                              api.updateLesson({ id: selectedLesson.id, media_path: '' });
                            }
                          }}
                          className="text-[11px] text-red-500 hover:text-red-700 font-bold px-2 py-1"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={lessonMediaPath}
                      onChange={(e) => setLessonMediaPath(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleImportManualPath('pdf', lessonMediaPath);
                        }
                      }}
                      placeholder="Paste PDF file path (e.g. C:\Docs\manual.pdf) or app-media://..."
                      className="flex-1 p-2.5 border rounded-xl text-xs bg-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleImportManualPath('pdf', lessonMediaPath)}
                      className="px-4 py-2.5 bg-white border border-slate-200 hover:border-orange-300 rounded-xl text-xs font-bold text-orange-600 shrink-0 shadow-sm"
                    >
                      Apply Path
                    </button>
                  </div>

                  {lessonMediaPath && lessonMediaPath.toLowerCase().includes('.pdf') ? (
                    <div className="h-80 bg-white rounded-xl overflow-hidden border border-slate-300 shadow-sm">
                      <iframe
                        src={resolveMediaPath(lessonMediaPath)}
                        className="w-full h-full border-0"
                        title="PDF Preview"
                      />
                    </div>
                  ) : (
                    <div className="h-48 bg-slate-100 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 space-y-2">
                      <FileText className="w-8 h-8 text-slate-300" />
                      <span className="text-xs font-medium">No PDF attached yet. Click "Browse PDF Document..." or enter a path above.</span>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* ENGINE 3: SOP GUIDE (SAFETY, PARAMETERS, CHECKLISTS, DIAGRAMS)            */}
              {/* ========================================================================= */}
              {lessonType === 'rich_text' && (
                <div className="space-y-5 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                  {/* Safety Alert */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-orange-950 flex items-center space-x-1.5">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <span>Mandatory Safety Protocol Alert</span>
                    </label>
                    <input
                      type="text"
                      value={sopIntro}
                      onChange={(e) => setSopIntro(e.target.value)}
                      placeholder="e.g. Always verify emergency shutoff switch and wear thermal protective gloves before heating nozzle."
                      className="w-full p-2.5 border border-orange-200 rounded-xl text-xs bg-white focus:outline-none focus:border-orange-500 font-medium"
                    />
                  </div>

                  {/* Body Text */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Standard Operating Procedures & Detailed Instructions
                    </label>
                    <textarea
                      rows={6}
                      value={sopBody}
                      onChange={(e) => setSopBody(e.target.value)}
                      placeholder="Enter detailed step-by-step operating guidelines..."
                      className="w-full p-3 border rounded-xl text-xs leading-relaxed bg-white focus:outline-none focus:border-orange-500 font-sans"
                    />
                  </div>

                  {/* Diagram Image Attachment */}
                  <div className="space-y-2 p-3 bg-white rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                        <ImageIcon className="w-4 h-4 text-orange-600" />
                        <span>Attach Schematic / Diagram Image</span>
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleAttachMedia('image')}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center space-x-1"
                        >
                          <Upload className="w-3 h-3 text-orange-600" />
                          <span>Browse Image...</span>
                        </button>
                        {sopImage && (
                          <button
                            type="button"
                            onClick={() => setSopImage('')}
                            className="text-[11px] text-red-500 hover:text-red-700 font-bold px-1"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={sopImage}
                        onChange={(e) => setSopImage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleImportManualPath('image', sopImage);
                          }
                        }}
                        placeholder="Paste image path or app-media://..."
                        className="flex-1 p-2 border rounded-xl text-xs bg-slate-50 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleImportManualPath('image', sopImage)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 hover:border-orange-300 rounded-xl text-xs font-bold text-orange-600 shrink-0 shadow-sm"
                      >
                        Apply Path
                      </button>
                    </div>

                    {sopImage && (
                      <div className="h-36 bg-slate-100 rounded-lg overflow-hidden border">
                        <img src={resolveMediaPath(sopImage)} alt="Diagram" className="w-full h-full object-contain" />
                      </div>
                    )}
                  </div>

                  {/* Calibration Parameters */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 font-mono uppercase">
                        Calibration Parameters ({sopParameters.length})
                      </label>
                      <button
                        type="button"
                        onClick={addParameter}
                        className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Parameter</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {sopParameters.map((param, pIdx) => (
                        <div key={pIdx} className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200">
                          <input
                            type="text"
                            value={param.label}
                            onChange={(e) => {
                              const copy = [...sopParameters];
                              copy[pIdx].label = e.target.value;
                              setSopParameters(copy);
                            }}
                            placeholder="Parameter Name"
                            className="flex-1 text-xs p-1.5 border rounded-lg focus:outline-none"
                          />
                          <input
                            type="text"
                            value={param.value}
                            onChange={(e) => {
                              const copy = [...sopParameters];
                              copy[pIdx].value = e.target.value;
                              setSopParameters(copy);
                            }}
                            placeholder="Value"
                            className="w-24 text-xs p-1.5 border rounded-lg focus:outline-none font-bold text-orange-600"
                          />
                          <input
                            type="text"
                            value={param.unit}
                            onChange={(e) => {
                              const copy = [...sopParameters];
                              copy[pIdx].unit = e.target.value;
                              setSopParameters(copy);
                            }}
                            placeholder="Unit (°C, mm/s)"
                            className="w-20 text-xs p-1.5 border rounded-lg focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => removeParameter(pIdx)}
                            className="text-slate-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pre-Flight Checklist */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 font-mono uppercase">
                        Pre-Flight Inspection Checklist ({sopChecklists.length})
                      </label>
                      <button
                        type="button"
                        onClick={addChecklist}
                        className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Checklist Item</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {sopChecklists.map((chk, cIdx) => (
                        <div key={cIdx} className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200">
                          <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />
                          <input
                            type="text"
                            value={chk.label}
                            onChange={(e) => {
                              const copy = [...sopChecklists];
                              copy[cIdx].label = e.target.value;
                              setSopChecklists(copy);
                            }}
                            placeholder="Inspection check description..."
                            className="flex-1 text-xs p-1.5 border rounded-lg focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => removeChecklist(cIdx)}
                            className="text-slate-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* ENGINE 4: ASSESSMENT QUIZ BUILDER                                         */}
              {/* ========================================================================= */}
              {lessonType === 'quiz' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <QuizEditor
                    initialQuiz={selectedLesson.quiz}
                    onSaveQuiz={async (quizData, questions) => {
                      await api.saveQuizWithQuestions(
                        { ...quizData, lesson_id: selectedLesson.id },
                        questions
                      );
                      onNotify('Quiz questions and answers saved successfully', 'success');
                      if (selectedCourse) {
                        const updated = await api.getCourseById(selectedCourse.id);
                        setSelectedCourse(updated);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ) : selectedModule ? (
          /* Focused Direct Unit Creator for selected Module (NO 4-CARD SCREEN) */
          <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-sm text-left">
            <div className="space-y-1 border-b pb-4">
              <span className="text-[10px] font-mono font-bold uppercase text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                MODULE CONTENT
              </span>
              <h3 className="text-lg font-black text-slate-900 font-poppins">
                {selectedModule.title}
              </h3>
              <p className="text-xs text-slate-500">
                This module has no units selected yet. Choose a format below to create a unit and immediately attach media files.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700">Choose Unit Format to Add:</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'video' as const, title: '🎬 Video Lesson', desc: 'Attach .mp4 / .webm video' },
                  { id: 'pdf' as const, title: '📄 PDF Document', desc: 'Attach technical PDF manual' },
                  { id: 'rich_text' as const, title: '📝 SOP Guide', desc: 'Safety protocols & checklists' },
                  { id: 'quiz' as const, title: '⚡ Assessment Quiz', desc: 'Timed competency examination' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const count = (selectedModule.lessons?.length || 0) + 1;
                      handleAddLesson(item.id, `${item.title.split(' ')[1]} ${count}`);
                    }}
                    className="p-4 bg-slate-50 hover:bg-orange-50/60 border border-slate-200 hover:border-orange-300 rounded-2xl text-left transition-all group"
                  >
                    <div className="font-bold text-xs text-slate-900 group-hover:text-orange-950 font-poppins">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* When no module exists in course */
          <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-3xl p-8 space-y-4 text-center shadow-sm">
            <Layers className="w-10 h-10 text-orange-600 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-slate-900 font-poppins">Select or Create a Module</h3>
              <p className="text-xs text-slate-500 mt-1">
                Choose a module from the middle column or click "+ Module" to start structuring your training curriculum.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* COURSE SETTINGS MODAL (Replaces intrusive Edit Curriculum screen)          */}
      {/* ========================================================================= */}
      {showCourseSettingsModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 font-poppins">Course Details & Settings</h3>
                <p className="text-[11px] text-slate-500">Configure catalog properties & progression mode</p>
              </div>
              <button
                onClick={() => setShowCourseSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Course Title</label>
                <input
                  type="text"
                  value={editingCourseData.title || ''}
                  onChange={(e) => setEditingCourseData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2.5 border rounded-xl text-xs focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              {/* Thumbnail Cover */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-orange-600" />
                  <span>Cover Image Thumbnail</span>
                </label>
                <div className="flex items-center space-x-3">
                  <div className="w-20 h-14 bg-slate-200 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-slate-300">
                    {editingCourseData.thumbnail_path ? (
                      <img
                        src={resolveMediaPath(editingCourseData.thumbnail_path)}
                        alt="Thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[9px] text-slate-400 font-mono">No Image</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <button
                      type="button"
                      onClick={handleAttachCourseThumbnail}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:border-orange-300 rounded-xl text-xs font-bold text-slate-700 flex items-center space-x-1.5 shadow-2xs"
                    >
                      <Upload className="w-3 h-3 text-orange-600" />
                      <span>Browse Image...</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Category</label>
                  <input
                    type="text"
                    value={editingCourseData.category || ''}
                    onChange={(e) => setEditingCourseData((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full p-2.5 border rounded-xl text-xs focus:outline-none focus:border-orange-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Difficulty</label>
                  <select
                    value={editingCourseData.difficulty || 'Beginner'}
                    onChange={(e) => setEditingCourseData((prev) => ({ ...prev, difficulty: e.target.value as any }))}
                    className="w-full p-2.5 border rounded-xl text-xs focus:outline-none focus:border-orange-500 font-medium bg-white"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={editingCourseData.description || ''}
                  onChange={(e) => setEditingCourseData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2.5 border rounded-xl text-xs focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              {/* Sequential Toggle */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingCourseData.is_sequential)}
                    onChange={(e) =>
                      setEditingCourseData((prev) => ({
                        ...prev,
                        is_sequential: e.target.checked ? 1 : 0
                      }))
                    }
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block font-poppins">
                      Sequential module progression
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Enforce finishing preceding modules before unlocking subsequent ones.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowCourseSettingsModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCourseSettings}
                  className="px-5 py-2 rounded-full btn-brand-gradient text-xs font-bold text-white shadow-sm"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Universal File Inputs */}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm"
        className="hidden"
        onChange={(e) => handleBrowserFileSelected(e, 'video')}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleBrowserFileSelected(e, 'pdf')}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => handleBrowserFileSelected(e, 'image')}
      />
      <input
        ref={thumbInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleBrowserThumbSelected}
      />
    </div>
  );
};
