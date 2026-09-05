---
name: infinyt-lms-workflow
description: >-
  Standard workflow and development guidelines for creating, modifying, and verifying features in the Infinyt 3D Offline Desktop LMS. Use when working on UI layouts, courses, quizzes, and database interactions.
---

# Infinyt 3D LMS Development Workflow

## Core Workflow Steps
1. **Understand Architecture**: Review `PROJECT_BLUEPRINT_AND_PROGRESS.md` before adding or modifying components.
2. **Database Queries**:
   - Queries and mutations are routed through `electron/main.ts` IPC handlers.
   - Updates to tables in `electron/db/index.ts` must maintain foreign key integrity.
3. **Course & Quiz Progress**:
   - Lessons must support 4 content types: `rich_text`, `video`, `3d_model`, and `quiz`.
   - Quiz submissions must always generate an HMAC-SHA256 signature for tamper resistance.
4. **Verification**:
   - Execute `npx vite build` to ensure zero build or type errors.
