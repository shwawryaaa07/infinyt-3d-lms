---
name: infinyt-lms-core
description: >-
  Standard architecture, SQLite data modeling, offline routing, and prerequisite gating for the Infinyt 3D Offline LMS. Use when modifying core state, database tables, or syllabus navigation.
---

# Infinyt LMS Core Architecture Skill

## Core Principles
1. **Local State & Database**:
   - Tables: `users`, `courses`, `modules`, `lessons`, `quizzes`, `quiz_questions`, `user_lesson_progress`, `quiz_attempts`, `certificates`.
   - All queries go through `electron/main.ts` IPC handlers invoking `electron/db/index.ts`.
2. **Prerequisite Gating**:
   - Module N+1 is locked until all lessons and quizzes in Module N are completed with passing scores (>=80%).
3. **Verification**:
   - Always run `npx vite build` to confirm zero type or build errors.
