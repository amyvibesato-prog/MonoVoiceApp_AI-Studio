import React, { useState } from 'react';
import { LogOut, ShieldCheck, Clock, FolderKanban, HardDrive } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { logoutAdmin } from '../../services/adminAuth';
import { AdminProjectsWorkshop } from './AdminProjectsWorkshop';
import { AdminBackupsManager } from './AdminBackupsManager';

interface AdminDashboardProps {
  expiresAt?: number;
  onLogout: () => void;
  onNavigateToSite: (path: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ expiresAt, onLogout, onNavigateToSite }) => {
  const { language } = useLanguage();
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeSection, setActiveSection] = useState<'projects' | 'backups'>('projects');

  const handleLogout = async () => {
    setLoggingOut(true);
    await logoutAdmin();
    setLoggingOut(false);
    onLogout();
  };

  const expiryFormatted = expiresAt
    ? new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '8 годин';

  return (
    <div className="py-6 sm:py-10 space-y-6 max-w-6xl mx-auto">
      {/* Top Header Bar */}
      <div className="p-6 bg-[var(--card-bg)] border-2 border-[var(--border-color)] rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 bottom-0 w-2 bg-emerald-500" />
        <div className="flex items-center gap-3.5 pl-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-[var(--text-color)]">
                {language === 'uk' ? 'Адміністративна панель' : 'Admin Control Panel'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                {language === 'uk' ? 'Активна сесія' : 'Active Session'}
              </span>
            </div>
            <p className="text-xs text-[var(--muted-text)] mt-1 flex items-center gap-2 font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {language === 'uk' ? 'Дійсна до:' : 'Expires at:'} {expiryFormatted}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end border-t sm:border-t-0 border-[var(--border-color)] pt-3 sm:pt-0">
          <button
            onClick={() => onNavigateToSite('/')}
            className="px-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] hover:border-amber-500 rounded-xl text-xs font-bold text-[var(--text-color)] transition-all cursor-pointer"
          >
            {language === 'uk' ? 'Переглянути сайт' : 'View Public Site'}
          </button>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            {language === 'uk' ? 'Вийти' : 'Logout'}
          </button>
        </div>
      </div>

      {/* Admin Section Tabs */}
      <div className="flex border-b border-[var(--border-color)] gap-2 text-xs font-bold">
        <button
          onClick={() => setActiveSection('projects')}
          className={`py-3 px-5 border-b-2 transition-all cursor-pointer inline-flex items-center gap-2 ${
            activeSection === 'projects'
              ? 'border-amber-500 text-amber-500 font-black'
              : 'border-transparent text-[var(--muted-text)] hover:text-[var(--text-color)]'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          Майстерня проєктів
        </button>

        <button
          onClick={() => setActiveSection('backups')}
          className={`py-3 px-5 border-b-2 transition-all cursor-pointer inline-flex items-center gap-2 ${
            activeSection === 'backups'
              ? 'border-amber-500 text-amber-500 font-black'
              : 'border-transparent text-[var(--muted-text)] hover:text-[var(--text-color)]'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          Backups & Restore (Бекапи)
        </button>
      </div>

      {/* Active Section View */}
      {activeSection === 'projects' ? <AdminProjectsWorkshop /> : <AdminBackupsManager />}
    </div>
  );
};
