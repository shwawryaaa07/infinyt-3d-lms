# Workspace Rules: Infinyt 3D Standalone Offline LMS

This repository contains the source code for the **Infinyt 3D Standalone Offline LMS**, an enterprise-grade commercial desktop learning platform built for industrial technical training.

## 1. Absolute Architectural Invariants
- **100% Offline Air-Gapped Operation**: The application must never attempt outbound network requests (HTTP/HTTPS, external CDNs, Google Fonts, remote APIs, or cloud telemetry). All assets (icons, fonts, libraries, databases) MUST be bundled locally.
- **Embedded Serverless Database**: Uses embedded SQLite (`sql.js` writing to `storage/infinyt_lms.db`). Never introduce external database server dependencies (like MySQL, Postgres, Apache, or XAMPP).
- **Process Isolation**: The renderer process (React UI) must have zero direct access to Node.js APIs (`fs`, `child_process`, `path`). All operating system interactions MUST pass through typed IPC handlers exposed via `window.electronAPI` in `electron/preload.ts`.
- **Windows File Encoding**: All files MUST be encoded in pure UTF-8 without Windows PowerShell Byte Order Mark (BOM `\uFEFF`).

## 2. Product Pillars & Design Standards
- **Two-Tier Content Model**:
  1. Flagship Core Course comes pre-installed in the local SQLite database out of the box.
  2. Additional courses can be injected via external hard drives / USB drives (`.i3dpack`) or created via the In-App Instructor Studio.
- **Visual Design Standard (Infinyt 3D Official Orange & White Theme)**:
  - **Surface & Backgrounds**: Crisp pure white (`#ffffff` / `surface-50`) for cards and elevated panels; clean light grey (`#f8fafc` / `surface-100`) for window backgrounds.
  - **Brand Colors**: Official Infinyt 3D Vibrant Orange (`#ea580c` primary, `#f97316` hover, `#fff7ed` subtle orange badge fills).
  - **Typography & Text**: Deep Charcoal / Slate (`#0f172a` / `surface-900` for headings, `#334155` / `surface-700` for body text) ensuring maximum contrast and legibility.
  - **Borders & Dividers**: Crisp structural 1px borders (`#e2e8f0` / `surface-300`).
  - **Success States**: Muted Emerald (`#10b981`) for completed lessons and passed quizzes.
  - **Zero Dead Buttons**: Every button must trigger a real, working, stateful handler. No non-functional placeholder buttons.

## 3. Verification Protocol
- Before declaring any task complete, always verify with `npx vite build` to guarantee TypeScript compilation and Electron bundling have zero errors.
