import { createFullBackup, writeAuditLog } from './backupManager';

let schedulerInterval: NodeJS.Timeout | null = null;

export function initBackupScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  try {
    writeAuditLog('SCHEDULER_INIT', 'Автоматичний планувальник резервного копіювання ініціалізовано', 'SUCCESS');
  } catch (_) {}

  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  schedulerInterval = setInterval(() => {
    try {
      console.log('[BackupScheduler] Executing scheduled daily backup...');
      createFullBackup('scheduled_daily', 'scheduler');
    } catch (err: any) {
      console.error('[BackupScheduler] Scheduled backup error:', err);
      writeAuditLog('SCHEDULED_BACKUP_ERROR', `Помилка автоматичного резервування: ${err.message}`, 'FAILED');
    }
  }, TWENTY_FOUR_HOURS);
}
