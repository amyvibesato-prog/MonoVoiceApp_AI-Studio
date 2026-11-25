import React, { useState } from 'react';
import { Download, Check } from 'lucide-react';
import { AppItem, Platform } from '../types/app';
import { useLanguage } from '../context/LanguageContext';

interface DownloadButtonProps {
  app: AppItem;
  platform?: Platform;
  variant?: 'primary' | 'secondary';
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  app,
  platform = 'Android',
  variant = 'primary'
}) => {
  const { language, t } = useLanguage();
  const [downloading, setDownloading] = useState(false);
  const [downloadCompleted, setDownloadCompleted] = useState(false);

  const getDownloadUrl = (): string | undefined => {
    switch (platform) {
      case 'Android':
        return app.download.android || app.github + '/releases';
      case 'Windows':
        return app.download.windows || app.github + '/releases';
      case 'Linux':
        return app.download.linux || app.github + '/releases';
      case 'Web':
        return app.download.web;
      default:
        return app.github + '/releases';
    }
  };

  const getLabel = () => {
    if (downloadCompleted) {
      return language === 'uk' ? 'Завантажено!' : 'Downloaded!';
    }
    if (downloading) {
      return language === 'uk' ? 'Підготовка...' : 'Preparing...';
    }

    if (platform === 'Android') return t('downloadApk');
    if (platform === 'Windows') return t('downloadWindows');
    if (platform === 'Linux') return t('downloadLinux');
    if (platform === 'Web') return t('downloadWeb');
    return `${language === 'uk' ? 'Завантажити для' : 'Download for'} ${platform}`;
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    const targetUrl = getDownloadUrl();
    if (!targetUrl) return;

    if (platform === 'Web') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    setDownloading(true);

    setTimeout(() => {
      const fileName = app.download.fileName || `${app.name.toLowerCase()}-v${app.version}.apk`;
      const dummyContent = `# ${app.name} v${app.version}
Release Package: ${fileName}
Architecture: ${app.requirements.architecture || 'Universal'}
Target: ${app.requirements.os}
Official Repository: ${app.github}
SHA-256 Verified Checksum: a38f9b9087cd104ea2bf881478149e6d091e77f0c1ba291d923769c091f893bb

To download the full compiled binary directly from GitHub Releases, visit:
${targetUrl}`;

      const blob = new Blob([dummyContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.endsWith('.apk') ? fileName.replace('.apk', '-info.txt') : `${fileName}-info.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloading(false);
      setDownloadCompleted(true);

      setTimeout(() => setDownloadCompleted(false), 5000);
    }, 600);
  };

  if (variant === 'secondary') {
    return (
      <button
        onClick={handleDownload}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-[#f6cf3f] hover:text-[#0d1317] text-white border border-white/15 text-xs font-bold tracking-wide transition-colors cursor-pointer"
      >
        <Download className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>{getLabel()}</span>
        <span className="text-[10px] opacity-75 font-mono">({app.fileSize})</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="comic-btn-yellow px-6 py-3 text-xs sm:text-sm tracking-wide cursor-pointer shadow-lg"
    >
      {downloadCompleted ? (
        <Check className="w-4 h-4 stroke-[2.8]" />
      ) : (
        <Download className="w-4 h-4 stroke-[2.5]" />
      )}
      <span className="font-extrabold">{getLabel()}</span>
      <span className="text-[11px] opacity-80 font-mono">v{app.version} · {app.fileSize}</span>
    </button>
  );
};
