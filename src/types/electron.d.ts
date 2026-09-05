export type ContentType = 'rich_text' | 'video' | 'pdf' | 'quiz';
export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
export type QuestionType = 'multiple_choice' | 'fill_blank';

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail_path?: string;
  category: string;
  difficulty: DifficultyLevel;
  is_inbuilt: number;
  is_sequential: number;  // 1 = modules lock sequentially
  sort_order: number;
  created_at?: string;
  modules?: Module[];
  progress_percentage?: number;
  total_lessons?: number;
  completed_lessons?: number;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
  created_at?: string;
  lessons?: Lesson[];
  is_locked?: boolean;
  is_completed?: boolean;
}

export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
}

export interface TechnicalParameter {
  label: string;
  value: string;
  unit?: string;
  recommended?: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  content_type: ContentType;
  content_body?: string;
  media_path?: string;
  duration_minutes: number;
  sort_order: number;
  created_at?: string;
  is_completed?: boolean;
  last_position_seconds?: number;
  quiz?: Quiz;
  checklists?: ChecklistItem[];
  parameters?: TechnicalParameter[];
}

export interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  passing_score: number;
  time_limit_minutes: number;
  shuffle_questions: number;
  questions?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  prompt: string;
  question_type?: QuestionType;
  options_json: string;
  options?: string[];
  correct_index: number;       // Which option index (0-based) is correct
  explanation?: string;
  points: number;
  sort_order: number;
  correct_answer_text?: string;
}

export interface LessonProgress {
  lesson_id: string;
  is_completed: number;
  last_position_seconds: number;
  completed_at?: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  course_id?: string;
  quiz_title?: string;
  score_percentage: number;
  passed: number;
  answers_submitted_json: string;
  hmac_signature: string;
  created_at: string;
}

export interface Certificate {
  id: string;
  user_id: string;  // Always 'learner' — kept for backward compat with pdf generator
  course_id: string;
  course_title?: string;
  issue_date: string;
  verification_hash: string;
  pdf_path?: string;
}

export interface LearnerStats {
  enrolledCoursesCount: number;
  totalLessonsCount: number;
  completedLessonsCount: number;
  overallProgressPercentage: number;
  averageExamScore: number;
  certificatesCount: number;
  recentCourseId?: string;
  recentLessonId?: string;
  recentCourseTitle?: string;
  recentLessonTitle?: string;
}

export interface AppStatus {
  isOffline: boolean;
  databasePath: string;
  databaseSizeKb: number;
  version: string;
  storagePath: string;
  isPackaged: boolean;
}

export interface PackageResult {
  success: boolean;
  courseId?: string;
  message?: string;
  filePath?: string;
  error?: string;
}

export interface MediaImportResult {
  success: boolean;
  originalName: string;
  filePath: string;
  mediaUrl: string;
  error?: string;
}

export interface ElectronAPI {
  // App Status
  getAppStatus: () => Promise<AppStatus>;

  // Courses & Progress (no userId — single learner)
  getCourses: () => Promise<Course[]>;
  getCourseById: (courseId: string) => Promise<Course | null>;
  getCourseProgress: (courseId: string) => Promise<{ completedLessons: number; totalLessons: number; percentage: number }>;
  getLessonsByModule: (moduleId: string) => Promise<Lesson[]>;
  getLessonById: (lessonId: string) => Promise<Lesson | null>;
  saveLessonProgress: (lessonId: string, isCompleted: boolean, lastPositionSeconds?: number, positionOnly?: boolean) => Promise<boolean>;
  getQuizByLessonId: (lessonId: string) => Promise<Quiz | null>;
  saveQuizAttempt: (quizId: string, scorePercentage: number, passed: boolean, answersJson: string) => Promise<{ id: string; hmac_signature: string; passed: boolean }>;
  getQuizAttempts: (quizId?: string) => Promise<QuizAttempt[]>;
  getCertificates: () => Promise<Certificate[]>;
  saveCertificate: (courseId: string, courseTitle?: string) => Promise<Certificate>;
  getLearnerStats: () => Promise<LearnerStats>;

  // Instructor Studio
  createCourse: (course: Partial<Course>) => Promise<Course>;
  updateCourse: (course: Partial<Course>) => Promise<boolean>;
  deleteCourse: (courseId: string) => Promise<boolean>;
  createModule: (module: Partial<Module>) => Promise<Module>;
  updateModule: (module: Partial<Module>) => Promise<boolean>;
  deleteModule: (moduleId: string) => Promise<boolean>;
  createLesson: (lesson: Partial<Lesson>) => Promise<Lesson>;
  updateLesson: (lesson: Partial<Lesson>) => Promise<boolean>;
  deleteLesson: (lessonId: string) => Promise<boolean>;
  saveQuizWithQuestions: (quiz: Partial<Quiz>, questions: Partial<QuizQuestion>[]) => Promise<Quiz>;

  // Media & Packaging
  importMediaFile: (courseId: string, category: 'video' | 'pdf' | 'image') => Promise<MediaImportResult | null>;
  importMediaFromPath: (courseId: string, rawPath: string, category: 'video' | 'pdf' | 'image') => Promise<MediaImportResult | null>;
  installCoursePackage: (packagePath?: string) => Promise<PackageResult>;
  exportCoursePackage: (courseId: string, destinationPath?: string) => Promise<PackageResult>;

  // Certificates
  generateCertificatePdf: (certificateId: string, destinationPath?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;

  // Admin PIN
  verifyAdminPin: (pin: string) => Promise<boolean>;
  changeAdminPin: (oldPin: string, newPin: string) => Promise<boolean>;

  // File dialog
  selectFile: (filters?: Electron.FileFilter[]) => Promise<string | null>;
  saveFile: (defaultName: string, filters?: Electron.FileFilter[]) => Promise<string | null>;

  // Window Controls
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;  // Optional — only present in Electron
  }
}
