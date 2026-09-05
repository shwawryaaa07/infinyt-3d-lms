# Infinyt 3D — Offline Learning Management System (LMS)

A robust, enterprise-grade offline learning platform designed for industrial and technical training in air-gapped environments.

---

## 🌟 Key Features

- **100% Offline & Air-Gapped**: Runs entirely local without requiring internet access, remote CDNs, or external database servers.
- **Embedded Database**: Powered by an embedded SQLite engine (`sql.js`), saving directly to local storage.
- **Multimodal Course Player**:
  - **Offline Video Engine**: Range-scrubbed video streaming, resume playback, and watch progress tracking.
  - **Technical PDF Viewer**: Built-in document viewer with pagination and zoom controls.
  - **Interactive SOPs**: Step-by-step operating procedures and interactive checklists.
- **Assessment & Certification Engine**:
  - Timed multiple-choice examinations with passing score thresholds.
  - Cryptographic verification to prevent tampering.
  - Vector PDF certificate generation.
- **Instructor Studio**:
  - Course, module, and lesson creation studio.
  - Media uploader for offline assets.
  - Course packaging system for exporting and importing `.i3dpack` archives across machines.

---

## 🛠️ Technology Stack

- **Shell**: Electron v33
- **Frontend**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Embedded SQLite (`sql.js`)
- **Document & Media Processing**: `pdf-lib`, `adm-zip`
- **Icons**: Lucide React

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/shwawryaaa07/infinyt-3d-lms.git

# Navigate to project directory
cd infinyt-3d-lms

# Install dependencies
npm install
```

### Development
```bash
# Run in development mode (Vite + Electron)
npm run dev
```

### Building for Production
```bash
# Compile TypeScript and bundle frontend + Electron
npm run build:app

# Build distributable installer and portable executable
npm run dist
```

---

## 🔒 Security & Offline Design

- **Air-Gapped Operation**: No external telemetry, remote APIs, or cloud connections.
- **Process Isolation**: The React frontend communicates strictly through typed Electron IPC channels.

---

## 📄 License

Proprietary — Copyright © 2026 Infinyt 3D. All rights reserved.
