---
name: course-packager
description: >-
  Workflow for exporting and importing offline .i3dpack zip course bundles for USB drive distribution. Use when implementing course authoring, file export, or syllabus import.
---

# Course Packaging & USB Distribution Skill

## Package Structure (.i3dpack)
An `.i3dpack` bundle is a ZIP archive containing:
1. `manifest.json`: Course metadata, modules, lessons, and quiz configurations.
2. `media/`: Subdirectory holding offline videos (.mp4), 3D meshes (.stl, .obj), and PDF guides.

## Import Workflow
1. Open native Windows file dialog to select `.i3dpack`.
2. Extract files into `storage/media/<courseId>/`.
3. Parse `manifest.json` and insert courses, modules, and lessons into `infinyt_lms.db` within a single transaction.
