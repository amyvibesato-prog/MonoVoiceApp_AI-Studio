import React from 'react';
import { ArrowRight, Globe, Terminal as TerminalIcon } from 'lucide-react';
import { AppItem, Platform } from '../types/app';
import { useLanguage } from '../context/LanguageContext';

interface AppCardProps {
  app: AppItem;
  onSelect: (slug: string) => void;
  index?: number;
}

export const ComicAppIconBadge: React.FC<{ iconType: AppItem['iconType']; size?: 'md' | 'lg' }> = ({
  iconType,
  size = 'md',
}) => {
  const dimClass = size === 'lg' ? 'w-22 h-22 sm:w-24 sm:h-24' : 'w-18 h-18 sm:w-20 sm:h-20';

  const renderInnerGlyph = () => {
    switch (iconType) {
      case 'waves':
        // Stylized audio wave / microphone disc like the circular emblem in card 1
        return (
          <g>
            <circle cx="50" cy="50" r="34" fill="#0d1317" />
            <circle cx="50" cy="50" r="27" fill="none" stroke="#f6cf3f" strokeWidth="4.5" strokeDasharray="120 30" />
            <rect x="33" y="42" width="5" height="16" rx="2.5" fill="#f6cf3f" />
            <rect x="42" y="32" width="5" height="36" rx="2.5" fill="#f6cf3f" />
            <rect x="51" y="26" width="5" height="48" rx="2.5" fill="#f6cf3f" />
            <rect x="60" y="36" width="5" height="28" rx="2.5" fill="#f6cf3f" />
          </g>
        );
      case 'file-text':
      case 'book-open':
        // Stylized notebook / book with star like card 3 (PlumaTsuki)
        return (
          <g>
            <circle cx="50" cy="50" r="35" fill="#0d1317" />
            <g transform="rotate(-10 50 50)">
              <path
                d="M30,24 L68,24 L68,74 L30,74 Z"
                fill="#f6cf3f"
                stroke="#0d1317"
                strokeWidth="3"
              />
              <path d="M35,24 L35,74" stroke="#0d1317" strokeWidth="3" />
              <line x1="26" y1="32" x2="33" y2="32" stroke="#0d1317" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="26" y1="44" x2="33" y2="44" stroke="#0d1317" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="26" y1="56" x2="33" y2="56" stroke="#0d1317" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="26" y1="68" x2="33" y2="68" stroke="#0d1317" strokeWidth="3.5" strokeLinecap="round" />
              {/* Star on cover */}
              <polygon
                points="52,37 54.8,43.5 61.8,44.2 56.5,48.8 58.1,55.6 52,52 45.9,55.6 47.5,48.8 42.2,44.2 49.2,43.5"
                fill="#0d1317"
              />
            </g>
          </g>
        );
      case 'image':
        // Stylized tag / frame badge like card 2
        return (
          <g>
            <circle cx="50" cy="50" r="35" fill="#0d1317" />
            <g transform="rotate(12 50 50)">
              <polygon
                points="32,26 68,26 72,72 28,72"
                fill="#f6cf3f"
                stroke="#0d1317"
                strokeWidth="3"
              />
              <circle cx="43" cy="41" r="4.5" fill="#0d1317" />
              <polygon points="33,66 47,48 56,59 62,51 67,66" fill="#0d1317" />
            </g>
          </g>
        );
      case 'settings':
        return (
          <g>
            <circle cx="50" cy="50" r="35" fill="#0d1317" />
            <g transform="rotate(-18 50 50)">
              <polygon points="50,22 72,36 72,64 50,78 28,64 28,36" fill="#f6cf3f" />
              <circle cx="50" cy="50" r="11" fill="#0d1317" />
            </g>
          </g>
        );
      case 'terminal':
        return (
          <g>
            <circle cx="50" cy="50" r="35" fill="#0d1317" />
            <rect x="26" y="28" width="48" height="44" rx="4" fill="#f6cf3f" />
            <path d="M35,42 L45,50 L35,58" fill="none" stroke="#0d1317" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="49" y1="58" x2="62" y2="58" stroke="#0d1317" strokeWidth="4.5" strokeLinecap="round" />
          </g>
        );
      case 'clock':
      default:
        return (
          <g>
            <circle cx="50" cy="50" r="35" fill="#0d1317" />
            <circle cx="50" cy="50" r="24" fill="#f6cf3f" />
            <path d="M50,36 L50,51 L61,56" fill="none" stroke="#0d1317" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
    }
  };

  return (
    <div className={`relative ${dimClass} shrink-0 select-none group-hover:scale-105 transition-transform duration-200`}>
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        {/* Outer Turquoise & Yellow Painted Square Frame */}
        <polygon
          points="4,6 95,2 98,94 6,98"
          fill="#66c9c8"
          stroke="#0d1317"
          strokeWidth="2.5"
        />
        <polygon
          points="8,10 92,6 89,91 10,94"
          fill="#f6cf3f"
        />
        {/* Diagonal brush streaks on frame */}
        <polygon points="4,28 28,4 38,4 4,38" fill="#66c9c8" opacity="0.7" />
        <polygon points="68,96 96,68 96,82 82,96" fill="#0d1317" opacity="0.85" />

        {renderInnerGlyph()}
      </svg>
    </div>
  );
};

export const NoirAppIconBadge = ComicAppIconBadge;

export const AppCard: React.FC<AppCardProps> = ({ app, onSelect, index = 0 }) => {
  const { language, t } = useLanguage();

  const renderPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case 'Windows':
        return (
          <svg key={platform} className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.949-1.801" />
          </svg>
        );
      case 'Android':
        return (
          <svg key={platform} className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.125 12 8.125c-1.8533 0-3.5902.2866-5.1368.8247L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.152.5676l1.9972 3.4592C2.6889 11.1867.343 14.5457.0422 18.6667h23.9156c-.3008-4.121-2.6467-7.48-6.0753-9.3453" />
          </svg>
        );
      case 'macOS':
        return (
          <svg key={platform} className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.96 6.33c.67-.81 1.12-1.94 1-3.08-.96.04-2.13.64-2.82 1.45-.61.7-.11 1.86-.99 2.97 1.08.08 2.14-.53 2.81-1.34" />
          </svg>
        );
      case 'Web':
        return <Globe key={platform} className="w-5 h-5 stroke-[2.2]" />;
      case 'Linux':
      default:
        return <TerminalIcon key={platform} className="w-5 h-5 stroke-[2.2]" />;
    }
  };

  return (
    <div
      onClick={() => onSelect(app.slug)}
      className="comic-card group relative flex flex-col justify-between p-5 sm:p-6 cursor-pointer overflow-hidden hover:-translate-y-1 transition-all duration-200"
    >
      {/* Yellow Diagonal Corner Paint Slashes (matching screenshot card corners) */}
      <svg
        viewBox="0 0 400 240"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        {/* Top-right yellow brush slash */}
        <polygon points="365,0 400,0 400,48 384,68 390,18" fill="#f6cf3f" />
        {/* Bottom-left or Top-left accent depending on card index */}
        {index % 2 === 0 ? (
          <polygon points="0,195 16,175 8,240 0,240" fill="#f6cf3f" opacity="0.85" />
        ) : (
          <polygon points="0,0 52,0 12,38 0,26" fill="#f6cf3f" opacity="0.9" />
        )}
        {/* Subtle bottom-right yellow edge nick */}
        <polygon points="388,210 400,190 400,240 375,240" fill="#f6cf3f" opacity="0.8" />
      </svg>

      {/* Top Row: Painted Square Icon on Left + Brush Title & Description on Right */}
      <div className="relative z-10 flex items-start gap-4">
        <ComicAppIconBadge iconType={app.iconType} />

        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="font-brush text-2xl sm:text-[27px] text-[#fff6c5] group-hover:text-[#f6cf3f] tracking-wide leading-tight transition-colors truncate">
            {app.name}
          </h3>

          <p className="mt-1.5 text-xs sm:text-[13px] text-zinc-200/90 leading-snug line-clamp-3">
            {app.tagline[language] || app.tagline.uk}
          </p>
        </div>
      </div>

      {/* Bottom Row: Yellow Brush CTA Button ("Відкрити →") + White Platform Icons */}
      <div className="relative z-10 mt-6 pt-2 flex items-center justify-between gap-4">
        <button
          type="button"
          className="comic-btn-yellow px-5 py-2 text-xs sm:text-sm tracking-wide cursor-pointer"
        >
          <span>{t('openApp')}</span>
          <ArrowRight className="w-4 h-4 stroke-[2.8] group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Platform Icons on Right */}
        <div className="flex items-center gap-2.5 text-zinc-100/90 pr-1">
          {app.platforms.map(p => renderPlatformIcon(p))}
        </div>
      </div>
    </div>
  );
};
