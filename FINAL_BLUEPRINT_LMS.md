---
name: finalblueprint-lms
description: >-
  Comprehensive master production blueprint, architecture, database schemas, and button-by-button workflows for the Infinyt 3D Standalone Offline LMS.
version: 1.0.0
author: Infinyt 3D Engineering
tags:
  - lms
  - offline
  - electron
  - sqlite
  - react
---

# Infinyt 3D Standalone Offline LMS — Master Production Blueprint

> **Status**: APPROVED & FINALIZED SPECIFICATION  
> **Target Platform**: Windows Standalone Desktop Application (`.exe`)  
> **Operating Environment**: 100% Offline / Air-Gapped (Zero Internet, Zero External Daemons, Zero XAMPP)  
> **Primary Technology Stack**: Electron (v33) + React 18 + Vite + Tailwind CSS + Embedded SQLite (`sql.js`) + `pdf-lib`

---

## 1. Executive Product Vision

The **Infinyt 3D Offline LMS** is a commercial-grade technical training platform engineered for industrial clients, manufacturing facilities, and training centers operating in air-gapped or restricted network environments.

### Core Value Invariants
1. **Zero-Configuration Standalone Executable**: Installs via a single Windows installer (`.exe`) or runs portably. The embedded SQLite database (`infinyt_lms.db`) and local media engine start automatically without requiring external server tools.
2. **Two-Tier Course Architecture**:
   - **Tier 1 (Inbuilt Flagship Course)**: Ships with a complete, fully functioning primary training program pre-installed in the local database out of the box. Students can start learning on Day 1 with zero setup.
   - **Tier 2 (Hard Drive / USB Course Injection)**: Clients can inject new courses via external hard drives or USB drives using self-contained `.i3dpack` course files with a single click.
3. **Distraction-Free Focus Aesthetic**: Built with a Deep Slate industrial design system (calm charcoal surfaces, high-contrast readable typography, and clean progress indicators) engineered for long technical training sessions without eye fatigue.
4. **Zero Dead Buttons**: Every element in the user interface is fully functional, stateful, and tied to persistent local data.

---

## 2. The 5 Core Product Pillars

```
┌────────────────────────────────────────────────────────────────────────┐
│                        THE 5 CORE PILLARS                              │
├───────────────────┬────────────────────────────────────────────────────┤
│ 1. Course Library │ Pre-installed flagship course + hard drive         │
│                   │ injected courses (.i3dpack)                        │
├───────────────────┼────────────────────────────────────────────────────┤
│ 2. Lesson Engine  │ 3 Technical Formats:                               │
│                   │ • Offline Video Player (playback resume & anti-skip)│
│                   │ • Technical PDF Reader (zoom, page controls)       │
│                   │ • SOP Guide (interactive checklists, parameters)   │
├───────────────────┼────────────────────────────────────────────────────┤
│ 3. Assessment Hub │ Timed technical quizzes, passing score gating,     │
│                   │ answer explanations & anti-tamper HMAC signatures  │
├───────────────────┼────────────────────────────────────────────────────┤
│ 4. Certification  │ Linear prerequisite locking & official vector PDF  │
│                   │ certificate generator (pdf-lib) with verify hash   │
├───────────────────┼────────────────────────────────────────────────────┤
│ 5. Course Manager │ In-app Course Authoring Studio (Master Admin PIN)   │
│                   │ & Hard Drive / USB Course Package Exporter         │
└───────────────────┴────────────────────────────────────────────────────┘
```

---

## 3. Screen-by-Screen & Button-by-Button Specifications

### Screen 1: The Desktop Application Shell
- **Top Branded Titlebar**:
  - Logo & Brand Title: `INFINYT 3D | Technical Training Platform`.
  - Offline Status Pill: Green badge `100% OFFLINE • LOCAL DATABASE READY`.
  - User Switcher: Displays current trainee name (e.g. `Operator: Trainee 01`).
  - Window Controls: Native-feeling minimize, maximize/restore, and close buttons.
- **Left Navigation Sidebar**:
  - `Dashboard`: Overview of learning progress and enrolled courses.
  - `My Courses`: Course library and active syllabus viewer.
  - `Certificates`: Gallery of earned, verified PDF credentials.
  - `Instructor Studio`: Protected by Master Admin PIN (Default: `1234`).
  - Bottom Storage Status: Real-time status of local SQLite file.

---

### Screen 2: Learner Dashboard & Course Library
- **Resume Learning Hero Banner**:
  - Displays the last active course and lesson.
  - Button: `[Resume Lesson]` ➔ Directly opens the course player at the exact timestamp or lesson step.
- **Metric Cards**:
  - `Enrolled Courses`: Count of installed courses.
  - `Lessons Completed`: E.g. `12 / 18 Completed`.
  - `Average Exam Score`: Real-time average of passed quizzes.
- **Action Button: `[+ Install Course from Drive]`**:
  - Opens Windows file dialog filtered for `.i3dpack` files.
  - Ingests new courses from external hard drives or USB sticks in under 3 seconds.
- **Course Catalog Cards**:
  - Displays thumbnail, title, category, difficulty tag, and progress percentage bar.
  - Button: `[Open Syllabus]` or `[Continue Course]` ➔ Mounts the Course Player.

---

### Screen 3: The Course Player & Interactive Syllabus
- **Left Collapsible Syllabus Panel**:
  - Hierarchical tree: Modules ➔ Lessons.
  - Status Indicators:
    - ✅ Green Checkmark: Lesson completed.
    - ⭕ Open Circle: Available to start.
    - 🔒 Lock Icon: Prerequisite locked (e.g. Module 2 locked until Quiz 1 is passed with >=80%).
- **Center Stage — 3 Dedicated Lesson Viewports**:
  1. **Offline Video Player**:
     - Custom video player reading local files via `app-media://` with byte-range scrubbing.
     - Controls: Play/Pause, 10-second skip, speed toggles (0.75x, 1x, 1.25x, 1.5x), volume.
     - Anti-Skimming Protection: Requires >=85% actual watch time before enabling `[Mark as Complete]`.
  2. **Technical PDF Viewer**:
     - Displays technical manuals, machine schematics, and print guidelines.
     - Controls: Next / Previous Page, Zoom In / Zoom Out, Page Jump input.
  3. **Technical SOP Guide (Rich Text)**:
     - Clear typographic layout with callout boxes for **Safety Warnings**, **Machine Temperatures**, and **Troubleshooting Tips**.
     - Interactive task checklists: Trainee checks off machine inspection items before marking the lesson complete.
- **Bottom Navigation Bar**:
  - `[Previous Lesson]` button.
  - `[Mark as Complete & Next]` button (updates SQLite progress in real time).

---

### Screen 4: The Examination & Quiz Runner
- Activated when the trainee reaches the module exam.
- **Header Bar**:
  - Quiz title, required passing grade (e.g. `Pass: 80%`), and active countdown timer (e.g. `15:00`).
- **Question Card**:
  - Question prompt and question index (e.g. `Question 2 of 5`).
  - Radio options (A, B, C, D) with distinct hover and active states.
- **Navigation Controls**:
  - `[Previous Question]` and `[Next Question]` buttons.
  - `[Submit Exam]` button on the final question.
- **Results & Review Screen**:
  - Instant score calculation: e.g. `Score: 85% (PASSED)` or `Score: 60% (NOT PASSED)`.
  - Anti-Tamper Security: Generates an HMAC-SHA256 signature recorded into SQLite.
  - Question Review: Displays correct answers and instructor explanations for every question.
  - If Passed ➔ Unlocks the subsequent module in the syllabus.
  - If Failed ➔ Displays a `[Retake Assessment]` button.

---

### Screen 5: Certificates & Verification View
- Lists all earned technical certificates.
- When a course reaches 100% completion:
  - Displays course name, completion date, and verified badge.
  - Button: `[Download PDF Certificate]` ➔ Uses `pdf-lib` to generate an official vector PDF certificate with official branding, student name, and a unique verification hash saved directly to disk.

---

### Screen 6: Instructor Studio (CMS & Package Manager)
- Unlocked only via Master Admin PIN (`1234`).
- **Course Authoring**:
  - Create new courses (Title, Category, Description, Thumbnail).
  - Add modules and lessons (select type: Video, PDF, or SOP Guide).
  - Upload local `.mp4` video files or `.pdf` documents (copied into the local media library).
  - Add quizzes: set question prompts, option choices, correct answers, and explanations.
- **Package Exporter**:
  - Button: `[Export Course Package (.i3dpack)]` ➔ Compresses course structure, quizzes, and all media files into a portable `.i3dpack` file ready for USB distribution.

---

## 4. Local SQLite Database Schema

The database (`storage/infinyt_lms.db`) contains the following production schema:

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'student')),
  pin_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
  options_json TEXT NOT NULL,
  explanation TEXT,
  points INTEGER DEFAULT 1,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_lesson_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  is_completed INTEGER DEFAULT 0,
  last_position_seconds INTEGER DEFAULT 0,
  completed_at DATETIME,
  PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score_percentage REAL NOT NULL,
  passed INTEGER NOT NULL,
  answers_submitted_json TEXT NOT NULL,
  hmac_signature TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  verification_hash TEXT NOT NULL,
  pdf_path TEXT
);
```

---

## 5. UI Design Tokens (Infinyt 3D Official Orange & White Theme)

- **Primary Brand Orange**: `#ea580c` (Primary buttons, active indicators, brand logo)
- **Brand Orange Hover**: `#f97316` (Interactive hover states)
- **Brand Light Tint**: `#fff7ed` (Subtle badge and active card background fills)
- **Surface Primary**: `#ffffff` (Pure White for main cards, syllabus containers, and editor sheets)
- **Surface Background**: `#f8fafc` (Clean Light Slate window background)
- **Borders & Dividers**: `#e2e8f0` (Crisp, clean 1px structural framing)
- **Text Headings**: `#0f172a` (Deep High-Contrast Slate for headings and titles)
- **Text Body**: `#334155` (Legible Slate-700 for body text and SOP instructions)
- **Text Muted**: `#64748b` (Subtle Slate-500 for timestamps, metadata, and labels)
- **Success Badge**: `#10b981` (Muted Emerald for completed lessons & passed exams)
- **Warning / Timer**: `#f59e0b` (Warm Amber for quiz countdowns and safety notices)

## 6. Implementation Verification Protocol

Before declaring any phase complete:
1. Run `npx vite build` to guarantee TypeScript compilation and Electron bundling have **0 errors**.
2. Verify that **every button** has a concrete handler (no placeholder `alert()` or dead buttons).
3. Verify that database reads and writes persist across restarts in `storage/infinyt_lms.db`.
