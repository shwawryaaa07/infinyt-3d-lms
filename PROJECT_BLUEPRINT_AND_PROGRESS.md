# Infinyt 3D Offline Standalone LMS — Master Project Blueprint & Progress

> **Document Purpose**: This file serves as the single source of truth for the **Infinyt 3D Desktop LMS** project. It documents the exact current progress, architecture decisions, database schemas, component contracts, and the remaining execution roadmap for developers and Antigravity AI agents.

---

## 1. Project Overview & Core Constraints

- **Client / Company**: **Infinyt 3D** (Additive Manufacturing, 3D Printing & Engineering Education).
- **Application Type**: 100% Offline Standalone Desktop Application (Windows `.exe`).
- **Network Requirement**: **Zero Internet / Zero Cloud**. Operates in air-gapped environments with network adapters disabled.
- **Local Persistence**: Embedded serverless SQLite database (`infinyt_lms.db`) with zero external daemon configuration (no localhost port daemons, no XAMPP, no background services).
- **Core Value Proposition**: 
  - Standard LMS platforms (Moodle, Canvas) only support flat 2D videos and PDFs. 
  - The Infinyt 3D LMS features an **embedded hardware-accelerated 3D model inspector (Three.js WebGL + STLLoader)** directly inside lessons so students can inspect STL/OBJ meshes, overhang angles, and slicer layer orientations.
- **Course Distribution Model**: Decoupled Engine & Course Packages (`.i3dpack`). Instructors author courses on one machine and export them to USB drives. Student machines import course packages with a single click without reinstalling or recompiling the `.exe`.

---

## 2. Technology Stack & Specifications

| Layer | Technology | Specification & Role |
| :--- | :--- | :--- |
| **Desktop Shell** | Electron (`v33.4.11`) | Native Windows desktop runtime with frameless window and single-instance lock. |
| **Frontend Framework** | React 18 + Vite 6 + TypeScript | High-performance reactive UI with strict typing and lightning-fast HMR. |
| **Styling & Theme** | Tailwind CSS + Lucide Icons | Custom Infinyt 3D dark engineering aesthetic (slate/zinc background, neon cyan & amber accents). |
| **Embedded Database** | `sql.js` (SQLite WebAssembly) | Pure serverless, zero C++ compilation issues, writes standard `infinyt_lms.db` readable by DB Browser for SQLite. |
| **3D Mesh Viewport** | Three.js (`v0.172`) + STLLoader + WebGL | Hardware-accelerated 3D rendering with OrbitControls, wireframe toggles, and millimeter dimension HUD. |
| **Document Engine** | `pdf-lib` (`v1.17.1`) | Pure client-side offline vector PDF certificate generation. |
| **Packaging & Distribution** | `electron-builder` + `adm-zip` | Compiles NSIS Windows Setup installer (`.exe`) and Portable executable; zips/unzips `.i3dpack` course files. |
| **Security & Signing** | Node.js native `crypto` | Master PIN salt hashing & HMAC-SHA256 anti-tamper signing on quiz score records and `.i3dgrade` receipts. |

---

## 3. Project Directory Map (`D:\infinyt-3d-lms`)

```text
D:\infinyt-3d-lms/
├── electron/
│   ├── main.ts                     # Electron lifecycle, window creation, custom media protocol, IPC handlers
│   ├── preload.ts                  # Secure contextBridge exposing typed window.electronAPI
│   ├── db/
│   │   └── index.ts                # SQLite engine (sql.js), schema migrations, and default course seed data
│   └── services/
│       ├── coursePackager.ts       # .i3dpack course bundle export & import engine (adm-zip)
│       ├── gradeHarvester.ts       # HMAC-SHA256 grade receipt generator & USB batch aggregator
│       └── certificateService.ts   # Vector PDF certificate generator (pdf-lib) with SHA-256 verification hash
├── src/
│   ├── App.tsx                     # Top-level application shell, tab switching, and Master Admin PIN modal
│   ├── main.tsx                    # React DOM root mounting
│   ├── index.css                   # Tailwind directives, custom scrollbars, and window drag regions
│   ├── components/
│   │   ├── common/
│   │   │   ├── TitleBar.tsx        # Branded frameless header with minimize, maximize, close controls
│   │   │   └── Sidebar.tsx         # Navigation sidebar (Dashboard, Courses, 3D Mesh Lab, Certificates, Instructor Tools)
│   │   ├── viewer3d/
│   │   │   └── ModelViewer3D.tsx   # Three.js 3D WebGL viewport with STLLoader, wireframe, dimensions HUD & rotation
│   │   ├── quiz/
│   │   │   ├── QuizRunner.tsx      # Timed quiz engine, question pager, instant scoring, explanations & HMAC signing
│   │   │   └── QuizEditor.tsx      # Visual assessment builder with option editor and correct-answer selector
│   │   ├── video/
│   │   │   └── VideoPlayer.tsx     # Offline video player with anti-skimming watch tracking (90% auto-complete)
│   │   └── pdf/
│   │       └── PdfViewer.tsx       # Offline PDF technical sheet viewer
│   ├── pages/
│   │   ├── Dashboard.tsx           # Home view: enrolled programs, metric cards, quick launch, .i3dpack import
│   │   ├── CourseView.tsx          # Lesson player & syllabus tree with linear prerequisite gating & certificate claiming
│   │   ├── CourseEditor.tsx        # WYSIWYG course builder for instructors with live preview & .i3dpack packager
│   │   ├── Analytics.tsx           # Class gradebook and USB Harvester (.i3dgrade tamper verification)
│   │   └── CertificatesView.tsx    # Verifiable certificate registry with live preview and vector PDF generation
│   └── types/
│       └── electron.d.ts           # TypeScript contracts for Course, Module, Lesson, Quiz, GradeReceipt, and window.electronAPI
├── storage/                        # Default persistent local storage directory
│   ├── infinyt_lms.db              # Active SQLite database file
│   └── media/                      # Offline video, PDF, and STL mesh assets
├── electron-builder.yml            # Electron builder configuration for NSIS and Portable Windows executables
├── package.json                    # Project dependencies and npm scripts
├── tsconfig.json                   # TypeScript compiler configuration
├── vite.config.ts                  # Vite + Electron build orchestration
└── tailwind.config.js              # Infinyt 3D design tokens and dark mode colors
```

---

## 4. Current Progress & Completed Milestones

### Phase 1: Desktop Shell & Scaffolding
- [x] Initialized Vite, React 18, TypeScript, Tailwind CSS, and Electron.
- [x] Single-instance lock implemented in `electron/main.ts` (prevents duplicate instances).
- [x] Custom frameless dark title bar with window drag regions and native minimize/maximize/close IPC handlers.
- [x] Responsive layout with learning navigation sidebar and offline status indicators.

### Phase 2: Local Persistence & Storage Engine
- [x] Embedded `sql.js` SQLite engine configured in `electron/db/index.ts`.
- [x] Database migrations execute automatically on app startup, creating:
  - `users` (admin with PIN hash, student profiles)
  - `courses` (metadata, slug, difficulty, sort order)
  - `modules` (course chapters)
  - `lessons` (rich text, video, 3D model, quiz, pdf)
  - `quizzes` & `quiz_questions` (passing score, time limits, explanations)
  - `user_lesson_progress` (completion flags, watch positions)
  - `quiz_attempts` (scores, pass/fail status, submitted answers, HMAC tamper signatures)
  - `certificates` (verification hash, issue date)
- [x] Seeded default flagship course: **"Additive Manufacturing & FDM Calibration"** with 2 modules, 4 lessons, and an assessment.

### Phase 3: Hardware-Accelerated 3D Model Viewport
- [x] Built `src/components/viewer3d/ModelViewer3D.tsx` using Three.js WebGL + `STLLoader`.
- [x] Integrated OrbitControls (rotate, pan, zoom).
- [x] Added **Wireframe Toggle** to inspect mesh triangles and polygon distribution.
- [x] Added **Dimension HUD Readout** displaying real-time millimeter dimensions and triangle face counts.
- [x] Added filament material color swatches (Infinyt Cyan, PLA Orange, PETG Green, Technical White, Resin Purple).

### Phase 4: Course Authoring & USB Packaging Pipeline (`.i3dpack`)
- [x] Built `src/pages/CourseEditor.tsx` with full WYSIWYG course and module management.
- [x] Built `src/components/quiz/QuizEditor.tsx` for visual question & answer authoring.
- [x] Built `src/components/video/VideoPlayer.tsx` with custom dark titanium UI and 90% anti-skimming auto-completion.
- [x] Built `src/components/pdf/PdfViewer.tsx` for offline technical sheets.
- [x] Built `electron/services/coursePackager.ts` using `adm-zip` for 1-click `.i3dpack` export and import via USB.

### Phase 5: Assessment & Prerequisite Gating Engine
- [x] Built `src/components/quiz/QuizRunner.tsx` with live countdown timer and multiple-choice question paging.
- [x] Instant scoring calculation against passing threshold.
- [x] Cryptographic HMAC-SHA256 signature generated and recorded for every attempt to prevent database tampering.
- [x] Post-quiz review screen showing per-question explanations and engineering rationale.
- [x] Built `src/pages/CourseView.tsx` with syllabus tree navigation and linear prerequisite locking.
- [x] Master Admin PIN modal in `App.tsx` (Default PIN: `1234`).

### Phase 6: Offline Certificates & USB Grade Harvester (`.i3dgrade`)
- [x] Built `electron/services/certificateService.ts` using `pdf-lib` for offline vector PDF generation with SHA-256 anti-counterfeit hashes.
- [x] Built `src/pages/CertificatesView.tsx` with live interactive certificate preview card and PDF download.
- [x] Built `electron/services/gradeHarvester.ts` for exporting signed `.i3dgrade` receipts and batch harvesting from USB drives.
- [x] Built `src/pages/Analytics.tsx` Class Gradebook with pass rate analytics, tamper verification badges, receipt inspector, and CSV export.

### Phase 7: Production Windows Compilation (`.exe`)
- [x] Configured `electron-builder.yml` for NSIS Windows Setup installer (`Infinyt3D-LMS-Setup.exe`) and Portable standalone (`Infinyt3D-LMS-Portable.exe`).
- [x] Verified full TypeScript compilation (`tsc --noEmit`) with 0 errors.
- [x] Verified production bundling (`vite build`) for React UI, Electron main, and Preload.
- [x] Validated zero dead buttons across all application views.

---

## 5. Guide for Antigravity AI Agents

When continuing work on this project in Antigravity IDE:
1. **Working Directory**: Always execute commands and read/write files relative to `D:\infinyt-3d-lms`.
2. **Building & Dev Server**:
   - Run `npm run dev` to launch the Vite + Electron desktop application.
   - Run `npx vite build` to verify TypeScript and production bundling.
3. **Database Rules**:
   - Database queries must go through `electron/main.ts` IPC handlers or `electron/db/index.ts`.
   - Never write blocking external network calls; keep all storage strictly inside `D:\infinyt-3d-lms\storage`.
4. **Encoding Rule**: Always write files in pure UTF-8 without Windows PowerShell BOM (`\uFEFF`).
