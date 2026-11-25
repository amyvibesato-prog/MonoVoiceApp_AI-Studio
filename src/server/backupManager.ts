import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_DIR = path.resolve(__dirname, '../../storage');
const BACKUPS_DIR = path.join(STORAGE_DIR, 'backups');
const MANIFEST_FILE = path.join(BACKUPS_DIR, 'backups_manifest.json');
const AUDIT_LOG_FILE = path.join(STORAGE_DIR, 'admin_audit_log.json');

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  ip: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
}

export interface BackupManifestEntry {
  id: string;
  filename: string;
  createdAt: string;
  trigger: string;
  sizeBytes: number;
  sha256: string;
  status: 'VERIFIED' | 'CORRUPTED';
  contents: {
    projectsCount: number;
    publicFilesCount: number;
    privateFilesCount: number;
    includesConfig: boolean;
    includesAuditLog: boolean;
  };
}

function ensureBackupDirs() {
  [STORAGE_DIR, BACKUPS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

export interface AuditLogContext {
  projectId?: string;
  method?: string;
  endpoint?: string;
  userAgent?: string;
}

export function writeAuditLog(
  action: string,
  details: string,
  status: "SUCCESS" | "WARNING" | "FAILED" = "SUCCESS",
  ip: string = "server",
  context?: AuditLogContext
): AuditLogEntry {
  ensureBackupDirs();
  const safeDetails = (details || "").replace(/(password|token|secret|cookie|key)=[^&\s]+/gi, "$1=[REDACTED]");
  const entry: AuditLogEntry = {
    id: `log_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    timestamp: new Date().toISOString(),
    action,
    details: safeDetails,
    ip,
    status,
    ...(context?.projectId ? { projectId: context.projectId } : {}),
    ...(context?.method ? { method: context.method } : {}),
    ...(context?.endpoint ? { endpoint: context.endpoint } : {}),
    ...(context?.userAgent ? { userAgent: context.userAgent.substring(0, 150) } : {})
  };

  let logs: AuditLogEntry[] = [];
  if (fs.existsSync(AUDIT_LOG_FILE)) {
    try {
      logs = JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, 'utf8'));
    } catch (_) {
      logs = [];
    }
  }

  logs.unshift(entry);
  if (logs.length > 200) {
    logs = logs.slice(0, 200);
  }

  fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(logs, null, 2), 'utf8');
  return entry;
}

export function getAuditLogs(): AuditLogEntry[] {
  ensureBackupDirs();
  if (!fs.existsSync(AUDIT_LOG_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, 'utf8'));
  } catch (_) {
    return [];
  }
}

function readManifest(): BackupManifestEntry[] {
  ensureBackupDirs();
  if (!fs.existsSync(MANIFEST_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  } catch (_) {
    return [];
  }
}

function writeManifest(manifest: BackupManifestEntry[]) {
  ensureBackupDirs();
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
}

function calculateSHA256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

export function createFullBackup(triggerName: string, ip: string = 'system'): { success: boolean; backup?: BackupManifestEntry; error?: string } {
  ensureBackupDirs();
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const safeTrigger = triggerName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const backupFilename = `monovoice_backup_${timestamp}_${safeTrigger}.tar.gz`;
  const backupPath = path.join(BACKUPS_DIR, backupFilename);

  try {
    const projectsPath = path.join(STORAGE_DIR, 'projects.json');
    let projectsCount = 0;
    if (fs.existsSync(projectsPath)) {
      try {
        const raw = fs.readFileSync(projectsPath, 'utf8');
        projectsCount = JSON.parse(raw).length;
      } catch (_) {}
    }

    const publicFilesDir = path.join(STORAGE_DIR, 'uploads/public');
    const privateFilesDir = path.join(STORAGE_DIR, 'uploads/private');
    const publicFilesCount = fs.existsSync(publicFilesDir) ? fs.readdirSync(publicFilesDir).length : 0;
    const privateFilesCount = fs.existsSync(privateFilesDir) ? fs.readdirSync(privateFilesDir).length : 0;

    const appletRootDir = path.resolve(__dirname, '../../');
    const tempArchivePath = path.join('/tmp', backupFilename);

    execSync(`tar --exclude='node_modules' --exclude='dist' --exclude='.git' --exclude='storage/backups' -czf "${tempArchivePath}" .`, {
      cwd: appletRootDir
    });

    fs.copyFileSync(tempArchivePath, backupPath);
    try { fs.unlinkSync(tempArchivePath); } catch (_) {}

    const stat = fs.statSync(backupPath);
    const sha256 = calculateSHA256(backupPath);

    const entry: BackupManifestEntry = {
      id: `bkp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      filename: backupFilename,
      createdAt: now.toISOString(),
      trigger: triggerName,
      sizeBytes: stat.size,
      sha256,
      status: 'VERIFIED',
      contents: {
        projectsCount,
        publicFilesCount,
        privateFilesCount,
        includesConfig: true,
        includesAuditLog: true
      }
    };

    const manifest = readManifest();
    manifest.unshift(entry);

    if (manifest.length > 10) {
      const toRemove = manifest.slice(10);
      manifest.splice(10);
      toRemove.forEach(item => {
        const oldPath = path.join(BACKUPS_DIR, item.filename);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (_) {}
        }
      });
    }

    writeManifest(manifest);
    writeAuditLog('CREATE_BACKUP', `Створено повну резервну копію: ${backupFilename} (${(stat.size / (1024 * 1024)).toFixed(2)} MB, SHA256: ${sha256.substring(0, 10)}...)`, 'SUCCESS', ip);

    return { success: true, backup: entry };
  } catch (err: any) {
    const errorMsg = err.message || 'Невідома помилка при створенні бекапу';
    writeAuditLog('CREATE_BACKUP_FAILED', `Помилка створення бекапу: ${errorMsg}`, 'FAILED', ip);
    return { success: false, error: errorMsg };
  }
}

export function getBackupList(): BackupManifestEntry[] {
  ensureBackupDirs();
  const manifest = readManifest();

  return manifest.map(entry => {
    const filePath = path.join(BACKUPS_DIR, entry.filename);
    if (!fs.existsSync(filePath)) {
      return { ...entry, status: 'CORRUPTED' as const };
    }

    try {
      const currentHash = calculateSHA256(filePath);
      const isMatch = currentHash === entry.sha256;
      return { ...entry, status: isMatch ? ('VERIFIED' as const) : ('CORRUPTED' as const) };
    } catch (_) {
      return { ...entry, status: 'CORRUPTED' as const };
    }
  });
}

export function restoreFullBackup(backupFilename: string, ip: string = 'system'): { success: boolean; message?: string; error?: string } {
  ensureBackupDirs();
  const safeFilename = path.basename(backupFilename);
  const backupPath = path.join(BACKUPS_DIR, safeFilename);

  if (!fs.existsSync(backupPath)) {
    writeAuditLog('RESTORE_FAILED', `Спроба відновлення з неіснуючого бекапу: ${safeFilename}`, 'FAILED', ip);
    return { success: false, error: 'Файл резервної копії не знайдено' };
  }

  const manifest = readManifest();
  const manifestEntry = manifest.find(m => m.filename === safeFilename);
  if (manifestEntry) {
    const currentHash = calculateSHA256(backupPath);
    if (currentHash !== manifestEntry.sha256) {
      writeAuditLog('RESTORE_FAILED', `Порушення цілісності SHA-256 для бекапу ${safeFilename}`, 'FAILED', ip);
      return { success: false, error: 'Помилка цілісності (SHA-256 Checksum Mismatch). Файл пошкоджений.' };
    }
  }

  const emergencyRes = createFullBackup('pre_restore_emergency', ip);
  if (!emergencyRes.success) {
    return { success: false, error: 'Не вдалося створити аварійну копію перед відновленням' };
  }

  const appletRootDir = path.resolve(__dirname, '../../');

  try {
    execSync(`tar -xzf "${backupPath}" -C "${appletRootDir}"`, {
      cwd: appletRootDir
    });

    writeAuditLog('RESTORE_SUCCESS', `Успішно відновлено всі дані та проєкти з резервної копії: ${safeFilename}`, 'SUCCESS', ip);
    return { success: true, message: 'Данні та файл проєктів успішно відновлено' };
  } catch (err: any) {
    writeAuditLog('RESTORE_ERROR', `Збій відновлення! Виконується автоматичний відкат до аварійної копії...`, 'FAILED', ip);

    if (emergencyRes.backup?.filename) {
      try {
        const emergencyPath = path.join(BACKUPS_DIR, emergencyRes.backup.filename);
        execSync(`tar -xzf "${emergencyPath}" -C "${appletRootDir}"`, { cwd: appletRootDir });
      } catch (_) {}
    }

    return { success: false, error: `Помилка під час відновлення: ${err.message || 'Збій розархівації'}. Виконано безпечний відкат.` };
  }
}
