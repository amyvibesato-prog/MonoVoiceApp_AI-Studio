import React, { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { AppCard } from '../components/AppCard';
import { AppService } from '../services/appService';
import { AppItem, Platform } from '../types/app';
import { useLanguage } from '../context/LanguageContext';

interface AppsCatalogPageProps {
  onSelectApp: (slug: string) => void;
}

export const AppsCatalogPage: React.FC<AppsCatalogPageProps> = ({ onSelectApp }) => {
  const { language, t } = useLanguage();

  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const platforms: { id: string; label: string }[] = [
    { id: 'all', label: t('allPlatforms') },
    { id: 'Android', label: 'Android' },
    { id: 'Windows', label: 'Windows' },
    { id: 'Web', label: 'Web' },
    { id: 'Linux', label: 'Linux' }
  ];

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: t('allCategories') },
    { id: 'Audio', label: language === 'uk' ? 'Аудіо' : 'Audio' },
    { id: 'Utility', label: language === 'uk' ? 'Утиліти' : 'Utility' },
    { id: 'Productivity', label: language === 'uk' ? 'Продуктивність' : 'Productivity' },
    { id: 'System', label: language === 'uk' ? 'Система' : 'System' },
    { id: 'Developer', label: language === 'uk' ? 'Розробка' : 'Developer' }
  ];

  // Fetch published apps via Data Access Layer
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    AppService.getPublishedApps({
      search: searchQuery,
      platform: selectedPlatform,
      category: selectedCategory,
    }).then(results => {
      if (isMounted) {
        setApps(results);
        setLoading(false);
      }
    }).catch(err => {
      console.error('Failed to load catalog data:', err);
      if (isMounted) {
        setApps([]);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [searchQuery, selectedPlatform, selectedCategory]);

  const hasActiveFilters = searchQuery !== '' || selectedPlatform !== 'all' || selectedCategory !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedPlatform('all');
    setSelectedCategory('all');
  };

  return (
    <div className="w-full space-y-8 pb-20 pt-6 select-none">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-block transform -rotate-3 origin-left">
          <div className="comic-eyebrow-strip px-5 py-1">
            <span className="font-impact text-xs uppercase tracking-wider text-[#0b1013]">
              {language === 'uk' ? 'КАТАЛОГ ПРОГРАМ' : 'APP DIRECTORY'}
            </span>
          </div>
        </div>
        <h1 className="font-impact text-4xl sm:text-5xl uppercase tracking-tight text-[#0b1114] dark:text-white transform -rotate-1">
          {t('catalogTitle')}
        </h1>
        <p className="text-sm sm:text-base font-medium text-[#0c181b] dark:text-zinc-200 max-w-xl">
          {t('catalogSubtitle')}
        </p>
      </div>

      {/* Search & Filter Panel inside Comic Black Card */}
      <div className="comic-card p-5 sm:p-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#f6cf3f]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-11 pr-10 py-3 bg-white/5 border border-white/15 text-xs sm:text-sm text-white placeholder:text-zinc-400 focus:outline-none focus:border-[#f6cf3f] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-[#f6cf3f] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Rows */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {platforms.map(p => {
              const active = selectedPlatform === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlatform(p.id)}
                  className={`px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#f6cf3f] text-[#0d1317]'
                      : 'bg-white/5 text-zinc-300 hover:text-[#f6cf3f] hover:bg-white/10'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 bg-[#0d1317] border border-white/20 text-xs font-bold text-zinc-100 focus:outline-none focus:border-[#f6cf3f] cursor-pointer"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs font-bold text-[#f6cf3f] hover:underline px-2 py-1 cursor-pointer"
              >
                {t('clearFilters')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading Skeleton / Loader */}
      {loading ? (
        <div className="comic-card py-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#f6cf3f] animate-spin" />
          <span className="text-xs font-mono font-bold text-zinc-300">
            {language === 'uk' ? 'Завантаження каталогу...' : 'Loading catalog records...'}
          </span>
        </div>
      ) : apps.length > 0 ? (
        /* Grid of Apps */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {apps.map((app, idx) => (
            <AppCard
              key={app.id}
              app={app}
              index={idx}
              onSelect={slug => onSelectApp(slug)}
            />
          ))}
        </div>
      ) : (
        /* Empty Catalog View */
        <div className="comic-card py-16 text-center space-y-4">
          <p className="text-sm font-medium text-zinc-300">{t('noAppsFound')}</p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="comic-btn-yellow px-5 py-2 text-xs font-extrabold cursor-pointer"
            >
              {t('clearFilters')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
