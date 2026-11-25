export interface BackupManifestItem {
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

export interface AuditLogItem {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  ip: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  projectId?: string;
  method?: string;
  endpoint?: string;
  userAgent?: string;
}

export async function fetchBackups(): Promise<BackupManifestItem[]> {
  try {
    const res = await fetch('/api/admin/backups', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch backups:', e);
    return [];
  }
}

export async function createBackupApi(trigger: string = 'manual_admin'): Promise<{ success: boolean; backup?: BackupManifestItem; error?: string }> {
  try {
    const res = await fetch('/api/admin/backups/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ trigger })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Не вдалося створити резервну копію' };
    }
    return data;
  } catch (e) {
    return { success: false, error: 'Помилка мережі при створенні резервної копії' };
  }
}

export async function restoreBackupApi(backupFilename: string, sudoPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/admin/backups/restore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ backupFilename, sudoPassword })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Не вдалося відновити з резервної копії' };
    }
    return data;
  } catch (e) {
    return { success: false, error: 'Помилка з’єднання при відновленні з резервної копії' };
  }
}

export async function fetchAuditLogs(): Promise<AuditLogItem[]> {
  try {
    const res = await fetch('/api/admin/audit-logs', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
}

export function getDownloadBackupUrl(filename: string): string {
  return `/api/admin/backups/download/${encodeURIComponent(filename)}`;
}
