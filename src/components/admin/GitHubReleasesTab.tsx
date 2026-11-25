import React, { useState, useEffect } from 'react';
import {
  GitPullRequest,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Download,
  FileCode,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldAlert,
  Info,
  Check,
  Tag
} from 'lucide-react';
import { AppItem, Platform } from '../../types/app';
import { useLanguage } from '../../context/LanguageContext';

interface GitHubAsset {
  id: number;
  name: string;
  sizeBytes: number;
  sizeFormatted: string;
  downloadUrl: string;
  contentType: string;
  createdAt: string;
  matchedPlatform?: Platform | 'Other';
}

interface GitHubRelease {
  id: number;
  tagName: string;
  version: string;
  name: string;
  body: string;
  publishedAt: string;
  htmlUrl: string;
  isPrerelease: boolean;
  isDraft: boolean;
  assets: GitHubAsset[];
}

interface GitHubSyncResult {
  success: boolean;
  repoInfo?: {
    owner: string;
    repo: string;
    fullRepoName: string;
    url: string;
  };
  latestRelease?: GitHubRelease;
  allReleases?: GitHubRelease[];
  currentVersion?: string;
  hasUpdate?: boolean;
  syncStatus: 'UP_TO_DATE' | 'UPDATE_AVAILABLE' | 'NO_RELEASES' | 'ERROR';
  error?: string;
  isRateLimited?: boolean;
  lastCheckedAt: string;
}

interface GitHubReleasesTabProps {
  csrfToken: string;
  onProjectsUpdated: () => void;
}

export const GitHubReleasesTab: React.FC<GitHubReleasesTabProps> = ({
  csrfToken,
  onProjectsUpdated
}) => {
  const { language } = useLanguage();

  const [projects, setProjects] = useState<AppItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkingProjectId, setCheckingProjectId] = useState<string | null>(null);

  // Map of project ID to latest GitHub sync result
  const [syncResults, setSyncResults] = useState<Record<string, GitHubSyncResult>>({});

  // Active modal state for confirming and applying a release
  const [selectedProject, setSelectedProject] = useState<AppItem | null>(null);
  const [selectedRelease, setSelectedRelease] = useState<GitHubRelease | null>(null);
  const [isApplyingRelease, setIsApplyingRelease] = useState(false);

  // Form states for release candidate application
  const [candidateVersion, setCandidateVersion] = useState('');
  const [candidateReleaseDate, setCandidateReleaseDate] = useState('');
  const [changelogUkText, setChangelogUkText] = useState('');
  const [changelogEnText, setChangelogEnText] = useState('');
  const [platformDownloads, setPlatformDownloads] = useState<Record<string, string>>({});
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [releaseActionPassword, setReleaseActionPassword] = useState('');

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch('/api/admin/projects');
      if (res.ok) {
        const data = await res.json();
        if (data.projects) {
          setProjects(data.projects);
        }
      }
    } catch (err) {
      console.error('Failed to fetch projects for GitHub tab:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Check single project GitHub releases
  const handleCheckSingle = async (project: AppItem) => {
    setCheckingProjectId(project.id);
    try {
      const res = await fetch(`/api/admin/projects/${project.id}/github-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ customGithubUrl: project.github })
      });

      const data = await res.json();
      if (data.githubResult) {
        setSyncResults(prev => ({
          ...prev,
          [project.id]: data.githubResult
        }));
      } else if (data.error) {
        setSyncResults(prev => ({
          ...prev,
          [project.id]: {
            success: false,
            syncStatus: 'ERROR',
            error: data.error,
            lastCheckedAt: new Date().toISOString()
          }
        }));
      }
    } catch (err: any) {
      setSyncResults(prev => ({
        ...prev,
        [project.id]: {
          success: false,
          syncStatus: 'ERROR',
          error: `Помилка запиту: ${err.message}`,
          lastCheckedAt: new Date().toISOString()
        }
      }));
    } finally {
      setCheckingProjectId(null);
    }
  };

  // Check all projects
  const handleCheckAll = async () => {
    setCheckingAll(true);
    try {
      const res = await fetch('/api/admin/github/check-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        const newMap: Record<string, GitHubSyncResult> = {};
        data.results.forEach((item: any) => {
          newMap[item.projectId] = item.syncResult;
        });
        setSyncResults(prev => ({ ...prev, ...newMap }));
      }
    } catch (err) {
      console.error('Check all error:', err);
    } finally {
      setCheckingAll(false);
    }
  };

  // Open Inspector Modal for Candidate Release
  const handleOpenReleaseModal = (project: AppItem, release: GitHubRelease) => {
    setSelectedProject(project);
    setSelectedRelease(release);

    setCandidateVersion(release.version);
    setCandidateReleaseDate(release.publishedAt ? release.publishedAt.split('T')[0] : new Date().toISOString().split('T')[0]);

    // Format body into bullet points
    const rawLines = release.body
      .split('\n')
      .map(line => line.replace(/^[\s*-]+/, '').trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));

    setChangelogUkText(rawLines.length > 0 ? rawLines.join('\n') : `Оновлено реліз v${release.version}`);
    setChangelogEnText(rawLines.length > 0 ? rawLines.join('\n') : `Updated release v${release.version}`);

    // Map release assets to platform downloads
    const initialDownloads: Record<string, string> = { ...project.download };
    release.assets.forEach(asset => {
      if (asset.matchedPlatform && asset.matchedPlatform !== 'Other') {
        const key = asset.matchedPlatform.toLowerCase();
        initialDownloads[key] = asset.downloadUrl;
      }
    });

    setPlatformDownloads(initialDownloads);
  };

  // Confirm and Apply Release to Project
  const handleConfirmApplyRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !selectedRelease) return;

    if (!releaseActionPassword.trim()) {
      alert('Будь ласка, введіть пароль оновлення/створення для цієї операції');
      return;
    }

    setIsApplyingRelease(true);
    try {
      const ukItems = changelogUkText.split('\n').map(s => s.trim()).filter(Boolean);
      const enItems = changelogEnText.split('\n').map(s => s.trim()).filter(Boolean);

      const res = await fetch(`/api/admin/projects/${selectedProject.id}/apply-github-release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          version: candidateVersion,
          releaseDate: candidateReleaseDate,
          changelogUk: ukItems,
          changelogEn: enItems,
          downloadMap: platformDownloads,
          publishImmediately,
          actionPassword: releaseActionPassword.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(
          language === 'uk'
            ? `Реліз v${candidateVersion} успішно застосовано та опубліковано!`
            : `Release v${candidateVersion} applied and published successfully!`
        );
        setSelectedProject(null);
        setSelectedRelease(null);
        setReleaseActionPassword('');
        fetchProjects();
        onProjectsUpdated();
      } else {
        alert(data.error || 'Помилка при застосуванні релізу');
      }
    } catch (err: any) {
      alert(`Помилка з'єднання: ${err.message}`);
    } finally {
      setIsApplyingRelease(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="comic-card p-6 border-l-4 border-l-[#f6cf3f] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-brush text-2xl text-[#f6cf3f] flex items-center gap-2">
              <GitPullRequest className="w-6 h-6 text-[#f6cf3f]" />
              <span>{language === 'uk' ? 'Інтеграція з GitHub Releases' : 'GitHub Releases Integration'}</span>
            </h2>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {language === 'uk'
                ? 'Автоматично отримує публічні релізи з GitHub, перевіряє нові версії, зіставляє файли (.apk, .exe, .zip) за платформами та дає змогу безпечно оновити каталог після підтвердження.'
                : 'Fetches public releases from GitHub, detects version updates, maps release assets to target OS platforms, and safely updates the public catalog after admin confirmation.'}
            </p>
          </div>

          <button
            onClick={handleCheckAll}
            disabled={checkingAll || projects.length === 0}
            className="comic-btn-yellow px-5 py-2.5 text-xs font-extrabold cursor-pointer shrink-0 disabled:opacity-50"
          >
            {checkingAll ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>{language === 'uk' ? 'Перевірити всі репозиторії' : 'Sync All Repos'}</span>
          </button>
        </div>

        {/* Security Rule Warning Badge */}
        <div className="p-3 bg-black/40 border border-amber-500/30 rounded text-xs text-amber-200 flex items-start gap-2 font-mono">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            {language === 'uk'
              ? 'Правило безпеки: Сервер НЕ змінює опубліковану версію автоматично, доки ви не підтвердите відповідність релізу та файлів платформі. При недоступності GitHub сайт показує останні підтверджені дані.'
              : 'Security Guarantee: System never updates published app binaries automatically without admin confirmation. Site gracefully falls back to last confirmed data if GitHub is unreachable.'}
          </span>
        </div>
      </div>

      {/* Projects Repository List Table */}
      <div className="comic-card p-6 space-y-4">
        <h3 className="font-brush text-xl text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#f6cf3f]" />
          <span>{language === 'uk' ? 'Репозиторії програм у каталозі' : 'Catalog Project Repositories'}</span>
        </h3>

        {loadingProjects ? (
          <div className="py-12 text-center text-xs text-zinc-400 font-mono space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#f6cf3f]" />
            <span>Завантаження проєктів...</span>
          </div>
        ) : projects.length === 0 ? (
          <p className="text-xs text-zinc-400 py-6 text-center">Проєктів не знайдено</p>
        ) : (
          <div className="space-y-4">
            {projects.map(project => {
              const result = syncResults[project.id];
              const isCheckingThis = checkingProjectId === project.id;

              return (
                <div
                  key={project.id}
                  className="bg-black/40 p-4 border border-white/10 rounded-lg space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
                    {/* Project & Current State */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-impact text-lg text-white">{project.name}</span>
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-white/10 text-[#f6cf3f] rounded">
                          v{project.version}
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">({project.releaseDate})</span>
                      </div>
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                      >
                        <span>{project.github}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleCheckSingle(project)}
                        disabled={isCheckingThis}
                        className="comic-btn-yellow px-3.5 py-1.5 text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        {isCheckingThis ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        <span>{language === 'uk' ? 'Перевірити GitHub' : 'Check Release'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Sync Status Output */}
                  {result ? (
                    <div className="space-y-3 text-xs">
                      {result.syncStatus === 'UPDATE_AVAILABLE' && result.latestRelease && (
                        <div className="p-3 bg-amber-950/80 border border-amber-500/50 rounded text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <span className="font-bold flex items-center gap-1.5 text-amber-300">
                              <Sparkles className="w-4 h-4 text-[#f6cf3f]" />
                              <span>
                                {language === 'uk'
                                  ? `Знайдено новий реліз на GitHub: ${result.latestRelease.tagName}`
                                  : `New GitHub release detected: ${result.latestRelease.tagName}`}
                              </span>
                            </span>
                            <p className="text-[11px] text-zinc-300">
                              {language === 'uk' ? 'Дата випуску:' : 'Published:'}{' '}
                              {new Date(result.latestRelease.publishedAt).toLocaleDateString()} · Assets:{' '}
                              {result.latestRelease.assets.length} файлів
                            </p>
                          </div>

                          <button
                            onClick={() => handleOpenReleaseModal(project, result.latestRelease!)}
                            className="px-3 py-1.5 bg-[#f6cf3f] hover:bg-yellow-400 text-[#0b1013] font-bold text-xs cursor-pointer rounded shrink-0"
                          >
                            {language === 'uk' ? 'Деталі та Застосування' : 'Inspect & Apply'}
                          </button>
                        </div>
                      )}

                      {result.syncStatus === 'UP_TO_DATE' && (
                        <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/30 rounded text-emerald-300 font-mono text-[11px] flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            {language === 'uk'
                              ? `Версія в каталозі v${project.version} є актуальною. Новіших релізів не знайдено.`
                              : `Catalog version v${project.version} is up to date with latest GitHub release.`}
                          </span>
                        </div>
                      )}

                      {result.syncStatus === 'NO_RELEASES' && (
                        <div className="p-2.5 bg-white/5 border border-white/10 rounded text-zinc-400 font-mono text-[11px] flex items-center gap-2">
                          <Info className="w-4 h-4 text-zinc-400 shrink-0" />
                          <span>У даному репозиторії поки немає опублікованих релізів.</span>
                        </div>
                      )}

                      {result.syncStatus === 'ERROR' && (
                        <div className="p-2.5 bg-red-950/80 border border-red-500/50 rounded text-red-300 font-mono text-[11px] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                            <span>{result.error || 'Помилка синхронізації з GitHub'}</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 shrink-0">
                            Публічний сайт показує збережені дані v{project.version}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                      <span>Натисніть «Перевірити GitHub» для пошуку останніх версій.</span>
                      <span>Платформи: {project.platforms.join(', ')}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Release Inspector Modal */}
      {selectedProject && selectedRelease && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="comic-card max-w-2xl w-full p-6 space-y-5 border-2 border-[#f6cf3f] my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-[#f6cf3f]">
                  GitHub Release Candidate Inspector
                </span>
                <h3 className="font-impact text-2xl text-white">
                  {selectedProject.name} — {selectedRelease.tagName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-zinc-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Comparison Overview */}
            <div className="grid grid-cols-2 gap-4 bg-black/50 p-4 border border-white/10 rounded text-xs font-mono">
              <div>
                <span className="text-zinc-400 block uppercase">Поточна версія в каталозі:</span>
                <span className="text-lg font-bold text-[#f6cf3f]">v{selectedProject.version}</span>
                <span className="text-[11px] text-zinc-400 block">Реліз: {selectedProject.releaseDate}</span>
              </div>
              <div>
                <span className="text-zinc-400 block uppercase">Новий реліз на GitHub:</span>
                <span className="text-lg font-bold text-emerald-400">{selectedRelease.tagName}</span>
                <span className="text-[11px] text-zinc-400 block">
                  Опубліковано: {new Date(selectedRelease.publishedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Release Assets List */}
            <div className="space-y-2">
              <span className="font-bold text-xs text-zinc-300 block">
                📦 Виявлені файли релізу (Assets & Platform Mapping):
              </span>
              {selectedRelease.assets.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">Файлів завантаження у релізі не знайдено.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto font-mono text-xs">
                  {selectedRelease.assets.map(asset => (
                    <div
                      key={asset.id}
                      className="p-2.5 bg-white/5 border border-white/10 rounded flex items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5 truncate">
                        <span className="text-white font-bold block truncate">{asset.name}</span>
                        <span className="text-[11px] text-zinc-400">{asset.sizeFormatted}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 font-bold rounded">
                          {asset.matchedPlatform || 'Файл'}
                        </span>
                        <a
                          href={asset.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 hover:text-[#f6cf3f] text-zinc-400"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirmation & Form Controls */}
            <form onSubmit={handleConfirmApplyRelease} className="space-y-4 border-t border-white/10 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-zinc-300 block mb-1">Версія для публікації:</label>
                  <input
                    type="text"
                    required
                    value={candidateVersion}
                    onChange={e => setCandidateVersion(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 text-white focus:outline-none focus:border-[#f6cf3f] font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-300 block mb-1">Дата випуску:</label>
                  <input
                    type="date"
                    required
                    value={candidateReleaseDate}
                    onChange={e => setCandidateReleaseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 text-white focus:outline-none focus:border-[#f6cf3f] font-mono"
                  />
                </div>
              </div>

              {/* Changelog Entry Editor */}
              <div className="space-y-2 text-xs">
                <label className="font-bold text-zinc-300 block">Опис змін (Changelog - UK):</label>
                <textarea
                  rows={3}
                  value={changelogUkText}
                  onChange={e => setChangelogUkText(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 text-white focus:outline-none focus:border-[#f6cf3f] font-mono"
                  placeholder="Введіть пункти оновлень..."
                />
              </div>

              <div className="space-y-2 text-xs">
                <label className="font-bold text-zinc-300 block">Release Notes (Changelog - EN):</label>
                <textarea
                  rows={3}
                  value={changelogEnText}
                  onChange={e => setChangelogEnText(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 text-white focus:outline-none focus:border-[#f6cf3f] font-mono"
                  placeholder="Enter release points..."
                />
              </div>

              {/* Action Password Input */}
              <div className="p-3 bg-amber-950/40 border border-amber-500/50 rounded space-y-1 text-xs">
                <label className="font-bold text-[#f6cf3f] block">
                  Пароль створення/оновлення проєкту (окремий пароль дій):*
                </label>
                <input
                  type="password"
                  required
                  value={releaseActionPassword}
                  onChange={e => setReleaseActionPassword(e.target.value)}
                  placeholder="Введіть пароль оновлення/створення..."
                  className="w-full px-3 py-2 bg-black/60 border border-amber-500/50 text-white focus:outline-none focus:border-[#f6cf3f] font-mono rounded"
                />
              </div>

              {/* Toggle Immediate Publish */}
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={publishImmediately}
                  onChange={e => setPublishImmediately(e.target.checked)}
                  className="accent-[#f6cf3f] w-4 h-4"
                />
                <span className="font-bold">Миттєво оновити публічний каталог на сайті після збереження</span>
              </label>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="px-4 py-2 bg-[#182226] hover:bg-[#223037] border-2 border-zinc-600 hover:border-[#f6cf3f] text-xs font-bold text-white transition-colors cursor-pointer rounded shadow-sm"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={isApplyingRelease}
                  className="comic-btn-yellow px-5 py-2 text-xs font-extrabold cursor-pointer disabled:opacity-50"
                >
                  {isApplyingRelease ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Підтвердити та Застосувати Реліз</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
