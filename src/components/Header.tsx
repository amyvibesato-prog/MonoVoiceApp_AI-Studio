import React, { useState } from 'react';
import { Sun, Moon, Settings, Menu, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPath, onNavigate }) => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const navItems = [
    { label: t('navApps'), path: '/', matchPaths: ['/', '/apps'] },
    { label: language === 'uk' ? 'Скрипти та Софт' : 'Scripts & Apps', path: '/scripts', matchPaths: ['/scripts'] },
    { label: t('navProjects'), path: '/projects', matchPaths: ['/projects'] },
    { label: t('navAbout'), path: '/about', matchPaths: ['/about'] },
    { label: t('navContacts'), path: '/about#contacts', matchPaths: ['/about#contacts'] },
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.path === '/' && (currentPath === '/' || currentPath.startsWith('/app/'))) {
      return true;
    }
    return currentPath === item.path;
  };

  const handleNavClick = (path: string) => {
    if (path === '/about#contacts') {
      onNavigate('/about');
      setTimeout(() => {
        const el = document.getElementById('contacts-section');
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      onNavigate(path);
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="relative z-40 w-full max-w-6xl mx-auto px-3.5 sm:px-6 pt-3 sm:pt-4 pb-2 select-none">
      <div className="flex items-center justify-between gap-2 sm:gap-4 w-full">
        
        {/* Left / Main Black Brush Banner */}
        <div
          className="relative flex-1 min-w-0 max-w-[790px] flex items-center justify-between md:justify-start px-2.5 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2.5 bg-[#0d1317] text-white shadow-[0_10px_22px_rgba(9,18,21,0.35)]"
          style={{
            clipPath: 'polygon(0.8% 8%, 99.6% 0%, 97.5% 94%, 99.2% 100%, 0.4% 96%, 0% 42%)'
          }}
        >
          {/* Subtle yellow bottom brush accent on left */}
          <div className="absolute bottom-0 left-3 w-20 sm:w-24 h-[3px] bg-[#f6cf3f]/80 pointer-events-none" />

          {/* Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
            <div
              onClick={() => handleNavClick('/')}
              className="relative w-8 h-8 sm:w-10 sm:h-10 -my-0.5 sm:-my-1 bg-[#0d1317] border-2 border-[#f6cf3f] shadow-[0_0_0_2px_#67cdcc] transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer overflow-hidden shrink-0"
            >
              <img
                src="/brand-logo.jpg"
                alt="MonoVoice Logo"
                className="w-full h-full object-cover"
              />
            </div>

            <button
              onClick={() => handleNavClick('/')}
              className="font-brush text-lg sm:text-[26px] text-[#f6cf3f] hover:text-[#ffe05d] tracking-wide transition-colors cursor-pointer leading-none pb-0.5 whitespace-nowrap"
            >
              MonoVoice
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-2.5 lg:gap-5 ml-2 md:ml-3 lg:ml-6 pr-1">
            {navItems.map(item => {
              const active = isActive(item);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`relative py-1 text-xs md:text-sm font-bold tracking-wide whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'text-[#f6cf3f]'
                      : 'text-zinc-200 hover:text-[#f6cf3f]'
                  }`}
                >
                  <span>{item.label}</span>
                  {active && (
                    <span
                      className="absolute left-0 -bottom-1 w-full h-[3px] bg-[#f6cf3f]"
                      style={{
                        clipPath: 'polygon(0% 20%, 96% 0%, 100% 85%, 4% 100%)'
                      }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1 text-[#f6cf3f] hover:text-white transition-colors cursor-pointer shrink-0 ml-auto"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Right Black Brush Island (Settings/Lang & Theme Toggle) */}
        <div className="relative flex items-center shrink-0">
          <div
            className="flex items-center gap-1.5 sm:gap-3 pl-5 pr-3 sm:pl-8 sm:pr-5 py-2 sm:py-2.5 bg-[#0d1317] text-[#f6cf3f] shadow-[0_10px_22px_rgba(9,18,21,0.35)]"
            style={{
              clipPath: 'polygon(0% 62%, 22% 8%, 97% 0%, 100% 88%, 88% 100%, 16% 94%)'
            }}
          >
            {/* Language Settings Trigger */}
            <button
              onClick={() => setSettingsOpen(prev => !prev)}
              className="p-1 text-[#f6cf3f] hover:text-[#ffe05d] hover:rotate-45 transition-all cursor-pointer"
              title={language === 'uk' ? 'Мова інтерфейсу' : 'Language'}
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </button>

            {/* Theme Toggle (Sun / Moon) */}
            <button
              onClick={toggleTheme}
              className="p-1 text-[#f6cf3f] hover:text-[#ffe05d] hover:scale-110 transition-all cursor-pointer"
              title={theme === 'dark' ? 'Turquoise Mode' : 'Night Mode'}
            >
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              ) : (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              )}
            </button>
          </div>

          {/* Language Popover Dropdown */}
          {settingsOpen && (
            <div className="absolute right-0 top-13 sm:top-14 w-48 sm:w-52 p-3.5 bg-[#0d1317] border-2 border-[#f6cf3f] text-white shadow-2xl z-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#f6cf3f]">
                  {language === 'uk' ? 'Мова сайту' : 'Language'}
                </span>
                <div className="flex items-center gap-1 bg-white/10 p-0.5">
                  <button
                    onClick={() => {
                      setLanguage('uk');
                      setSettingsOpen(false);
                    }}
                    className={`px-2.5 py-1 text-xs font-bold cursor-pointer ${
                      language === 'uk' ? 'bg-[#f6cf3f] text-[#0d1317]' : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    UA
                  </button>
                  <button
                    onClick={() => {
                      setLanguage('en');
                      setSettingsOpen(false);
                    }}
                    className={`px-2.5 py-1 text-xs font-bold cursor-pointer ${
                      language === 'en' ? 'bg-[#f6cf3f] text-[#0d1317]' : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    EN
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 p-4 bg-[#0d1317] border-2 border-[#f6cf3f] text-white space-y-2.5 shadow-2xl">
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`block w-full text-left py-2 text-base font-bold ${
                isActive(item) ? 'text-[#f6cf3f]' : 'text-zinc-200'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => handleNavClick('/apps')}
            className="block w-full text-left py-2 text-base font-bold text-zinc-200"
          >
            {language === 'uk' ? 'Каталог усіх програм' : 'Full App Catalog'}
          </button>
        </div>
      )}
    </header>
  );
};
