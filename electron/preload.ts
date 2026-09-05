import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../src/types/electron.d.ts';

const api: ElectronAPI = {
  // App Status
  getAppStatus: () => ipcRenderer.invoke('app:getStatus'),

  // Courses & Progress (no userId — single learner)
  getCourses: () => ipcRenderer.invoke('db:getCourses'),
  getCourseById: (courseId) => ipcRenderer.invoke('db:getCourseById', courseId),
  getCourseProgress: (courseId) => ipcRenderer.invoke('db:getCourseProgress', courseId),
  getLessonsByModule: (moduleId) => ipcRenderer.invoke('db:getLessonsByModule', moduleId),
  getLessonById: (lessonId) => ipcRenderer.invoke('db:getLessonById', lessonId),
  saveLessonProgress: (lessonId, isCompleted, lastPositionSeconds, positionOnly) =>
    ipcRenderer.invoke('db:saveLessonProgress', lessonId, isCompleted, lastPositionSeconds, positionOnly),
  getQuizByLessonId: (lessonId) => ipcRenderer.invoke('db:getQuizByLessonId', lessonId),
  saveQuizAttempt: (quizId, scorePercentage, passed, answersJson) =>
    ipcRenderer.invoke('db:saveQuizAttempt', quizId, scorePercentage, passed, answersJson),
  getQuizAttempts: (quizId) => ipcRenderer.invoke('db:getQuizAttempts', quizId),
  getCertificates: () => ipcRenderer.invoke('db:getCertificates'),
  saveCertificate: (courseId, courseTitle) => ipcRenderer.invoke('db:saveCertificate', courseId, courseTitle),
  getLearnerStats: () => ipcRenderer.invoke('db:getLearnerStats'),

  // Instructor Studio
  createCourse: (course) => ipcRenderer.invoke('db:createCourse', course),
  updateCourse: (course) => ipcRenderer.invoke('db:updateCourse', course),
  deleteCourse: (courseId) => ipcRenderer.invoke('db:deleteCourse', courseId),
  createModule: (mod) => ipcRenderer.invoke('db:createModule', mod),
  updateModule: (mod) => ipcRenderer.invoke('db:updateModule', mod),
  deleteModule: (moduleId) => ipcRenderer.invoke('db:deleteModule', moduleId),
  createLesson: (lesson) => ipcRenderer.invoke('db:createLesson', lesson),
  updateLesson: (lesson) => ipcRenderer.invoke('db:updateLesson', lesson),
  deleteLesson: (lessonId) => ipcRenderer.invoke('db:deleteLesson', lessonId),
  saveQuizWithQuestions: (quiz, questions) => ipcRenderer.invoke('db:saveQuizWithQuestions', quiz, questions),

  // Packaging & Media
  importMediaFile: (courseId, category) => ipcRenderer.invoke('media:importFile', courseId, category),
  importMediaFromPath: (courseId, rawPath, category) => ipcRenderer.invoke('media:importFromPath', courseId, rawPath, category),
  installCoursePackage: (packagePath) => ipcRenderer.invoke('course:installPackage', packagePath),
  exportCoursePackage: (courseId, destinationPath) => ipcRenderer.invoke('course:exportPackage', courseId, destinationPath),

  // Certificates
  generateCertificatePdf: (certificateId, destinationPath) =>
    ipcRenderer.invoke('certificate:generatePdf', certificateId, destinationPath),

  // Admin PIN
  verifyAdminPin: (pin) => ipcRenderer.invoke('db:verifyAdminPin', pin),
  changeAdminPin: (oldPin, newPin) => ipcRenderer.invoke('db:changeAdminPin', oldPin, newPin),

  // File dialog
  selectFile: (filters) => ipcRenderer.invoke('dialog:selectFile', filters),
  saveFile: (defaultName, filters) => ipcRenderer.invoke('dialog:saveFile', defaultName, filters),

  // Window Controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized')
};

contextBridge.exposeInMainWorld('electronAPI', api);
