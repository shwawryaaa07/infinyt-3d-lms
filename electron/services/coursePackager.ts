import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import type { Course, PackageResult } from '../../src/types/electron.d.ts';
import {
  getCourseById,
  createCourse,
  createModule,
  createLesson,
  saveQuizWithQuestions,
  saveDatabaseToFile
} from '../db/index.js';

export async function exportCoursePackage(
  courseId: string,
  destinationPath: string,
  storageDir: string
): Promise<PackageResult> {
  try {
    const course = getCourseById(courseId);
    if (!course) {
      return { success: false, error: `Course with ID ${courseId} not found` };
    }

    const zip = new AdmZip();

    // Manifest metadata
    const manifest = {
      formatVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        thumbnail_path: course.thumbnail_path,
        category: course.category,
        difficulty: course.difficulty,
        sort_order: course.sort_order,
        modules: course.modules
      }
    };

    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));

    // Check if there are local media assets to include
    const mediaDir = path.join(storageDir, 'media');
    if (fs.existsSync(mediaDir)) {
      // Find referenced media files
      const referencedMedia: string[] = [];
      course.modules?.forEach((m) => {
        m.lessons?.forEach((l) => {
          if (l.media_path && !l.media_path.startsWith('http')) {
            const cleanPath = l.media_path.replace('app-media://', '').replace(/^\/+/, '');
            referencedMedia.push(cleanPath);
          }
        });
      });

      referencedMedia.forEach((relPath) => {
        const fullPath = path.join(mediaDir, relPath);
        if (fs.existsSync(fullPath)) {
          const zipEntryDir = path.dirname(relPath);
          zip.addLocalFile(fullPath, path.join('media', zipEntryDir === '.' ? '' : zipEntryDir));
        }
      });
    }

    zip.writeZip(destinationPath);

    return {
      success: true,
      filePath: destinationPath,
      courseId: course.id,
      message: `Successfully packaged course '${course.title}' to ${destinationPath}`
    };
  } catch (err: any) {
    console.error('Error exporting course package:', err);
    return { success: false, error: err.message || 'Unknown export error' };
  }
}

export async function installCoursePackage(
  packagePath: string,
  storageDir: string
): Promise<PackageResult> {
  try {
    if (!fs.existsSync(packagePath)) {
      return { success: false, error: `Package file not found at ${packagePath}` };
    }

    const zip = new AdmZip(packagePath);
    const manifestEntry = zip.getEntry('manifest.json');

    if (!manifestEntry) {
      return { success: false, error: 'Invalid .i3dpack package: Missing manifest.json in root of archive.' };
    }

    const rawManifest = zip.readAsText(manifestEntry);
    const cleanManifest = rawManifest.replace(/^\uFEFF/, '').trim();
    const manifest = JSON.parse(cleanManifest);
    const courseData = (manifest.course || manifest) as Course;

    if (!courseData || !courseData.title) {
      return { success: false, error: 'Invalid manifest format: Course title or metadata missing.' };
    }

    // Extract all media files into storage/media/
    const mediaDir = path.join(storageDir, 'media');
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }

    zip.getEntries().forEach((entry) => {
      if (!entry.isDirectory && entry.entryName !== 'manifest.json') {
        const cleanName = entry.entryName.replace(/^media[/\\]/, '');
        const targetDiskPath = path.join(mediaDir, cleanName);
        const targetDir = path.dirname(targetDiskPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        fs.writeFileSync(targetDiskPath, entry.getData());
      }
    });

    // Check if course already exists by ID
    const existing = courseData.id ? getCourseById(courseData.id) : null;
    const finalCourseId = existing
      ? 'course_inj_' + Math.random().toString(36).substring(2, 9)
      : (courseData.id || 'crs_' + Math.random().toString(36).substring(2, 9));

    const baseSlug = (courseData.slug || courseData.title || 'course')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    // Insert course
    createCourse({
      id: finalCourseId,
      title: courseData.title + (existing ? ' (Imported)' : ''),
      slug: uniqueSlug,
      description: courseData.description || '',
      thumbnail_path: courseData.thumbnail_path || '',
      category: courseData.category || 'Industrial 3D Printing',
      difficulty: courseData.difficulty || 'Intermediate',
      is_inbuilt: 0,
      is_sequential: courseData.is_sequential ? 1 : 0,
      sort_order: courseData.sort_order || 1
    });

    // Insert modules and lessons
    if (courseData.modules && Array.isArray(courseData.modules)) {
      for (const m of courseData.modules) {
        const newMod = createModule({
          course_id: finalCourseId,
          title: m.title || 'Module',
          sort_order: m.sort_order || 1
        });

        if (m.lessons && Array.isArray(m.lessons)) {
          for (const l of m.lessons) {
            const newLes = createLesson({
              module_id: newMod.id,
              title: l.title || 'Lesson Unit',
              content_type: l.content_type || 'rich_text',
              content_body: l.content_body || '',
              media_path: l.media_path || '',
              duration_minutes: l.duration_minutes || 5,
              sort_order: l.sort_order || 1
            });

            if (l.content_type === 'quiz' && l.quiz) {
              saveQuizWithQuestions(
                {
                  lesson_id: newLes.id,
                  title: l.quiz.title || `${l.title} Assessment`,
                  passing_score: l.quiz.passing_score ?? 80,
                  time_limit_minutes: l.quiz.time_limit_minutes ?? 15,
                  shuffle_questions: l.quiz.shuffle_questions ?? 1
                },
                l.quiz.questions || []
              );
            }
          }
        }
      }
    }

    saveDatabaseToFile();

    return {
      success: true,
      courseId: finalCourseId,
      message: `Successfully installed '${courseData.title}' from .i3dpack package.`
    };
  } catch (err: any) {
    console.error('Error importing course package:', err);
    return { success: false, error: err.message || 'Unknown error occurred while installing course package.' };
  }
}
