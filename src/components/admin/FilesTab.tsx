import React, { useState, useEffect } from 'react';
import { FileText, Trash2, Upload, RefreshCw, HardDrive, Shield } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { FileUploaderWidget } from './FileUploaderWidget';

interface FileMeta {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  sizeFormatted: string;
  uploadedAt: string;
  url: string;
  usageLocation: string;
  isPrivate: boolean;
}

interface FilesTabProps {
  csrfToken: string;
}

export const FilesTab: React.FC<FilesTabProps> = ({ csrfToken }) => {
  const { language } = useLanguage();
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/files');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && Array.isArray(data.files)) {
          setFiles(data.files);
        }
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDelete = async (file: FileMeta) => {
    if (!confirm(`Видалити файл ${file.originalName}?`)) return;

    try {
      const res = await fetch(`/api/admin/files/${file.id}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': csrfToken }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchFiles();
      } else {
        alert(data.error || 'Помилка видалення');
      }
    } catch (err) {
      alert('Помилка видалення');
    }
  };

  return (
    <div className="space-y-6">
      <div className="comic-card p-6 border-l-4 border-l-[#f6cf3f] space-y-4">
        <div>
          <h2 className="font-brush text-2xl text-[#f6cf3f] flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-[#f6cf3f]" />
            <span>{language === 'uk' ? 'Серверний Реєстр Файлів' : 'Server File Manager'}</span>
          </h2>
          <p className="text-xs text-zinc-300">
            Завантажуйте інсталяційні графи, архіви та документи. Усі файли валідуються на сервері.
          </p>
        </div>

        <FileUploaderWidget
          csrfToken={csrfToken}
          usageLocation="General Upload"
          onFileUploaded={() => fetchFiles()}
        />
      </div>

      <div className="comic-card p-6 space-y-4">
        <h3 className="font-brush text-xl text-white">Завантажені файли ({files.length})</h3>

        {loading ? (
          <div className="py-8 text-center text-xs text-zinc-400 font-mono">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#f6cf3f] mb-2" />
            <span>Завантаження реєстру файлів...</span>
          </div>
        ) : files.length === 0 ? (
          <p className="text-xs text-zinc-400 py-6 text-center">У реєстрі немає збережених файлів</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-200">
              <thead className="bg-white/10 text-[#f6cf3f] font-mono text-[11px] uppercase">
                <tr>
                  <th className="p-2.5">Назва файлу</th>
                  <th className="p-2.5">Тип & Вага</th>
                  <th className="p-2.5">Використання</th>
                  <th className="p-2.5">Час завантаження</th>
                  <th className="p-2.5 text-right">Дія</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 font-mono">
                {files.map(file => (
                  <tr key={file.id} className="hover:bg-white/5">
                    <td className="p-2.5 font-bold text-white truncate max-w-xs">{file.originalName}</td>
                    <td className="p-2.5 text-zinc-400">
                      {file.sizeFormatted} ({file.mimeType.split('/')[1] || 'file'})
                    </td>
                    <td className="p-2.5 text-[#f6cf3f]">{file.usageLocation}</td>
                    <td className="p-2.5 text-zinc-400">{new Date(file.uploadedAt).toLocaleString()}</td>
                    <td className="p-2.5 text-right">
                      <button
                        onClick={() => handleDelete(file)}
                        className="p-1.5 bg-red-950/80 hover:bg-red-900 border border-red-500/60 text-red-200 rounded cursor-pointer shadow-sm transition-colors"
                        title="Видалити"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
