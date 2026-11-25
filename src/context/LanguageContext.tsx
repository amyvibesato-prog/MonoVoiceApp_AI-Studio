import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'uk';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  uk: {
    navApps: 'Програми',
    navProjects: 'Проєкти',
    navAbout: 'Про мене',
    navContacts: 'Контакти',
    heroBadge: 'МОЇ ПРОГРАМИ',
    heroTitleLine1: 'ІДЕЇ, ЯКІ',
    heroTitleLine2: 'ПРАЦЮЮТЬ',
    heroTagline: 'Невеликі інструменти, які роблять моє життя зручнішим, а ігри та задачі — ближчими.',
    browseApps: 'Усі програми',
    featuredAppLabel: 'Мої розробки',
    featuredSectionTitle: 'Обрані програми',
    viewAll: 'Усі програми',
    openApp: 'Відкрити',
    viewApp: 'Відкрити',
    download: 'Завантажити',
    downloadApk: 'Завантажити APK',
    downloadWindows: 'Завантажити для Windows',
    downloadLinux: 'Завантажити для Linux',
    downloadWeb: 'Відкрити Web-версію',
    sourceCode: 'Вихідний код на GitHub',
    aboutCardTitle: 'Про мене',
    aboutCardText: 'Трохи про мій шлях, інтереси та те, що надихає.',
    aboutCardBtn: 'Дізнатися більше',
    contactsCardTitle: 'Контакти',
    contactsCardText: 'Якщо є питання, ідеї або просто хочеш поговорити — я тут.',
    contactsCardBtn: 'Написати',
    footerMotto: '— КРАЩІ ІДЕЇ — ЗАВЖДИ В ГРІ —',
    catalogTitle: 'Усі програми',
    catalogSubtitle: 'Колекція незалежних утиліт та інструментів. Пряме завантаження без реклами.',
    searchPlaceholder: 'Пошук за назвою, тегом або платформою...',
    allPlatforms: 'Усі платформи',
    allCategories: 'Усі категорії',
    allStatuses: 'Будь-який статус',
    statusAvailable: 'Доступно',
    statusInDev: 'У розробці',
    noAppsFound: 'За вашим запитом не знайдено жодної програми.',
    clearFilters: 'Скинути фільтри',
    backToApps: 'Назад до програм',
    featuresSection: 'Можливості',
    screenshotsSection: 'Скріншоти та інтерфейс',
    requirementsSection: 'Системні вимоги',
    changelogSection: 'Історія змін',
    versionLabel: 'Версія',
    releasedOn: 'Оновлено',
    fileSizeLabel: 'Розмір',
    osLabel: 'ОС',
    architectureLabel: 'Архітектура',
    licenseLabel: 'Ліцензія',
    shareApp: 'Поділитися',
    linkCopied: 'Скопійовано!',
    inDevelopmentBadge: 'У розробці',
    latestVersion: 'Остання',
    footerTagline: 'Small apps. Real purpose.',
    allRightsReserved: 'Усі права захищено.',
    githubReleases: 'Усі релізи на GitHub'
  },
  en: {
    navApps: 'Apps',
    navProjects: 'Projects',
    navAbout: 'About Me',
    navContacts: 'Contacts',
    heroBadge: 'MY APPS',
    heroTitleLine1: 'IDEAS THAT',
    heroTitleLine2: 'ACTUALLY WORK',
    heroTagline: 'Small tools that make my daily life more convenient and bring games & workflows closer.',
    browseApps: 'All Apps',
    featuredAppLabel: 'Featured Apps',
    featuredSectionTitle: 'Featured Apps',
    viewAll: 'View all',
    openApp: 'Open',
    viewApp: 'Open',
    download: 'Download',
    downloadApk: 'Download APK',
    downloadWindows: 'Download for Windows',
    downloadLinux: 'Download for Linux',
    downloadWeb: 'Launch Web App',
    sourceCode: 'Source Code on GitHub',
    aboutCardTitle: 'About Me',
    aboutCardText: 'A bit about my journey, interests, and what inspires my work.',
    aboutCardBtn: 'Learn more',
    contactsCardTitle: 'Contacts',
    contactsCardText: 'If you have questions, ideas, or just want to chat — I am here.',
    contactsCardBtn: 'Write to me',
    footerMotto: '— BEST IDEAS — ALWAYS IN THE GAME —',
    catalogTitle: 'All Applications',
    catalogSubtitle: 'Complete directory of independent software and utilities. Direct downloads.',
    searchPlaceholder: 'Search apps by name, feature, or platform...',
    allPlatforms: 'All Platforms',
    allCategories: 'All Categories',
    allStatuses: 'All Status',
    statusAvailable: 'Available',
    statusInDev: 'In Development',
    noAppsFound: 'No applications match your current filter criteria.',
    clearFilters: 'Reset filters',
    backToApps: 'Back to Apps',
    featuresSection: 'Features',
    screenshotsSection: 'Screenshots & Interface',
    requirementsSection: 'System Requirements',
    changelogSection: 'Changelog & Releases',
    versionLabel: 'Version',
    releasedOn: 'Released',
    fileSizeLabel: 'Size',
    osLabel: 'OS',
    architectureLabel: 'Architecture',
    licenseLabel: 'License',
    shareApp: 'Share link',
    linkCopied: 'Link copied!',
    inDevelopmentBadge: 'In Development',
    latestVersion: 'Latest',
    footerTagline: 'Small apps. Real purpose.',
    allRightsReserved: 'All rights reserved.',
    githubReleases: 'All GitHub Releases'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('monovoice_lang_v2');
    return (saved as Language) || 'uk';
  });

  useEffect(() => {
    localStorage.setItem('monovoice_lang_v2', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || translations.uk[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
