import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  limit,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { AppItem, ProjectPublishStatus } from '../types/app';
import { APPS_DATA } from '../data/apps';
import { getDb } from './firebase';

// Local in-memory fallback cache
let projectsDatabaseCache: AppItem[] = [];

export interface UploadedFileMetadata {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  sizeFormatted: string;
  uploadedAt: string;
  url: string;
  usageLocation: string; // e.g., 'Icon', 'Screenshot', 'Binary Download', 'Private Archive'
  isPrivate: boolean;
}

const uploadedFilesRegistryCache: Map<string, UploadedFileMetadata> = new Map();

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

let isInitialized = false;
let lastProjectsFetchTime = 0;
const CACHE_TTL_MS = 5000; // 5-second in-memory cache to conserve Spark free-tier quotas

/**
 * Resilient async execution with retries for transient cloud operations
 */
async function withRetry<T>(operation: () => Promise<T>, retries = 2, delayMs = 250): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

/**
 * Removes undefined fields from objects before saving to Firestore
 */
function cleanFirestoreData<T extends Record<string, any>>(data: T): Partial<T> {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        cleaned[key] = cleanFirestoreData(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

export const ProjectStore = {
  /**
   * Initializes store, verifies Firestore connection, performs concurrency-safe seed migration if needed.
   */
  async initStore(): Promise<void> {
    if (isInitialized) return;

    const db = getDb();
    if (!db) {
      console.warn('⚠️ Firestore not available. Using local in-memory store fallback.');
      projectsDatabaseCache = [...APPS_DATA];
      isInitialized = true;
      return;
    }

    try {
      // 1. Concurrency-safe distributed lock via Firestore Transaction
      const lockRef = doc(db, 'system_settings', 'migration_lock');
      let shouldSeed = false;

      try {
        await runTransaction(db, async (tx) => {
          const lockSnap = await tx.get(lockRef);
          const lockData = lockSnap.data();

          if (lockData?.seed_completed === true) {
            shouldSeed = false;
            return;
          }

          if (lockData?.status === 'IN_PROGRESS') {
            const lockAgeMs = Date.now() - new Date(lockData.lockedAt || 0).getTime();
            // 10-minute timeout for stale locks
            if (lockAgeMs < 10 * 60 * 1000) {
              shouldSeed = false;
              return;
            }
          }

          // Acquire lock
          tx.set(lockRef, {
            status: 'IN_PROGRESS',
            lockedBy: process.env.K_REVISION || 'node_express_instance',
            lockedAt: new Date().toISOString()
          }, { merge: true });

          shouldSeed = true;
        });
      } catch (lockErr) {
        console.warn('Transaction lock check notice (proceeding to read cache):', lockErr);
      }

      // 2. Perform seed if lock was acquired
      if (shouldSeed) {
        console.log('📦 Acquired migration lock. Checking projects data to seed...');
        let sourceProjects: AppItem[] = [];

        // Check if local storage/projects.json exists first to preserve user modifications
        const projectsFile = path.resolve(process.cwd(), 'storage', 'projects.json');
        if (fs.existsSync(projectsFile)) {
          try {
            sourceProjects = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
            console.log(`📁 Loaded ${sourceProjects.length} projects from storage/projects.json for seed.`);
          } catch (e) {
            console.error('Error reading storage/projects.json, falling back to APPS_DATA:', e);
            sourceProjects = [...APPS_DATA];
          }
        } else {
          sourceProjects = [...APPS_DATA];
        }

        // Chunked batch commit (<= 350 writes per batch)
        const CHUNK_SIZE = 350;
        for (let i = 0; i < sourceProjects.length; i += CHUNK_SIZE) {
          const chunk = sourceProjects.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          for (const item of chunk) {
            const docRef = doc(db, 'projects', item.id);
            batch.set(docRef, {
              ...item,
              publishStatus: item.publishStatus || (item.status === 'available' || item.status === 'published' ? 'Published' : 'Draft'),
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString()
            }, { merge: true });
          }
          await batch.commit();
        }

        // Finalize lock as COMPLETED
        const finalizeBatch = writeBatch(db);
        finalizeBatch.set(lockRef, {
          seed_completed: true,
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
          seededCount: sourceProjects.length
        }, { merge: true });
        await finalizeBatch.commit();
        console.log(`✅ Successfully seeded ${sourceProjects.length} initial projects into Firestore with lock finalized.`);
      }

      // 3. Load Firestore projects into local cache
      const projectsCol = collection(db, 'projects');
      const freshSnap = await getDocs(projectsCol);
      const loadedProjects: AppItem[] = [];
      freshSnap.forEach(docSnap => {
        loadedProjects.push(docSnap.data() as AppItem);
      });

      if (loadedProjects.length > 0) {
        projectsDatabaseCache = loadedProjects;
        console.log(`🔥 Loaded ${projectsDatabaseCache.length} projects from Firestore into ProjectStore cache.`);
      } else if (projectsDatabaseCache.length === 0) {
        projectsDatabaseCache = [...APPS_DATA];
      }

      // 4. Load uploaded_files into cache
      try {
        const filesCol = collection(db, 'uploaded_files');
        const filesSnap = await getDocs(filesCol);
        filesSnap.forEach(docSnap => {
          const fileData = docSnap.data() as UploadedFileMetadata;
          uploadedFilesRegistryCache.set(fileData.id, fileData);
        });
      } catch (err) {
        console.warn('Notice loading uploaded_files:', err);
      }

      isInitialized = true;
    } catch (err) {
      console.error('❌ Error during ProjectStore Firestore initialization:', err);
      if (projectsDatabaseCache.length === 0) {
        projectsDatabaseCache = [...APPS_DATA];
      }
      isInitialized = true;
    }
  },

  /**
   * Returns all projects for administrative views with caching for Spark quota conservation.
   */
  async getAllProjects(): Promise<AppItem[]> {
    const now = Date.now();
    if (projectsDatabaseCache.length > 0 && now - lastProjectsFetchTime < CACHE_TTL_MS) {
      return [...projectsDatabaseCache];
    }

    const db = getDb();
    if (!db) return [...projectsDatabaseCache];

    try {
      const list = await withRetry(async () => {
        const projectsCol = collection(db, 'projects');
        const snap = await getDocs(projectsCol);
        const results: AppItem[] = [];
        snap.forEach(docSnap => {
          results.push(docSnap.data() as AppItem);
        });
        return results;
      });

      if (list.length > 0) {
        projectsDatabaseCache = list;
        lastProjectsFetchTime = now;
        // Keep storage/projects.json safely updated as offline mirror
        try {
          const projectsFile = path.resolve(process.cwd(), 'storage', 'projects.json');
          fs.writeFileSync(projectsFile, JSON.stringify(list, null, 2), 'utf8');
        } catch (mirrorErr) {
          console.warn('Notice syncing local projects storage mirror:', mirrorErr);
        }
      }
      return [...projectsDatabaseCache];
    } catch (err) {
      console.error('Failed to fetch all projects from Firestore, returning cache:', err);
      return [...projectsDatabaseCache];
    }
  },

  /**
   * Returns only published projects for public display.
   */
  async getPublishedProjects(): Promise<AppItem[]> {
    const all = await this.getAllProjects();
    return all.filter(p => p.publishStatus === 'Published' || p.status === 'available' || p.status === 'published');
  },

  /**
   * Retrieves single project by slug.
   */
  async getProjectBySlug(slug: string): Promise<AppItem | null> {
    if (!slug) return null;
    const all = await this.getAllProjects();
    const found = all.find(p => p.slug === slug);
    if (found) return found;

    const db = getDb();
    if (!db) return null;

    try {
      return await withRetry(async () => {
        const projectsCol = collection(db, 'projects');
        const q = query(projectsCol, where('slug', '==', slug), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        return snap.docs[0].data() as AppItem;
      });
    } catch (err) {
      console.error(`Failed to fetch project by slug "${slug}" from Firestore:`, err);
      return null;
    }
  },

  /**
   * Retrieves single project by ID.
   */
  async getProjectById(id: string): Promise<AppItem | null> {
    if (!id) return null;
    const all = await this.getAllProjects();
    const found = all.find(p => p.id === id);
    if (found) return found;

    const db = getDb();
    if (!db) return null;

    try {
      return await withRetry(async () => {
        const docRef = doc(db, 'projects', id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return null;
        return docSnap.data() as AppItem;
      });
    } catch (err) {
      console.error(`Failed to fetch project by id "${id}" from Firestore:`, err);
      return null;
    }
  },

  /**
   * Creates a new project in Firestore with data validation and retries.
   */
  async createProject(projectData: Partial<AppItem>): Promise<AppItem> {
    const name = (projectData.name || '').trim();
    if (!name) {
      throw new Error('Назва проєкту обов\'язкова');
    }

    const id = projectData.id || `proj_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    let slug = (projectData.slug || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!slug) {
      slug = `project-${Date.now()}`;
    }

    const newProject: AppItem = {
      id,
      slug,
      name,
      publishStatus: projectData.publishStatus || 'Draft',
      tagline: projectData.tagline || { uk: '', en: '' },
      description: projectData.description || { uk: '', en: '' },
      longDescription: projectData.longDescription || { uk: [''], en: [''] },
      iconType: projectData.iconType || 'file-text',
      customIconUrl: projectData.customIconUrl,
      platforms: projectData.platforms || ['Android'],
      category: projectData.category || 'Utility',
      status: projectData.status || 'in-development',
      version: projectData.version || '1.0.0',
      releaseDate: projectData.releaseDate || new Date().toISOString().split('T')[0],
      fileSize: projectData.fileSize || '5 MB',
      featured: Boolean(projectData.featured),
      download: projectData.download || {},
      github: projectData.github || 'https://github.com/monovoice',
      screenshots: projectData.screenshots || [],
      features: projectData.features || { uk: [], en: [] },
      requirements: projectData.requirements || { os: 'Cross-platform' },
      changelog: projectData.changelog || [
        {
          version: projectData.version || '1.0.0',
          date: new Date().toISOString().split('T')[0],
          changes: { uk: ['Початковий реліз'], en: ['Initial release'] }
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update in Firestore with retry
    const db = getDb();
    if (db) {
      await withRetry(async () => {
        const docRef = doc(db, 'projects', id);
        await setDoc(docRef, cleanFirestoreData(newProject));
        console.log(`✅ Project "${newProject.name}" (${id}) saved to Firestore.`);
      });
    }

    // Update local cache and mirror
    projectsDatabaseCache.unshift(newProject);
    lastProjectsFetchTime = Date.now();
    try {
      const projectsFile = path.resolve(process.cwd(), 'storage', 'projects.json');
      fs.writeFileSync(projectsFile, JSON.stringify(projectsDatabaseCache, null, 2), 'utf8');
    } catch (e) {
      console.warn('Notice saving storage/projects.json:', e);
    }

    return newProject;
  },

  /**
   * Updates an existing project in Firestore.
   */
  async updateProject(id: string, updates: Partial<AppItem>): Promise<AppItem | null> {
    const existing = await this.getProjectById(id);
    if (!existing) return null;

    const updated: AppItem = {
      ...existing,
      ...updates,
      id: existing.id, // Preserve ID
      updatedAt: new Date().toISOString()
    };

    const db = getDb();
    if (db) {
      await withRetry(async () => {
        const docRef = doc(db, 'projects', id);
        await setDoc(docRef, cleanFirestoreData(updated), { merge: true });
        console.log(`✅ Project "${updated.name}" (${id}) updated in Firestore.`);
      });
    }
    // Update local cache and mirror
    const idx = projectsDatabaseCache.findIndex(p => p.id === id);
    if (idx !== -1) {
      projectsDatabaseCache[idx] = updated;
    } else {
      projectsDatabaseCache.unshift(updated);
    }
    lastProjectsFetchTime = Date.now();

    try {
      const projectsFile = path.resolve(process.cwd(), 'storage', 'projects.json');
      fs.writeFileSync(projectsFile, JSON.stringify(projectsDatabaseCache, null, 2), 'utf8');
    } catch (e) {
      console.warn('Notice saving storage/projects.json:', e);
    }

    return updated;
  },

  /**
   * Updates publish status with corresponding development status mapping.
   */
  async updateProjectPublishStatus(id: string, publishStatus: ProjectPublishStatus): Promise<AppItem | null> {
    const statusMapping: Record<ProjectPublishStatus, string> = {
      'Published': 'available',
      'Draft': 'in-development',
      'Archived': 'archived'
    };

    return this.updateProject(id, {
      publishStatus,
      status: (statusMapping[publishStatus] || 'available') as any
    });
  },

  /**
   * Deletes a project from Firestore.
   */
  async deleteProject(id: string): Promise<boolean> {
    const initialLen = projectsDatabaseCache.length;
    projectsDatabaseCache = projectsDatabaseCache.filter(p => p.id !== id);
    lastProjectsFetchTime = Date.now();

    const db = getDb();
    if (db) {
      try {
        await withRetry(async () => {
          const docRef = doc(db, 'projects', id);
          await deleteDoc(docRef);
          console.log(`✅ Project (${id}) deleted from Firestore.`);
        });
      } catch (err) {
        console.error(`Failed to delete project ${id} from Firestore:`, err);
      }
    }

    try {
      const projectsFile = path.resolve(process.cwd(), 'storage', 'projects.json');
      fs.writeFileSync(projectsFile, JSON.stringify(projectsDatabaseCache, null, 2), 'utf8');
    } catch (e) {
      console.warn('Notice updating storage/projects.json after delete:', e);
    }

    return projectsDatabaseCache.length < initialLen;
  },

  /**
   * File registry methods
   */
  async registerUploadedFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    usageLocation: string = 'General',
    isPrivate: boolean = false
  ): Promise<{ success: boolean; file?: UploadedFileMetadata; error?: string }> {
    const MAX_SIZE = 50 * 1024 * 1024;
    if (fileBuffer.length > MAX_SIZE) {
      return { success: false, error: 'Перевищено максимальний дозволений розмір файлу (ліміт: 50 МБ)' };
    }

    const ext = path.extname(originalName).toLowerCase();
    const disallowedExts = ['.exe', '.bat', '.sh', '.php', '.phtml', '.js', '.vbs', '.py'];
    if (disallowedExts.includes(ext)) {
      return { success: false, error: `Завантаження файлів з розширенням ${ext} заборонено з міркувань безпеки` };
    }

    const sanitizedOriginal = originalName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const fileId = `file_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const storedName = `${fileId}${ext}`;

    const metadata: UploadedFileMetadata = {
      id: fileId,
      originalName: sanitizedOriginal,
      storedName,
      mimeType,
      sizeBytes: fileBuffer.length,
      sizeFormatted: formatBytes(fileBuffer.length),
      uploadedAt: new Date().toISOString(),
      url: isPrivate ? `/api/admin/downloads/private/${storedName}` : `/storage/uploads/public/${storedName}`,
      usageLocation,
      isPrivate
    };

    uploadedFilesRegistryCache.set(fileId, metadata);

    const db = getDb();
    if (db) {
      try {
        const fileRef = doc(db, 'uploaded_files', fileId);
        await setDoc(fileRef, metadata);
      } catch (err) {
        console.error(`Failed to save file metadata ${fileId} to Firestore:`, err);
      }
    }

    return { success: true, file: metadata };
  },

  async getUploadedFiles(): Promise<UploadedFileMetadata[]> {
    const db = getDb();
    if (!db) {
      return Array.from(uploadedFilesRegistryCache.values());
    }

    try {
      const filesCol = collection(db, 'uploaded_files');
      const snap = await getDocs(filesCol);
      const list: UploadedFileMetadata[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as UploadedFileMetadata);
      });
      return list;
    } catch (err) {
      console.error('Failed to fetch uploaded files from Firestore, returning cache:', err);
      return Array.from(uploadedFilesRegistryCache.values());
    }
  },

  async deleteUploadedFile(fileId: string): Promise<boolean> {
    uploadedFilesRegistryCache.delete(fileId);
    const db = getDb();
    if (db) {
      try {
        const fileRef = doc(db, 'uploaded_files', fileId);
        await deleteDoc(fileRef);
        return true;
      } catch (err) {
        console.error(`Failed to delete uploaded file ${fileId} from Firestore:`, err);
      }
    }
    return true;
  }
};
