import React, { useState, useMemo } from 'react';
import {
  Code,
  Copy,
  Check,
  Download,
  Smartphone,
  Monitor,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  FileCode,
  Layers,
  ArrowRight,
  HelpCircle,
  FolderDown,
  Terminal
} from 'lucide-react';
import { AdobeScriptItem } from '../data/adobeScripts';
import { AppService } from '../services/appService';
import { AppItem } from '../types/app';
import { ComicAppIconBadge } from '../components/AppCard';
import { useLanguage } from '../context/LanguageContext';

interface ScriptsAndAppsPageProps {
  onSelectApp: (slug: string) => void;
}

type TabType = 'all' | 'adobe' | 'android' | 'pc';

export const ScriptsAndAppsPage: React.FC<ScriptsAndAppsPageProps> = ({ onSelectApp }) => {
  const { language, t } = useLanguage();

  const [adobeScripts, setAdobeScripts] = useState<AdobeScriptItem[]>([]);
  const [publishedApps, setPublishedApps] = useState<AppItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('adobe');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdobeApp, setSelectedAdobeApp] = useState<string>('all');
  const [expandedScriptId, setExpandedScriptId] = useState<string | null>(null);
  const [copiedCodeScriptId, setCopiedCodeScriptId] = useState<string | null>(null);

  // Fetch scripts and apps via AppService
  React.useEffect(() => {
    AppService.getAdobeScripts().then(setAdobeScripts);
    AppService.getPublishedApps().then(setPublishedApps);
  }, []);

  // Filter Android Apps
  const androidApps = useMemo(() => {
    return publishedApps.filter(app => app.platforms.includes('Android'));
  }, [publishedApps]);

  // Filter PC Apps (Windows, Linux, macOS)
  const pcApps = useMemo(() => {
    return publishedApps.filter(app =>
      app.platforms.some(p => p === 'Windows' || p === 'Linux' || p === 'macOS')
    );
  }, [publishedApps]);

  // Filter Adobe Scripts based on search & sub-filter
  const filteredAdobeScripts = useMemo(() => {
    return adobeScripts.filter(script => {
      if (selectedAdobeApp !== 'all' && script.adobeApp !== selectedAdobeApp) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = script.name.toLowerCase().includes(q);
        const matchTaglineUk = script.tagline.uk.toLowerCase().includes(q);
        const matchTaglineEn = script.tagline.en.toLowerCase().includes(q);
        const matchDescUk = script.description.uk.toLowerCase().includes(q);
        const matchDescEn = script.description.en.toLowerCase().includes(q);
        const matchApp = script.adobeApp.toLowerCase().includes(q);
        if (!matchName && !matchTaglineUk && !matchTaglineEn && !matchDescUk && !matchDescEn && !matchApp) {
          return false;
        }
      }
      return true;
    });
  }, [adobeScripts, selectedAdobeApp, searchQuery]);

  // Filter Android Apps based on search
  const filteredAndroidApps = useMemo(() => {
    return androidApps.filter(app => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        app.name.toLowerCase().includes(q) ||
        app.tagline.uk.toLowerCase().includes(q) ||
        app.tagline.en.toLowerCase().includes(q) ||
        app.description.uk.toLowerCase().includes(q) ||
        app.description.en.toLowerCase().includes(q)
      );
    });
  }, [androidApps, searchQuery]);

  // Filter PC Apps based on search
  const filteredPcApps = useMemo(() => {
    return pcApps.filter(app => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        app.name.toLowerCase().includes(q) ||
        app.tagline.uk.toLowerCase().includes(q) ||
        app.tagline.en.toLowerCase().includes(q) ||
        app.description.uk.toLowerCase().includes(q) ||
        app.description.en.toLowerCase().includes(q)
      );
    });
  }, [pcApps, searchQuery]);

  const handleCopyCode = (script: AdobeScriptItem) => {
    navigator.clipboard.writeText(script.codeSnippet);
    setCopiedCodeScriptId(script.id);
    setTimeout(() => {
      setCopiedCodeScriptId(null);
    }, 2500);
  };

  const handleDownloadScript = (script: AdobeScriptItem) => {
    const blob = new Blob([script.codeSnippet], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = script.downloadFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-8 pb-20 pt-6 select-none">
      {/* Header Eyebrow & Title */}
      <div className="space-y-3">
        <div className="inline-block transform -rotate-3 origin-left">
          <div className="comic-eyebrow-strip px-5 py-1">
            <span className="font-impact text-xs uppercase tracking-wider text-[#0b1013]">
              {language === 'uk' ? 'АДОБ СКРИПТИ, АНДРОЇД ТА ПК' : 'ADOBE SCRIPTS, ANDROID & PC'}
            </span>
          </div>
        </div>
        <h1 className="font-impact text-3xl sm:text-5xl uppercase tracking-tight text-[#0b1114] dark:text-white transform -rotate-1">
          {language === 'uk' ? 'Скрипти Adobe та Програми' : 'Adobe Scripts & Applications'}
        </h1>
        <p className="text-sm sm:text-base font-medium text-[#0c181b] dark:text-zinc-200 max-w-2xl leading-relaxed">
          {language === 'uk'
            ? 'Колекція скриптів ExtendScript / JSX для Adobe After Effects, Premiere Pro, Photoshop та Illustrator, а також незалежні програми для Android та ПК.'
            : 'Dedicated library of ExtendScript / JSX automation tools for Adobe programs alongside standalone Android & PC desktop applications.'}
        </p>
      </div>

      {/* Primary Category Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-[#0d1317]/20 dark:border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('adobe')}
          className={`flex items-center gap-2 px-5 py-2.5 font-impact uppercase text-sm sm:text-base tracking-wide transition-all cursor-pointer ${
            activeTab === 'adobe'
              ? 'bg-[#0d1317] text-[#f6cf3f] border-2 border-[#f6cf3f] shadow-[0_6px_16px_rgba(0,0,0,0.3)] transform -rotate-1'
              : 'bg-white/10 text-[#0d1317] dark:text-white hover:bg-white/20'
          }`}
        >
          <Code className="w-4 h-4 text-[#f6cf3f]" />
          <span>{language === 'uk' ? 'Скрипти Adobe' : 'Adobe Scripts'}</span>
          <span className="px-2 py-0.5 text-xs rounded bg-[#f6cf3f] text-[#0d1317] font-bold">
            {adobeScripts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('android')}
          className={`flex items-center gap-2 px-5 py-2.5 font-impact uppercase text-sm sm:text-base tracking-wide transition-all cursor-pointer ${
            activeTab === 'android'
              ? 'bg-[#0d1317] text-[#f6cf3f] border-2 border-[#f6cf3f] shadow-[0_6px_16px_rgba(0,0,0,0.3)] transform -rotate-1'
              : 'bg-white/10 text-[#0d1317] dark:text-white hover:bg-white/20'
          }`}
        >
          <Smartphone className="w-4 h-4 text-[#f6cf3f]" />
          <span>{language === 'uk' ? 'Андроїд Програми' : 'Android Apps'}</span>
          <span className="px-2 py-0.5 text-xs rounded bg-[#f6cf3f] text-[#0d1317] font-bold">
            {androidApps.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pc')}
          className={`flex items-center gap-2 px-5 py-2.5 font-impact uppercase text-sm sm:text-base tracking-wide transition-all cursor-pointer ${
            activeTab === 'pc'
              ? 'bg-[#0d1317] text-[#f6cf3f] border-2 border-[#f6cf3f] shadow-[0_6px_16px_rgba(0,0,0,0.3)] transform -rotate-1'
              : 'bg-white/10 text-[#0d1317] dark:text-white hover:bg-white/20'
          }`}
        >
          <Monitor className="w-4 h-4 text-[#f6cf3f]" />
          <span>{language === 'uk' ? 'ПК Програми' : 'PC Programs'}</span>
          <span className="px-2 py-0.5 text-xs rounded bg-[#f6cf3f] text-[#0d1317] font-bold">
            {pcApps.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-5 py-2.5 font-impact uppercase text-sm sm:text-base tracking-wide transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-[#0d1317] text-[#f6cf3f] border-2 border-[#f6cf3f] shadow-[0_6px_16px_rgba(0,0,0,0.3)] transform -rotate-1'
              : 'bg-white/10 text-[#0d1317] dark:text-white hover:bg-white/20'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#f6cf3f]" />
          <span>{language === 'uk' ? 'Всі розробки' : 'All Items'}</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="comic-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#f6cf3f]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={
              language === 'uk'
                ? 'Пошук скриптів та програм...'
                : 'Search scripts, features or keywords...'
            }
            className="w-full pl-10 pr-9 py-2.5 bg-white/5 border border-white/15 text-xs sm:text-sm text-white placeholder:text-zinc-400 focus:outline-none focus:border-[#f6cf3f]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-[#f6cf3f]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Adobe sub-filter if adobe or all tab is selected */}
        {(activeTab === 'adobe' || activeTab === 'all') && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider shrink-0">
              {language === 'uk' ? 'Програма Adobe:' : 'Adobe App:'}
            </span>
            {['all', 'After Effects', 'Premiere Pro', 'Photoshop', 'Illustrator'].map(app => (
              <button
                key={app}
                onClick={() => setSelectedAdobeApp(app)}
                className={`px-3 py-1 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedAdobeApp === app
                    ? 'bg-[#f6cf3f] text-[#0d1317]'
                    : 'bg-white/10 text-zinc-300 hover:bg-white/20 hover:text-white'
                }`}
              >
                {app === 'all' ? (language === 'uk' ? 'Усі Adobe' : 'All Adobe') : app}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: ADOBE SCRIPTS                                 */}
      {/* ========================================================= */}
      {(activeTab === 'adobe' || activeTab === 'all') && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-brush text-2xl sm:text-3xl text-[#0b1114] dark:text-[#f6cf3f] flex items-center gap-2">
              <FileCode className="w-6 h-6 text-[#f6cf3f]" />
              <span>{language === 'uk' ? 'Скрипти для Adobe (ExtendScript / JSX)' : 'Adobe ExtendScript / JSX Tools'}</span>
            </h2>
            <span className="text-xs font-mono font-bold text-[#0d1317] dark:text-zinc-300">
              {filteredAdobeScripts.length} {language === 'uk' ? 'знайдено' : 'items'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredAdobeScripts.map(script => {
              const isExpanded = expandedScriptId === script.id;
              const isCopied = copiedCodeScriptId === script.id;

              return (
                <div
                  key={script.id}
                  className="comic-card p-6 flex flex-col justify-between border-l-4 border-l-[#f6cf3f] space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider border ${script.appBadgeColor}`}>
                        {script.adobeApp}
                      </span>
                      <div className="flex items-center gap-2 text-xs font-mono text-[#f6cf3f]">
                        <span>v{script.version}</span>
                        <span>·</span>
                        <span className="text-zinc-300">{script.fileFormat}</span>
                      </div>
                    </div>

                    {/* Title & Tagline */}
                    <div>
                      <h3 className="font-brush text-2xl text-[#fff6c5]">
                        {script.name}
                      </h3>
                      <p className="text-xs sm:text-sm font-semibold text-[#f6cf3f] mt-1">
                        {script.tagline[language] || script.tagline.uk}
                      </p>
                    </div>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-zinc-200/90 leading-relaxed">
                      {script.description[language] || script.description.uk}
                    </p>

                    {/* Features List */}
                    <div className="bg-black/30 p-3 rounded space-y-1.5 border border-white/5">
                      <span className="text-xs font-bold text-[#f6cf3f] uppercase tracking-wider block">
                        {language === 'uk' ? 'Можливості скрипту:' : 'Key Capabilities:'}
                      </span>
                      <ul className="space-y-1 text-xs text-zinc-200">
                        {(script.features[language] || script.features.uk).map((f, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-[#f6cf3f] shrink-0">✓</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Actions & Code Controls */}
                  <div className="pt-3 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <button
                        onClick={() => handleDownloadScript(script)}
                        className="comic-btn-yellow px-4 py-2 text-xs font-extrabold cursor-pointer"
                      >
                        <Download className="w-4 h-4 stroke-[2.5]" />
                        <span>{language === 'uk' ? 'Завантажити .jsx' : 'Download .jsx'}</span>
                      </button>

                      <button
                        onClick={() => handleCopyCode(script)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400">{language === 'uk' ? 'Скопійовано!' : 'Copied!'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-[#f6cf3f]" />
                            <span>{language === 'uk' ? 'Копіювати код' : 'Copy Code'}</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setExpandedScriptId(isExpanded ? null : script.id)}
                        className="flex items-center gap-1 text-xs font-bold text-[#f6cf3f] hover:underline cursor-pointer ml-auto"
                      >
                        <span>{isExpanded ? (language === 'uk' ? 'Сховати код' : 'Hide Code') : (language === 'uk' ? 'Переглянути код' : 'View Code')}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Expandable Code & Installation Panel */}
                    {isExpanded && (
                      <div className="mt-3 space-y-3 pt-3 border-t border-white/10">
                        {/* Code Box */}
                        <div className="relative bg-[#05080a] border border-white/20 rounded p-3 overflow-x-auto">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs font-mono text-zinc-400">
                            <span>{script.downloadFileName}</span>
                            <button
                              onClick={() => handleCopyCode(script)}
                              className="text-[#f6cf3f] hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{language === 'uk' ? 'Скопіювати' : 'Copy'}</span>
                            </button>
                          </div>
                          <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed max-h-60 overflow-y-auto">
                            {script.codeSnippet}
                          </pre>
                        </div>

                        {/* Installation Steps */}
                        <div className="bg-white/5 p-3 rounded space-y-1.5 text-xs text-zinc-200">
                          <span className="font-bold text-[#f6cf3f] block">
                            💡 {language === 'uk' ? 'Як встановити та запустити:' : 'How to install & execute:'}
                          </span>
                          <ol className="list-decimal list-inside space-y-1 text-zinc-300">
                            {(script.installationGuide[language] || script.installationGuide.uk).map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 2: ANDROID APPLICATIONS                            */}
      {/* ========================================================= */}
      {(activeTab === 'android' || activeTab === 'all') && (
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-brush text-2xl sm:text-3xl text-[#0b1114] dark:text-[#f6cf3f] flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-[#f6cf3f]" />
              <span>{language === 'uk' ? 'Програми для Android (APK)' : 'Android APK Applications'}</span>
            </h2>
            <span className="text-xs font-mono font-bold text-[#0d1317] dark:text-zinc-300">
              {filteredAndroidApps.length} {language === 'uk' ? 'програм' : 'apps'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndroidApps.map(app => (
              <div
                key={app.id}
                className="comic-card p-6 flex flex-col justify-between space-y-4 hover:-translate-y-1 transition-transform cursor-pointer"
                onClick={() => onSelectApp(app.slug)}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <ComicAppIconBadge iconType={app.iconType} />
                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-[#f6cf3f] text-[#0d1317]">
                      Android APK
                    </span>
                  </div>

                  <div>
                    <h3 className="font-brush text-2xl text-[#fff6c5]">
                      {app.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-200 mt-1 line-clamp-2">
                      {app.description[language] || app.description.uk}
                    </p>
                  </div>

                  <div className="text-xs font-mono text-[#f6cf3f] space-y-1">
                    <div>ОС: {app.requirements.os}</div>
                    <div>Розмір: {app.fileSize} · v{app.version}</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <span className="comic-btn-yellow px-4 py-1.5 text-xs font-extrabold">
                    <span>{language === 'uk' ? 'Детальніше & Завантажити' : 'Details & APK'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 3: PC APPLICATIONS (Windows, Linux, Web)           */}
      {/* ========================================================= */}
      {(activeTab === 'pc' || activeTab === 'all') && (
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-brush text-2xl sm:text-3xl text-[#0b1114] dark:text-[#f6cf3f] flex items-center gap-2">
              <Monitor className="w-6 h-6 text-[#f6cf3f]" />
              <span>{language === 'uk' ? 'Програми для ПК (Windows, Linux, Web)' : 'PC Desktop Utilities & Web'}</span>
            </h2>
            <span className="text-xs font-mono font-bold text-[#0d1317] dark:text-zinc-300">
              {filteredPcApps.length} {language === 'uk' ? 'програм' : 'apps'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPcApps.map(app => (
              <div
                key={app.id}
                className="comic-card p-6 flex flex-col justify-between space-y-4 hover:-translate-y-1 transition-transform cursor-pointer"
                onClick={() => onSelectApp(app.slug)}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <ComicAppIconBadge iconType={app.iconType} />
                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-[#f6cf3f] text-[#0d1317]">
                      {app.platforms.join(' / ')}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-brush text-2xl text-[#fff6c5]">
                      {app.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-200 mt-1 line-clamp-2">
                      {app.description[language] || app.description.uk}
                    </p>
                  </div>

                  <div className="text-xs font-mono text-[#f6cf3f] space-y-1">
                    <div>Вимоги: {app.requirements.os}</div>
                    <div>Розмір: {app.fileSize} · v{app.version}</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <span className="comic-btn-yellow px-4 py-1.5 text-xs font-extrabold">
                    <span>{language === 'uk' ? 'Переглянути & Завантажити' : 'Details & Download'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Helpful Adobe Script Setup Guide Footer Box */}
      <div className="comic-card p-6 sm:p-7 space-y-4 mt-8 border-t-4 border-t-[#f6cf3f]">
        <div className="flex items-center gap-3">
          <HelpCircle className="w-6 h-6 text-[#f6cf3f] shrink-0" />
          <h3 className="font-brush text-2xl text-[#f6cf3f]">
            {language === 'uk' ? 'Як правильно користуватися скриптами Adobe?' : 'How to install and use Adobe ExtendScript files?'}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm text-zinc-200">
          <div className="bg-white/5 p-4 rounded space-y-1.5">
            <span className="font-bold text-[#f6cf3f] block">1. Завантажте `.jsx` файл</span>
            <p className="leading-relaxed">
              Натисніть кнопку "Завантажити .jsx" під потрібним скриптом або скопіюйте код безпосередньо у текстовий редактор.
            </p>
          </div>
          <div className="bg-white/5 p-4 rounded space-y-1.5">
            <span className="font-bold text-[#f6cf3f] block">2. Помістіть у папку Scripts</span>
            <p className="leading-relaxed">
              Для After Effects або Photoshop скопіюйте файл у папку `Scripts/ScriptUI Panels` для зручного відображення як окремої панелі.
            </p>
          </div>
          <div className="bg-white/5 p-4 rounded space-y-1.5">
            <span className="font-bold text-[#f6cf3f] block">3. Надайте дозволи у налаштуваннях</span>
            <p className="leading-relaxed">
              У налаштуваннях програмі (Preferences -&gt; Scripting &amp; Expressions) обов’язково увімкніть "Allow Scripts to Write Files".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
