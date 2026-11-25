import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Eye,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  RefreshCw,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  LayoutGrid,
  List,
  Globe,
  Terminal as TerminalIcon,
  Clock,
  Settings,
  Image as ImageIcon,
  BookOpen,
  ArrowRight,
  Check,
  Lock,
  KeyRound
} from 'lucide-react';
import { AppItem, AppStatus, AppCategory, Platform } from '../../types/app';
import { useLanguage } from '../../context/LanguageContext';
import { ProjectPreviewModal } from './ProjectPreviewModal';
import { FileUploaderWidget, UploadedFile } from './FileUploaderWidget';
import { ComicAppIconBadge } from '../AppCard';
import { GuardCodeModal } from './GuardCodeModal';

interface ProjectsTabProps {
  csrfToken: string;
  onProjectListChanged: () => void;
}

export const ProjectsTab: React.FC<ProjectsTabProps> = ({ csrfToken, onProjectListChanged }) => {
  const { language } = useLanguage();

  const [projects, setProjects] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Action Password Modal State for Create & Manual Update
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionPasswordInput, setActionPasswordInput] = useState('');
  const [actionPasswordError, setActionPasswordError] = useState('');
  const [pendingAction, setPendingAction] = useState<{
    type: 'SAVE' | 'TOGGLE_STATUS';
    targetStatus?: AppStatus;
    projectToToggle?: AppItem;
  } | null>(null);

  // Modal / Form States
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<'basic' | 'content' | 'downloads' | 'extra'>('basic');
  const [previewProject, setPreviewProject] = useState<AppItem | null>(null);
  const [editingProject, setEditingProject] = useState<Partial<AppItem> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  // MonoVoice Guard (15-second Steam Guard) State
  const [guardModalOpen, setGuardModalOpen] = useState(false);
  const [guardPendingAction, setGuardPendingAction] = useState<{
    actionTitle: string;
    targetLabel: string;
    actionType: string;
    onExecute: (guardCode: string) => Promise<void>;
  } | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formIconType, setFormIconType] = useState<AppItem['iconType']>('waves');
  const [formTaglineUk, setFormTaglineUk] = useState('');
  const [formTaglineEn, setFormTaglineEn] = useState('');
  const [formDescUk, setFormDescUk] = useState('');
  const [formDescEn, setFormDescEn] = useState('');
  const [formLongDescUk, setFormLongDescUk] = useState('');
  const [formLongDescEn, setFormLongDescEn] = useState('');
  const [formCategory, setFormCategory] = useState<AppCategory>('Utility');
  const [formStatus, setFormStatus] = useState<AppStatus>('draft');
  const [formVersion, setFormVersion] = useState('1.0.0');
  const [formReleaseDate, setFormReleaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [formFileSize, setFormFileSize] = useState('5.0 MB');
  const [formGithub, setFormGithub] = useState('https://github.com/monovoice');
  const [formFeatured, setFormFeatured] = useState(false);
  const [formPlatforms, setFormPlatforms] = useState<Platform[]>(['Android']);
  const [formOsRequirement, setFormOsRequirement] = useState('Android 8.0+ / Windows 10+');
  const [formFeaturesUk, setFormFeaturesUk] = useState('');
  const [formFeaturesEn, setFormFeaturesEn] = useState('');

  // Download links
  const [downloadAndroid, setDownloadAndroid] = useState('');
  const [downloadWindows, setDownloadWindows] = useState('');
  const [downloadLinux, setDownloadLinux] = useState('');
  const [downloadMac, setDownloadMac] = useState('');
  const [downloadWeb, setDownloadWeb] = useState('');

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/projects');
      if (res.ok) {
        const data = await res.json();
        if (data.projects) setProjects(data.projects);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleOpenNew = () => {
    setEditingProject(null);
    setFormName('');
    setFormSlug(`project-${Date.now().toString().slice(-4)}`);
    setFormIconType('waves');
    setFormTaglineUk('');
    setFormTaglineEn('');
    setFormDescUk('');
    setFormDescEn('');
    setFormLongDescUk('');
    setFormLongDescEn('');
    setFormCategory('Utility');
    setFormStatus('draft');
    setFormVersion('1.0.0');
    setFormReleaseDate(new Date().toISOString().split('T')[0]);
    setFormFileSize('5.0 MB');
    setFormGithub('https://github.com/monovoice');
    setFormFeatured(false);
    setFormPlatforms(['Android']);
    setFormOsRequirement('Android 8.0+');
    setFormFeaturesUk('');
    setFormFeaturesEn('');
    setDownloadAndroid('');
    setDownloadWindows('');
    setDownloadLinux('');
    setDownloadMac('');
    setDownloadWeb('');

    setEditorTab('basic');
    setEditorOpen(true);
  };

  const handleOpenEdit = (project: AppItem) => {
    setEditingProject(project);
    setFormName(project.name);
    setFormSlug(project.slug);
    setFormIconType(project.iconType || 'waves');
    setFormTaglineUk(project.tagline?.uk || '');
    setFormTaglineEn(project.tagline?.en || '');
    setFormDescUk(project.description?.uk || '');
    setFormDescEn(project.description?.en || '');
    setFormLongDescUk(Array.isArray(project.longDescription?.uk) ? project.longDescription.uk.join('\n\n') : '');
    setFormLongDescEn(Array.isArray(project.longDescription?.en) ? project.longDescription.en.join('\n\n') : '');
    setFormCategory(project.category || 'Utility');
    setFormStatus(project.status || 'draft');
    setFormVersion(project.version || '1.0.0');
    setFormReleaseDate(project.releaseDate || new Date().toISOString().split('T')[0]);
    setFormFileSize(project.fileSize || '5.0 MB');
    setFormGithub(project.github || 'https://github.com/monovoice');
    setFormFeatured(Boolean(project.featured));
    setFormPlatforms(project.platforms || ['Android']);
    setFormOsRequirement(project.requirements?.os || 'Android 8.0+');
    setFormFeaturesUk(Array.isArray(project.features?.uk) ? project.features.uk.join('\n') : '');
    setFormFeaturesEn(Array.isArray(project.features?.en) ? project.features.en.join('\n') : '');

    setDownloadAndroid(project.download?.android || '');
    setDownloadWindows(project.download?.windows || '');
    setDownloadLinux(project.download?.linux || '');
    setDownloadMac(project.download?.mac || '');
    setDownloadWeb(project.download?.web || '');

    setEditorTab('basic');
    setEditorOpen(true);
  };

  const handleQuickToggleStatus = (project: AppItem) => {
    setPendingAction({ type: 'TOGGLE_STATUS', projectToToggle: project });
    setActionPasswordError('');
    setActionModalOpen(true);
  };

  const executeQuickToggleStatus = async (password: string, project: AppItem, guardCode?: string) => {
    const newStatus: AppStatus = project.status === 'published' ? 'draft' : 'published';
    setStatusUpdatingId(project.id);

    try {
      const res = await fetch(`/api/admin/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          ...(guardCode ? { 'X-Guard-Code': guardCode } : {})
        },
        body: JSON.stringify({
          ...project,
          status: newStatus,
          actionPassword: password
        })
      });

      const data = await res.json();
      if (res.status === 403 && data.requiresGuardCode) {
        if (guardCode) {
          throw new Error(data.error || 'Недійсний або прострочений код MonoVoice Guard');
        }
        setActionModalOpen(false);
        setGuardPendingAction({
          actionTitle: 'Зміна статусу проєкту',
          targetLabel: project.name,
          actionType: 'CHANGE_STATUS_PROJECT',
          onExecute: async (code) => {
            await executeQuickToggleStatus(password, project, code);
          }
        });
        setGuardModalOpen(true);
        return;
      }

      if (res.ok && data.success) {
        setActionModalOpen(false);
        setActionPasswordInput('');
        setActionPasswordError('');
        fetchProjects();
        onProjectListChanged();
      } else {
        const errMsg = data.error || 'Помилка зміни статусу. Невірний пароль.';
        if (guardCode) {
          throw new Error(errMsg);
        }
        setActionPasswordError(errMsg);
      }
    } catch (err: any) {
      if (guardCode) {
        throw err instanceof Error ? err : new Error(err?.message || 'Помилка підключення');
      }
      setActionPasswordError(`Помилка підключення: ${err.message}`);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleTogglePlatform = (platform: Platform) => {
    if (formPlatforms.includes(platform)) {
      if (formPlatforms.length === 1) return; // Keep at least one
      setFormPlatforms(formPlatforms.filter(p => p !== platform));
    } else {
      setFormPlatforms([...formPlatforms, platform]);
    }
  };

  const handleSave = (targetStatus?: AppStatus) => {
    if (!formName.trim() || !formSlug.trim()) {
      alert('Назва та URL Slug є обов’язковими полями');
      return;
    }
    setPendingAction({ type: 'SAVE', targetStatus });
    setActionPasswordError('');
    setActionModalOpen(true);
  };

  const executeSave = async (password: string, targetStatus?: AppStatus, guardCode?: string) => {
    setIsSaving(true);
    const splitUkFeatures = formFeaturesUk.split('\n').map(s => s.trim()).filter(Boolean);
    const splitEnFeatures = formFeaturesEn.split('\n').map(s => s.trim()).filter(Boolean);
    const splitUkLongDesc = formLongDescUk.split('\n\n').map(s => s.trim()).filter(Boolean);
    const splitEnLongDesc = formLongDescEn.split('\n\n').map(s => s.trim()).filter(Boolean);

    const payload: Partial<AppItem> & { actionPassword: string } = {
      name: formName.trim(),
      slug: formSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
      iconType: formIconType,
      tagline: { uk: formTaglineUk, en: formTaglineEn },
      description: { uk: formDescUk, en: formDescEn },
      longDescription: {
        uk: splitUkLongDesc.length ? splitUkLongDesc : [formDescUk],
        en: splitEnLongDesc.length ? splitEnLongDesc : [formDescEn]
      },
      category: formCategory,
      status: targetStatus || formStatus,
      version: formVersion,
      releaseDate: formReleaseDate,
      fileSize: formFileSize,
      github: formGithub,
      featured: formFeatured,
      platforms: formPlatforms,
      requirements: {
        os: formOsRequirement
      },
      features: {
        uk: splitUkFeatures,
        en: splitEnFeatures
      },
      download: {
        android: downloadAndroid || undefined,
        windows: downloadWindows || undefined,
        linux: downloadLinux || undefined,
        mac: downloadMac || undefined,
        web: downloadWeb || undefined
      },
      actionPassword: password
    };

    try {
      const isEdit = Boolean(editingProject && editingProject.id);
      const url = isEdit ? `/api/admin/projects/${editingProject!.id}` : '/api/admin/projects';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          ...(guardCode ? { 'X-Guard-Code': guardCode } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.status === 403 && data.requiresGuardCode) {
        if (guardCode) {
          throw new Error(data.error || 'Недійсний або прострочений код MonoVoice Guard');
        }
        setActionModalOpen(false);
        setGuardPendingAction({
          actionTitle: isEdit ? 'Оновлення проєкту' : 'Створення проєкту',
          targetLabel: payload.name || 'Проєкт',
          actionType: isEdit ? 'UPDATE_PROJECT' : 'CREATE_PROJECT',
          onExecute: async (code) => {
            await executeSave(password, targetStatus, code);
          }
        });
        setGuardModalOpen(true);
        return;
      }

      if (res.ok && data.success) {
        setActionModalOpen(false);
        setActionPasswordInput('');
        setActionPasswordError('');
        setEditorOpen(false);
        fetchProjects();
        onProjectListChanged();
        alert(data.message || 'Проєкт збережено успішно');
      } else {
        const errMsg = data.error || 'Помилка збереження. Перевірте пароль.';
        if (guardCode) {
          throw new Error(errMsg);
        }
        setActionPasswordError(errMsg);
      }
    } catch (err: any) {
      if (guardCode) {
        throw err instanceof Error ? err : new Error(err?.message || "Помилка з'єднання");
      }
      setActionPasswordError(`Помилка з'єднання: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmActionWithPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionPasswordInput.trim()) {
      setActionPasswordError('Будь ласка, вкажіть пароль створення/оновлення');
      return;
    }

    if (pendingAction?.type === 'SAVE') {
      executeSave(actionPasswordInput.trim(), pendingAction.targetStatus);
    } else if (pendingAction?.type === 'TOGGLE_STATUS' && pendingAction.projectToToggle) {
      executeQuickToggleStatus(actionPasswordInput.trim(), pendingAction.projectToToggle);
    }
  };

  const handleDelete = async (project: AppItem, guardCode?: string) => {
    if (!guardCode && !confirm(`Ви впевнені, що хочете остаточно вилучити проєкт "${project.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/projects/${project.id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken,
          ...(guardCode ? { 'X-Guard-Code': guardCode } : {})
        }
      });
      const data = await res.json();

      if (res.status === 403 && data.requiresGuardCode) {
        if (guardCode) {
          throw new Error(data.error || 'Недійсний або прострочений код MonoVoice Guard');
        }
        setGuardPendingAction({
          actionTitle: 'Остаточне видалення проєкту',
          targetLabel: project.name,
          actionType: 'DELETE_PROJECT',
          onExecute: async (code) => {
            await handleDelete(project, code);
          }
        });
        setGuardModalOpen(true);
        return;
      }

      if (res.ok && data.success) {
        fetchProjects();
        onProjectListChanged();
      } else {
        const errMsg = data.error || 'Помилка видалення';
        if (guardCode) {
          throw new Error(errMsg);
        }
        alert(errMsg);
      }
    } catch (err: any) {
      if (guardCode) {
        throw err instanceof Error ? err : new Error(err?.message || 'Помилка видалення');
      }
      alert('Помилка видалення');
    }
  };

  const renderPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case 'Windows':
        return (
          <svg key={platform} className="w-4 h-4 fill-current text-cyan-300" viewBox="0 0 24 24">
            <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.949-1.801" />
          </svg>
        );
      case 'Android':
        return (
          <svg key={platform} className="w-4 h-4 fill-current text-emerald-400" viewBox="0 0 24 24">
            <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.125 12 8.125c-1.8533 0-3.5902.2866-5.1368.8247L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.152.5676l1.9972 3.4592C2.6889 11.1867.343 14.5457.0422 18.6667h23.9156c-.3008-4.121-2.6467-7.48-6.0753-9.3453" />
          </svg>
        );
      case 'macOS':
        return (
          <svg key={platform} className="w-4 h-4 fill-current text-slate-300" viewBox="0 0 24 24">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.96 6.33c.67-.81 1.12-1.94 1-3.08-.96.04-2.13.64-2.82 1.45-.61.7-.11 1.86-.99 2.97 1.08.08 2.14-.53 2.81-1.34" />
          </svg>
        );
      case 'Web':
        return <Globe key={platform} className="w-4 h-4 text-purple-300 stroke-[2.2]" />;
      case 'Linux':
      default:
        return <TerminalIcon key={platform} className="w-4 h-4 text-amber-300 stroke-[2.2]" />;
    }
  };

  const filteredProjects = projects.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      (p.tagline?.uk && p.tagline.uk.toLowerCase().includes(q)) ||
      (p.tagline?.en && p.tagline.en.toLowerCase().includes(q));

    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    const matchesPlatform = filterPlatform === 'all' || p.platforms.includes(filterPlatform as Platform);

    return matchesSearch && matchesStatus && matchesCategory && matchesPlatform;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Search Controls */}
      <div className="comic-card p-6 border-l-4 border-l-[#f6cf3f] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-brush text-2xl text-[#f6cf3f] flex items-center gap-2">
              <Layers className="w-6 h-6 text-[#f6cf3f]" />
              <span>{language === 'uk' ? 'Управління Пропродуктами Каталогу' : 'Catalog Products Management'}</span>
            </h2>
            <p className="text-xs text-zinc-300">
              {language === 'uk'
                ? 'Редагуйте наявні продукти, створюйте нові та керуйте їхнім виглядом і статусом публікації.'
                : 'Manage app catalog items, edit details, set release versions, and create new products.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#182226] border-2 border-zinc-600 rounded p-1 gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition-colors cursor-pointer rounded ${
                  viewMode === 'grid'
                    ? 'bg-[#f6cf3f] text-[#0d1317]'
                    : 'text-zinc-300 hover:text-white'
                }`}
                title="Вигляд карточок (як на головній)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Карточки</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition-colors cursor-pointer rounded ${
                  viewMode === 'table'
                    ? 'bg-[#f6cf3f] text-[#0d1317]'
                    : 'text-zinc-300 hover:text-white'
                }`}
                title="Вигляд таблиці"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Таблиця</span>
              </button>
            </div>

            <button
              onClick={handleOpenNew}
              className="comic-btn-yellow px-5 py-2.5 text-xs font-extrabold cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'uk' ? 'Новий продукт' : 'New Product'}</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#f6cf3f] absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={language === 'uk' ? 'Пошук продукту за назвою чи slug...' : 'Search product by name or slug...'}
              className="w-full pl-9 pr-3 py-2 bg-[#182226] border-2 border-zinc-600 hover:border-zinc-400 text-xs text-white placeholder:text-zinc-400 focus:outline-none focus:border-[#f6cf3f] font-mono rounded"
            />
          </div>

          {/* Status Select */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-[#182226] border-2 border-zinc-600 hover:border-zinc-400 text-xs text-white focus:outline-none focus:border-[#f6cf3f] font-mono cursor-pointer rounded"
          >
            <option value="all" className="bg-[#0b1013]">Всі статуси</option>
            <option value="published" className="bg-[#0b1013]">Опубліковані (Published)</option>
            <option value="draft" className="bg-[#0b1013]">Чернетки (Draft)</option>
            <option value="in-development" className="bg-[#0b1013]">В розробці (In Dev)</option>
            <option value="archived" className="bg-[#0b1013]">Архівовані (Archived)</option>
          </select>

          {/* Category Select */}
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-[#182226] border-2 border-zinc-600 hover:border-zinc-400 text-xs text-white focus:outline-none focus:border-[#f6cf3f] font-mono cursor-pointer rounded"
          >
            <option value="all" className="bg-[#0b1013]">Всі категорії</option>
            <option value="Audio" className="bg-[#0b1013]">Audio (Аудіо)</option>
            <option value="Utility" className="bg-[#0b1013]">Utility (Утиліти)</option>
            <option value="Productivity" className="bg-[#0b1013]">Productivity (Продуктивність)</option>
            <option value="System" className="bg-[#0b1013]">System (Система)</option>
            <option value="Developer" className="bg-[#0b1013]">Developer (Розробка)</option>
          </select>

          {/* Platform Select */}
          <select
            value={filterPlatform}
            onChange={e => setFilterPlatform(e.target.value)}
            className="px-3 py-2 bg-[#182226] border-2 border-zinc-600 hover:border-zinc-400 text-xs text-white focus:outline-none focus:border-[#f6cf3f] font-mono cursor-pointer rounded"
          >
            <option value="all" className="bg-[#0b1013]">Всі платформи</option>
            <option value="Android" className="bg-[#0b1013]">Android</option>
            <option value="Windows" className="bg-[#0b1013]">Windows</option>
            <option value="macOS" className="bg-[#0b1013]">macOS</option>
            <option value="Linux" className="bg-[#0b1013]">Linux</option>
            <option value="Web" className="bg-[#0b1013]">Web</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="comic-card p-12 text-center text-xs text-zinc-400 font-mono space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#f6cf3f]" />
          <span>Завантаження продуктів з сервера...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="comic-card p-12 text-center space-y-4">
          <p className="text-sm text-zinc-300 font-medium">Жодного продукту не знайдено за вибраними фільтрами</p>
          <button
            onClick={handleOpenNew}
            className="comic-btn-yellow px-5 py-2 text-xs font-extrabold cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Створити новий продукт</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW (Exact main page comic card layout + Admin action overlays) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quick Create New Card */}
          <div
            onClick={handleOpenNew}
            className="comic-card group relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-[#f6cf3f]/60 hover:border-[#f6cf3f] bg-[#0d1317]/50 hover:bg-[#182226]/80 cursor-pointer transition-all duration-200 min-h-[320px] text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-[#f6cf3f]/10 border-2 border-[#f6cf3f] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-8 h-8 text-[#f6cf3f]" />
            </div>
            <div>
              <h3 className="font-brush text-2xl text-[#f6cf3f]">Створити продукт</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-[200px] mx-auto">
                Додати новий запис до каталогу програм MonoVoice
              </p>
            </div>
            <span className="comic-btn-yellow px-4 py-1.5 text-xs font-extrabold">
              Створити +
            </span>
          </div>

          {/* Product Cards */}
          {filteredProjects.map((project, index) => {
            const isPublished = project.status === 'published' || project.status === 'available';
            const isUpdatingThis = statusUpdatingId === project.id;

            return (
              <div
                key={project.id}
                className="comic-card group relative flex flex-col justify-between p-5 sm:p-6 overflow-hidden transition-all duration-200 hover:-translate-y-1 border-2 border-white/10 hover:border-[#f6cf3f]"
              >
                {/* Yellow Diagonal Corner Paint Slashes */}
                <svg
                  viewBox="0 0 400 240"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  <polygon points="365,0 400,0 400,48 384,68 390,18" fill="#f6cf3f" />
                  {index % 2 === 0 ? (
                    <polygon points="0,195 16,175 8,240 0,240" fill="#f6cf3f" opacity="0.85" />
                  ) : (
                    <polygon points="0,0 52,0 12,38 0,26" fill="#f6cf3f" opacity="0.9" />
                  )}
                  <polygon points="388,210 400,190 400,240 375,240" fill="#f6cf3f" opacity="0.8" />
                </svg>

                {/* Card Top Admin Status & Tag Bar */}
                <div className="relative z-10 flex items-center justify-between gap-2 pb-3 border-b border-white/10 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded font-mono ${
                        isPublished
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : project.status === 'draft'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-white/10 text-zinc-300'
                      }`}
                    >
                      {project.status === 'published' || project.status === 'available'
                        ? 'Опубліковано'
                        : project.status === 'draft'
                        ? 'Чернетка'
                        : project.status === 'in-development'
                        ? 'В розробці'
                        : 'Архів'}
                    </span>
                    <span className="text-[10px] font-mono text-[#f6cf3f] font-bold">
                      v{project.version}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-zinc-400">
                    {project.category}
                  </span>
                </div>

                {/* Main Card Content (Identical to Main Page Display) */}
                <div className="relative z-10 flex items-start gap-4">
                  <ComicAppIconBadge iconType={project.iconType} />

                  <div className="flex-1 min-w-0 pt-0.5">
                    <h3 className="font-brush text-2xl text-[#fff6c5] group-hover:text-[#f6cf3f] tracking-wide leading-tight transition-colors truncate">
                      {project.name}
                    </h3>

                    <p className="mt-1.5 text-xs text-zinc-200/90 leading-snug line-clamp-3">
                      {project.tagline?.[language] || project.tagline?.uk || project.tagline?.en || 'Без опису'}
                    </p>
                  </div>
                </div>

                {/* Platforms & Admin Action Controls Row */}
                <div className="relative z-10 mt-5 pt-3 border-t border-white/10 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-zinc-100">
                      {project.platforms?.map(p => renderPlatformIcon(p))}
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {project.fileSize}
                    </span>
                  </div>

                  {/* Admin Toolbar Buttons */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {/* Edit */}
                    <button
                      onClick={() => handleOpenEdit(project)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 bg-[#182226] hover:bg-[#223037] border-2 border-zinc-600 hover:border-[#f6cf3f] text-white font-bold text-[11px] rounded transition-colors cursor-pointer"
                      title="Редагувати всі дані"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#f6cf3f]" />
                      <span className="hidden xl:inline">Змінити</span>
                    </button>

                    {/* Preview */}
                    <button
                      onClick={() => setPreviewProject(project)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 bg-[#182226] hover:bg-[#223037] border-2 border-zinc-600 hover:border-[#f6cf3f] text-white font-bold text-[11px] rounded transition-colors cursor-pointer"
                      title="Попередній перегляд продукту"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-300" />
                      <span className="hidden xl:inline">Перегляд</span>
                    </button>

                    {/* Quick Publish / Unpublish */}
                    <button
                      onClick={() => handleQuickToggleStatus(project)}
                      disabled={isUpdatingThis}
                      className={`flex items-center justify-center gap-1 py-1.5 px-2 border-2 text-white font-bold text-[11px] rounded transition-colors cursor-pointer ${
                        isPublished
                          ? 'bg-amber-950/80 hover:bg-amber-900 border-amber-500/60'
                          : 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/60'
                      }`}
                      title={isPublished ? 'Перевести в чернетки' : 'Опублікувати'}
                    >
                      {isUpdatingThis ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                      ) : isPublished ? (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-300" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      )}
                      <span className="hidden xl:inline">
                        {isPublished ? 'В draft' : 'Опубл.'}
                      </span>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(project)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 bg-red-950/80 hover:bg-red-900 border-2 border-red-500/60 text-red-200 font-bold text-[11px] rounded transition-colors cursor-pointer"
                      title="Видалити продукт"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      <span className="hidden xl:inline">Видалити</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="comic-card p-6 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-200">
              <thead className="bg-white/10 text-[#f6cf3f] font-mono text-[11px] uppercase">
                <tr>
                  <th className="p-3">Іконка & Назва</th>
                  <th className="p-3">Категорія</th>
                  <th className="p-3">Версія</th>
                  <th className="p-3">Платформи</th>
                  <th className="p-3">Статус</th>
                  <th className="p-3 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 font-mono">
                {filteredProjects.map(project => {
                  const isPublished = project.status === 'published' || project.status === 'available';
                  return (
                    <tr key={project.id} className="hover:bg-white/5">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[#182226] border border-zinc-600 flex items-center justify-center shrink-0">
                            <ComicAppIconBadge iconType={project.iconType} size="md" />
                          </div>
                          <div>
                            <span className="font-bold text-white block text-sm">{project.name}</span>
                            <span className="text-[11px] text-zinc-400">/{project.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-zinc-300">{project.category}</td>
                      <td className="p-3 text-[#f6cf3f] font-bold">v{project.version}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          {project.platforms?.map(p => renderPlatformIcon(p))}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded ${
                            isPublished
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : project.status === 'draft'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-white/10 text-zinc-400'
                          }`}
                        >
                          {project.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setPreviewProject(project)}
                            className="p-1.5 bg-[#182226] hover:bg-[#223037] border border-zinc-500 hover:border-[#f6cf3f] text-zinc-100 hover:text-white rounded cursor-pointer shadow-sm transition-colors"
                            title="Попередній перегляд"
                          >
                            <Eye className="w-4 h-4 text-cyan-300" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(project)}
                            className="p-1.5 bg-[#182226] hover:bg-[#223037] border border-zinc-500 hover:border-[#f6cf3f] text-zinc-100 hover:text-white rounded cursor-pointer shadow-sm transition-colors"
                            title="Редагувати"
                          >
                            <Edit3 className="w-4 h-4 text-[#f6cf3f]" />
                          </button>
                          <button
                            onClick={() => handleDelete(project)}
                            className="p-1.5 bg-red-950/80 hover:bg-red-900 border border-red-500/60 text-red-200 rounded cursor-pointer shadow-sm transition-colors"
                            title="Видалити"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Complete Product Editor Modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="comic-card max-w-4xl w-full p-6 space-y-5 border-2 border-[#f6cf3f] my-6 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <ComicAppIconBadge iconType={formIconType} size="md" />
                <div>
                  <h3 className="font-impact text-2xl text-[#f6cf3f]">
                    {editingProject ? `Редагувати: ${formName || 'Продукт'}` : 'Створити новий продукт'}
                  </h3>
                  <p className="text-xs text-zinc-300">
                    Повна настройка метаданих, контенту, версій та файлів для каталогу
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditorOpen(false)}
                className="p-2 text-zinc-400 hover:text-white text-xl font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-3 font-mono text-xs overflow-x-auto shrink-0">
              <button
                onClick={() => setEditorTab('basic')}
                className={`px-3.5 py-1.5 font-bold rounded transition-colors cursor-pointer border-2 ${
                  editorTab === 'basic'
                    ? 'bg-[#f6cf3f] text-[#0d1317] border-[#f6cf3f]'
                    : 'bg-[#182226] text-white border-zinc-600 hover:border-zinc-400'
                }`}
              >
                1. Основні дані
              </button>
              <button
                onClick={() => setEditorTab('content')}
                className={`px-3.5 py-1.5 font-bold rounded transition-colors cursor-pointer border-2 ${
                  editorTab === 'content'
                    ? 'bg-[#f6cf3f] text-[#0d1317] border-[#f6cf3f]'
                    : 'bg-[#182226] text-white border-zinc-600 hover:border-zinc-400'
                }`}
              >
                2. Описи (UK & EN)
              </button>
              <button
                onClick={() => setEditorTab('downloads')}
                className={`px-3.5 py-1.5 font-bold rounded transition-colors cursor-pointer border-2 ${
                  editorTab === 'downloads'
                    ? 'bg-[#f6cf3f] text-[#0d1317] border-[#f6cf3f]'
                    : 'bg-[#182226] text-white border-zinc-600 hover:border-zinc-400'
                }`}
              >
                3. Платформи & Файли
              </button>
              <button
                onClick={() => setEditorTab('extra')}
                className={`px-3.5 py-1.5 font-bold rounded transition-colors cursor-pointer border-2 ${
                  editorTab === 'extra'
                    ? 'bg-[#f6cf3f] text-[#0d1317] border-[#f6cf3f]'
                    : 'bg-[#182226] text-white border-zinc-600 hover:border-zinc-400'
                }`}
              >
                4. Фічі & Вимоги
              </button>
            </div>

            {/* Tab 1: Basic Info */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
              {editorTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-zinc-300 block mb-1">Назва продукту:*</label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                        placeholder="напр. PlumaTsuki"
                        className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] font-mono rounded"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-zinc-300 block mb-1">URL Slug (ідентифікатор):*</label>
                      <input
                        type="text"
                        required
                        value={formSlug}
                        onChange={e => setFormSlug(e.target.value)}
                        placeholder="напр. plumatsuki"
                        className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] font-mono rounded"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Icon Selection with Live Preview */}
                    <div>
                      <label className="font-bold text-zinc-300 block mb-1">Стиль іконки (SVG):</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={formIconType}
                          onChange={e => setFormIconType(e.target.value as AppItem['iconType'])}
                          className="flex-1 px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] font-mono cursor-pointer rounded"
                        >
                          <option value="waves">waves (Аудіо / Хвилі)</option>
                          <option value="file-text">file-text (Документи)</option>
                          <option value="book-open">book-open (Книга / Замітки)</option>
                          <option value="image">image (Зображення / Медіа)</option>
                          <option value="settings">settings (Утиліти / Налаштування)</option>
                          <option value="terminal">terminal (Консоль / Код)</option>
                          <option value="clock">clock (Час / Таймер)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-zinc-300 block mb-1">Категорія:</label>
                      <select
                        value={formCategory}
                        onChange={e => setFormCategory(e.target.value as AppCategory)}
                        className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] font-mono cursor-pointer rounded"
                      >
                        <option value="Audio">Audio (Аудіо)</option>
                        <option value="Utility">Utility (Утиліти)</option>
                        <option value="Productivity">Productivity (Продуктивність)</option>
                        <option value="System">System (Система)</option>
                        <option value="Developer">Developer (Розробка)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-zinc-300 block mb-1">Статус публікації:</label>
                      <select
                        value={formStatus}
                        onChange={e => setFormStatus(e.target.value as AppStatus)}
                        className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] font-mono cursor-pointer rounded"
                      >
                        <option value="draft">Draft (Чернетка - приховано)</option>
                        <option value="published">Published (Опубліковано в каталозі)</option>
                        <option value="available">Available (Доступно)</option>
                        <option value="in-development">In Development (В розробці)</option>
                        <option value="archived">Archived (Архів)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="font-bold text-zinc-300 block mb-1">Версія програми:</label>
                      <input
                        type="text"
                        value={formVersion}
                        onChange={e => setFormVersion(e.target.value)}
                        placeholder="1.0.0"
                        className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] font-mono rounded"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-zinc-300 block mb-1">Дата релізу:</label>
                      <input
                        type="date"
                        value={formReleaseDate}
                        onChange={e => setFormReleaseDate(e.target.value)}
                        className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] font-mono rounded"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-zinc-300 block mb-1">Розмір файлу:</label>
                      <input
                        type="text"
                        value={formFileSize}
                        onChange={e => setFormFileSize(e.target.value)}
                        placeholder="напр. 12.4 MB"
                        className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] font-mono rounded"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-zinc-300 block mb-1">GitHub репозиторій:</label>
                      <input
                        type="text"
                        value={formGithub}
                        onChange={e => setFormGithub(e.target.value)}
                        placeholder="https://github.com/monovoice/..."
                        className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] font-mono rounded"
                      />
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 text-white font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formFeatured}
                          onChange={e => setFormFeatured(e.target.checked)}
                          className="w-4 h-4 accent-[#f6cf3f]"
                        />
                        <span>Виділити як Обраний Продукт (Featured)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Localization & Content */}
              {editorTab === 'content' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-zinc-300 block mb-1">Короткий опис / Tagline (Українською):</label>
                      <input
                        type="text"
                        value={formTaglineUk}
                        onChange={e => setFormTaglineUk(e.target.value)}
                        placeholder="Коротке гасло для карточки програми"
                        className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] rounded"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-zinc-300 block mb-1">Tagline (English):</label>
                      <input
                        type="text"
                        value={formTaglineEn}
                        onChange={e => setFormTaglineEn(e.target.value)}
                        placeholder="Short tagline for app card"
                        className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] rounded"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-zinc-300 block mb-1">Повний опис (Українською):</label>
                      <textarea
                        rows={4}
                        value={formDescUk}
                        onChange={e => setFormDescUk(e.target.value)}
                        placeholder="Детальний опис можливостей програми..."
                        className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] rounded"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-zinc-300 block mb-1">Full Description (English):</label>
                      <textarea
                        rows={4}
                        value={formDescEn}
                        onChange={e => setFormDescEn(e.target.value)}
                        placeholder="Detailed application description..."
                        className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] rounded"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-zinc-300 block mb-1">Розширений розповідний опис (UK, абзаци через 2 нових рядки):</label>
                      <textarea
                        rows={4}
                        value={formLongDescUk}
                        onChange={e => setFormLongDescUk(e.target.value)}
                        placeholder="Абзац 1...&#10;&#10;Абзац 2..."
                        className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-zinc-300 block mb-1">Long Paragraph Description (EN, double newline separated):</label>
                      <textarea
                        rows={4}
                        value={formLongDescEn}
                        onChange={e => setFormLongDescEn(e.target.value)}
                        placeholder="Paragraph 1...&#10;&#10;Paragraph 2..."
                        className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] rounded font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Downloads & File Attachments */}
              {editorTab === 'downloads' && (
                <div className="space-y-4">
                  {/* Platforms Checklist */}
                  <div>
                    <label className="font-bold text-zinc-300 block mb-2">Підтримувані платформи:</label>
                    <div className="flex flex-wrap gap-3">
                      {(['Android', 'Windows', 'macOS', 'Linux', 'Web'] as Platform[]).map(p => {
                        const checked = formPlatforms.includes(p);
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handleTogglePlatform(p)}
                            className={`flex items-center gap-2 px-3 py-1.5 font-mono text-xs font-bold rounded border-2 transition-colors cursor-pointer ${
                              checked
                                ? 'bg-[#f6cf3f] text-[#0d1317] border-[#f6cf3f]'
                                : 'bg-[#182226] text-zinc-300 border-zinc-600 hover:border-zinc-400'
                            }`}
                          >
                            {renderPlatformIcon(p)}
                            <span>{p}</span>
                            {checked && <Check className="w-3.5 h-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Platform Download Links */}
                  <div className="space-y-3 pt-2">
                    <span className="font-bold text-[#f6cf3f] block">Посилання завантаження дистрибутивів:</span>

                    {formPlatforms.includes('Android') && (
                      <div>
                        <label className="font-bold text-zinc-300 block mb-1">Android APK URL:</label>
                        <input
                          type="text"
                          value={downloadAndroid}
                          onChange={e => setDownloadAndroid(e.target.value)}
                          placeholder="/uploads/file_..._app.apk або https://..."
                          className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] font-mono rounded"
                        />
                      </div>
                    )}

                    {formPlatforms.includes('Windows') && (
                      <div>
                        <label className="font-bold text-zinc-300 block mb-1">Windows Installer/ZIP URL:</label>
                        <input
                          type="text"
                          value={downloadWindows}
                          onChange={e => setDownloadWindows(e.target.value)}
                          placeholder="/uploads/file_..._setup.exe або .zip"
                          className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] font-mono rounded"
                        />
                      </div>
                    )}

                    {formPlatforms.includes('Linux') && (
                      <div>
                        <label className="font-bold text-zinc-300 block mb-1">Linux Package / AppImage URL:</label>
                        <input
                          type="text"
                          value={downloadLinux}
                          onChange={e => setDownloadLinux(e.target.value)}
                          placeholder="/uploads/file_..._app.tar.gz"
                          className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] font-mono rounded"
                        />
                      </div>
                    )}

                    {formPlatforms.includes('macOS') && (
                      <div>
                        <label className="font-bold text-zinc-300 block mb-1">macOS DMG / ZIP URL:</label>
                        <input
                          type="text"
                          value={downloadMac}
                          onChange={e => setDownloadMac(e.target.value)}
                          placeholder="/uploads/file_..._app.dmg"
                          className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] font-mono rounded"
                        />
                      </div>
                    )}

                    {formPlatforms.includes('Web') && (
                      <div>
                        <label className="font-bold text-zinc-300 block mb-1">Web App / Cloud Demo URL:</label>
                        <input
                          type="text"
                          value={downloadWeb}
                          onChange={e => setDownloadWeb(e.target.value)}
                          placeholder="https://..."
                          className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] font-mono rounded"
                        />
                      </div>
                    )}
                  </div>

                  {/* Built-in File Uploader Widget */}
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <span className="font-bold text-zinc-300 block">Завантажити бінарний файл прямо на сервер:</span>
                    <FileUploaderWidget
                      csrfToken={csrfToken}
                      usageLocation="Binary Download"
                      onFileUploaded={(file: UploadedFile) => {
                        if (file.originalName.endsWith('.apk')) setDownloadAndroid(file.url);
                        else if (file.originalName.endsWith('.exe') || file.originalName.endsWith('.zip')) setDownloadWindows(file.url);
                        else if (file.originalName.endsWith('.tar.gz')) setDownloadLinux(file.url);
                        else setDownloadAndroid(file.url);
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Tab 4: Features & Requirements */}
              {editorTab === 'extra' && (
                <div className="space-y-4">
                  <div>
                    <label className="font-bold text-zinc-300 block mb-1">Системні вимоги (ОС, Архітектура):</label>
                    <input
                      type="text"
                      value={formOsRequirement}
                      onChange={e => setFormOsRequirement(e.target.value)}
                      placeholder="Android 8.0+ / Windows 10 x64"
                      className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] font-mono rounded"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-zinc-300 block mb-1">Перелік ключових фіч (UK, кожна фіча з нового рядка):</label>
                      <textarea
                        rows={6}
                        value={formFeaturesUk}
                        onChange={e => setFormFeaturesUk(e.target.value)}
                        placeholder="Швидка обробка аудіо&#10;Офлайн-режим&#10;Експорт у WAV..."
                        className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-zinc-300 block mb-1">Key Features List (EN, line by line):</label>
                      <textarea
                        rows={6}
                        value={formFeaturesEn}
                        onChange={e => setFormFeaturesEn(e.target.value)}
                        placeholder="Fast audio processing&#10;Offline support&#10;WAV export..."
                        className="w-full px-3 py-2 bg-[#182226] border-2 border-zinc-600 text-white focus:outline-none focus:border-[#f6cf3f] rounded font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="px-4 py-2 bg-[#182226] hover:bg-[#223037] border-2 border-zinc-600 hover:border-[#f6cf3f] text-xs font-bold text-white transition-colors cursor-pointer rounded"
              >
                Скасувати
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSave('draft')}
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#182226] hover:bg-[#223037] border-2 border-zinc-600 hover:border-[#f6cf3f] text-xs font-bold text-white transition-colors cursor-pointer rounded disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  Зберегти як Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSave('published')}
                  disabled={isSaving}
                  className="comic-btn-yellow px-6 py-2 text-xs font-extrabold cursor-pointer"
                >
                  {isSaving ? 'Збереження...' : 'Опублікувати (Publish)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewProject && (
        <ProjectPreviewModal
          project={previewProject}
          onClose={() => setPreviewProject(null)}
          onPublishDirectly={async () => {
            await handleQuickToggleStatus(previewProject);
            setPreviewProject(null);
          }}
        />
      )}

      {/* Action Password Required Modal */}
      {actionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="comic-card max-w-md w-full p-6 space-y-4 border-2 border-[#f6cf3f] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-brush text-2xl text-[#f6cf3f] flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#f6cf3f]" />
                <span>Підтвердження операції</span>
              </h3>
              <button
                onClick={() => {
                  setActionModalOpen(false);
                  setActionPasswordError('');
                }}
                className="text-zinc-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-200 leading-relaxed">
              Навіть для створення чи ручного оновлення додатку чи проєкту введіть пароль дій (відмінний від пароля входу в панель).
            </p>

            {actionPasswordError && (
              <div className="p-3 bg-red-950/90 border border-red-500/80 text-red-200 text-xs font-bold rounded flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{actionPasswordError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmActionWithPassword} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">
                  Пароль створення/оновлення проєкту:
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={actionPasswordInput}
                  onChange={e => {
                    setActionPasswordInput(e.target.value);
                    setActionPasswordError('');
                  }}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2.5 bg-[#182226] border-2 border-zinc-600 focus:border-[#f6cf3f] text-xs text-white placeholder:text-zinc-500 focus:outline-none rounded font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActionModalOpen(false);
                    setActionPasswordError('');
                  }}
                  className="px-4 py-2 bg-[#182226] hover:bg-[#223038] border-2 border-zinc-500 hover:border-[#f6cf3f] text-xs font-bold text-white rounded transition-colors cursor-pointer"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="comic-btn-yellow px-5 py-2 text-xs font-extrabold cursor-pointer"
                >
                  {isSaving ? 'Обробка...' : 'Підтвердити операцію'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MonoVoice Guard 15-Second Steam Guard Modal */}
      {guardPendingAction && (
        <GuardCodeModal
          isOpen={guardModalOpen}
          onClose={() => {
            setGuardModalOpen(false);
            setGuardPendingAction(null);
          }}
          onConfirm={async (code) => {
            if (guardPendingAction) {
              await guardPendingAction.onExecute(code);
            }
          }}
          actionTitle={guardPendingAction.actionTitle}
          targetLabel={guardPendingAction.targetLabel}
          actionType={guardPendingAction.actionType}
          csrfToken={csrfToken}
        />
      )}
    </div>
  );
};

