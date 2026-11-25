import React from 'react';
import { ArrowLeft, Search, Home } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface AppNotFoundProps {
  onBackToCatalog: () => void;
  onGoHome: () => void;
}

export const AppNotFound: React.FC<AppNotFoundProps> = ({
  onBackToCatalog,
  onGoHome,
}) => {
  const { language } = useLanguage();

  return (
    <div className="w-full py-16 px-4 flex flex-col items-center justify-center text-center space-y-6 select-none">
      <div className="comic-card p-8 sm:p-12 max-w-lg w-full space-y-6 border-2 border-[#f6cf3f] shadow-2xl">
        <div className="w-20 h-20 mx-auto bg-[#f6cf3f] text-[#0d1317] flex items-center justify-center font-impact text-4xl transform -rotate-3 shadow">
          404
        </div>

        <div className="space-y-2">
          <h1 className="font-impact text-3xl sm:text-4xl text-[#fff6c5] uppercase tracking-wide">
            {language === 'uk' ? 'Програму не знайдено' : 'App Not Found'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-sm mx-auto">
            {language === 'uk'
              ? 'Запитана програма не існує, є чернеткою або її було перенесено. Скористайтеся каталогом для пошуку потрібного софту.'
              : 'The requested application does not exist, is in draft mode, or has been relocated. Browse our public catalog below.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onBackToCatalog}
            className="comic-btn-yellow w-full sm:w-auto px-6 py-2.5 text-xs font-extrabold cursor-pointer"
          >
            <Search className="w-4 h-4 stroke-[2.5]" />
            <span>{language === 'uk' ? 'Переглянути каталог' : 'Browse Catalog'}</span>
          </button>

          <button
            onClick={onGoHome}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4 text-[#f6cf3f]" />
            <span>{language === 'uk' ? 'На головну' : 'Go Home'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
