---
name: offline-media-engine
description: >-
  Procedures for local video streaming with range requests, playback resume, anti-skimming watch tracking, and embedded PDF document viewing in the Infinyt 3D LMS.
---

# Offline Media Engine Skill

## Video Player Guidelines
1. **Streaming Protocol**:
   - Stream local video files using the custom `app-media://` protocol with HTTP 206 Partial Content support for instantaneous video scrubbing.
2. **Watch Tracking & Anti-Skimming**:
   - Track elapsed watch time to prevent trainees from skipping straight to the end to claim false completion credit (requires >=85% actual watch time).
   - Save last playback position in seconds to `user_lesson_progress` to resume smoothly upon return.

## PDF Document Guidelines
- Embed PDFs cleanly with page navigation (Next, Previous, Zoom In, Zoom Out) and fullscreen options.
