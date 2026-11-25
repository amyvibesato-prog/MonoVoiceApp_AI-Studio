import React, { useState } from 'react';
import { X, KeyRound, AlertTriangle, CheckCircle2, RotateCcw, AlertCircle } from 'lucide-react';
import { BackupManifestItem, restoreBackupApi } from '../../services/adminBackupsApi';

interface BackupRestoreModalProps {
  isOpen: boolean;
  backup: BackupManifestItem | null;
  onRestoreSuccess: () => void;
  onClose: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  backup,
  onRestoreSuccess,
  onClose,
}) => {
  const [sudoPassword, setSudoPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !backup) return null;

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sudoPassword.trim()) {
      setErrorMsg('Вкажіть пароль адміністратора для підтвердження');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await restoreBackupApi(backup.filename, sudoPassword);
    setLoading(false);

    if (res.success) {
      onRestoreSuccess();
      onClose();
    } else {
      setErrorMsg(res.error || 'Помилка при відновленні з резервної копії');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[var(--card-bg)] border-2 border-[var(--border-color)] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--muted-text)] hover:text-[var(--text-color)] transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center font-bold shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-color)]">Відновлення з резервної копії</h3>
            <p className="text-xs font-mono text-[var(--muted-text)]">{backup.filename}</p>
          </div>
        </div>

        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 text-xs text-[var(--text-color)]">
          <div className="flex items-center gap-2 text-amber-500 font-bold uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Увага: Поточний стан буде повністю замінено
          </div>
          <p className="text-[var(--muted-text)] leading-relaxed">
            Усі поточні проєкти ({backup.contents?.projectsCount || 0}), іконки, релізи та системні файли будуть замінені даними з копії за {new Date(backup.createdAt).toLocaleString()}.
          </p>
          <div className="pt-2 border-t border-amber-500/20 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            Автоматично створюється аварійна копія поточного стану перед початком відновлення.
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleRestoreSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-text)] mb-2">
              Підтвердження паролем адміністратора *
            </label>
            <div className="relative">
              <input
                type="password"
                value={sudoPassword}
                onChange={e => setSudoPassword(e.target.value)}
                placeholder="Введіть пароль..."
                required
                className="w-full px-4 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] focus:border-red-500 rounded-xl text-sm font-mono text-[var(--text-color)] outline-none"
              />
              <KeyRound className="w-4 h-4 text-[var(--muted-text)] absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--muted-text)] hover:text-[var(--text-color)] bg-[var(--input-bg)] border border-[var(--border-color)] transition-all cursor-pointer"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Запустити контрольоване відновлення
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
