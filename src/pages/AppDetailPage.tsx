import React, { useState } from 'react';
import {
  ArrowLeft,
  Share2,
  Github,
  Check,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { AppItem } from '../types/app';
import { DownloadButton } from '../components/DownloadButton';
import { ScreenshotGallery } from '../components/ScreenshotGallery';
import { ComicAppIconBadge } from '../components/AppCard';
import { useLanguage } from '../context/LanguageContext';

interface AppDetailPageProps {
  app: AppItem;
  onBack: () => void;
}

export const AppDetailPage: React.FC<AppDetailPageProps> = ({ app, onBack }) => {
  const { language, t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="w-full space-y-8 pb-20 pt-4 select-none">
      {/* Top Breadcrumb & Share */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0d1317] text-[#f6cf3f] text-xs font-extrabold uppercase tracking-wider hover:bg-[#141e24] transition-colors cursor-pointer shadow"
          style={{ clipPath: 'polygon(3% 0%, 100% 5%, 97% 100%, 0% 95%)' }}
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>{t('backToApps')}</span>
        </button>

        <div className="flex items-center gap-2.5">
          <a
            href={app.github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0d1317] text-white hover:text-[#f6cf3f] text-xs font-bold transition-colors shadow"
          >
            <Github className="w-4 h-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0d1317] text-white hover:text-[#f6cf3f] text-xs font-bold transition-colors cursor-pointer shadow"
          >
            {copied ? <Check className="w-4 h-4 text-[#f6cf3f]" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? t('linkCopied') : t('shareApp')}</span>
          </button>
        </div>
      </div>

      {/* Hero App Header Card */}
      <div className="comic-card p-6 sm:p-10 overflow-hidden">
        <svg
          viewBox="0 0 800 260"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <polygon points="735,0 800,0 800,65 765,95 775,25" fill="#f6cf3f" />
          <polygon points="0,210 24,185 14,260 0,260" fill="#f6cf3f" opacity="0.85" />
        </svg>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <ComicAppIconBadge iconType={app.iconType} size="lg" />

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#f6cf3f] font-mono font-bold">
                <span>{app.platforms.join(' · ')}</span>
                <span>·</span>
                <span>v{app.version}</span>
                <span>·</span>
                <span>{app.fileSize}</span>
              </div>

              <h1 className="font-brush text-3xl sm:text-5xl text-[#fff6c5] tracking-wide">
                {app.name}
              </h1>

              <p className="text-sm sm:text-base text-zinc-200 max-w-xl leading-relaxed">
                {app.tagline[language] || app.tagline.uk}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 lg:min-w-[230px]">
            <DownloadButton app={app} platform={app.platforms[0]} variant="primary" />

            {app.platforms.length > 1 && (
              <div className="flex flex-col gap-2 pt-1">
                {app.platforms.slice(1).map(p => (
                  <DownloadButton key={p} app={app} platform={p} variant="secondary" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Description Card */}
          <div className="comic-card p-6 sm:p-8 space-y-4">
            <h2 className="font-brush text-2xl sm:text-3xl text-[#f6cf3f]">
              {language === 'uk' ? 'Опис програми' : 'Description'}
            </h2>
            <div className="space-y-3 text-sm sm:text-[15px] text-zinc-200 leading-relaxed">
              {(app.longDescription[language] || app.longDescription.uk).map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Features Card */}
          <div className="comic-card p-6 sm:p-8 space-y-4">
            <h2 className="font-brush text-2xl sm:text-3xl text-[#f6cf3f]">
              {t('featuresSection')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {(app.features[language] || app.features.uk).map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 bg-white/5 border border-white/10"
                >
                  <div className="w-5 h-5 bg-[#f6cf3f] text-[#0d1317] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span className="text-xs sm:text-sm text-zinc-100 leading-snug">
                    {feat}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Screenshots */}
          {app.screenshots.length > 0 && (
            <div className="comic-card p-6 sm:p-8 space-y-4">
              <h2 className="font-brush text-2xl sm:text-3xl text-[#f6cf3f]">
                {t('screenshotsSection')}
              </h2>
              <ScreenshotGallery screenshots={app.screenshots} appName={app.name} />
            </div>
          )}

          {/* Changelog */}
          <div className="comic-card p-6 sm:p-8 space-y-5">
            <h2 className="font-brush text-2xl sm:text-3xl text-[#f6cf3f]">
              {t('changelogSection')}
            </h2>
            <div className="space-y-5">
              {app.changelog.map((log, index) => (
                <div
                  key={log.version}
                  className="relative pl-6 pb-5 border-l-2 border-[#f6cf3f]/40 last:pb-0"
                >
                  <div
                    className={`absolute -left-[7px] top-1 w-3 h-3 rotate-45 ${
                      index === 0 ? 'bg-[#f6cf3f]' : 'bg-zinc-600'
                    }`}
                  />
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-[#f6cf3f]">
                        v{log.version}
                      </span>
                      {index === 0 && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-[#f6cf3f] text-[#0d1317]">
                          {t('latestVersion')}
                        </span>
                      )}
                      <span className="text-xs text-zinc-400 font-mono">{log.date}</span>
                    </div>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-zinc-200">
                      {(log.changes[language] || log.changes.uk).map((change, cIdx) => (
                        <li key={cIdx} className="flex items-start gap-2">
                          <span className="text-[#f6cf3f] select-none">✦</span>
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Specs & Direct Delivery */}
        <div className="lg:col-span-4 space-y-6">
          <div className="comic-card p-6 space-y-4">
            <h3 className="font-brush text-2xl text-[#f6cf3f]">
              {t('requirementsSection')}
            </h3>

            <div className="space-y-3 text-xs sm:text-sm divide-y divide-white/10">
              <div className="flex justify-between py-2 gap-2">
                <span className="text-zinc-400">{t('osLabel')}</span>
                <span className="text-zinc-100 font-semibold text-right">{app.requirements.os}</span>
              </div>

              {app.requirements.architecture && (
                <div className="flex justify-between py-2 gap-2">
                  <span className="text-zinc-400">{t('architectureLabel')}</span>
                  <span className="text-zinc-100 font-mono text-right">{app.requirements.architecture}</span>
                </div>
              )}

              <div className="flex justify-between py-2 gap-2">
                <span className="text-zinc-400">{t('fileSizeLabel')}</span>
                <span className="text-[#f6cf3f] font-mono font-bold">{app.fileSize}</span>
              </div>

              <div className="flex justify-between py-2 gap-2">
                <span className="text-zinc-400">{t('releasedOn')}</span>
                <span className="text-zinc-100 font-mono">{app.releaseDate}</span>
              </div>

              <div className="flex justify-between py-2 gap-2">
                <span className="text-zinc-400">{t('licenseLabel')}</span>
                <span className="text-zinc-100 font-semibold">MIT Open Source</span>
              </div>
            </div>

            {app.requirements.permissions && (
              <div className="pt-3 border-t border-white/10 space-y-2">
                <span className="text-xs font-bold text-[#f6cf3f] uppercase">
                  {language === 'uk' ? 'Дозволи' : 'Permissions'}
                </span>
                <ul className="space-y-1.5 text-xs text-zinc-300">
                  {(app.requirements.permissions[language] || app.requirements.permissions.uk).map((perm, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Shield className="w-3.5 h-3.5 text-[#f6cf3f] shrink-0 mt-0.5" />
                      <span>{perm}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="comic-card p-6 space-y-3">
            <h3 className="font-brush text-2xl text-[#f6cf3f]">
              {language === 'uk' ? 'Прямий доступ' : 'Direct Delivery'}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              {language === 'uk'
                ? 'Усі бінарні файли розміщені на офіційних релізах GitHub з перевіркою контрольних сум SHA-256.'
                : 'All binaries are served directly from official GitHub Releases with verified SHA-256 checksums.'}
            </p>
            <a
              href={`${app.github}/releases`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#f6cf3f] hover:underline pt-1"
            >
              <span>{t('githubReleases')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
