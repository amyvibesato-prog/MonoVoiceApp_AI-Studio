import React from 'react';
import { Heart, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { t } = useLanguage();

  return (
    <footer className="relative w-full bg-[#0d1317] text-white mt-auto pt-4 pb-4 select-none">
      {/* Rough Brush-Stroke Top Edge SVG */}
      <svg
        viewBox="0 0 1440 18"
        preserveAspectRatio="none"
        className="absolute -top-3 left-0 w-full h-4 text-[#0d1317] fill-current pointer-events-none"
      >
        <polygon points="0,18 0,6 180,12 420,3 680,11 920,2 1190,10 1380,4 1440,9 1440,18" />
      </svg>

      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Left: Brand Logo */}
        <button
          onClick={() => {
            onNavigate('/');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-3 group cursor-pointer"
          title="MonoVoice Home"
        >
          <img
            src="/brand-logo.jpg"
            alt="MonoVoice Logo"
            className="w-8 h-8 object-cover rounded border border-[#f6cf3f] group-hover:scale-110 transition-transform"
          />
        </button>

        {/* Center: Yellow Spaced Motto ("— КРАЩІ ІДЕЇ — ЗАВЖДИ В ГРІ —") */}
        <div className="text-xs sm:text-sm font-extrabold tracking-[0.18em] uppercase text-[#f6cf3f] text-center font-impact">
          {t('footerMotto')}
        </div>

        {/* Right: Platform & Social Icons */}
        <div className="flex items-center gap-4 text-zinc-200">
          {/* Windows */}
          <button
            onClick={() => onNavigate('/apps')}
            className="hover:text-[#f6cf3f] transition-colors cursor-pointer"
            title="Windows Apps"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.949-1.801" />
            </svg>
          </button>

          {/* Android */}
          <button
            onClick={() => onNavigate('/apps')}
            className="hover:text-[#f6cf3f] transition-colors cursor-pointer"
            title="Android Apps"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.125 12 8.125c-1.8533 0-3.5902.2866-5.1368.8247L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.152.5676l1.9972 3.4592C2.6889 11.1867.343 14.5457.0422 18.6667h23.9156c-.3008-4.121-2.6467-7.48-6.0753-9.3453" />
            </svg>
          </button>

          {/* GitHub */}
          <a
            href="https://github.com/monovoice"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#f6cf3f] transition-colors cursor-pointer"
            title="GitHub"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
          </a>

          {/* Admin Owner Lock Link */}
          <button
            onClick={() => onNavigate('/admin')}
            className="hover:text-[#f6cf3f] transition-colors cursor-pointer"
            title="Admin Panel"
          >
            <ShieldCheck className="w-4 h-4 stroke-[2.3]" />
          </button>

          {/* Heart */}
          <button
            onClick={() => onNavigate('/about')}
            className="hover:text-[#f6cf3f] transition-colors cursor-pointer"
            title="About"
          >
            <Heart className="w-4 h-4 stroke-[2.3]" />
          </button>
        </div>

      </div>
    </footer>
  );
};
