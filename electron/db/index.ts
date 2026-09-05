import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import type {
  Course,
  Module,
  Lesson,
  Quiz,
  QuizQuestion,
  QuizAttempt,
  Certificate,
  LearnerStats
} from '../../src/types/electron.d.ts';

let db: Database | null = null;
let SQL: SqlJsStatic | null = null;
let dbFilePath = '';

const HMAC_SECRET = 'infinyt-3d-airgapped-hmac-salt-key-2026';

export function getDatabase(): Database | null {
  return db;
}

export function getDatabaseFilePath(): string {
  return dbFilePath;
}

export function getDatabaseSizeKb(): number {
  try {
    if (fs.existsSync(dbFilePath)) {
      const stats = fs.statSync(dbFilePath);
      return Math.round(stats.size / 1024);
    }
  } catch (err) {
    console.error('Error getting database size:', err);
  }
  return 0;
}

export function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(`infinyt-pin-salt-${pin}`).digest('hex');
}

export async function initDatabase(storageDir: string): Promise<Database> {
  if (db) return db;

  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const mediaDir = path.join(storageDir, 'media');
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }

  dbFilePath = path.join(storageDir, 'infinyt_lms.db');

  SQL = await initSqlJs();

  if (fs.existsSync(dbFilePath)) {
    const fileBuffer = fs.readFileSync(dbFilePath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON;');
  runMigrations(db);
  seedInitialData(db);
  saveDatabaseToFile();

  return db;
}

export function saveDatabaseToFile(): void {
  if (!db || !dbFilePath) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbFilePath, buffer);
  } catch (err) {
    console.error('Failed to persist database to disk:', err);
  }
}

export function exportDatabaseBlob(): Uint8Array | null {
  if (!db) return null;
  return db.export();
}

function runMigrations(database: Database): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      thumbnail_path TEXT,
      category TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      is_inbuilt INTEGER DEFAULT 0,
      is_sequential INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content_type TEXT NOT NULL CHECK(content_type IN ('rich_text', 'video', 'pdf', 'quiz')),
      content_body TEXT,
      media_path TEXT,
      duration_minutes INTEGER DEFAULT 5,
      sort_order INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      lesson_id TEXT UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      passing_score INTEGER DEFAULT 80,
      time_limit_minutes INTEGER DEFAULT 15,
      shuffle_questions INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      prompt TEXT NOT NULL,
      question_type TEXT DEFAULT 'multiple_choice',
      options_json TEXT NOT NULL,
      correct_index INTEGER NOT NULL DEFAULT 0,
      correct_answer_text TEXT,
      explanation TEXT,
      points INTEGER DEFAULT 1,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lesson_progress (
      lesson_id TEXT NOT NULL PRIMARY KEY REFERENCES lessons(id) ON DELETE CASCADE,
      is_completed INTEGER DEFAULT 0,
      last_position_seconds INTEGER DEFAULT 0,
      completed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      score_percentage REAL NOT NULL,
      passed INTEGER NOT NULL,
      answers_submitted_json TEXT NOT NULL,
      hmac_signature TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
      course_title TEXT,
      issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      verification_hash TEXT NOT NULL
    );
  `);

  try {
    database.run("ALTER TABLE quiz_questions ADD COLUMN question_type TEXT DEFAULT 'multiple_choice';");
  } catch {}
  try {
    database.run("ALTER TABLE quiz_questions ADD COLUMN correct_answer_text TEXT;");
  } catch {}
}

function seedInitialData(database: Database): void {
  const check = database.exec("SELECT value FROM app_settings WHERE key = 'admin_pin_hash'");
  if (!check[0] || check[0].values.length === 0) {
    const defaultHash = hashPin('1234');
    database.run("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('admin_pin_hash', ?)", [defaultHash]);
  }

  // Pre-seed Flagship Core Course if courses table is empty
  try {
    const countRes = database.exec("SELECT COUNT(*) FROM courses;");
    const courseCount = (countRes[0]?.values[0]?.[0] as number) || 0;
    if (courseCount === 0) {
      seedFlagshipCourse(database);
    }
  } catch (err) {
    console.warn('Error checking courses count during seed:', err);
  }
}

function seedFlagshipCourse(database: Database): void {
  const courseId = 'course_fdm_flagship';
  database.run(`
    INSERT INTO courses (id, title, slug, description, thumbnail_path, category, difficulty, is_inbuilt, is_sequential, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 1)
  `, [
    courseId,
    'Industrial Additive Manufacturing & FDM Calibration',
    'industrial-additive-manufacturing-fdm-calibration',
    'Comprehensive technical training on CoreXY kinematics, hotend thermodynamics, live micro-step z-height calibration, volumetric flow-rate tuning, and high-strength infill mechanics.',
    '',
    'Industrial 3D Printing',
    'Intermediate'
  ]);

  // Module 1: Safety & Machine Architecture
  const mod1Id = 'mod_fdm_safety';
  database.run(`
    INSERT INTO modules (id, course_id, title, sort_order)
    VALUES (?, ?, ?, 1)
  `, [mod1Id, courseId, 'Module 1: Machine Safety & Pre-Flight Protocols']);

  // Lesson 1.1: SOP Guide
  const sopBody = JSON.stringify({
    introduction: 'Mandatory industrial additive manufacturing safety protocol. Operating within defined thermal and mechanical parameters ensures dimensional repeatability and operator safety.',
    sections: [
      { heading: '1. Machine Pre-Commissioning', content: 'Inspect all axes, safety interlocks, and thermal sensors before beginning the manufacturing cycle. Verify enclosure ventilation pressure.' },
      { heading: '2. Thermal Safety Thresholds', content: 'Ensure maximum extruder temperature does not exceed 300°C for all-metal hotends. Maintain bed temperature within material manufacturer specifications.' }
    ],
    parameters: [
      { label: 'Hotend Limit', value: '300', unit: '°C' },
      { label: 'Bed Limit', value: '110', unit: '°C' },
      { label: 'Air Flow', value: '120', unit: 'CFM' }
    ],
    checklists: [
      { id: 'c1', label: 'Verify build plate magnetic alignment and clean PEI surface with 99% IPA.', required: true },
      { id: 'c2', label: 'Verify HEPA / Carbon air filtration unit is active and operational.', required: true },
      { id: 'c3', label: 'Verify emergency power shutdown switch is unobstructed.', required: true }
    ]
  });

  database.run(`
    INSERT INTO lessons (id, module_id, title, content_type, content_body, media_path, duration_minutes, sort_order)
    VALUES (?, ?, ?, 'rich_text', ?, NULL, 8, 1)
  `, ['les_fdm_sop', mod1Id, 'Industrial Machine Safety SOP & Pre-Flight Protocol', sopBody]);

  // Lesson 1.2: Video Lesson
  database.run(`
    INSERT INTO lessons (id, module_id, title, content_type, content_body, media_path, duration_minutes, sort_order)
    VALUES (?, ?, ?, 'video', 'Video lecture covering CoreXY kinematic belt resonance, tension tuning, and frame squareness.', 'sample_calibration_lecture.mp4', 12, 2)
  `, ['les_fdm_video', mod1Id, 'CoreXY Kinematics & High-Speed Belt Resonance Calibration']);

  // Module 2: Extrusion & Competency Examination
  const mod2Id = 'mod_fdm_extrusion';
  database.run(`
    INSERT INTO modules (id, course_id, title, sort_order)
    VALUES (?, ?, ?, 2)
  `, [mod2Id, courseId, 'Module 2: High-Flow Extrusion & Competency Examination']);

  // Lesson 2.1: PDF Datasheet
  database.run(`
    INSERT INTO lessons (id, module_id, title, content_type, content_body, media_path, duration_minutes, sort_order)
    VALUES (?, ?, ?, 'pdf', 'Official technical standard and thermal conductivity datasheet for high-speed additive manufacturing.', 'i3d_thermal_datasheet.pdf', 10, 1)
  `, ['les_fdm_pdf', mod2Id, 'Engineering Standard & Hotend Thermal Conductivity Matrix']);

  // Lesson 2.2: Quiz Lesson
  const quizLessonId = 'les_fdm_quiz';
  database.run(`
    INSERT INTO lessons (id, module_id, title, content_type, content_body, media_path, duration_minutes, sort_order)
    VALUES (?, ?, ?, 'quiz', 'Module 2 technical competency examination. Passing with >= 80% unlocks certification.', NULL, 15, 2)
  `, [quizLessonId, mod2Id, 'Module 2 Competency Examination & Diagnostic Assessment']);

  // Quiz
  const quizId = 'quiz_fdm_mastery';
  database.run(`
    INSERT INTO quizzes (id, lesson_id, title, passing_score, time_limit_minutes, shuffle_questions)
    VALUES (?, ?, ?, 80, 15, 1)
  `, [quizId, quizLessonId, 'Industrial FDM Competency Certification Exam']);

  // Quiz Questions
  database.run(`
    INSERT INTO quiz_questions (id, quiz_id, prompt, question_type, options_json, correct_index, explanation, points, sort_order)
    VALUES (?, ?, ?, 'multiple_choice', ?, ?, ?, 1, ?)
  `, [
    'q_fdm_1',
    quizId,
    'What is the mandatory action if a thermal runaway condition or detached thermistor is detected?',
    JSON.stringify([
      'Immediately trigger firmware emergency heater cut-off (M999) and halt heating',
      'Increase fan speed to 100% and continue extrusion',
      'Double the heater duty cycle to reach target faster',
      'Ignore the warning if the build plate feels warm'
    ]),
    0,
    'Detached sensors or thermal runaway must immediately trigger an emergency heater shutdown to prevent equipment damage or fire hazards.',
    1
  ]);

  database.run(`
    INSERT INTO quiz_questions (id, quiz_id, prompt, question_type, options_json, correct_index, explanation, points, sort_order)
    VALUES (?, ?, ?, 'multiple_choice', ?, ?, ?, 1, ?)
  `, [
    'q_fdm_2',
    quizId,
    'How does a bimetallic heatbreak prevent heat creep during prolonged industrial print jobs?',
    JSON.stringify([
      'By combining a super-thin titanium throat with a copper heatsink collar to reduce thermal conductivity by up to 90%',
      'By using pure aluminum which conducts heat into the filament spool',
      'By keeping the nozzle cool while the cold zone is heated',
      'By blowing compressed air directly on the nozzle heater block'
    ]),
    0,
    'Titanium has very low thermal conductivity (~6.7 W/m·K) while copper dissipates heat rapidly (~401 W/m·K), creating a sharp thermal gradient.',
    2
  ]);

  database.run(`
    INSERT INTO quiz_questions (id, quiz_id, prompt, question_type, options_json, correct_index, explanation, points, sort_order)
    VALUES (?, ?, ?, 'multiple_choice', ?, ?, ?, 1, ?)
  `, [
    'q_fdm_3',
    quizId,
    'Which infill pattern provides the highest isotropic structural strength across all 3 axes (X, Y, and Z)?',
    JSON.stringify([
      '3D Gyroid infill',
      'Linear 100% rectilinear infill along X-axis only',
      'Concentric circles infill',
      'Standard 10% grid infill'
    ]),
    0,
    'Gyroid infill has continuous triply periodic minimal surfaces, distributing mechanical load evenly in X, Y, and Z planes without weak shear lines.',
    3
  ]);
}

// ==========================================
// Admin PIN Management
// ==========================================

export function verifyAdminPin(pin: string): boolean {
  if (!db) return false;
  const targetHash = hashPin(pin);
  const result = db.exec("SELECT value FROM app_settings WHERE key = 'admin_pin_hash'");
  if (result[0]?.values[0]?.[0]) {
    return (result[0].values[0][0] as string) === targetHash;
  }
  return false;
}

export function changeAdminPin(oldPin: string, newPin: string): boolean {
  if (!verifyAdminPin(oldPin)) return false;
  if (!db) return false;
  const newHash = hashPin(newPin);
  db.run("UPDATE app_settings SET value = ? WHERE key = 'admin_pin_hash'", [newHash]);
  saveDatabaseToFile();
  return true;
}

// ==========================================
// Course & Module Queries (Single Learner)
// ==========================================

export function getCourses(): Course[] {
  if (!db) return [];
  const stmt = db.prepare(`
    SELECT id, title, slug, description, thumbnail_path, category, difficulty,
           is_inbuilt, is_sequential, sort_order, created_at
    FROM courses
    ORDER BY sort_order ASC, created_at ASC
  `);

  const courses: Course[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as unknown as Course;
    const progress = getCourseProgress(row.id);
    courses.push({
      ...row,
      total_lessons: progress.totalLessons,
      completed_lessons: progress.completedLessons,
      progress_percentage: progress.percentage
    });
  }
  stmt.free();
  return courses;
}

export function getCourseById(courseId: string): Course | null {
  if (!db) return null;
  const stmt = db.prepare(`
    SELECT id, title, slug, description, thumbnail_path, category, difficulty,
           is_inbuilt, is_sequential, sort_order, created_at
    FROM courses
    WHERE id = ?
  `);
  stmt.bind([courseId]);

  if (!stmt.step()) {
    stmt.free();
    return null;
  }

  const course = stmt.getAsObject() as unknown as Course;
  stmt.free();

  const isSequential = Boolean(course.is_sequential);

  // Fetch modules
  const modStmt = db.prepare(`
    SELECT id, course_id, title, sort_order, created_at
    FROM modules
    WHERE course_id = ?
    ORDER BY sort_order ASC
  `);
  modStmt.bind([courseId]);

  const modules: Module[] = [];
  let previousModuleCompleted = true;

  while (modStmt.step()) {
    const mod = modStmt.getAsObject() as unknown as Module;

    // Fetch lessons for this module
    const lesStmt = db.prepare(`
      SELECT l.id, l.module_id, l.title, l.content_type, l.content_body, l.media_path,
             l.duration_minutes, l.sort_order, l.created_at,
             COALESCE(p.is_completed, 0) as is_completed,
             COALESCE(p.last_position_seconds, 0) as last_position_seconds
      FROM lessons l
      LEFT JOIN lesson_progress p ON p.lesson_id = l.id
      WHERE l.module_id = ?
      ORDER BY l.sort_order ASC
    `);
    lesStmt.bind([mod.id]);

    const lessons: Lesson[] = [];
    let allLessonsDone = true;

    while (lesStmt.step()) {
      const les = lesStmt.getAsObject() as unknown as Lesson;
      les.is_completed = Boolean(les.is_completed);

      // Attach quiz if content_type === 'quiz'
      if (les.content_type === 'quiz') {
        les.quiz = getQuizByLessonId(les.id) || undefined;
      }

      if (!les.is_completed) {
        allLessonsDone = false;
      }
      lessons.push(les);
    }
    lesStmt.free();

    mod.lessons = lessons;
    mod.is_completed = lessons.length > 0 && allLessonsDone;
    mod.is_locked = isSequential ? !previousModuleCompleted : false;

    if (!mod.is_completed) {
      previousModuleCompleted = false;
    }

    modules.push(mod);
  }
  modStmt.free();

  course.modules = modules;
  const progress = getCourseProgress(courseId);
  course.total_lessons = progress.totalLessons;
  course.completed_lessons = progress.completedLessons;
  course.progress_percentage = progress.percentage;

  return course;
}

export function getCourseProgress(courseId: string): { completedLessons: number; totalLessons: number; percentage: number } {
  if (!db) return { completedLessons: 0, totalLessons: 0, percentage: 0 };

  const totalStmt = db.prepare(`
    SELECT COUNT(l.id) as total
    FROM lessons l
    JOIN modules m ON l.module_id = m.id
    WHERE m.course_id = ?
  `);
  totalStmt.bind([courseId]);
  totalStmt.step();
  const total = (totalStmt.getAsObject() as { total: number }).total || 0;
  totalStmt.free();

  if (total === 0) return { completedLessons: 0, totalLessons: 0, percentage: 0 };

  const completedStmt = db.prepare(`
    SELECT COUNT(l.id) as completed
    FROM lessons l
    JOIN modules m ON l.module_id = m.id
    JOIN lesson_progress p ON p.lesson_id = l.id
    WHERE m.course_id = ? AND p.is_completed = 1
  `);
  completedStmt.bind([courseId]);
  completedStmt.step();
  const completed = (completedStmt.getAsObject() as { completed: number }).completed || 0;
  completedStmt.free();

  return {
    completedLessons: completed,
    totalLessons: total,
    percentage: Math.round((completed / total) * 100)
  };
}

export function getLessonsByModule(moduleId: string): Lesson[] {
  if (!db) return [];
  const stmt = db.prepare(`
    SELECT l.id, l.module_id, l.title, l.content_type, l.content_body, l.media_path,
           l.duration_minutes, l.sort_order, l.created_at,
           COALESCE(p.is_completed, 0) as is_completed,
           COALESCE(p.last_position_seconds, 0) as last_position_seconds
    FROM lessons l
    LEFT JOIN lesson_progress p ON p.lesson_id = l.id
    WHERE l.module_id = ?
    ORDER BY l.sort_order ASC
  `);
  stmt.bind([moduleId]);

  const lessons: Lesson[] = [];
  while (stmt.step()) {
    const les = stmt.getAsObject() as unknown as Lesson;
    les.is_completed = Boolean(les.is_completed);
    lessons.push(les);
  }
  stmt.free();
  return lessons;
}

export function getLessonById(lessonId: string): Lesson | null {
  if (!db) return null;
  const stmt = db.prepare(`
    SELECT l.id, l.module_id, l.title, l.content_type, l.content_body, l.media_path,
           l.duration_minutes, l.sort_order, l.created_at,
           COALESCE(p.is_completed, 0) as is_completed,
           COALESCE(p.last_position_seconds, 0) as last_position_seconds
    FROM lessons l
    LEFT JOIN lesson_progress p ON p.lesson_id = l.id
    WHERE l.id = ?
  `);
  stmt.bind([lessonId]);

  if (!stmt.step()) {
    stmt.free();
    return null;
  }

  const les = stmt.getAsObject() as unknown as Lesson;
  stmt.free();
  les.is_completed = Boolean(les.is_completed);

  if (les.content_type === 'quiz') {
    les.quiz = getQuizByLessonId(les.id) || undefined;
  }

  return les;
}

export function saveLessonProgress(
  lessonId: string,
  isCompleted: boolean,
  lastPositionSeconds = 0,
  positionOnly = false
): boolean {
  if (!db) return false;
  try {
    const completedVal = isCompleted ? 1 : 0;
    const completedAt = isCompleted ? new Date().toISOString() : null;
    db.run(
      `INSERT INTO lesson_progress (lesson_id, is_completed, last_position_seconds, completed_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(lesson_id) DO UPDATE SET
         is_completed = CASE WHEN ? = 1 THEN 1 ELSE is_completed END,
         last_position_seconds = ?,
         completed_at = CASE WHEN ? = 1 THEN COALESCE(completed_at, ?) ELSE completed_at END`,
      [
        lessonId,
        completedVal,
        lastPositionSeconds,
        completedAt,
        completedVal,
        lastPositionSeconds,
        completedVal,
        completedAt
      ]
    );

    if (!positionOnly) {
      saveDatabaseToFile(); // Only write to disk on completion events
    }
    return true;
  } catch (err) {
    console.error('Error saving lesson progress:', err);
    return false;
  }
}

// ==========================================
// Quiz Queries & Mutations
// ==========================================

export function getQuizByLessonId(lessonId: string): Quiz | null {
  if (!db) return null;
  const stmt = db.prepare(`
    SELECT id, lesson_id, title, passing_score, time_limit_minutes, shuffle_questions
    FROM quizzes
    WHERE lesson_id = ?
  `);
  stmt.bind([lessonId]);

  if (!stmt.step()) {
    stmt.free();
    return null;
  }

  const quiz = stmt.getAsObject() as unknown as Quiz;
  stmt.free();

  quiz.questions = getQuizQuestions(quiz.id);
  return quiz;
}

export function getQuizQuestions(quizId: string): QuizQuestion[] {
  if (!db) return [];
  const stmt = db.prepare(`
    SELECT id, quiz_id, prompt, question_type, options_json, correct_index, correct_answer_text, explanation, points, sort_order
    FROM quiz_questions
    WHERE quiz_id = ?
    ORDER BY sort_order ASC
  `);
  stmt.bind([quizId]);

  const questions: QuizQuestion[] = [];
  while (stmt.step()) {
    const q = stmt.getAsObject() as unknown as QuizQuestion;
    try {
      q.options = JSON.parse(q.options_json);
    } catch {
      q.options = [];
    }
    q.question_type = (q.question_type as any) || 'multiple_choice';
    questions.push(q);
  }
  stmt.free();
  return questions;
}

export function saveQuizWithQuestions(
  quizData: Partial<Quiz>,
  questions: Partial<QuizQuestion>[]
): Quiz {
  if (!db) throw new Error('Database not initialized');
  if (!quizData.lesson_id) throw new Error('lesson_id is required to save quiz');

  let quizId = quizData.id;
  if (!quizId) {
    const existStmt = db.prepare('SELECT id FROM quizzes WHERE lesson_id = ?');
    existStmt.bind([quizData.lesson_id]);
    if (existStmt.step()) {
      quizId = (existStmt.getAsObject() as { id: string }).id;
    } else {
      quizId = 'quiz_' + crypto.randomUUID().slice(0, 8);
    }
    existStmt.free();
  }

  db.run(
    `INSERT INTO quizzes (id, lesson_id, title, passing_score, time_limit_minutes, shuffle_questions)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       passing_score = excluded.passing_score,
       time_limit_minutes = excluded.time_limit_minutes,
       shuffle_questions = excluded.shuffle_questions`,
    [
      quizId,
      quizData.lesson_id,
      quizData.title || 'Assessment Quiz',
      quizData.passing_score ?? 80,
      quizData.time_limit_minutes ?? 15,
      quizData.shuffle_questions ?? 1
    ]
  );

  // Clear existing questions and rewrite
  db.run('DELETE FROM quiz_questions WHERE quiz_id = ?', [quizId]);

  questions.forEach((q, idx) => {
    const qId = q.id || 'qq_' + crypto.randomUUID().slice(0, 8);
    const optionsJson = q.options ? JSON.stringify(q.options) : q.options_json || '[]';
    db!.run(
      `INSERT INTO quiz_questions (id, quiz_id, prompt, question_type, options_json, correct_index, correct_answer_text, explanation, points, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        qId,
        quizId,
        q.prompt || '',
        q.question_type || 'multiple_choice',
        optionsJson,
        q.correct_index ?? 0,
        q.correct_answer_text || null,
        q.explanation || '',
        q.points || 1,
        idx + 1
      ]
    );
  });

  saveDatabaseToFile();

  return {
    id: quizId,
    lesson_id: quizData.lesson_id!,
    title: quizData.title || 'Assessment Quiz',
    passing_score: quizData.passing_score ?? 80,
    time_limit_minutes: quizData.time_limit_minutes ?? 15,
    shuffle_questions: quizData.shuffle_questions ?? 1,
    questions: getQuizQuestions(quizId)
  };
}

export function saveQuizAttempt(
  quizId: string,
  scorePercentage: number,
  passed: boolean,
  answersJson: string
): { id: string; hmac_signature: string; passed: boolean } {
  if (!db) throw new Error('Database not initialized');

  const attemptId = 'att_' + crypto.randomUUID().slice(0, 8);
  const createdAt = new Date().toISOString();
  const passedInt = passed ? 1 : 0;

  const payload = `${attemptId}:${quizId}:${scorePercentage}:${passedInt}:${createdAt}`;
  const hmac = crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');

  db.run(
    `INSERT INTO quiz_attempts (id, quiz_id, score_percentage, passed, answers_submitted_json, hmac_signature, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [attemptId, quizId, scorePercentage, passedInt, answersJson, hmac, createdAt]
  );

  saveDatabaseToFile();
  return { id: attemptId, hmac_signature: hmac, passed };
}

export function getQuizAttempts(quizId?: string): QuizAttempt[] {
  if (!db) return [];

  let query = `
    SELECT qa.id, qa.quiz_id, qa.score_percentage, qa.passed, qa.answers_submitted_json, qa.hmac_signature, qa.created_at,
           q.title as quiz_title, m.course_id
    FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    JOIN lessons l ON q.lesson_id = l.id
    JOIN modules m ON l.module_id = m.id
  `;

  if (quizId) {
    query += ` WHERE qa.quiz_id = ? ORDER BY qa.created_at DESC`;
  } else {
    query += ` ORDER BY qa.created_at DESC`;
  }

  const stmt = db.prepare(query);
  if (quizId) stmt.bind([quizId]);

  const attempts: QuizAttempt[] = [];
  while (stmt.step()) {
    attempts.push(stmt.getAsObject() as unknown as QuizAttempt);
  }
  stmt.free();
  return attempts;
}

// ==========================================
// Certificate Generation & Query
// ==========================================

export function getCertificateById(certId: string): Certificate | null {
  if (!db) return null;
  const stmt = db.prepare(`
    SELECT c.id, c.course_id, c.course_title, c.issue_date, c.verification_hash,
           co.title as course_title_fallback
    FROM certificates c
    JOIN courses co ON c.course_id = co.id
    WHERE c.id = ?
  `);
  stmt.bind([certId]);

  if (!stmt.step()) {
    stmt.free();
    return null;
  }

  const row = stmt.getAsObject() as any;
  stmt.free();

  return {
    id: row.id,
    user_id: 'learner',
    course_id: row.course_id,
    course_title: row.course_title || row.course_title_fallback,
    issue_date: row.issue_date,
    verification_hash: row.verification_hash
  };
}

export function getCertificates(): Certificate[] {
  if (!db) return [];
  const stmt = db.prepare(`
    SELECT c.id, c.course_id, c.course_title, c.issue_date, c.verification_hash,
           co.title as course_title_fallback
    FROM certificates c
    JOIN courses co ON c.course_id = co.id
    ORDER BY c.issue_date DESC
  `);

  const certs: Certificate[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    certs.push({
      id: row.id,
      user_id: 'learner',
      course_id: row.course_id,
      course_title: row.course_title || row.course_title_fallback,
      issue_date: row.issue_date,
      verification_hash: row.verification_hash
    });
  }
  stmt.free();
  return certs;
}

export function saveCertificate(courseId: string, courseTitle = 'Certified Course'): Certificate {
  if (!db) throw new Error('Database not initialized');

  const existStmt = db.prepare(
    'SELECT id, issue_date, verification_hash, course_title FROM certificates WHERE course_id = ?'
  );
  existStmt.bind([courseId]);

  if (existStmt.step()) {
    const row = existStmt.getAsObject() as any;
    existStmt.free();
    return {
      id: row.id,
      user_id: 'learner',
      course_id: courseId,
      course_title: row.course_title || courseTitle,
      issue_date: row.issue_date,
      verification_hash: row.verification_hash
    };
  }
  existStmt.free();

  const certId = 'cert_' + crypto.randomUUID().slice(0, 8);
  const issueDate = new Date().toISOString();
  const verificationHash =
    'I3D-' +
    crypto
      .createHash('sha256')
      .update(`${certId}:${courseId}:${issueDate}`)
      .digest('hex')
      .slice(0, 16)
      .toUpperCase();

  db.run(
    `INSERT INTO certificates (id, course_id, course_title, issue_date, verification_hash)
     VALUES (?, ?, ?, ?, ?)`,
    [certId, courseId, courseTitle, issueDate, verificationHash]
  );

  saveDatabaseToFile();

  return {
    id: certId,
    user_id: 'learner',
    course_id: courseId,
    course_title: courseTitle,
    issue_date: issueDate,
    verification_hash: verificationHash
  };
}

// ==========================================
// Learner Statistics
// ==========================================

export function getLearnerStats(): LearnerStats {
  if (!db) {
    return {
      enrolledCoursesCount: 0,
      totalLessonsCount: 0,
      completedLessonsCount: 0,
      overallProgressPercentage: 0,
      averageExamScore: 0,
      certificatesCount: 0
    };
  }

  // Course Count
  const courseCountStmt = db.prepare('SELECT COUNT(*) as c FROM courses');
  courseCountStmt.step();
  const enrolledCount = (courseCountStmt.getAsObject() as { c: number }).c || 0;
  courseCountStmt.free();

  // Lessons Counts
  const totalLessonsStmt = db.prepare('SELECT COUNT(*) as c FROM lessons');
  totalLessonsStmt.step();
  const totalLessons = (totalLessonsStmt.getAsObject() as { c: number }).c || 0;
  totalLessonsStmt.free();

  const completedLessonsStmt = db.prepare('SELECT COUNT(*) as c FROM lesson_progress WHERE is_completed = 1');
  completedLessonsStmt.step();
  const completedLessons = (completedLessonsStmt.getAsObject() as { c: number }).c || 0;
  completedLessonsStmt.free();

  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Average Quiz Score
  const avgScoreStmt = db.prepare('SELECT AVG(score_percentage) as avg_score FROM quiz_attempts');
  avgScoreStmt.step();
  const avgScore = Math.round((avgScoreStmt.getAsObject() as { avg_score: number }).avg_score || 0);
  avgScoreStmt.free();

  // Certificates Count
  const certCountStmt = db.prepare('SELECT COUNT(*) as c FROM certificates');
  certCountStmt.step();
  const certCount = (certCountStmt.getAsObject() as { c: number }).c || 0;
  certCountStmt.free();

  // Most recent lesson / course
  let recentCourseId: string | undefined;
  let recentLessonId: string | undefined;
  let recentCourseTitle: string | undefined;
  let recentLessonTitle: string | undefined;

  const recentStmt = db.prepare(`
    SELECT l.id as lesson_id, l.title as lesson_title, c.id as course_id, c.title as course_title
    FROM lesson_progress p
    JOIN lessons l ON p.lesson_id = l.id
    JOIN modules m ON l.module_id = m.id
    JOIN courses c ON m.course_id = c.id
    ORDER BY p.last_position_seconds DESC, p.completed_at DESC
    LIMIT 1
  `);

  if (recentStmt.step()) {
    const recent = recentStmt.getAsObject() as any;
    recentCourseId = recent.course_id;
    recentLessonId = recent.lesson_id;
    recentCourseTitle = recent.course_title;
    recentLessonTitle = recent.lesson_title;
  }
  recentStmt.free();

  return {
    enrolledCoursesCount: enrolledCount,
    totalLessonsCount: totalLessons,
    completedLessonsCount: completedLessons,
    overallProgressPercentage: overallProgress,
    averageExamScore: avgScore,
    certificatesCount: certCount,
    recentCourseId,
    recentLessonId,
    recentCourseTitle,
    recentLessonTitle
  };
}

// ==========================================
// Instructor CRUD Operations
// ==========================================

export function createCourse(course: Partial<Course>): Course {
  if (!db) throw new Error('Database not initialized');

  const id = course.id || 'crs_' + crypto.randomUUID().slice(0, 8);
  const slug =
    course.slug ||
    (course.title || 'Course')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
      '-' +
      crypto.randomUUID().slice(0, 4);

  db.run(
    `INSERT INTO courses (id, title, slug, description, thumbnail_path, category, difficulty, is_inbuilt, is_sequential, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      course.title || 'New Industrial Course',
      slug,
      course.description || '',
      course.thumbnail_path || '',
      course.category || 'Industrial 3D Printing',
      course.difficulty || 'Beginner',
      course.is_inbuilt ? 1 : 0,
      course.is_sequential ? 1 : 0,
      course.sort_order || 1
    ]
  );

  saveDatabaseToFile();

  return {
    id,
    title: course.title || 'New Industrial Course',
    slug,
    description: course.description || '',
    thumbnail_path: course.thumbnail_path || '',
    category: course.category || 'Industrial 3D Printing',
    difficulty: (course.difficulty as any) || 'Beginner',
    is_inbuilt: course.is_inbuilt ? 1 : 0,
    is_sequential: course.is_sequential ? 1 : 0,
    sort_order: course.sort_order || 1
  };
}

export function updateCourse(course: Partial<Course>): boolean {
  if (!db || !course.id) return false;
  try {
    db.run(
      `UPDATE courses SET
         title = COALESCE(?, title),
         description = COALESCE(?, description),
         thumbnail_path = COALESCE(?, thumbnail_path),
         category = COALESCE(?, category),
         difficulty = COALESCE(?, difficulty),
         is_sequential = COALESCE(?, is_sequential),
         sort_order = COALESCE(?, sort_order)
       WHERE id = ?`,
      [
        course.title ?? null,
        course.description ?? null,
        course.thumbnail_path ?? null,
        course.category ?? null,
        course.difficulty ?? null,
        course.is_sequential !== undefined ? (course.is_sequential ? 1 : 0) : null,
        course.sort_order ?? null,
        course.id
      ]
    );
    saveDatabaseToFile();
    return true;
  } catch (err) {
    console.error('Error updating course:', err);
    return false;
  }
}

export function deleteCourse(courseId: string): boolean {
  if (!db) return false;
  try {
    db.run('DELETE FROM courses WHERE id = ?', [courseId]);
    saveDatabaseToFile();
    return true;
  } catch (err) {
    console.error('Error deleting course:', err);
    return false;
  }
}

export function createModule(mod: Partial<Module>): Module {
  if (!db) throw new Error('Database not initialized');
  const id = mod.id || 'mod_' + crypto.randomUUID().slice(0, 8);
  db.run(
    `INSERT INTO modules (id, course_id, title, sort_order)
     VALUES (?, ?, ?, ?)`,
    [id, mod.course_id || null, mod.title || 'New Module', mod.sort_order || 1]
  );
  saveDatabaseToFile();
  return {
    id,
    course_id: mod.course_id!,
    title: mod.title || 'New Module',
    sort_order: mod.sort_order || 1
  };
}

export function updateModule(mod: Partial<Module>): boolean {
  if (!db || !mod.id) return false;
  try {
    db.run(
      `UPDATE modules SET
         title = COALESCE(?, title),
         sort_order = COALESCE(?, sort_order)
       WHERE id = ?`,
      [mod.title ?? null, mod.sort_order ?? null, mod.id]
    );
    saveDatabaseToFile();
    return true;
  } catch (err) {
    console.error('Error updating module:', err);
    return false;
  }
}

export function deleteModule(moduleId: string): boolean {
  if (!db) return false;
  try {
    db.run('DELETE FROM modules WHERE id = ?', [moduleId]);
    saveDatabaseToFile();
    return true;
  } catch (err) {
    console.error('Error deleting module:', err);
    return false;
  }
}

export function createLesson(lesson: Partial<Lesson>): Lesson {
  if (!db) throw new Error('Database not initialized');
  const id = lesson.id || 'les_' + crypto.randomUUID().slice(0, 8);
  db.run(
    `INSERT INTO lessons (id, module_id, title, content_type, content_body, media_path, duration_minutes, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      lesson.module_id || null,
      lesson.title || 'New Lesson',
      lesson.content_type || 'rich_text',
      lesson.content_body || '',
      lesson.media_path || '',
      lesson.duration_minutes || 5,
      lesson.sort_order || 1
    ]
  );
  saveDatabaseToFile();
  return {
    id,
    module_id: lesson.module_id!,
    title: lesson.title || 'New Lesson',
    content_type: lesson.content_type || 'rich_text',
    content_body: lesson.content_body || '',
    media_path: lesson.media_path || '',
    duration_minutes: lesson.duration_minutes || 5,
    sort_order: lesson.sort_order || 1
  };
}

export function updateLesson(lesson: Partial<Lesson>): boolean {
  if (!db || !lesson.id) return false;
  try {
    db.run(
      `UPDATE lessons SET
         title = COALESCE(?, title),
         content_type = COALESCE(?, content_type),
         content_body = COALESCE(?, content_body),
         media_path = COALESCE(?, media_path),
         duration_minutes = COALESCE(?, duration_minutes),
         sort_order = COALESCE(?, sort_order)
       WHERE id = ?`,
      [
        lesson.title ?? null,
        lesson.content_type ?? null,
        lesson.content_body ?? null,
        lesson.media_path ?? null,
        lesson.duration_minutes ?? null,
        lesson.sort_order ?? null,
        lesson.id
      ]
    );
    saveDatabaseToFile();
    return true;
  } catch (err) {
    console.error('Error updating lesson:', err);
    return false;
  }
}

export function deleteLesson(lessonId: string): boolean {
  if (!db) return false;
  try {
    db.run('DELETE FROM lessons WHERE id = ?', [lessonId]);
    saveDatabaseToFile();
    return true;
  } catch (err) {
    console.error('Error deleting lesson:', err);
    return false;
  }
}
