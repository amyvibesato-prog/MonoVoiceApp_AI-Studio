import React, { useState, useEffect } from 'react';
import { HardDrive, Plus, Download, RotateCcw, ShieldCheck, AlertCircle, FileText, CheckCircle2, Copy, Check, Clock, ShieldAlert } from 'lucide-react';
import {
  fetchBackups,
  createBackupApi,
  getDownloadBackupUrl,
  fetchAuditLogs,
  BackupManifestItem,
  AuditLogItem
} from '../../services/adminBackupsApi';
import { BackupDetailsModal } from './BackupDetailsModal';
import { BackupRestoreModal } from './BackupRestoreModal';

export const AdminBackupsManager: React.FC = () => {
  const [backups, setBackups] = useState<BackupManifestItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'backups' | 'audit'>('backups');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals
  const [detailsBackup, setDetailsBackup] = useState<BackupManifestItem | null>(null);
  const [restoreBackup, setRestoreBackup] = useState<BackupManifestItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [bList, aLogs] = await Promise.all([fetchBackups(), fetchAuditLogs()]);
    setBackups(bList);
    setAuditLogs(aLogs);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateManualBackup = async () => {
    setCreating(true);
    setErrorMsg(null);
    const res = await createBackupApi('manual_admin_button');
    setCreating(false);

    if (res.success) {
      await loadData();
    } else {
      setErrorMsg(res.error || 'Не вдалося створити резервну копію');
    }
  };

  const lastBackupTime = backups.length > 0
    ? new Date(backups[0].createdAt).toLocaleString()
    : 'Ще не створювалися';

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview */}
      <div className="p-6 bg-[var(--card-bg)] border-2 border-[var(--border-color)] rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-[var(--text-color)]">
                Backups & Restore (Резервні копії)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                SHA-256 Verified
              </span>
            </div>
            <p className="text-xs text-[var(--muted-text)] mt-1 flex items-center gap-2 font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Останній бекап: {lastBackupTime}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleCreateManualBackup}
            disabled={creating}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-amber-500/20 cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
          >
            {creating ? (
              <span className="inline-block w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Створити резервну копію зараз
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-color)] text-xs font-bold gap-4">
        <button
          onClick={() => setActiveTab('backups')}
          className={`py-2.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'backups'
              ? 'border-amber-500 text-amber-500 font-black'
              : 'border-transparent text-[var(--muted-text)] hover:text-[var(--text-color)]'
          }`}
        >
          Резервні копії ({backups.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`py-2.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'border-amber-500 text-amber-500 font-black'
              : 'border-transparent text-[var(--muted-text)] hover:text-[var(--text-color)]'
          }`}
        >
          Журнал дій (Audit Log) ({auditLogs.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[var(--muted-text)] font-mono">Завантаження реєстру бекапів...</p>
        </div>
      ) : activeTab === 'backups' ? (
        backups.length === 0 ? (
          <div className="p-12 text-center bg-[var(--card-bg)] border-2 border-dashed border-[var(--border-color)] rounded-2xl">
            <p className="text-sm font-bold text-[var(--text-color)]">Резервні копії відсутні</p>
            <p className="text-xs text-[var(--muted-text)] mt-1">
              Натисніть кнопку вище, щоб створити першу резервну копію.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map(bkp => (
              <div
                key={bkp.id}
                className="p-4 bg-[var(--card-bg)] border-2 border-[var(--border-color)] rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 font-bold">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-mono font-bold text-[var(--text-color)]">
                        {bkp.filename}
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {bkp.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--muted-text)] mt-1">
                      <span>{new Date(bkp.createdAt).toLocaleString()}</span>
                      <span>•</span>
                      <span>{(bkp.sizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                      <span>•</span>
                      <span>SHA256: {bkp.sha256.substring(0, 10)}...</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 border-[var(--border-color)] pt-3 md:pt-0">
                  <button
                    onClick={() => setDetailsBackup(bkp)}
                    className="px-3 py-1.5 bg-[var(--input-bg)] border border-[var(--border-color)] hover:border-amber-500 rounded-lg text-xs font-bold text-[var(--text-color)] transition-all cursor-pointer"
                  >
                    Деталі
                  </button>

                  <a
                    href={getDownloadBackupUrl(bkp.filename)}
                    download
                    className="px-3 py-1.5 bg-[var(--input-bg)] border border-[var(--border-color)] hover:border-amber-500 rounded-lg text-xs font-bold text-[var(--text-color)] transition-all inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-500" />
                    Завантажити
                  </a>

                  <button
                    onClick={() => setRestoreBackup(bkp)}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Відновити
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Enhanced Audit Log View */
        <div className="space-y-3">
          <div className="p-3 bg-zinc-900/60 border border-[var(--border-color)] rounded-xl flex items-center justify-between text-xs text-[var(--muted-text)] font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Захищений серверний журнал (Read-Only Audit Ledger)</span>
            </div>
            <span>Записів: {auditLogs.length}</span>
          </div>

          <div className="space-y-2">
            {auditLogs.map(log => (
              <div key={log.id} className="p-4 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl space-y-2 text-xs font-mono shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                      log.status === 'SUCCESS'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : log.status === 'WARNING'
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        : 'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                      {log.action}
                    </span>
                    {log.method && (
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-amber-400 font-bold text-[10px]">
                        {log.method}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--muted-text)]">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="text-[var(--text-color)] font-sans font-medium text-xs">
                  {log.details}
                </div>

                <div className="flex items-center justify-between text-[11px] text-[var(--muted-text)] pt-1 border-t border-zinc-800/50">
                  <span>IP: <strong className="text-zinc-300">{log.ip}</strong></span>
                  {log.endpoint && <span>Endpoint: <strong className="text-zinc-300">{log.endpoint}</strong></span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <BackupDetailsModal
        isOpen={Boolean(detailsBackup)}
        backup={detailsBackup}
        onClose={() => setDetailsBackup(null)}
      />

      <BackupRestoreModal
        isOpen={Boolean(restoreBackup)}
        backup={restoreBackup}
        onRestoreSuccess={() => {
          loadData();
        }}
        onClose={() => setRestoreBackup(null)}
      />
    </div>
  );
};
