import React, { useState } from 'react';
import { Upload, File, Trash2, CheckCircle2, AlertTriangle, ShieldCheck, HardDrive } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface UploadedFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeFormatted: string;
  uploadedAt: string;
  url: string;
  usageLocation: string;
  isPrivate: boolean;
}

interface FileUploaderWidgetProps {
  files?: UploadedFile[];
  csrfToken: string;
  onFileUploadSuccess?: (newFile: UploadedFile) => void;
  onFileDeleteSuccess?: (fileId: string) => void;
  usageLocation?: string;
  onFileUploaded?: (newFile: UploadedFile) => void;
}

export const FileUploaderWidget: React.FC<FileUploaderWidgetProps> = ({
  files = [],
  csrfToken,
  onFileUploadSuccess,
  onFileDeleteSuccess,
  usageLocation: initialUsageLocation = 'Screenshot',
  onFileUploaded
}) => {
  const { language } = useLanguage();

  const [usageLocation, setUsageLocation] = useState(initialUsageLocation);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      // Convert file to Base64 Data URL
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        const base64Data = reader.result as string;

        const response = await fetch('/api/admin/upload-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileDataUrl: base64Data,
            usageLocation,
            isPrivate
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          if (onFileUploadSuccess) onFileUploadSuccess(data.file);
          if (onFileUploaded) onFileUploaded(data.file);
          // Reset input
          e.target.value = '';
        } else {
          setUploadError(data.error || 'Помилка завантаження файлу');
        }
        setIsUploading(false);
      };
    } catch (err) {
      console.error('File upload error:', err);
      setUploadError('Не вдалося відправити файл на сервер');
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/admin/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });
      if (response.ok) {
        if (onFileDeleteSuccess) onFileDeleteSuccess(fileId);
        setDeleteConfirmId(null);
      } else {
        alert('Не вдалося видалити файл');
      }
    } catch (err) {
      alert('Помилка з’єднання');
    }
  };

  return (
    <div className="space-y-5">
      {/* Upload Box */}
      <div className="bg-black/30 p-4 sm:p-5 rounded border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-[#f6cf3f] uppercase tracking-wider block">
              {language === 'uk' ? 'Завантаження файлів & Реєстр' : 'Secure File Uploader'}
            </span>
            <span className="text-[11px] text-zinc-300 block">
              {language === 'uk'
                ? 'Підтримуються зображення, APK, ZIP, EXE, JSX. Максимальний розмір: 50 МБ.'
                : 'Supports PNG, JPG, WebP, APK, ZIP, EXE, JSX up to 50 MB.'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Usage Location Picker */}
            <select
              value={usageLocation}
              onChange={e => setUsageLocation(e.target.value)}
              className="px-3 py-1.5 bg-[#0d1317] border border-white/20 text-xs font-bold text-[#f6cf3f] focus:outline-none"
            >
              <option value="Screenshot">Скриншот</option>
              <option value="Icon">Іконка</option>
              <option value="Binary Release">Інсталятор / APK</option>
              <option value="Source Code Archive">Архів коду (Приватний)</option>
              <option value="Document">Документація</option>
              <option value="General Upload">Загальний файл</option>
            </select>

            <label className="flex items-center gap-1.5 text-xs text-zinc-300 font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
                className="accent-[#f6cf3f]"
              />
              <span>{language === 'uk' ? 'Приватний файл' : 'Private File'}</span>
            </label>
          </div>
        </div>

        {/* Error Alert */}
        {uploadError && (
          <div className="p-3 bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* File Input */}
        <div className="relative border-2 border-dashed border-white/20 hover:border-[#f6cf3f] p-6 text-center rounded transition-colors cursor-pointer group">
          <input
            type="file"
            disabled={isUploading}
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="space-y-1.5 pointer-events-none">
            <Upload className="w-8 h-8 text-[#f6cf3f] mx-auto group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white block">
              {isUploading
                ? (language === 'uk' ? 'Валідація та завантаження на сервер...' : 'Validating & uploading file...')
                : (language === 'uk' ? 'Перетягніть файл сюди або натисніть для вибору' : 'Drag and drop file here or click to browse')}
            </span>
          </div>
        </div>
      </div>

      {/* Uploaded Files Table */}
      {files.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
            {language === 'uk' ? 'Завантажені файли у системному реєстрі:' : 'Registered Files:'}
          </span>
          <div className="overflow-x-auto bg-black/40 border border-white/10 rounded">
            <table className="w-full text-left text-xs text-zinc-200">
              <thead className="bg-white/10 text-[#f6cf3f] font-mono text-[11px] uppercase">
                <tr>
                  <th className="p-2.5">Файл</th>
                  <th className="p-2.5">Тип / Призначення</th>
                  <th className="p-2.5">Розмір</th>
                  <th className="p-2.5">Доступ</th>
                  <th className="p-2.5 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 font-mono">
                {files.map(f => (
                  <tr key={f.id} className="hover:bg-white/5">
                    <td className="p-2.5 font-bold text-white flex items-center gap-2">
                      <File className="w-4 h-4 text-[#f6cf3f] shrink-0" />
                      <span className="truncate max-w-[200px]">{f.originalName}</span>
                    </td>
                    <td className="p-2.5 text-zinc-300">{f.usageLocation}</td>
                    <td className="p-2.5 text-[#f6cf3f]">{f.sizeFormatted}</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 text-[10px] font-bold ${f.isPrivate ? 'bg-red-950 text-red-300' : 'bg-emerald-950 text-emerald-300'}`}>
                        {f.isPrivate ? 'ПРИВАТНИЙ' : 'ПУБЛІЧНИЙ'}
                      </span>
                    </td>
                    <td className="p-2.5 text-right">
                      {deleteConfirmId === f.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDeleteFile(f.id)}
                            className="px-2 py-1 bg-red-600 text-white text-[10px] font-extrabold cursor-pointer"
                          >
                            Підтвердити
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-[#182226] hover:bg-[#223037] border border-zinc-500 text-white font-bold text-[10px] cursor-pointer rounded"
                          >
                            Скасувати
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(f.id)}
                          className="p-1 text-zinc-400 hover:text-red-400 cursor-pointer"
                          title="Видалити файл"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
