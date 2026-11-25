import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { AppScreenshot } from '../types/app';
import { useLanguage } from '../context/LanguageContext';

interface ScreenshotGalleryProps {
  screenshots: AppScreenshot[];
  appName: string;
}

export const ScreenshotGallery: React.FC<ScreenshotGalleryProps> = ({ screenshots, appName }) => {
  const { language } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Lock body scroll and handle keyboard navigation when lightbox is open
  useEffect(() => {
    if (selectedIndex === null) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedIndex(null);
      } else if (e.key === 'ArrowRight') {
        setSelectedIndex(prev => (prev !== null && prev < screenshots.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex(prev => (prev !== null && prev > 0 ? prev - 1 : screenshots.length - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedIndex, screenshots.length]);

  if (!screenshots || screenshots.length === 0) {
    return null;
  }

  const lightboxModal =
    selectedIndex !== null && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#070c0e]/92 backdrop-blur-md p-3 sm:p-6 select-none"
            onClick={() => setSelectedIndex(null)}
          >
            {/* Top-Right Floating Close Button on Viewport */}
            <button
              onClick={() => setSelectedIndex(null)}
              className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[10000] w-11 h-11 flex items-center justify-center bg-[#f6cf3f] hover:bg-[#ffe05d] text-[#0d1317] border-2 border-[#0d1317] shadow-xl transition-transform hover:scale-105 cursor-pointer"
              aria-label="Close lightbox"
            >
              <X className="w-6 h-6 stroke-[2.8]" />
            </button>

            <div
              className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              {/* Main Preview Image */}
              <div className="relative overflow-hidden border-2 border-[#f6cf3f] shadow-[0_20px_50px_rgba(0,0,0,0.85)] bg-[#0d1317] max-h-[78vh] flex items-center justify-center">
                <img
                  src={screenshots[selectedIndex].url}
                  alt={screenshots[selectedIndex].caption[language] || appName}
                  referrerPolicy="no-referrer"
                  className="max-h-[78vh] w-auto max-w-full object-contain mx-auto"
                />
              </div>

              {/* Caption & Controls Bar */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 w-full max-w-3xl px-4 py-3 bg-[#0d1317] border border-[#f6cf3f]/40 text-xs sm:text-sm text-zinc-200 shadow-lg">
                <span className="font-medium text-zinc-100">
                  {screenshots[selectedIndex].caption[language] || screenshots[selectedIndex].caption.en}
                </span>

                {screenshots.length > 1 && (
                  <div className="flex items-center gap-2 shrink-0 ml-auto">
                    <button
                      onClick={() =>
                        setSelectedIndex(prev =>
                          prev !== null && prev > 0 ? prev - 1 : screenshots.length - 1
                        )
                      }
                      className="p-2 bg-white/10 text-[#f6cf3f] hover:bg-[#f6cf3f] hover:text-[#0d1317] transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                    </button>
                    <span className="font-mono text-xs tabular-nums text-[#f6cf3f] px-1">
                      {selectedIndex + 1} / {screenshots.length}
                    </span>
                    <button
                      onClick={() =>
                        setSelectedIndex(prev =>
                          prev !== null && prev < screenshots.length - 1 ? prev + 1 : 0
                        )
                      }
                      className="p-2 bg-white/10 text-[#f6cf3f] hover:bg-[#f6cf3f] hover:text-[#0d1317] transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="space-y-4">
      {/* Thumbnails Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {screenshots.map((shot, index) => {
          const isPortrait = shot.aspectRatio === '9:16';
          return (
            <div
              key={index}
              onClick={() => setSelectedIndex(index)}
              className="group relative cursor-pointer overflow-hidden bg-[#0a0f12] border-2 border-white/15 hover:border-[#f6cf3f] transition-all shadow-md"
            >
              <div className={`w-full overflow-hidden ${isPortrait ? 'aspect-[9/16] max-h-[360px]' : 'aspect-video'}`}>
                <img
                  src={shot.url}
                  alt={`${appName} screenshot ${index + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Hover overlay hint */}
              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="p-2.5 bg-[#f6cf3f] text-[#0d1317] shadow-lg transform group-hover:scale-110 transition-transform">
                  <Maximize2 className="w-5 h-5 stroke-[2.5]" />
                </div>
              </div>

              {/* Caption Bar */}
              {shot.caption && (
                <div className="p-3 bg-[#0d1317] border-t border-white/10 text-xs text-zinc-300 font-sans truncate">
                  {shot.caption[language] || shot.caption.en}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {lightboxModal}
    </div>
  );
};
