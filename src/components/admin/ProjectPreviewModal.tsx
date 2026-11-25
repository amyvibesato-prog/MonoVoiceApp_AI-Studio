import React from 'react';
import { X, Eye } from 'lucide-react';
import { AppItem } from '../../types/app';
import { AppDetailPage } from '../../pages/AppDetailPage';
import { useLanguage } from '../../context/LanguageContext';

interface ProjectPreviewModalProps {
  project: AppItem;
  onClose: () => void;
  onPublishDirectly?: () => void;
}

export const ProjectPreviewModal: React.FC<ProjectPreviewModalProps> = ({
  project,
  onClose,
  onPublishDirectly
}) => {
  const { language } = useLanguage();

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0b1114]/90 backdrop-blur-md flex flex-col overflow-y-auto select-none p-3 sm:p-6">
      {/* Top Admin Sticky Banner */}
      <div className="sticky top-0 z-50 bg-[#0d1317] border-2 border-[#f6cf3f] p-4 text-white shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-[#f6cf3f]" />
          <div>
            <span className="font-impact text-lg text-[#f6cf3f] uppercase block leading-none">
              {language === 'uk' ? 'РЕЖИМ ПОПЕРЕДНЬОГО ПЕРЕГЛЯДУ (PREVIEW)' : 'PREVIEW MODE'}
            </span>
            <span className="text-xs text-zinc-300">
              {language === 'uk'
                ? `Так виглядатиме публічна сторінка програми «${project.name}» після публікації.`
                : `Live preview of public page for "${project.name}" prior to publishing.`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onPublishDirectly && project.status !== 'published' && (
            <button
              onClick={onPublishDirectly}
              className="comic-btn-yellow px-4 py-2 text-xs font-extrabold cursor-pointer"
            >
              <span>{language === 'uk' ? 'Опублікувати зараз' : 'Publish Now'}</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#182226] hover:bg-[#223037] border-2 border-zinc-600 hover:border-[#f6cf3f] text-xs font-bold text-white transition-colors cursor-pointer rounded shadow-sm"
          >
            <X className="w-4 h-4 text-[#f6cf3f]" />
            <span>{language === 'uk' ? 'Закрити перегляд' : 'Close Preview'}</span>
          </button>
        </div>
      </div>

      {/* Embedded Public Page Component */}
      <div className="max-w-6xl w-full mx-auto flex-1">
        <AppDetailPage app={project} onBack={onClose} />
      </div>
    </div>
  );
};
