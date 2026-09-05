import { app, BrowserWindow, ipcMain, protocol, dialog, Menu } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  initDatabase,
  getDatabaseFilePath,
  getDatabaseSizeKb,
  getCourses,
  getCourseById,
  getCourseProgress,
  getLessonsByModule,
  getLessonById,
  saveLessonProgress,
  getQuizByLessonId,
  saveQuizAttempt,
  getQuizAttempts,
  getCertificates,
  getCertificateById,
  saveCertificate,
  getLearnerStats,
  createCourse,
  updateCourse,
  deleteCourse,
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
  saveQuizWithQuestions,
  verifyAdminPin,
  changeAdminPin
} from './db/index.js';

import { installCoursePackage, exportCoursePackage } from './services/coursePackager.js';
import { generateCertificatePdf } from './services/certificateService.js';
import type { AppStatus } from '../src/types/electron.d.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure single instance lock in production builds
if (app.isPackaged) {
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });
  }
}

// Storage path: in dev, project root/storage; in prod, appData/Infinyt3D_LMS
const storageDir = app.isPackaged
  ? path.join(app.getPath('userData'), 'storage')
  : path.join(process.cwd(), 'storage');

let mainWindow: BrowserWindow | null = null;

// Register custom protocol for high-performance offline range-scrubbed media
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app-media',
    privileges: {
      standard: true,
      secure: true,
      bypassCSP: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

async function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1080,
    minHeight: 700,
    frame: true,
    autoHideMenuBar: true,
    title: 'Infinyt 3D — Training Academy',
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  });

  mainWindow.setMenu(null);

  // Load Vite dev server URL or production build
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open external links in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    import('electron').then(({ shell }) => shell.openExternal(url));
    return { action: 'deny' };
  });
}

// Set up app-media protocol handler for local streaming
function registerMediaProtocol() {
  protocol.handle('app-media', async (request) => {
    try {
      const url = new URL(request.url);
      let relativePath = decodeURIComponent(url.pathname);
      if (url.host && url.host !== 'localhost') {
        relativePath = path.join(url.host, relativePath);
      }
      relativePath = relativePath.replace(/^[/\\]+/, '');

      const mediaBasePath = path.normalize(path.join(storageDir, 'media'));
      const resolvedPath = path.normalize(path.join(mediaBasePath, relativePath));

      // Security check: ensure path is within storage directory
      if (!resolvedPath.toLowerCase().startsWith(path.normalize(storageDir).toLowerCase())) {
        return new Response('Forbidden access outside storage directory', { status: 403 });
      }

      if (!fs.existsSync(resolvedPath)) {
        return new Response('Media file not found: ' + relativePath, { status: 404 });
      }

      const stat = fs.statSync(resolvedPath);
      const fileSize = stat.size;
      const range = request.headers.get('range');

      // Determine mime type
      const ext = path.extname(resolvedPath).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.mp4') contentType = 'video/mp4';
      else if (ext === '.webm') contentType = 'video/webm';
      else if (ext === '.pdf') contentType = 'application/pdf';
      else if (ext === '.glb') contentType = 'model/gltf-binary';
      else if (ext === '.gltf') contentType = 'model/gltf+json';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.svg') contentType = 'image/svg+xml';

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;

        const stream = fs.createReadStream(resolvedPath, { start, end });
        return new Response(stream as any, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize.toString(),
            'Content-Type': contentType
          }
        });
      }

      const stream = fs.createReadStream(resolvedPath);
      return new Response(stream as any, {
        status: 200,
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes'
        }
      });
    } catch (err: any) {
      console.error('Error serving app-media protocol:', err);
      return new Response('Internal Protocol Error', { status: 500 });
    }
  });
}

// App lifecycle
app.whenReady().then(async () => {
  registerMediaProtocol();

  // Initialize embedded SQLite database
  try {
    await initDatabase(storageDir);
    console.log('Infinyt 3D Embedded SQLite database initialized successfully at:', getDatabaseFilePath());
  } catch (err) {
    console.error('Failed to initialize embedded database:', err);
  }

  // Register IPC handlers
  registerIpcHandlers();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});// Safe dialog helpers to prevent TypeError when window is not focused
async function showOpenDialogSafe(options: Electron.OpenDialogOptions): Promise<Electron.OpenDialogReturnValue> {
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  if (win && !win.isDestroyed()) {
    return dialog.showOpenDialog(win, options);
  }
  return dialog.showOpenDialog(options);
}

async function showSaveDialogSafe(options: Electron.SaveDialogOptions): Promise<Electron.SaveDialogReturnValue> {
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  if (win && !win.isDestroyed()) {
    return dialog.showSaveDialog(win, options);
  }
  return dialog.showSaveDialog(options);
}

function registerIpcHandlers() {
  // Window Controls
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize();
  });
  ipcMain.handle('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });
  ipcMain.handle('window:close', () => {
    mainWindow?.close();
  });
  ipcMain.handle('window:isMaximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  // App & Database Status
  ipcMain.handle('app:getStatus', async (): Promise<AppStatus> => {
    const isOnline = false; // Air-gapped offline guaranteed
    const dbPath = getDatabaseFilePath();
    const dbSize = getDatabaseSizeKb();

    return {
      isOffline: !isOnline,
      databasePath: dbPath,
      databaseSizeKb: dbSize,
      version: app.getVersion(),
      storagePath: storageDir,
      isPackaged: app.isPackaged
    };
  });

  // Course Queries & Progress
  ipcMain.handle('db:getCourses', () => getCourses());
  ipcMain.handle('db:getCourseById', (_event, id: string) => getCourseById(id));
  ipcMain.handle('db:getCourseProgress', (_event, courseId: string) => getCourseProgress(courseId));
  ipcMain.handle('db:getLessonsByModule', (_event, moduleId: string) => getLessonsByModule(moduleId));
  ipcMain.handle('db:getLessonById', (_event, lessonId: string) => getLessonById(lessonId));
  ipcMain.handle(
    'db:saveLessonProgress',
    (_event, lessonId: string, isCompleted: boolean, lastPositionSeconds: number, positionOnly?: boolean) =>
      saveLessonProgress(lessonId, isCompleted, lastPositionSeconds, positionOnly)
  );

  // Quiz Engine
  ipcMain.handle('db:getQuizByLessonId', (_event, lessonId: string) => getQuizByLessonId(lessonId));
  ipcMain.handle(
    'db:saveQuizAttempt',
    (_event, quizId: string, scorePercentage: number, passed: boolean, answersJson: string) =>
      saveQuizAttempt(quizId, scorePercentage, passed, answersJson)
  );
  ipcMain.handle('db:getQuizAttempts', (_event, quizId?: string) => getQuizAttempts(quizId));

  // Certificates & Learner Analytics
  ipcMain.handle('db:getCertificates', () => getCertificates());
  ipcMain.handle('db:getCertificateById', (_event, id: string) => getCertificateById(id));
  ipcMain.handle('db:saveCertificate', (_event, courseId: string, courseTitle?: string) =>
    saveCertificate(courseId, courseTitle)
  );
  ipcMain.handle('db:getLearnerStats', () => getLearnerStats());

  // Instructor Studio Mutations
  ipcMain.handle('db:createCourse', (_event, course) => createCourse(course));
  ipcMain.handle('db:updateCourse', (_event, course) => updateCourse(course));
  ipcMain.handle('db:deleteCourse', (_event, courseId: string) => deleteCourse(courseId));

  ipcMain.handle('db:createModule', (_event, mod) => createModule(mod));
  ipcMain.handle('db:updateModule', (_event, mod) => updateModule(mod));
  ipcMain.handle('db:deleteModule', (_event, moduleId: string) => deleteModule(moduleId));

  ipcMain.handle('db:createLesson', (_event, lesson) => createLesson(lesson));
  ipcMain.handle('db:updateLesson', (_event, lesson) => updateLesson(lesson));
  ipcMain.handle('db:deleteLesson', (_event, lessonId: string) => deleteLesson(lessonId));

  ipcMain.handle('db:saveQuizWithQuestions', (_event, quizData, questions) =>
    saveQuizWithQuestions(quizData, questions)
  );

  // Admin PIN Protection
  ipcMain.handle('db:verifyAdminPin', (_event, pin: string) => verifyAdminPin(pin));
  ipcMain.handle('db:changeAdminPin', (_event, oldPin: string, newPin: string) => changeAdminPin(oldPin, newPin));

  // Media file import and local disk persistence
  ipcMain.handle('media:importFile', async (_event, courseId: string, category: 'video' | 'pdf' | 'image') => {
    try {
      const filters: Electron.FileFilter[] =
        category === 'video'
          ? [{ name: 'Video Files (*.mp4, *.webm)', extensions: ['mp4', 'webm'] }]
          : category === 'pdf'
          ? [{ name: 'PDF Documents (*.pdf)', extensions: ['pdf'] }]
          : [{ name: 'Images (*.png, *.jpg, *.jpeg, *.webp)', extensions: ['png', 'jpg', 'jpeg', 'webp'] }];

      const result = await showOpenDialogSafe({
        title: `Select ${category.toUpperCase()} File`,
        properties: ['openFile'],
        filters
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      const sourcePath = result.filePaths[0];
      const fileName = path.basename(sourcePath);
      const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const folderName = courseId ? courseId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'general';
      const courseMediaDir = path.join(storageDir, 'media', folderName);
      if (!fs.existsSync(courseMediaDir)) {
        fs.mkdirSync(courseMediaDir, { recursive: true });
      }

      const destPath = path.join(courseMediaDir, safeName);
      fs.copyFileSync(sourcePath, destPath);

      const relativeMediaUrl = `app-media://${folderName}/${safeName}`;
      return {
        success: true,
        originalName: fileName,
        filePath: destPath,
        mediaUrl: relativeMediaUrl
      };
    } catch (err: any) {
      console.error('Error in media:importFile:', err);
      return { success: false, error: err.message };
    }
  });

  // Import media from direct disk path string
  ipcMain.handle('media:importFromPath', async (_event, courseId: string, rawPath: string, _category?: 'video' | 'pdf' | 'image') => {
    if (!rawPath || typeof rawPath !== 'string') {
      return { success: false, error: 'Path cannot be empty' };
    }

    const trimmed = rawPath.trim();
    if (
      trimmed.startsWith('app-media://') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('data:')
    ) {
      return { success: true, originalName: path.basename(trimmed) || trimmed, filePath: '', mediaUrl: trimmed };
    }

    // Clean up quotes and file:// scheme
    let cleanedPath = trimmed.replace(/^["']|["']$/g, '');
    if (cleanedPath.startsWith('file:///')) {
      cleanedPath = decodeURIComponent(cleanedPath.replace(/^file:\/\/\/?/, ''));
    }

    if (fs.existsSync(cleanedPath)) {
      try {
        const fileName = path.basename(cleanedPath);
        const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const folderName = courseId ? courseId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'general';
        const courseMediaDir = path.join(storageDir, 'media', folderName);
        if (!fs.existsSync(courseMediaDir)) {
          fs.mkdirSync(courseMediaDir, { recursive: true });
        }

        const destPath = path.join(courseMediaDir, safeName);
        fs.copyFileSync(cleanedPath, destPath);

        const relativeMediaUrl = `app-media://${folderName}/${safeName}`;
        return {
          success: true,
          originalName: fileName,
          filePath: destPath,
          mediaUrl: relativeMediaUrl
        };
      } catch (copyErr) {
        console.warn('Could not copy file into storage, returning direct path:', copyErr);
      }
    }

    // Fallback: accept direct path string so user is never blocked
    return {
      success: true,
      originalName: path.basename(cleanedPath) || cleanedPath,
      filePath: cleanedPath,
      mediaUrl: cleanedPath
    };
  });

  // Course Ingestion & Export (.i3dpack)
  ipcMain.handle('course:installPackage', async (_event, packagePath?: string) => {
    let targetPath = packagePath;
    if (!targetPath) {
      const result = await showOpenDialogSafe({
        title: 'Install Infinyt 3D Offline Course Package (.i3dpack)',
        buttonLabel: 'Install Package',
        filters: [{ name: 'Infinyt 3D Course Package (*.i3dpack, *.zip)', extensions: ['i3dpack', 'zip'] }],
        properties: ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, message: 'Package selection cancelled' };
      }
      targetPath = result.filePaths[0];
    }
    return installCoursePackage(targetPath, storageDir);
  });

  ipcMain.handle('course:exportPackage', async (_event, courseId: string, destinationPath?: string) => {
    let targetPath = destinationPath;
    if (!targetPath) {
      const course = getCourseById(courseId);
      const defaultName = `${(course?.title || 'course').replace(/[^a-z0-9]/gi, '_')}.i3dpack`;
      const result = await showSaveDialogSafe({
        title: 'Export Course to USB Drive (.i3dpack)',
        defaultPath: defaultName,
        filters: [{ name: 'Infinyt 3D Course Package', extensions: ['i3dpack'] }]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, message: 'Export destination cancelled' };
      }
      targetPath = result.filePath;
    }
    return exportCoursePackage(courseId, targetPath, storageDir);
  });

  // Certificate PDF Generation
  ipcMain.handle('certificate:generatePdf', async (_event, certificateId: string, destinationPath?: string) => {
    const cert = getCertificateById(certificateId);
    if (!cert) return { success: false, error: 'Certificate not found' };

    let targetPath = destinationPath;
    if (!targetPath) {
      const defaultName = `Infinyt3D_Certificate_${cert.verification_hash.slice(-8)}.pdf`;
      const result = await showSaveDialogSafe({
        title: 'Save Engineering Certificate PDF',
        defaultPath: defaultName,
        filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Export cancelled' };
      }
      targetPath = result.filePath;
    }
    return generateCertificatePdf(cert, targetPath);
  });

  // File picker helper
  ipcMain.handle('dialog:selectFile', async (_event, filters?: Electron.FileFilter[]) => {
    const result = await showOpenDialogSafe({
      properties: ['openFile'],
      filters: filters || [{ name: 'All Files', extensions: ['*'] }]
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('dialog:saveFile', async (_event, defaultName: string, filters?: Electron.FileFilter[]) => {
    const result = await showSaveDialogSafe({
      defaultPath: defaultName,
      filters: filters || [{ name: 'All Files', extensions: ['*'] }]
    });
    return result.canceled ? null : result.filePath;
  });
}
