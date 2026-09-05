---
name: course-injection-packager
description: >-
  Workflow for importing and exporting offline .i3dpack course bundles from external hard drives or USB sticks, and building courses in the Instructor Studio.
---

# Course Injection & Packaging Skill

## The .i3dpack Format
- An `.i3dpack` bundle is a ZIP archive containing:
  - `manifest.json`: Full course metadata, module hierarchy, lessons, and quiz questions.
  - `media/`: Directory holding offline video MP4s and PDF documents.

## Injection Workflow (Hard Drive / USB)
1. User clicks "Install Course from Drive".
2. Open native Windows dialog (`dialog.showOpenDialog`) filtering for `.i3dpack`.
3. Validate `manifest.json`, extract media files into `storage/media/<courseId>/`.
4. Insert course, module, lesson, and quiz records into `infinyt_lms.db` in an atomic transaction.
