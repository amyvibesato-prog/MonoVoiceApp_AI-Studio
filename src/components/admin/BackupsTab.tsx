import React, { useState, useEffect } from 'react';
import {
  Database,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
  Eye,
  RefreshCw,
  HardDrive,
  Clock,
  Settings,
  Lock,
  KeyRound,
  FileCode,
  Layers,
  Sparkles,
  Check,
  Copy,
  Info
} from 'lucide-react';
import { BackupManifest } from '../../server/backupService';
import { GuardCodeModal } from './GuardCodeModal';

interface BackupsTabProps {
  csrfToken: string;
}

export const BackupsTab: React.FC<BackupsTabProps> = ({ csrfToken }) => {
  const [backups, setBackups] = useState<BackupManifest[]>([]);
  const [settings, setSettings] = useState<{
    autoBackupEnabled: boolean;
    autoBackupIntervalHours: number;
    maxBackupsCount: number;
    retentionDays: number;
    lastAutoBackupAt?: string;
  }>({
    autoBackupEnabled: true,
    autoBackupIntervalHours: 24,
    maxBackupsCount: 15,
    retentionDays: 30
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Modals & Drawers state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createNote, setCreateNote] = useState('');
  
  const [selectedBackup, setSelectedBackup] = useState<BackupManifest | null>(null);
  const [backupDetailsModal, setBackupDetailsModal] = useState<any | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  const [restoreModalBackup, setRestoreModalBackup] = useState<BackupManifest | null>(null);
  const [sudoPassword, setSudoPassword] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // MonoVoice Guard (15-second Steam Guard) State
  const [guardModalOpen, setGuardModalOpen] = useState(false);
  const [guardPendingAction, setGuardPendingAction] = useState<{
    actionTitle: string;
    targetLabel: string;
    actionType: string;
    onExecute: (guardCode: string) => Promise<void>;
  } | null>(null);

  const fetchBackups = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/backups');
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
        if (data.settings) {
          setSettings(data.settings);
        }
      } else {
        setActionMessage({ type: 'error', text: 'Помилка завантаження списку резервних копій' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Зв\'язок із сервером втрачено' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setIsCreating(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({ type: 'manual', note: createNote })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ type: 'success', text: 'Резервну копію успішно створено та захищено SHA-256 контрольною сумою!' });
        setShowCreateModal(false);
        setCreateNote('');
        fetchBackups();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Не вдалося створити копію' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Мережева помилка при створенні резервної копії' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleVerifyBackup = async (id: string) => {
    setActionMessage({ type: 'info', text: 'Виконується перевірка цілісності та обчислення SHA-256 хешу...' });
    try {
      const res = await fetch(`/api/admin/backups/${id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        }
      });
      const data = await res.json();
      if (data.isVerified) {
        setActionMessage({ type: 'success', text: `✅ ${data.message}` });
        fetchBackups();
      } else {
        setActionMessage({ type: 'error', text: `⚠️ ${data.message}` });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Помилка під час виклику служби верифікації' });
    }
  };

  const handleViewDetails = async (backup: BackupManifest) => {
    setSelectedBackup(backup);
    setIsFetchingDetails(true);
    try {
      const res = await fetch(`/api/admin/backups/${backup.id}`);
      if (res.ok) {
        const data = await res.json();
        setBackupDetailsModal(data);
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Помилка зчитування детальної інформації про бэкап' });
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const handleRestoreBackup = async (guardCode?: string, targetBackup = restoreModalBackup) => {
    if (!targetBackup) return;

    setIsRestoring(true);
    setActionMessage(null);

    try {
      // Step 1: If sudoToken is needed or fallback
      let sudoToken = '';
      if (!guardCode && sudoPassword) {
        const sudoRes = await fetch('/api/admin/sudo-auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken
          },
          body: JSON.stringify({ password: sudoPassword })
        });
        const sudoData = await sudoRes.json();
        if (sudoRes.ok && sudoData.sudoToken) {
          sudoToken = sudoData.sudoToken;
        }
      }

      // Step 2: Execute Restore
      const restoreRes = await fetch(`/api/admin/backups/${targetBackup.id}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
          ...(guardCode ? { 'X-Guard-Code': guardCode } : {})
        },
        body: JSON.stringify({
          sudoToken,
          sudoPassword: sudoPassword || undefined,
          guardCode
        })
      });

      const restoreData = await restoreRes.json();

      if (restoreRes.status === 403 && restoreData.requiresGuardCode) {
        if (guardCode) {
          throw new Error(restoreData.error || 'Недійсний або прострочений код MonoVoice Guard');
        }
        const backupToRestore = targetBackup;
        setRestoreModalBackup(null);
        setGuardPendingAction({
          actionTitle: 'Відновлення резервної копії',
          targetLabel: backupToRestore.id,
          actionType: 'RESTORE_BACKUP',
          onExecute: async (code) => {
            await handleRestoreBackup(code, backupToRestore);
          }
        });
        setGuardModalOpen(true);
        return;
      }

      if (restoreRes.ok && restoreData.success) {
        setActionMessage({
          type: 'success',
          text: `🎉 ${restoreData.message}`
        });
        setRestoreModalBackup(null);
        setSudoPassword('');
        fetchBackups();
      } else {
        const errMsg = restoreData.error || 'Помилка під час виконання відновлення';
        if (guardCode) {
          throw new Error(errMsg);
        }
        setActionMessage({ type: 'error', text: errMsg });
      }
    } catch (err: any) {
      if (guardCode) {
        throw err instanceof Error ? err : new Error(err?.message || 'Критична помилка мережі при спробі відновлення');
      }
      setActionMessage({ type: 'error', text: 'Критична помилка мережі при спробі відновлення' });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteBackup = async (id: string, guardCode?: string) => {
    if (!guardCode && !window.confirm('Ви впевнені, що бажаєте остаточно видалити цю резервну копію з сервера?')) return;

    try {
      const res = await fetch(`/api/admin/backups/${id}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': csrfToken,
          ...(guardCode ? { 'X-Guard-Code': guardCode } : {})
        }
      });
      const data = await res.json();

      if (res.status === 403 && data.requiresGuardCode) {
        if (guardCode) {
          throw new Error(data.error || 'Недійсний або прострочений код MonoVoice Guard');
        }
        setGuardPendingAction({
          actionTitle: 'Видалення резервної копії',
          targetLabel: id,
          actionType: 'DELETE_BACKUP',
          onExecute: async (code) => {
            await handleDeleteBackup(id, code);
          }
        });
        setGuardModalOpen(true);
        return;
      }

      if (res.ok && data.success) {
        setActionMessage({ type: 'success', text: 'Резервну копію видалено з сервера' });
        fetchBackups();
      } else {
        const errMsg = data.error || 'Помилка видалення';
        if (guardCode) {
          throw new Error(errMsg);
        }
        setActionMessage({ type: 'error', text: errMsg });
      }
    } catch (err: any) {
      if (guardCode) {
        throw err instanceof Error ? err : new Error(err?.message || 'Помилка при видаленні резервної копії');
      }
      setActionMessage({ type: 'error', text: 'Помилка при видаленні резервної копії' });
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/admin/backups/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ type: 'success', text: 'Налаштування автоматичного копіювання збережено' });
        setShowSettingsModal(false);
        fetchBackups();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Помилка збереження' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Помилка збереження налаштувань' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Резервне копіювання та відновлення</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Етап 6 — Захист даних
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Ізольоване сховище <code className="text-emerald-300 font-mono text-xs">storage/backups</code>, SHA-256 контрольні суми та автоматичні знімки перед відновленням.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-sm transition-colors shadow-lg shadow-emerald-900/20"
          >
            <Plus className="w-4 h-4" />
            Створити копію
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm border-2 border-slate-600 hover:border-[#f6cf3f] transition-colors shadow-sm"
          >
            <Settings className="w-4 h-4 text-[#f6cf3f]" />
            Авто-планувальник
          </button>

          <button
            onClick={fetchBackups}
            disabled={isLoading}
            className="p-2 text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-[#f6cf3f] rounded-xl transition-colors shadow-sm cursor-pointer disabled:opacity-75"
            title="Оновити список"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-start gap-3 border ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : actionMessage.type === 'error'
              ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              : 'bg-blue-950/40 border-blue-800/60 text-blue-300'
          }`}
        >
          {actionMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />}
          {actionMessage.type === 'error' && <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />}
          {actionMessage.type === 'info' && <Info className="w-5 h-5 shrink-0 text-blue-400 mt-0.5" />}
          <div className="flex-1 font-medium">{actionMessage.text}</div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Auto-backup Status Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            Авто-планувальник
          </div>
          <div className="text-lg font-bold text-white flex items-center gap-2">
            {settings.autoBackupEnabled ? (
              <span className="text-emerald-400 text-sm font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Активний ({settings.autoBackupIntervalHours} год)
              </span>
            ) : (
              <span className="text-slate-500 text-sm">Вимкнений</span>
            )}
          </div>
          <div className="text-xs text-slate-500">
            Останнє копіювання:{' '}
            {settings.lastAutoBackupAt
              ? new Date(settings.lastAutoBackupAt).toLocaleString('uk-UA')
              : 'Ще не виконувалось'}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-purple-400" />
            Збережено копій
          </div>
          <div className="text-lg font-bold text-white">
            {backups.length} / {settings.maxBackupsCount} max
          </div>
          <div className="text-xs text-slate-500">Автоматичне ротування застарілих файлів</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Захист цілісності
          </div>
          <div className="text-sm font-semibold text-emerald-300">SHA-256 Checksum</div>
          <div className="text-xs text-slate-500">Зашифрований контроль кожного запису</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            Безпечне відновлення
          </div>
          <div className="text-sm font-semibold text-amber-300">Pre-restore Safety</div>
          <div className="text-xs text-slate-500">Автоматичний знімок перед відновленням</div>
        </div>
      </div>

      {/* Main Backups List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            Список актуальних резервних копій ({backups.length})
          </h3>
          <span className="text-xs text-slate-500 font-mono">Сховище: /storage/backups</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
            <span>Завантаження резервних копій...</span>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Database className="w-12 h-12 text-slate-700 mx-auto" />
            <p className="text-slate-400 text-sm font-medium">Резервних копій поки немає</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Створити першу резервну копію
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Назва та тип</th>
                  <th className="px-5 py-3">Дата створення</th>
                  <th className="px-5 py-3">Розмір</th>
                  <th className="px-5 py-3">Об'єкти</th>
                  <th className="px-5 py-3">SHA-256 Контроль</th>
                  <th className="px-5 py-3 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {backups.map(item => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Name & Type */}
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-xl border shrink-0 ${
                            item.type === 'pre-restore'
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : item.type === 'automatic'
                              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          }`}
                        >
                          {item.type === 'pre-restore' && <ShieldAlert className="w-4 h-4" />}
                          {item.type === 'automatic' && <Clock className="w-4 h-4" />}
                          {item.type === 'manual' && <Database className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-2">
                            {item.name}
                            {item.type === 'pre-restore' && (
                              <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                                Pre-Restore
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.note}</div>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-400">
                      <div>{new Date(item.createdAt).toLocaleDateString('uk-UA')}</div>
                      <div className="text-slate-500">{new Date(item.createdAt).toLocaleTimeString('uk-UA')}</div>
                    </td>

                    {/* Size */}
                    <td className="px-5 py-4 whitespace-nowrap font-mono text-xs text-slate-300 font-semibold">
                      {item.sizeFormatted}
                    </td>

                    {/* Objects */}
                    <td className="px-5 py-4 whitespace-nowrap text-xs">
                      <div className="text-slate-200 font-medium">{item.projectCount} проєктів</div>
                      <div className="text-slate-500">{item.filesCount} підкріплених файлів</div>
                    </td>

                    {/* Checksum SHA256 */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800" title={item.checksumSha256}>
                          {item.checksumSha256.substring(0, 10)}...
                        </span>
                        {item.isVerified ? (
                          <span className="text-emerald-400 flex items-center gap-0.5 text-[10px]" title="Верифіковано">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Не перевірено</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => handleViewDetails(item)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-lg border-2 border-slate-600 hover:border-[#f6cf3f] transition-colors inline-flex items-center gap-1 cursor-pointer shadow-sm"
                        title="Деталі резервної копії"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-300" />
                        Деталі
                      </button>

                      <button
                        onClick={() => handleVerifyBackup(item.id)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-lg border-2 border-slate-600 hover:border-[#f6cf3f] transition-colors inline-flex items-center gap-1 cursor-pointer shadow-sm"
                        title="Верифікувати SHA-256"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Перевірити
                      </button>

                      <button
                        onClick={() => setRestoreModalBackup(item)}
                        className="px-2.5 py-1.5 bg-amber-950/80 hover:bg-amber-900 text-amber-200 font-bold text-xs rounded-lg border-2 border-amber-500/80 transition-colors inline-flex items-center gap-1 cursor-pointer shadow-sm"
                        title="Відновити з цієї копії"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        Відновити
                      </button>

                      <button
                        onClick={() => handleDeleteBackup(item.id)}
                        className="p-1.5 bg-red-950/80 hover:bg-red-900 border border-red-500/60 text-red-200 rounded-lg transition-colors inline-flex cursor-pointer shadow-sm"
                        title="Видалити"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Create Backup Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                Створення ручної резервної копії
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              <p>
                Буде створено повний знімок бази даних MonoVoice Apps, реєстру завантажених файлів та конфігурацій вихідного коду з обчисленням хешу SHA-256.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Примітка або коментар до копії (опціонально)
                </label>
                <input
                  type="text"
                  value={createNote}
                  onChange={e => setCreateNote(e.target.value)}
                  placeholder="напр. Резервна копія перед великим оновленням v1.3"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Гарантія безпеки:
                </div>
                <div>Файл зберігатиметься в захищеному каталозі storage/backups з шифрувальною контрольною сумою.</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm border-2 border-slate-600 hover:border-[#f6cf3f] transition-colors cursor-pointer shadow-sm"
              >
                Скасувати
              </button>
              <button
                onClick={handleCreateBackup}
                disabled={isCreating}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-75 disabled:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {isCreating && <RefreshCw className="w-4 h-4 animate-spin" />}
                {isCreating ? 'Створення...' : 'Створити копію'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: View Backup Details Modal */}
      {selectedBackup && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Деталі резервної копії
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedBackup.id}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedBackup(null);
                  setBackupDetailsModal(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-xs text-slate-500 block">Назва:</span>
                  <span className="font-semibold text-white">{selectedBackup.name}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Тип:</span>
                  <span className="capitalize font-medium text-emerald-400">{selectedBackup.type}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Розмір архіву:</span>
                  <span className="font-mono text-slate-200">{selectedBackup.sizeFormatted}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Дата створення:</span>
                  <span className="text-slate-300">{new Date(selectedBackup.createdAt).toLocaleString('uk-UA')}</span>
                </div>
              </div>

              {/* SHA-256 Checksum */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs font-semibold text-slate-400 block">Контрольна сума SHA-256 (Integrity Hash):</span>
                <div className="font-mono text-xs text-emerald-400 break-all select-all bg-slate-900 p-2 rounded border border-slate-800">
                  {selectedBackup.checksumSha256}
                </div>
              </div>

              {/* Contents Summary */}
              {backupDetailsModal ? (
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">Вміст резервної копії:</h4>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-2">
                    <div className="font-medium text-slate-300">
                      Проєкти в базі ({backupDetailsModal.dataSummary?.projectsCount}):
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedBackup.contentsSummary?.projectsList.map((pName, idx) => (
                        <span key={idx} className="bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                          {pName}
                        </span>
                      ))}
                    </div>

                    <div className="font-medium text-slate-300 pt-2 border-t border-slate-800">
                      Знімок конфігурації сирцевого коду:
                    </div>
                    <div className="text-slate-400">
                      Пакет: MonoVoice Apps v{backupDetailsModal.dataSummary?.sourceSnapshot?.appMetadata?.version || '1.2.0'} | Node:{' '}
                      {backupDetailsModal.dataSummary?.sourceSnapshot?.nodeVersion || process.version}
                    </div>
                  </div>
                </div>
              ) : isFetchingDetails ? (
                <div className="p-4 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                  Завантаження структурного вмісту...
                </div>
              ) : null}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setSelectedBackup(null);
                  setBackupDetailsModal(null);
                }}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold border-2 border-slate-600 hover:border-[#f6cf3f] rounded-xl text-sm transition-colors cursor-pointer shadow-sm"
              >
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Restore Backup Safety & Sudo Confirmation Modal */}
      {restoreModalBackup && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-amber-400 border-b border-slate-800 pb-4">
              <ShieldAlert className="w-7 h-7 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-white">Відновлення даних з копії</h3>
                <p className="text-xs text-amber-300 font-medium">Критична операція заміни даних</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              <div className="bg-amber-950/30 border border-amber-800/40 p-3 rounded-xl text-xs text-amber-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" /> Попередження про заміну даних:
                </div>
                <div>
                  Поточні записи програм та реєстр файлів будуть замінені даними з копії від{' '}
                  <strong>{new Date(restoreModalBackup.createdAt).toLocaleString('uk-UA')}</strong>.
                </div>
                <div className="pt-1 text-emerald-300 font-semibold border-t border-amber-800/40">
                  🛡️ Система СТАВИТЬ ЗАХИСТ: перед відновленням буде створено автоматичний безпечний знімок (Pre-restore safety backup).
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  Пароль адміністратора (Sudo Auth)
                </label>
                <input
                  type="password"
                  value={sudoPassword}
                  onChange={e => setSudoPassword(e.target.value)}
                  placeholder="Введіть пароль підтвердження"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setRestoreModalBackup(null);
                  setSudoPassword('');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm border-2 border-slate-600 hover:border-[#f6cf3f] transition-colors cursor-pointer shadow-sm"
              >
                Cкасувати
              </button>
              <button
                onClick={() => handleRestoreBackup()}
                disabled={isRestoring || !sudoPassword}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-75 disabled:bg-slate-800 disabled:border disabled:border-slate-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {isRestoring && <RefreshCw className="w-4 h-4 animate-spin" />}
                {isRestoring ? 'Відновлення...' : 'Підтвердити та відновити'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Auto-backup Scheduler Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400" />
                Налаштування автокопіювання
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              <label className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
                <div>
                  <div className="font-semibold text-white">Автоматичне щоденне копіювання</div>
                  <div className="text-xs text-slate-400">Серверний фоновий процес без залежності від браузера</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoBackupEnabled}
                  onChange={e => setSettings({ ...settings, autoBackupEnabled: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 bg-slate-900"
                />
              </label>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Максимальна кількість збережених копій (Лимит)
                </label>
                <input
                  type="number"
                  min={3}
                  max={50}
                  value={settings.maxBackupsCount}
                  onChange={e => setSettings({ ...settings, maxBackupsCount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                />
                <span className="text-xs text-slate-500 mt-1 block">
                  Застарілі автоматичні копії буде автоматично видалено при перевищенні ліміту.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm border-2 border-slate-600 hover:border-[#f6cf3f] transition-colors cursor-pointer shadow-sm"
              >
                Скасувати
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-75 disabled:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {isSavingSettings && <RefreshCw className="w-4 h-4 animate-spin" />}
                Зберегти налаштування
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MonoVoice Guard 15-Second Steam Guard Modal */}
      {guardPendingAction && (
        <GuardCodeModal
          isOpen={guardModalOpen}
          onClose={() => {
            setGuardModalOpen(false);
            setGuardPendingAction(null);
          }}
          onConfirm={async (code) => {
            if (guardPendingAction) {
              await guardPendingAction.onExecute(code);
            }
          }}
          actionTitle={guardPendingAction.actionTitle}
          targetLabel={guardPendingAction.targetLabel}
          actionType={guardPendingAction.actionType}
          csrfToken={csrfToken}
        />
      )}
    </div>
  );
};
