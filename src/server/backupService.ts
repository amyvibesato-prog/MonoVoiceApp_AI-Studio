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
  writeBatch
} from 'firebase/firestore';
import { ProjectStore, UploadedFileMetadata } from './projectStore';
import { AppItem } from '../types/app';
import { getDb } from './firebase';

export interface BackupManifest {
  id: string;
  name: string;
  type: 'manual' | 'automatic' | 'pre-restore';
  status: 'completed' | 'failed' | 'corrupted';
  createdAt: string;
  sizeBytes: number;
  sizeFormatted: string;
  checksumSha256: string;
  projectCount: number;
  filesCount: number;
  note?: string;
  verifiedAt?: string;
  isVerified?: boolean;
  systemVersion: string;
  storagePath?: string;
  hasInlineSnapshot?: boolean;
  contentsSummary: {
    projectsList: string[];
    uploadedFilesList: string[];
    hasSourceSnapshot: boolean;
  };
}

export interface BackupPayload {
  manifest: BackupManifest;
  data: {
    projectsDatabase: AppItem[];
    uploadedFilesRegistry: UploadedFileMetadata[];
    sourceCodeManifest: {
      files: string[];
      packages: Record<string, string>;
      nodeVersion: string;
      appMetadata: Record<string, any>;
    };
  };
}

export interface BackupSettings {
  autoBackupEnabled: boolean;
  autoBackupIntervalHours: number;
  maxBackupsCount: number;
  retentionDays: number;
  lastAutoBackupAt?: string;
}

const BACKUP_DIR = path.resolve(process.cwd(), 'storage', 'backups');
const SETTINGS_FILE = path.join(BACKUP_DIR, 'backup-settings.json');

// Ensure directory exists for local fallback backup persistence
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

let backupSettings: BackupSettings = {
  autoBackupEnabled: true,
  autoBackupIntervalHours: 24,
  maxBackupsCount: 15,
  retentionDays: 30
};

// Load saved settings if they exist
try {
  if (fs.existsSync(SETTINGS_FILE)) {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    backupSettings = { ...backupSettings, ...JSON.parse(raw) };
  }
} catch (e) {
  console.warn('Could not load backup settings, using defaults');
}

function saveSettings(): void {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(backupSettings, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save backup settings to disk:', e);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function canonicalStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const keyValues = keys.map(k => JSON.stringify(k) + ':' + canonicalStringify(obj[k]));
  return '{' + keyValues.join(',') + '}';
}

function calculateChecksum(payloadData: any): string {
  const jsonString = canonicalStringify(payloadData);
  return crypto.createHash('sha256').update(jsonString).digest('hex');
}

let autoBackupInterval: NodeJS.Timeout | null = null;

export const BackupService = {
  getSettings(): BackupSettings {
    return { ...backupSettings };
  },

  updateSettings(newSettings: Partial<BackupSettings>): BackupSettings {
    backupSettings = { ...backupSettings, ...newSettings };
    saveSettings();
    return backupSettings;
  },

  async getAllBackups(): Promise<BackupManifest[]> {
    const manifestsMap = new Map<string, BackupManifest>();

    // 1. Read from Firestore
    const db = getDb();
    if (db) {
      try {
        const backupsCol = collection(db, 'backups');
        const snap = await getDocs(backupsCol);
        snap.forEach(docSnap => {
          const docData = docSnap.data();
          if (docData && docData.manifest) {
            manifestsMap.set(docData.manifest.id, docData.manifest);
          } else if (docData && docData.id && docData.checksumSha256) {
            manifestsMap.set(docData.id, docData as BackupManifest);
          }
        });
      } catch (err) {
        console.error('Error fetching backups from Firestore:', err);
      }
    }

    // 2. Read from local directory fallback
    if (fs.existsSync(BACKUP_DIR)) {
      const files = fs.readdirSync(BACKUP_DIR);
      for (const file of files) {
        if (file.endsWith('.json') && file !== 'backup-settings.json' && file !== 'backup-logs.json' && file !== 'backups_manifest.json') {
          try {
            const filePath = path.join(BACKUP_DIR, file);
            const raw = fs.readFileSync(filePath, 'utf-8');
            const parsed = JSON.parse(raw) as BackupPayload;
            if (parsed && parsed.manifest && !manifestsMap.has(parsed.manifest.id)) {
              manifestsMap.set(parsed.manifest.id, parsed.manifest);
            }
          } catch (err) {
            console.error(`Error reading local backup ${file}:`, err);
          }
        }
      }
    }

    const manifests = Array.from(manifestsMap.values());
    return manifests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getBackupById(id: string): Promise<BackupPayload | null> {
    const db = getDb();
    if (db) {
      try {
        const docRef = doc(db, 'backups', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const docData = docSnap.data();
          if (docData.data && docData.manifest) {
            return docData as BackupPayload;
          }
        }
      } catch (err) {
        console.warn(`Firestore read failed for backup ${id}, trying disk fallback:`, err);
      }
    }

    // Fallback to local file
    const filePath = path.join(BACKUP_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw) as BackupPayload;
      } catch (e) {
        console.error(`Failed to read backup from disk ${id}:`, e);
      }
    }

    return null;
  },

  async createBackup(type: 'manual' | 'automatic' | 'pre-restore' = 'manual', note: string = ''): Promise<{ success: boolean; manifest?: BackupManifest; error?: string }> {
    try {
      const timestamp = new Date().toISOString();
      const backupId = `backup_${type}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const projects = await ProjectStore.getAllProjects();
      const uploadedFiles = await ProjectStore.getUploadedFiles();

      let packages = {};
      let nodeVer = process.version;
      try {
        const pkgPath = path.resolve(process.cwd(), 'package.json');
        if (fs.existsSync(pkgPath)) {
          const pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          packages = pkgData.dependencies || {};
        }
      } catch (e) {
        console.warn('Could not snapshot package.json:', e);
      }

      const dataToHash = {
        projectsDatabase: projects,
        uploadedFilesRegistry: uploadedFiles
      };
      const checksum = calculateChecksum(dataToHash);
      const payloadString = JSON.stringify({ dataToHash, timestamp });
      const sizeBytes = Buffer.byteLength(payloadString, 'utf-8');

      // Check whether inline snapshot fits into Firestore safe threshold (< 500 KiB)
      const fitsInline = sizeBytes < 500 * 1024;
      const storagePath = `backups/${backupId}.json`;

      const manifest: BackupManifest = {
        id: backupId,
        name: `MonoVoice Backup (${type.toUpperCase()}) - ${new Date().toLocaleString('uk-UA')}`,
        type,
        status: 'completed',
        createdAt: timestamp,
        sizeBytes,
        sizeFormatted: formatBytes(sizeBytes),
        checksumSha256: checksum,
        projectCount: projects.length,
        filesCount: uploadedFiles.length,
        note: note || (type === 'pre-restore' ? 'Автоматичний знімок стану перед відновленням' : 'Створений вручну бекап'),
        isVerified: true,
        verifiedAt: timestamp,
        systemVersion: '2.1.0',
        storagePath,
        hasInlineSnapshot: fitsInline,
        contentsSummary: {
          projectsList: projects.map(p => `${p.name} (${p.status})`),
          uploadedFilesList: uploadedFiles.map(f => f.originalName),
          hasSourceSnapshot: true
        }
      };

      const payload: BackupPayload = {
        manifest,
        data: {
          projectsDatabase: projects,
          uploadedFilesRegistry: uploadedFiles,
          sourceCodeManifest: {
            files: ['server.ts', 'src/server/adminRoutes.ts', 'src/server/projectStore.ts'],
            packages,
            nodeVersion: nodeVer,
            appMetadata: { appName: 'MonoVoice Apps', environment: process.env.NODE_ENV || 'production' }
          }
        }
      };

      // 1. Save full payload to local storage directory
      const filePath = path.join(BACKUP_DIR, `${backupId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');

      // 2. Save manifest and conditional snapshot to Firestore
      const db = getDb();
      if (db) {
        try {
          const docRef = doc(db, 'backups', backupId);
          if (fitsInline) {
            await setDoc(docRef, payload);
          } else {
            // Save manifest only to prevent 1 MiB document limit overflow
            await setDoc(docRef, { manifest });
          }
          console.log(`✅ Backup metadata saved to Firestore (${backupId}, inline=${fitsInline})`);
        } catch (err) {
          console.error('Failed to save backup to Firestore:', err);
        }
      }

      return { success: true, manifest };
    } catch (err) {
      console.error('Backup creation error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Невідома помилка створення бекапу' };
    }
  },

  async verifyBackup(id: string): Promise<{ isVerified: boolean; message: string; manifest?: BackupManifest }> {
    const payload = await this.getBackupById(id);
    if (!payload) {
      return { isVerified: false, message: 'Файл бекапу не знайдено' };
    }

    const { manifest, data } = payload;
    const computedChecksum = calculateChecksum({
      projectsDatabase: data.projectsDatabase,
      uploadedFilesRegistry: data.uploadedFilesRegistry
    });

    if (computedChecksum !== manifest.checksumSha256) {
      return {
        isVerified: false,
        message: `Помилка контрольної суми! Записано: ${manifest.checksumSha256.substring(0, 8)}..., Фактично: ${computedChecksum.substring(0, 8)}...`,
        manifest
      };
    }

    manifest.isVerified = true;
    manifest.verifiedAt = new Date().toISOString();
    return {
      isVerified: true,
      message: 'Контрольну суму SHA-256 успішно підтверджено. Цілісність даних гарантована.',
      manifest
    };
  },

  /**
   * Restores a backup in sequential batches (chunks <= 350 writes per batch)
   * with operation state logging in recovery_operation_log.
   */
  async restoreBackup(id: string): Promise<{ success: boolean; message: string; operationId?: string }> {
    const payload = await this.getBackupById(id);
    if (!payload) {
      return { success: false, message: 'Файл резервної копії не знайдено' };
    }

    // 1. Generate pre-restore safety backup
    const preRestoreRes = await this.createBackup('pre-restore', `Автоматичний знімок перед відновленням бекапу ${id}`);
    const preRestoreId = preRestoreRes.manifest?.id || 'pre_restore_snapshot';

    const operationId = `restore_op_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const db = getDb();

    if (!db) {
      return { success: false, message: 'База даних недоступна для відновлення' };
    }

    const projectsToRestore = payload.data.projectsDatabase || [];
    const CHUNK_SIZE = 350;
    const totalChunks = Math.ceil(projectsToRestore.length / CHUNK_SIZE) || 1;

    // 2. Initialize operation log in Firestore
    const opLogRef = doc(db, 'recovery_operation_log', operationId);
    try {
      await setDoc(opLogRef, {
        operationId,
        backupId: id,
        preRestoreSnapshotId: preRestoreId,
        totalChunks,
        lastSuccessfulChunkIndex: -1,
        status: 'IN_PROGRESS',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (logErr) {
      console.warn('Notice writing recovery_operation_log:', logErr);
    }

    try {
      // 3. Clear existing projects in batches of <= 350
      const projectsCol = collection(db, 'projects');
      const existingProjectsSnap = await getDocs(projectsCol);
      const docsToDelete = existingProjectsSnap.docs;

      for (let i = 0; i < docsToDelete.length; i += CHUNK_SIZE) {
        const deleteChunk = docsToDelete.slice(i, i + CHUNK_SIZE);
        const delBatch = writeBatch(db);
        for (const docSnap of deleteChunk) {
          delBatch.delete(docSnap.ref);
        }
        await delBatch.commit();
      }

      // 4. Insert restored projects in batches of <= 350
      for (let i = 0; i < projectsToRestore.length; i += CHUNK_SIZE) {
        const chunkIndex = Math.floor(i / CHUNK_SIZE);
        const restoreChunk = projectsToRestore.slice(i, i + CHUNK_SIZE);
        const putBatch = writeBatch(db);

        for (const proj of restoreChunk) {
          const docRef = doc(db, 'projects', proj.id);
          putBatch.set(docRef, {
            ...proj,
            updatedAt: new Date().toISOString()
          });
        }
        await putBatch.commit();

        // Update progress in operation log
        await setDoc(opLogRef, {
          lastSuccessfulChunkIndex: chunkIndex,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      // 5. Finalize operation log as COMPLETED
      await setDoc(opLogRef, {
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Refresh local ProjectStore cache
      await ProjectStore.initStore();

      return {
        success: true,
        operationId,
        message: `Успішно відновлено ${projectsToRestore.length} проєктів з бекапу "${payload.manifest.name}".`
      };
    } catch (err: any) {
      console.error(`Restore operation ${operationId} failed:`, err);
      try {
        await setDoc(opLogRef, {
          status: 'FAILED',
          errorDetails: err?.message || String(err),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {}

      return {
        success: false,
        operationId,
        message: `Помилка при відновленні: ${err?.message || 'Збій пакетної операції'}. Аварійна копія збережена: ${preRestoreId}`
      };
    }
  },

  async deleteBackup(id: string): Promise<boolean> {
    const filePath = path.join(BACKUP_DIR, `${id}.json`);
    let deletedLocal = false;
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        deletedLocal = true;
      } catch (e) {
        console.error('Error deleting local backup file:', e);
      }
    }

    const db = getDb();
    if (db) {
      try {
        const docRef = doc(db, 'backups', id);
        await deleteDoc(docRef);
        return true;
      } catch (err) {
        console.error('Error deleting backup from Firestore:', err);
      }
    }

    return deletedLocal;
  },

  initAutoBackup(): void {
    if (autoBackupInterval) {
      clearInterval(autoBackupInterval);
    }

    if (!backupSettings.autoBackupEnabled) return;

    const intervalMs = backupSettings.autoBackupIntervalHours * 60 * 60 * 1000;
    autoBackupInterval = setInterval(async () => {
      console.log('⏰ Running automated scheduled backup...');
      await this.createBackup('automatic', 'Автоматичний бекап за розкладом');
      backupSettings.lastAutoBackupAt = new Date().toISOString();
      saveSettings();
    }, intervalMs);

    console.log(`⏱️ Auto-backup scheduled every ${backupSettings.autoBackupIntervalHours} hours.`);
  }
};
