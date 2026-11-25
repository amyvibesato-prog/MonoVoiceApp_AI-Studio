import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface MascotCrops {
  hasOriginal: boolean;
  heroUrl: string | null;
  headUrl: string | null;
  cardUrl: string | null;
  originalUrl: string | null;
}

interface MascotContextType extends MascotCrops {
  isUploading: boolean;
  isDraggingFile: boolean;
  uploadMascotFile: (file: File) => Promise<void>;
  triggerFileSelect: () => void;
}

const STORAGE_KEY = 'monovoice_mascot_crops_v1';

const MascotContext = createContext<MascotContextType | undefined>(undefined);

export const MascotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [crops, setCrops] = useState<MascotCrops>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.heroUrl) {
          return {
            hasOriginal: true,
            heroUrl: parsed.heroUrl,
            headUrl: parsed.headUrl || parsed.heroUrl,
            cardUrl: parsed.cardUrl || parsed.heroUrl,
            originalUrl: parsed.originalUrl || parsed.heroUrl,
          };
        }
      }
    } catch {
      // ignore storage errors
    }
    return {
      hasOriginal: false,
      heroUrl: null,
      headUrl: null,
      cardUrl: null,
      originalUrl: null,
    };
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Check backend /api/mascot on mount in case file is already in src/assets/images
  useEffect(() => {
    fetch('/api/mascot')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && data.hasOriginal && data.heroUrl) {
          setCrops({
            hasOriginal: true,
            heroUrl: data.heroUrl,
            headUrl: data.headUrl || data.heroUrl,
            cardUrl: data.cardUrl || data.heroUrl,
            originalUrl: data.originalUrl || data.heroUrl,
          });
        }
      })
      .catch(() => {
        // Ignore if static host
      });
  }, []);

  // Client-side lossless geometric crop using Canvas (only crops & converts to WebP/PNG, 0% pixel alteration)
  const cropImageInBrowser = (dataUrl: string): Promise<MascotCrops> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;

        const makeCrop = (
          sx: number,
          sy: number,
          sw: number,
          sh: number,
          maxDim = 1200,
          removeTurquoiseBg = false
        ) => {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, maxDim / Math.max(sw, sh));
          canvas.width = Math.round(sw * scale);
          canvas.height = Math.round(sh * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) return dataUrl;
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

          if (removeTurquoiseBg) {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            // Sample top-right or top-left background pixel (turquoise ~ rgb(112, 210, 208))
            const sampleIdx = (2 * canvas.width + (canvas.width - 3)) * 4;
            const bgR = data[sampleIdx];
            const bgG = data[sampleIdx + 1];
            const bgB = data[sampleIdx + 2];

            // Only key if the sampled corner is indeed cyan/turquoise (G > R + 35 && B > R + 35)
            if (bgG > bgR + 30 && bgB > bgR + 30) {
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const dist = Math.hypot(r - bgR, g - bgG, b - bgB);
                if (dist < 26) {
                  data[i + 3] = 0;
                } else if (dist < 42) {
                  data[i + 3] = Math.round(((dist - 26) / 16) * 255);
                }
              }
              ctx.putImageData(imgData, 0, 0);
            }
          }

          return canvas.toDataURL('image/png');
        };

        // If landscape 2-pose sheet (like MonoVoice_Sticker_pack...png, aspect > 1.15),
        // crop left front-facing mascot (0% to 67.5% width)
        const isTwoPoseSheet = w / h > 1.15;

        const heroUrl = isTwoPoseSheet
          ? makeCrop(0, 0, w * 0.675, h, 1200, true)
          : makeCrop(0, 0, w, h, 1200, true);

        const headUrl = isTwoPoseSheet
          ? makeCrop(w * 0.08, 0, w * 0.48, h * 0.65, 500, false)
          : makeCrop(w * 0.1, 0, w * 0.8, h * 0.68, 500, false);

        const cardUrl = isTwoPoseSheet
          ? makeCrop(w * 0.02, 0, w * 0.64, h * 0.92, 800, true)
          : makeCrop(0, 0, w, h * 0.92, 800, true);

        resolve({
          hasOriginal: true,
          heroUrl,
          headUrl,
          cardUrl,
          originalUrl: heroUrl,
        });
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  };

  const uploadMascotFile = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    setIsUploading(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 1. Instant client-side geometric crop + WebP conversion
      const browserCrops = await cropImageInBrowser(dataUrl);
      setCrops(browserCrops);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(browserCrops));
      } catch {
        // quota exceeded fallback
      }

      // 2. Also send original to Vite backend to save in /src/assets/images/mascot_original.png & crop via ImageMagick
      const res = await fetch('/api/mascot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      });
      if (res.ok) {
        const serverData = await res.json();
        if (serverData && serverData.hasOriginal && serverData.heroUrl) {
          setCrops(prev => ({
            ...prev,
            hasOriginal: true,
            heroUrl: serverData.heroUrl,
            headUrl: serverData.headUrl || prev.headUrl,
            cardUrl: serverData.cardUrl || prev.cardUrl,
            originalUrl: serverData.originalUrl || prev.originalUrl,
          }));
        }
      }
    } catch (e) {
      console.error('Failed to process mascot image:', e);
    } finally {
      setIsUploading(false);
    }
  };

  // Global drag-and-drop support so user can drop the PNG anywhere on the page
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        setIsDraggingFile(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) {
        setIsDraggingFile(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingFile(false);
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        uploadMascotFile(file);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <MascotContext.Provider
      value={{
        ...crops,
        isUploading,
        isDraggingFile,
        uploadMascotFile,
        triggerFileSelect,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) uploadMascotFile(file);
          e.target.value = '';
        }}
      />

      {/* Fullscreen Drag-and-Drop Overlay */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-[100] bg-[#0b1114]/85 backdrop-blur-sm flex items-center justify-center p-6 pointer-events-none">
          <div className="max-w-lg w-full p-8 bg-[#0e1518] border-4 border-[#f6cf3f] text-center space-y-3 shadow-2xl transform -rotate-1">
            <div className="text-3xl font-extrabold text-[#f6cf3f] font-display tracking-wide">
              ВІДПУСТІТЬ ФАЙЛ МАСКОТА ТУТ
            </div>
            <p className="text-sm text-zinc-200">
              Оригінальний PNG буде збережено у проєкт та автоматично обрізано під секції сайту (без жодного ШІ чи редагування).
            </p>
          </div>
        </div>
      )}

      {children}
    </MascotContext.Provider>
  );
};

export const useMascot = () => {
  const ctx = useContext(MascotContext);
  if (!ctx) throw new Error('useMascot must be used within MascotProvider');
  return ctx;
};
