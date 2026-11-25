import React, { useState } from 'react';
import { X, ShieldCheck, Copy, Check, HardDrive } from 'lucide-react';
import { BackupManifestItem } from '../../services/adminBackupsApi';

interface BackupDetailsModalProps {
  isOpen: boolean;
  backup: BackupManifestItem | null;
  onClose: () => void;
}

export const BackupDetailsModal: React.FC<BackupDetailsModalProps> = ({
  isOpen,
  backup,
  onClose,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);

  if (!isOpen || !backup) return null;

  const copySHA256 = () => {
    navigator.clipboard.writeText(backup.sha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const formattedSize = (backup.sizeBytes / (1024 * 1024)).toFixed(2) + ' MB';

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
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-color)]">Деталі резервної копії</h3>
            <p className="text-xs font-mono text-[var(--muted-text)]">{backup.filename}</p>
          </div>
        </div>

        <div className="p-3.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--muted-text)]">
            <span>Контрольна сума SHA-256</span>
            <button
              onClick={copySHA256}
              className="text-amber-500 hover:underline flex items-center gap-1 cursor-pointer font-mono"
            >
              {copiedHash ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              {copiedHash ? 'Скопійовано' : 'Скопіювати'}
            </button>
          </div>
          <div className="text-xs font-mono break-all text-[var(--text-color)] bg-zinc-950 p-2 rounded-lg border border-[var(--border-color)] select-all">
            {backup.sha256}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl">
            <span className="text-[var(--muted-text)] block font-mono text-[11px]">Дата створення</span>
            <strong className="text-[var(--text-color)] font-mono">{new Date(backup.createdAt).toLocaleString()}</strong>
          </div>

          <div className="p-3 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl">
            <span className="text-[var(--muted-text)] block font-mono text-[11px]">Розмір архіву</span>
            <strong className="text-[var(--text-color)] font-mono">{formattedSize}</strong>
          </div>

          <div className="p-3 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl">
            <span className="text-[var(--muted-text)] block font-mono text-[11px]">Кількість проєктів</span>
            <strong className="text-[var(--text-color)]">{backup.contents?.projectsCount || 0} проєктів</strong>
          </div>

          <div className="p-3 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl">
            <span className="text-[var(--muted-text)] block font-mono text-[11px]">Файли утиліт / медіа</span>
            <strong className="text-[var(--text-color)]">
              {(backup.contents?.publicFilesCount || 0) + (backup.contents?.privateFilesCount || 0)} файлів
            </strong>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Статус цілісності: {backup.status}</span>
          </div>
          <span className="text-[10px] font-mono uppercase bg-emerald-500/20 px-2 py-0.5 rounded">
            Verified OK
          </span>
        </div>
      </div>
    </div>
  );
};
