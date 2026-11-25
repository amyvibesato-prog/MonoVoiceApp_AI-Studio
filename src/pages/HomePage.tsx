import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Send, Github, Mail, X, Check } from 'lucide-react';
import { AppCard } from '../components/AppCard';
import { MascotArtwork } from '../components/MascotArtwork';
import { AppService } from '../services/appService';
import { AppItem } from '../types/app';
import { useLanguage } from '../context/LanguageContext';

interface HomePageProps {
  onNavigate: (path: string) => void;
  onSelectApp: (slug: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectApp }) => {
  const { language, t } = useLanguage();
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [featuredApps, setFeaturedApps] = useState<AppItem[]>([]);

  // Top 3 featured apps loaded via Data Access Layer
  React.useEffect(() => {
    AppService.getPublishedApps({ featuredOnly: true }).then(apps => {
      setFeaturedApps(apps.slice(0, 3));
    });
  }, []);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('contact@monovoice.app');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const contactModal =
    contactModalOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-[#0b1114]/85 backdrop-blur-sm flex items-center justify-center p-4 select-none"
            onClick={() => setContactModalOpen(false)}
          >
            <div
              className="comic-card max-w-md w-full p-6 sm:p-7 border-2 border-[#f6cf3f] space-y-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-brush text-3xl text-[#f6cf3f]">{t('contactsCardTitle')}</h3>
                <button
                  onClick={() => setContactModalOpen(false)}
                  className="p-1 text-zinc-400 hover:text-[#f6cf3f] cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p className="text-sm text-zinc-200 leading-relaxed">
                {language === 'uk'
                  ? 'Зв’язатися зі мною щодо програм, баг-репортів або нових ідей можна напряму у Telegram, GitHub або поштою:'
                  : 'Reach out directly regarding apps, bug reports, or new tool ideas via Telegram, GitHub, or email:'}
              </p>

              <div className="space-y-3">
                <a
                  href="https://t.me/monovoice"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-3.5 bg-white/5 hover:bg-[#f6cf3f] hover:text-[#0d1317] text-white border border-white/10 transition-colors font-bold text-sm"
                >
                  <span className="flex items-center gap-3">
                    <Send className="w-4 h-4" />
                    <span>Telegram — @monovoice</span>
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                <a
                  href="https://github.com/monovoice"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-3.5 bg-white/5 hover:bg-[#f6cf3f] hover:text-[#0d1317] text-white border border-white/10 transition-colors font-bold text-sm"
                >
                  <span className="flex items-center gap-3">
                    <Github className="w-4 h-4" />
                    <span>GitHub — github.com/monovoice</span>
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                <button
                  onClick={handleCopyEmail}
                  className="w-full flex items-center justify-between p-3.5 bg-white/5 hover:bg-[#f6cf3f] hover:text-[#0d1317] text-white border border-white/10 transition-colors font-bold text-sm cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    {copiedEmail ? <Check className="w-4 h-4 text-emerald-400" /> : <Mail className="w-4 h-4" />}
                    <span>
                      {copiedEmail
                        ? language === 'uk'
                          ? 'Скопійовано: contact@monovoice.app'
                          : 'Copied: contact@monovoice.app'
                        : 'contact@monovoice.app'}
                    </span>
                  </span>
                  <span className="text-xs uppercase opacity-75">
                    {language === 'uk' ? 'Копіювати' : 'Copy'}
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative w-full pb-12 pt-2 select-none overflow-hidden sm:overflow-visible">
      {/* SVG Dry-Brush Filter for Authentic Hand-Painted Headline Edges */}
      <svg className="sr-only" aria-hidden="true">
        <defs>
          <filter id="brush-rough-edge" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* Background Decorative Speed-Lines & 4-Pointed Sparkles (Strictly contained) */}
      <div className="absolute inset-x-0 top-0 w-full h-[540px] pointer-events-none overflow-hidden z-0">
        <svg
          viewBox="0 0 1200 650"
          preserveAspectRatio="xMidYMin slice"
          className="w-full h-full"
        >
          {/* Diagonal Yellow Speed Slashes */}
          <polygon points="360,340 545,195 552,202 372,354" fill="#f6cf3f" opacity="0.9" />
          <polygon points="390,350 510,255 518,264 402,362" fill="#f6cf3f" opacity="0.75" />
          <polygon points="435,190 480,172 462,196" fill="#f6cf3f" opacity="0.9" />
          <polygon points="940,320 1180,145 1185,154 952,332" fill="#f6cf3f" opacity="0.85" />
          <polygon points="1110,95 1195,38 1198,46 1118,104" fill="#f6cf3f" opacity="0.85" />

          {/* Diagonal White Shooting Line */}
          <line x1="420" y1="115" x2="495" y2="52" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />

          {/* White 4-Pointed Star Left of Title */}
          <path
            d="M42,195 Q54,218 76,222 Q54,226 42,252 Q36,226 14,222 Q36,218 42,195 Z"
            fill="#ffffff"
            opacity="0.92"
          />

          {/* Two White 4-Pointed Stars Near Mascot */}
          <path
            d="M575,62 Q582,92 612,98 Q582,104 575,136 Q568,104 538,98 Q568,92 575,62 Z"
            fill="#ffffff"
            opacity="0.95"
          />
          <path
            d="M615,132 Q620,154 642,158 Q620,162 615,185 Q610,162 588,158 Q610,154 615,132 Z"
            fill="#ffffff"
            opacity="0.92"
          />
        </svg>
      </div>

      {/* ================= HERO SECTION ================= */}
      <section className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center gap-6 pt-2 lg:pt-4">
        
        {/* Left Column: Tilted Badge + Giant Brush Headline + Subtitle */}
        <div className="lg:col-span-6 space-y-4 sm:space-y-5 pt-3 sm:pt-4 pb-2 lg:pb-8 px-1 sm:pl-4">
          {/* Yellow Brush Strip ("МОЇ ПРОГРАМИ") */}
          <div className="inline-block transform -rotate-3 sm:-rotate-6 origin-left">
            <div className="comic-eyebrow-strip px-5 sm:px-7 py-1.5 sm:py-2 shadow-sm">
              <span className="font-impact text-xs sm:text-base tracking-wider uppercase text-[#0b1013]">
                {t('heroBadge')}
              </span>
            </div>
          </div>

          {/* Giant Brush Headline ("ІДЕЇ, ЯКІ ПРАЦЮЮТЬ") */}
          <div className="transform -rotate-2 sm:-rotate-3 origin-left pt-1 max-w-full">
            <h1
              className="font-impact text-[34px] sm:text-6xl md:text-[68px] leading-[0.98] sm:leading-[0.95] tracking-tight uppercase text-[#0b1114] dark:text-white drop-shadow-[0_3px_0_rgba(255,255,255,0.18)] break-words"
              style={{ filter: 'url(#brush-rough-edge)' }}
            >
              <span className="block">{t('heroTitleLine1')}</span>
              <span className="block mt-1 pl-2 sm:pl-6">{t('heroTitleLine2')}</span>
            </h1>
          </div>

          {/* Subtitle */}
          <p className="text-sm sm:text-[17px] font-medium text-[#0c181b] dark:text-zinc-100 max-w-md leading-relaxed pt-1">
            {t('heroTagline')}
          </p>
        </div>

        {/* Right Column: Mascot Artwork + Hand-Drawn Crown & "GOOD APPS BETTER DAYS" */}
        <div className="lg:col-span-6 relative flex items-end justify-center lg:justify-end min-h-[240px] sm:min-h-[340px] z-10">
          
          {/* Mascot Container */}
          <div className="relative w-[240px] sm:w-[360px] lg:w-[400px] mx-auto lg:mx-0 lg:mr-14 z-10">
            <MascotArtwork variant="hero" className="w-full h-auto" />
          </div>

          {/* Hand-Drawn Crown + "GOOD APPS BETTER DAYS" on Far Right */}
          <div className="hidden sm:flex flex-col items-start absolute right-2 lg:right-0 top-6 sm:top-10 transform -rotate-12 select-none pointer-events-none z-20">
            <svg viewBox="0 0 80 60" className="w-12 h-10 mb-1 -ml-1">
              <path
                d="M10,44 L8,14 L26,32 L40,10 L54,32 L72,14 L68,44 Z"
                fill="none"
                stroke="#f6cf3f"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10,52 L68,49"
                fill="none"
                stroke="#f6cf3f"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
            </svg>

            <div className="font-brush text-xl lg:text-2xl leading-[1.05] text-[#f6cf3f] tracking-wider uppercase drop-shadow-[0_2px_2px_rgba(11,17,20,0.28)]">
              <div>GOOD</div>
              <div className="pl-1">APPS</div>
              <div className="pl-2">BETTER</div>
              <div className="pl-4">DAYS</div>
            </div>
          </div>

        </div>

      </section>

      {/* ================= 3-COLUMN FEATURED APPS ROW ================= */}
      <section className="relative z-20 mt-6 sm:mt-8 lg:mt-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {featuredApps.map((app, idx) => (
            <AppCard
              key={app.id}
              app={app}
              index={idx}
              onSelect={slug => onSelectApp(slug)}
            />
          ))}
        </div>

        {/* Links to View Full Catalog and Adobe Scripts */}
        <div className="mt-4 flex flex-wrap justify-between items-center gap-2">
          <button
            onClick={() => onNavigate('/scripts')}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#f6cf3f] hover:bg-[#ffe05d] text-[#0d1317] text-xs font-extrabold uppercase tracking-wider transition-transform hover:translate-x-0.5 cursor-pointer shadow"
            style={{
              clipPath: 'polygon(3% 0%, 100% 6%, 97% 100%, 0% 94%)'
            }}
          >
            <span>
              {language === 'uk'
                ? '✨ Скрипти для Adobe, Android та ПК'
                : '✨ Adobe Scripts, Android & PC Tools'}
            </span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          <button
            onClick={() => onNavigate('/apps')}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#0d1317]/85 hover:bg-[#0d1317] text-[#f6cf3f] text-xs font-extrabold uppercase tracking-wider transition-transform hover:translate-x-0.5 cursor-pointer shadow"
            style={{
              clipPath: 'polygon(3% 0%, 100% 6%, 97% 100%, 0% 94%)'
            }}
          >
            <span>
              {language === 'uk'
                ? 'Усі програми в каталозі'
                : 'Browse all applications'}
            </span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </section>

      {/* ================= BOTTOM 2-COLUMN ROW: "ПРО МЕНЕ" & "КОНТАКТИ" ================= */}
      <section className="relative z-20 mt-5 sm:mt-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        
        {/* Left Card: "Про мене" with Mascot Portrait on Yellow Burst */}
        <div
          onClick={() => onNavigate('/about')}
          className="comic-card lg:col-span-6 group cursor-pointer overflow-hidden flex flex-col sm:flex-row items-stretch min-h-[190px] hover:-translate-y-1 transition-all duration-200"
        >
          {/* Yellow Diagonal Corner Slashes on Right Side of Card */}
          <svg
            viewBox="0 0 500 220"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
          >
            <polygon points="455,0 475,0 438,42 428,35" fill="#f6cf3f" opacity="0.85" />
            <polygon points="480,0 500,0 500,38 465,78 456,68" fill="#f6cf3f" />
            <polygon points="455,220 500,165 500,192 476,220" fill="#f6cf3f" />
            <polygon points="482,220 500,198 500,220" fill="#f6cf3f" />
          </svg>

          {/* Left Visual Panel: Mascot on Yellow Comic Burst */}
          <div className="relative w-full sm:w-[38%] h-44 sm:h-auto sm:min-h-[170px] bg-[#f6cf3f] overflow-hidden shrink-0 flex items-end justify-center">
            <MascotArtwork variant="card" className="relative z-0 w-full h-full" />
          </div>

          {/* Right Content Panel */}
          <div className="relative z-10 flex-1 p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <h2 className="font-brush text-2xl sm:text-[31px] text-[#f6cf3f] tracking-wide leading-tight">
                {t('aboutCardTitle')}
              </h2>
              <p className="mt-2 text-xs sm:text-[13.5px] text-zinc-200/90 leading-relaxed max-w-xs">
                {t('aboutCardText')}
              </p>
            </div>

            <div className="mt-5">
              <span className="comic-btn-yellow px-5 py-2 text-xs sm:text-sm tracking-wide">
                <span>{t('aboutCardBtn')}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.8] group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>
        </div>

        {/* Right Card: "Контакти" with Painted Telegram Icon */}
        <div
          onClick={() => setContactModalOpen(true)}
          className="comic-card lg:col-span-6 group cursor-pointer overflow-hidden p-5 sm:p-6 flex items-center gap-4 sm:gap-6 min-h-[190px] hover:-translate-y-1 transition-all duration-200"
        >
          {/* Yellow Diagonal Corner Slashes + 4-Pointed Sparkle on Right */}
          <svg
            viewBox="0 0 500 220"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <polygon points="445,0 462,0 415,48 408,42" fill="#f6cf3f" opacity="0.8" />
            <polygon points="472,0 500,0 500,45 435,105 426,95" fill="#f6cf3f" />
            <polygon points="438,220 500,152 500,185 468,220" fill="#f6cf3f" />
            <polygon points="475,220 500,192 500,220" fill="#f6cf3f" />

            <path
              d="M390,102 Q393,116 407,119 Q393,122 390,136 Q387,122 373,119 Q387,116 390,102 Z"
              fill="#f6cf3f"
            />
          </svg>

          {/* Left: Hand-Painted Square Telegram Badge */}
          <div className="relative z-10 w-18 h-18 sm:w-24 sm:h-24 shrink-0 group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
              <polygon points="3,5 96,2 98,95 5,98" fill="#66c9c8" stroke="#0d1317" strokeWidth="2.5" />
              <polygon points="8,10 92,7 90,91 11,94" fill="#f6cf3f" />
              <polygon points="4,25 25,4 36,4 4,36" fill="#66c9c8" opacity="0.8" />
              <circle cx="50" cy="50" r="36" fill="#0d1317" />
              <path
                d="M25,51 L73,30 L59,74 L46,60 L38,67 L40,55 L63,37 L36,54 Z"
                fill="#f6cf3f"
                stroke="#f6cf3f"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Right: Title, Subtitle & "Написати →" Button */}
          <div className="relative z-10 flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
            <div>
              <h2 className="font-brush text-2xl sm:text-[31px] text-[#f6cf3f] tracking-wide leading-tight">
                {t('contactsCardTitle')}
              </h2>
              <p className="mt-2 text-xs sm:text-[13.5px] text-zinc-200/90 leading-relaxed max-w-xs">
                {t('contactsCardText')}
              </p>
            </div>

            <div className="mt-5">
              <span className="comic-btn-yellow px-5 py-2 text-xs sm:text-sm tracking-wide">
                <span>{t('contactsCardBtn')}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.8] group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>
        </div>

      </section>

      {contactModal}
    </div>
  );
};
