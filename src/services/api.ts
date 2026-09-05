import type {
  Course,
  Module,
  Lesson,
  Quiz,
  QuizQuestion,
  QuizAttempt,
  Certificate,
  LearnerStats,
  PackageResult,
  AppStatus,
  ElectronAPI
} from '../types/electron.d.ts';

// Helper to check if running in Electron
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';
};

// =========================================================================
// BROWSER FALLBACK STORAGE ENGINE (Zero mock data, lightweight stubs)
// =========================================================================

const STORAGE_KEY_COURSES = 'infinyt3d_lms_courses';
const STORAGE_KEY_PROGRESS = 'infinyt3d_lms_progress';
const STORAGE_KEY_ATTEMPTS = 'infinyt3d_lms_attempts';
const STORAGE_KEY_CERTS = 'infinyt3d_lms_certs';
const STORAGE_KEY_PIN = 'infinyt3d_lms_admin_pin';

function getStoredCourses(): Course[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COURSES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [];
}

function saveStoredCourses(courses: Course[]) {
  try {
    localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(courses));
  } catch (e) {
    console.error(e);
  }
}

function getStoredProgress(): Record<string, { is_completed: boolean; last_position_seconds: number }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return {};
}

function saveStoredProgress(progress: Record<string, { is_completed: boolean; last_position_seconds: number }>) {
  try {
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progress));
  } catch (e) {
    console.error(e);
  }
}

function getStoredCerts(): Certificate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CERTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [];
}

function saveStoredCerts(certs: Certificate[]) {
  try {
    localStorage.setItem(STORAGE_KEY_CERTS, JSON.stringify(certs));
  } catch (e) {
    console.error(e);
  }
}

function getStoredAttempts(): QuizAttempt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ATTEMPTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [];
}

function saveStoredAttempts(attempts: QuizAttempt[]) {
  try {
    localStorage.setItem(STORAGE_KEY_ATTEMPTS, JSON.stringify(attempts));
  } catch (e) {
    console.error(e);
  }
}

export const api: ElectronAPI = {
  // App Status
  getAppStatus: async (): Promise<AppStatus> => {
    if (isElectron()) return window.electronAPI!.getAppStatus();
    return {
      isOffline: true,
      databasePath: 'browser://localStorage',
      databaseSizeKb: 120,
      version: '1.0.0 (Browser Dev Mode)',
      storagePath: 'browser_storage',
      isPackaged: false
    };
  },

  // Courses & Progress (Single Learner)
  getCourses: async (): Promise<Course[]> => {
    if (isElectron()) return window.electronAPI!.getCourses();
    const courses = getStoredCourses();
    const progress = getStoredProgress();

    return courses.map((c) => {
      let total = 0;
      let completed = 0;
      c.modules?.forEach((m) => {
        m.lessons?.forEach((l) => {
          total++;
          const p = progress[l.id];
          if (p?.is_completed) completed++;
        });
      });
      return {
        ...c,
        total_lessons: total,
        completed_lessons: completed,
        progress_percentage: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    });
  },

  getCourseById: async (courseId: string): Promise<Course | null> => {
    if (isElectron()) return window.electronAPI!.getCourseById(courseId);
    const courses = getStoredCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course) return null;

    const progress = getStoredProgress();
    const isSequential = Boolean(course.is_sequential);
    let prevModuleCompleted = true;

    const modules = (course.modules || []).map((m) => {
      let allDone = true;
      const lessons = (m.lessons || []).map((l) => {
        const p = progress[l.id];
        const isDone = Boolean(p?.is_completed);
        if (!isDone) allDone = false;
        return {
          ...l,
          is_completed: isDone,
          last_position_seconds: p?.last_position_seconds || 0
        };
      });

      const isCompleted = lessons.length > 0 && allDone;
      const isLocked = isSequential ? !prevModuleCompleted : false;
      if (!isCompleted) prevModuleCompleted = false;

      return {
        ...m,
        lessons,
        is_completed: isCompleted,
        is_locked: isLocked
      };
    });

    let total = 0;
    let completed = 0;
    modules.forEach((m) => {
      m.lessons?.forEach((l) => {
        total++;
        if (l.is_completed) completed++;
      });
    });

    return {
      ...course,
      modules,
      total_lessons: total,
      completed_lessons: completed,
      progress_percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  },

  getCourseProgress: async (courseId: string) => {
    if (isElectron()) return window.electronAPI!.getCourseProgress(courseId);
    const course = await api.getCourseById(courseId);
    if (!course) return { completedLessons: 0, totalLessons: 0, percentage: 0 };
    return {
      completedLessons: course.completed_lessons || 0,
      totalLessons: course.total_lessons || 0,
      percentage: course.progress_percentage || 0
    };
  },

  getLessonsByModule: async (moduleId: string): Promise<Lesson[]> => {
    if (isElectron()) return window.electronAPI!.getLessonsByModule(moduleId);
    const courses = getStoredCourses();
    const progress = getStoredProgress();
    for (const c of courses) {
      const mod = c.modules?.find((m) => m.id === moduleId);
      if (mod) {
        return (mod.lessons || []).map((l) => ({
          ...l,
          is_completed: Boolean(progress[l.id]?.is_completed),
          last_position_seconds: progress[l.id]?.last_position_seconds || 0
        }));
      }
    }
    return [];
  },

  getLessonById: async (lessonId: string): Promise<Lesson | null> => {
    if (isElectron()) return window.electronAPI!.getLessonById(lessonId);
    const courses = getStoredCourses();
    const progress = getStoredProgress();
    for (const c of courses) {
      for (const m of c.modules || []) {
        const found = m.lessons?.find((l) => l.id === lessonId);
        if (found) {
          return {
            ...found,
            is_completed: Boolean(progress[found.id]?.is_completed),
            last_position_seconds: progress[found.id]?.last_position_seconds || 0
          };
        }
      }
    }
    return null;
  },

  saveLessonProgress: async (
    lessonId: string,
    isCompleted: boolean,
    lastPositionSeconds = 0,
    _positionOnly = false
  ): Promise<boolean> => {
    if (isElectron()) {
      return window.electronAPI!.saveLessonProgress(lessonId, isCompleted, lastPositionSeconds, _positionOnly);
    }
    const progress = getStoredProgress();
    const prev = progress[lessonId] || { is_completed: false, last_position_seconds: 0 };
    progress[lessonId] = {
      is_completed: isCompleted ? true : prev.is_completed,
      last_position_seconds: lastPositionSeconds
    };
    saveStoredProgress(progress);
    return true;
  },

  getQuizByLessonId: async (lessonId: string): Promise<Quiz | null> => {
    if (isElectron()) return window.electronAPI!.getQuizByLessonId(lessonId);
    const lesson = await api.getLessonById(lessonId);
    return lesson?.quiz || null;
  },

  saveQuizAttempt: async (quizId: string, scorePercentage: number, passed: boolean, answersJson: string) => {
    if (isElectron()) return window.electronAPI!.saveQuizAttempt(quizId, scorePercentage, passed, answersJson);
    const attempts = getStoredAttempts();
    const id = 'att_' + Math.random().toString(36).substring(2, 9);
    const hmac_signature = 'HMAC_BROWSER_SIG_' + Date.now();
    attempts.unshift({
      id,
      quiz_id: quizId,
      score_percentage: scorePercentage,
      passed: passed ? 1 : 0,
      answers_submitted_json: answersJson,
      hmac_signature,
      created_at: new Date().toISOString()
    });
    saveStoredAttempts(attempts);
    return { id, hmac_signature, passed };
  },

  getQuizAttempts: async (quizId?: string): Promise<QuizAttempt[]> => {
    if (isElectron()) return window.electronAPI!.getQuizAttempts(quizId);
    const attempts = getStoredAttempts();
    return quizId ? attempts.filter((a) => a.quiz_id === quizId) : attempts;
  },

  getCertificates: async (): Promise<Certificate[]> => {
    if (isElectron()) return window.electronAPI!.getCertificates();
    return getStoredCerts();
  },

  saveCertificate: async (courseId: string, courseTitle = 'Certified Course'): Promise<Certificate> => {
    if (isElectron()) return window.electronAPI!.saveCertificate(courseId, courseTitle);
    const certs = getStoredCerts();
    const existing = certs.find((c) => c.course_id === courseId);
    if (existing) return existing;

    const id = 'cert_' + Math.random().toString(36).substring(2, 9);
    const newCert: Certificate = {
      id,
      user_id: 'learner',
      course_id: courseId,
      course_title: courseTitle,
      issue_date: new Date().toISOString(),
      verification_hash: 'I3D-' + Math.random().toString(36).substring(2, 10).toUpperCase()
    };
    certs.unshift(newCert);
    saveStoredCerts(certs);
    return newCert;
  },

  getLearnerStats: async (): Promise<LearnerStats> => {
    if (isElectron()) return window.electronAPI!.getLearnerStats();
    const courses = await api.getCourses();
    const certs = await api.getCertificates();
    const attempts = await api.getQuizAttempts();

    let totalLessons = 0;
    let completedLessons = 0;
    courses.forEach((c) => {
      totalLessons += c.total_lessons || 0;
      completedLessons += c.completed_lessons || 0;
    });

    const avgScore =
      attempts.length > 0
        ? Math.round(attempts.reduce((sum, a) => sum + a.score_percentage, 0) / attempts.length)
        : 0;

    return {
      enrolledCoursesCount: courses.length,
      totalLessonsCount: totalLessons,
      completedLessonsCount: completedLessons,
      overallProgressPercentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      averageExamScore: avgScore,
      certificatesCount: certs.length
    };
  },

  // Instructor Studio
  createCourse: async (course: Partial<Course>): Promise<Course> => {
    if (isElectron()) return window.electronAPI!.createCourse(course);
    const courses = getStoredCourses();
    const newCourse: Course = {
      id: course.id || 'crs_' + Math.random().toString(36).substring(2, 9),
      title: course.title || 'New Course',
      slug: (course.title || 'course').toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      description: course.description || '',
      category: course.category || 'Industrial 3D Printing',
      difficulty: course.difficulty || 'Beginner',
      is_inbuilt: 0,
      is_sequential: course.is_sequential ? 1 : 0,
      sort_order: course.sort_order || 1,
      modules: []
    };
    courses.push(newCourse);
    saveStoredCourses(courses);
    return newCourse;
  },

  updateCourse: async (course: Partial<Course>): Promise<boolean> => {
    if (isElectron()) return window.electronAPI!.updateCourse(course);
    const courses = getStoredCourses();
    const idx = courses.findIndex((c) => c.id === course.id);
    if (idx >= 0) {
      courses[idx] = { ...courses[idx], ...course };
      saveStoredCourses(courses);
      return true;
    }
    return false;
  },

  deleteCourse: async (courseId: string): Promise<boolean> => {
    if (isElectron()) return window.electronAPI!.deleteCourse(courseId);
    const courses = getStoredCourses().filter((c) => c.id !== courseId);
    saveStoredCourses(courses);
    return true;
  },

  createModule: async (mod: Partial<Module>): Promise<Module> => {
    if (isElectron()) return window.electronAPI!.createModule(mod);
    const courses = getStoredCourses();
    const course = courses.find((c) => c.id === mod.course_id);
    const newMod: Module = {
      id: mod.id || 'mod_' + Math.random().toString(36).substring(2, 9),
      course_id: mod.course_id!,
      title: mod.title || 'New Module',
      sort_order: mod.sort_order || 1,
      lessons: []
    };
    if (course) {
      course.modules = course.modules || [];
      course.modules.push(newMod);
      saveStoredCourses(courses);
    }
    return newMod;
  },

  updateModule: async (mod: Partial<Module>): Promise<boolean> => {
    if (isElectron()) return window.electronAPI!.updateModule(mod);
    const courses = getStoredCourses();
    for (const c of courses) {
      const mIdx = c.modules?.findIndex((m) => m.id === mod.id);
      if (mIdx !== undefined && mIdx >= 0) {
        c.modules![mIdx] = { ...c.modules![mIdx], ...mod };
        saveStoredCourses(courses);
        return true;
      }
    }
    return false;
  },

  deleteModule: async (moduleId: string): Promise<boolean> => {
    if (isElectron()) return window.electronAPI!.deleteModule(moduleId);
    const courses = getStoredCourses();
    for (const c of courses) {
      if (c.modules) {
        c.modules = c.modules.filter((m) => m.id !== moduleId);
        saveStoredCourses(courses);
        return true;
      }
    }
    return false;
  },

  createLesson: async (lesson: Partial<Lesson>): Promise<Lesson> => {
    if (isElectron()) return window.electronAPI!.createLesson(lesson);
    const courses = getStoredCourses();
    const newLesson: Lesson = {
      id: lesson.id || 'les_' + Math.random().toString(36).substring(2, 9),
      module_id: lesson.module_id!,
      title: lesson.title || 'New Lesson',
      content_type: lesson.content_type || 'rich_text',
      content_body: lesson.content_body || '',
      media_path: lesson.media_path || '',
      duration_minutes: lesson.duration_minutes || 5,
      sort_order: lesson.sort_order || 1
    };

    for (const c of courses) {
      const mod = c.modules?.find((m) => m.id === lesson.module_id);
      if (mod) {
        mod.lessons = mod.lessons || [];
        mod.lessons.push(newLesson);
        saveStoredCourses(courses);
        break;
      }
    }
    return newLesson;
  },

  updateLesson: async (lesson: Partial<Lesson>): Promise<boolean> => {
    if (isElectron()) return window.electronAPI!.updateLesson(lesson);
    const courses = getStoredCourses();
    for (const c of courses) {
      for (const m of c.modules || []) {
        const lIdx = m.lessons?.findIndex((l) => l.id === lesson.id);
        if (lIdx !== undefined && lIdx >= 0) {
          m.lessons![lIdx] = { ...m.lessons![lIdx], ...lesson };
          saveStoredCourses(courses);
          return true;
        }
      }
    }
    return false;
  },

  deleteLesson: async (lessonId: string): Promise<boolean> => {
    if (isElectron()) return window.electronAPI!.deleteLesson(lessonId);
    const courses = getStoredCourses();
    for (const c of courses) {
      for (const m of c.modules || []) {
        if (m.lessons) {
          m.lessons = m.lessons.filter((l) => l.id !== lessonId);
          saveStoredCourses(courses);
          return true;
        }
      }
    }
    return false;
  },

  saveQuizWithQuestions: async (quiz: Partial<Quiz>, questions: Partial<QuizQuestion>[]): Promise<Quiz> => {
    if (isElectron()) return window.electronAPI!.saveQuizWithQuestions(quiz, questions);
    const fullQuiz: Quiz = {
      id: quiz.id || 'quiz_' + Math.random().toString(36).substring(2, 9),
      lesson_id: quiz.lesson_id!,
      title: quiz.title || 'Assessment',
      passing_score: quiz.passing_score ?? 80,
      time_limit_minutes: quiz.time_limit_minutes ?? 15,
      shuffle_questions: quiz.shuffle_questions ?? 1,
      questions: questions.map((q, idx) => ({
        id: q.id || 'qq_' + Math.random().toString(36).substring(2, 9),
        quiz_id: quiz.id || 'quiz',
        prompt: q.prompt || 'Question',
        options_json: q.options ? JSON.stringify(q.options) : '[]',
        options: q.options || [],
        correct_index: q.correct_index ?? 0,
        explanation: q.explanation || '',
        points: q.points || 1,
        sort_order: idx + 1
      }))
    };

    const courses = getStoredCourses();
    for (const c of courses) {
      for (const m of c.modules || []) {
        const les = m.lessons?.find((l) => l.id === quiz.lesson_id);
        if (les) {
          les.quiz = fullQuiz;
          saveStoredCourses(courses);
          break;
        }
      }
    }
    return fullQuiz;
  },

  // Packaging & Media
  importMediaFile: async (courseId: string, category: 'video' | 'pdf' | 'image') => {
    if (isElectron()) return window.electronAPI!.importMediaFile(courseId, category);
    return null;
  },

  importMediaFromPath: async (courseId: string, rawPath: string, category: 'video' | 'pdf' | 'image') => {
    if (isElectron()) return window.electronAPI!.importMediaFromPath(courseId, rawPath, category);
    return null;
  },

  installCoursePackage: async (packagePath?: string): Promise<PackageResult> => {
    if (isElectron()) return window.electronAPI!.installCoursePackage(packagePath);
    return { success: false, message: 'Package installation requires Electron desktop environment.' };
  },

  exportCoursePackage: async (courseId: string, destinationPath?: string): Promise<PackageResult> => {
    if (isElectron()) return window.electronAPI!.exportCoursePackage(courseId, destinationPath);
    return { success: false, message: 'Package export requires Electron desktop environment.' };
  },

  // Certificates
  generateCertificatePdf: async (certificateId: string, destinationPath?: string) => {
    if (isElectron()) return window.electronAPI!.generateCertificatePdf(certificateId, destinationPath);
    return { success: false, error: 'PDF Generation requires Electron environment.' };
  },

  // Admin PIN
  verifyAdminPin: async (pin: string): Promise<boolean> => {
    if (isElectron()) return window.electronAPI!.verifyAdminPin(pin);
    const stored = localStorage.getItem(STORAGE_KEY_PIN) || '1234';
    return pin === stored;
  },

  changeAdminPin: async (oldPin: string, newPin: string): Promise<boolean> => {
    if (isElectron()) return window.electronAPI!.changeAdminPin(oldPin, newPin);
    const stored = localStorage.getItem(STORAGE_KEY_PIN) || '1234';
    if (oldPin === stored) {
      localStorage.setItem(STORAGE_KEY_PIN, newPin);
      return true;
    }
    return false;
  },

  // File dialogs
  selectFile: async (filters?: Electron.FileFilter[]): Promise<string | null> => {
    if (isElectron()) return window.electronAPI!.selectFile(filters);
    return null;
  },

  saveFile: async (defaultName: string, filters?: Electron.FileFilter[]): Promise<string | null> => {
    if (isElectron()) return window.electronAPI!.saveFile(defaultName, filters);
    return null;
  }
};
