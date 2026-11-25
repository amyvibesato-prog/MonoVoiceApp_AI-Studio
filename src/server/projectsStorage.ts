import { writeAuditLog } from "./backupManager";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AppItem, ProjectPublishStatus } from '../types/app';
import { APPS_DATA } from '../data/apps';
import { ADOBE_SCRIPTS_DATA } from '../data/adobeScripts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_DIR = path.resolve(__dirname, '../../storage');
const PROJECTS_FILE = path.join(STORAGE_DIR, 'projects.json');
const CHECKPOINTS_DIR = path.join(STORAGE_DIR, 'checkpoints');
const UPLOADS_PUBLIC_DIR = path.join(STORAGE_DIR, 'uploads/public');
const UPLOADS_PRIVATE_DIR = path.join(STORAGE_DIR, 'uploads/private');

// Ensure necessary directories exist
function ensureDirs() {
  [STORAGE_DIR, CHECKPOINTS_DIR, UPLOADS_PUBLIC_DIR, UPLOADS_PRIVATE_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Transform Adobe Script items into unified AppItem format
function adaptAdobeScript(script: any): AppItem {
  return {
    id: script.id,
    slug: script.slug,
    name: script.name,
    publishStatus: 'Published',
    tagline: script.tagline,
    description: script.description,
    longDescription: {
      uk: [script.description.uk],
      en: [script.description.en]
    },
    iconType: 'terminal',
    platforms: ['ExtendScript'],
    category: 'Adobe Script',
    status: 'available',
    version: script.version,
    releaseDate: script.releaseDate,
    fileSize: '~5 KB',
    featured: true,
    download: {
      extendscript: `/storage/uploads/public/${script.downloadFileName || script.id + '.jsx'}`,
      fileName: script.downloadFileName
    },
    github: script.githubUrl || 'https://github.com/monovoice',
    features: script.features,
    requirements: {
      os: `${script.adobeApp} CC 2020 - 2026`
    },
    screenshots: [],
    changelog: [
      {
        version: script.version,
        date: script.releaseDate,
        changes: {
          uk: ['Початковий стабільний реліз скрипта'],
          en: ['Initial stable script release']
        }
      }
    ],
    adobeApp: script.adobeApp,
    appBadgeColor: script.appBadgeColor,
    fileFormat: script.fileFormat,
    codeSnippet: script.codeSnippet,
    installationGuide: script.installationGuide,
    downloadFileName: script.downloadFileName,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

// Initial seed if projects.json does not exist
function seedProjects(): AppItem[] {
  ensureDirs();

  const seededApps: AppItem[] = APPS_DATA.map(app => ({
    ...app,
    publishStatus: (app.publishStatus || 'Published') as ProjectPublishStatus,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }));

  const seededScripts: AppItem[] = ADOBE_SCRIPTS_DATA.map(adaptAdobeScript);

  const initialItems = [...seededApps, ...seededScripts];
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(initialItems, null, 2), 'utf8');
  return initialItems;
}

export function readProjectsFromFile(): AppItem[] {
  ensureDirs();
  if (!fs.existsSync(PROJECTS_FILE)) {
    return seedProjects();
  }
  try {
    const raw = fs.readFileSync(PROJECTS_FILE, 'utf8');
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) {
      return seedProjects();
    }
    return items;
  } catch (e) {
    console.error('Failed to parse projects.json, fallback to seed:', e);
    return seedProjects();
  }
}

function writeProjectsToFile(items: AppItem[]) {
  ensureDirs();
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(items, null, 2), 'utf8');
}

// Checkpoint Management
export function createCheckpoint(triggerName: string): string {
  ensureDirs();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeTrigger = triggerName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `checkpoint_${timestamp}_${safeTrigger}.json`;
  const checkpointPath = path.join(CHECKPOINTS_DIR, filename);

  const currentItems = readProjectsFromFile();
  fs.writeFileSync(checkpointPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    trigger: triggerName,
    itemCount: currentItems.length,
    data: currentItems
  }, null, 2), 'utf8');

  // Keep only latest 15 checkpoints
  try {
    const files = fs.readdirSync(CHECKPOINTS_DIR)
      .filter(f => f.startsWith('checkpoint_') && f.endsWith('.json'))
      .sort((a, b) => b.localeCompare(a));

    if (files.length > 15) {
      files.slice(15).forEach(f => {
        try { fs.unlinkSync(path.join(CHECKPOINTS_DIR, f)); } catch (_) {}
      });
    }
  } catch (e) {
    console.error('Checkpoint cleanup error:', e);
  }

  return filename;
}

export function listCheckpoints() {
  ensureDirs();
  try {
    const files = fs.readdirSync(CHECKPOINTS_DIR)
      .filter(f => f.startsWith('checkpoint_') && f.endsWith('.json'))
      .sort((a, b) => b.localeCompare(a));

    return files.map(f => {
      const fullPath = path.join(CHECKPOINTS_DIR, f);
      const stat = fs.statSync(fullPath);
      let meta: any = {};
      try {
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        meta = {
          trigger: content.trigger || 'unknown',
          itemCount: content.itemCount || 0,
          timestamp: content.timestamp || stat.mtime.toISOString()
        };
      } catch (_) {}

      return {
        id: f,
        filename: f,
        size: stat.size,
        createdAt: stat.mtime,
        ...meta
      };
    });
  } catch (e) {
    return [];
  }
}

export function restoreCheckpoint(checkpointFilename: string, context?: { ip?: string; method?: string; endpoint?: string; userAgent?: string }): boolean {
  ensureDirs();
  const safeFilename = path.basename(checkpointFilename);
  const checkpointPath = path.join(CHECKPOINTS_DIR, safeFilename);

  if (!fs.existsSync(checkpointPath)) {
    return false;
  }

  try {
    createCheckpoint('pre_restore_backup');

    const raw = fs.readFileSync(checkpointPath, 'utf8');
    const parsed = JSON.parse(raw);
    const restoredData = Array.isArray(parsed) ? parsed : parsed.data;

    if (!Array.isArray(restoredData)) {
      return false;
    }

    writeProjectsToFile(restoredData);
    writeAuditLog("CHECKPOINT_RESTORE", `Відновлено стан проєктів з контрольної точки: ${safeFilename}`, "SUCCESS", context?.ip || "server", { method: context?.method, endpoint: context?.endpoint, userAgent: context?.userAgent });
    return true;
  } catch (e) {
    console.error('Failed to restore checkpoint:', e);
    return false;
  }
}

// Public API methods
export function getPublicProjects(): AppItem[] {
  const all = readProjectsFromFile();
  return all.filter(p => p.publishStatus === 'Published');
}

export function getPublicProjectBySlug(slug: string): AppItem | null {
  const all = getPublicProjects();
  return all.find(p => p.slug === slug) || null;
}

export function getAllAdminProjects(): AppItem[] {
  return readProjectsFromFile();
}

export function saveProject(projectInput: Partial<AppItem>, context?: { ip?: string; method?: string; endpoint?: string; userAgent?: string }): { success: boolean; project?: AppItem; error?: string } {
  if (!projectInput.name || !projectInput.name.trim()) {
    return { success: false, error: 'Назва проєкту є обовʼязковою' };
  }

  const projects = readProjectsFromFile();
  const now = Date.now();

  let slug = projectInput.slug ? projectInput.slug.trim().toLowerCase() : '';
  if (!slug) {
    slug = projectInput.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
  }

  const existingWithSlug = projects.find(p => p.slug === slug && p.id !== projectInput.id);
  if (existingWithSlug) {
    return { success: false, error: `Проєкт із таким slug ("${slug}") вже існує` };
  }

  createCheckpoint(`save_${slug}`);

  let updatedProject: AppItem;

  const existingIdx = projectInput.id ? projects.findIndex(p => p.id === projectInput.id) : -1;
  if (existingIdx !== -1) {
    const idx = existingIdx;

    updatedProject = {
      ...projects[idx],
      ...projectInput,
      slug,
      publishStatus: projectInput.publishStatus || projects[idx].publishStatus || 'Draft',
      updatedAt: now
    } as AppItem;

    projects[idx] = updatedProject;
  } else {
    const newId = `proj_${now}_${Math.random().toString(36).substring(2, 7)}`;
    updatedProject = {
      id: newId,
      slug,
      name: projectInput.name,
      publishStatus: projectInput.publishStatus || 'Draft',
      tagline: projectInput.tagline || { uk: '', en: '' },
      description: projectInput.description || { uk: '', en: '' },
      longDescription: projectInput.longDescription || { uk: [''], en: [''] },
      iconType: projectInput.iconType || 'waves',
      customIconUrl: projectInput.customIconUrl,
      platforms: projectInput.platforms || ['Windows'],
      category: projectInput.category || 'Utility',
      status: projectInput.status || 'available',
      version: projectInput.version || '1.0.0',
      releaseDate: projectInput.releaseDate || new Date().toISOString().split('T')[0],
      fileSize: projectInput.fileSize || '1.0 MB',
      featured: Boolean(projectInput.featured),
      download: projectInput.download || {},
      github: projectInput.github || '',
      features: projectInput.features || { uk: [], en: [] },
      requirements: projectInput.requirements || { os: 'Windows 10+' },
      screenshots: projectInput.screenshots || [],
      changelog: projectInput.changelog || [],
      adobeApp: projectInput.adobeApp,
      codeSnippet: projectInput.codeSnippet,
      installationGuide: projectInput.installationGuide,
      downloadFileName: projectInput.downloadFileName,
      createdAt: now,
      updatedAt: now
    };

    projects.unshift(updatedProject);
  }

  writeProjectsToFile(projects);
  const isEdit = Boolean(projectInput.id);
  writeAuditLog(isEdit ? "PROJECT_UPDATE" : "PROJECT_CREATE", `${isEdit ? "Оновлено" : "Створено"} проєкт "${updatedProject.name}" (${updatedProject.slug})`, "SUCCESS", context?.ip || "server", { projectId: updatedProject.id, method: context?.method, endpoint: context?.endpoint, userAgent: context?.userAgent });
  return { success: true, project: updatedProject };
}

export function updateProjectPublishStatus(id: string, status: ProjectPublishStatus, context?: { ip?: string; method?: string; endpoint?: string; userAgent?: string }): { success: boolean; project?: AppItem; error?: string } {
  const projects = readProjectsFromFile();
  const idx = projects.findIndex(p => p.id === id);
  if (idx === -1) {
    return { success: false, error: 'Проєкт не знайдено' };
  }

  createCheckpoint(`status_${status}_${id}`);

  projects[idx].publishStatus = status;
  projects[idx].updatedAt = Date.now();

  writeProjectsToFile(projects);
  writeAuditLog("PROJECT_STATUS_CHANGE", `Змінено статус проєкту "${projects[idx].name}" (${id}) на ${status}`, "SUCCESS", context?.ip || "server", { projectId: id, method: context?.method, endpoint: context?.endpoint, userAgent: context?.userAgent });
  return { success: true, project: projects[idx] };
}

export function deleteProject(id: string, context?: { ip?: string; method?: string; endpoint?: string; userAgent?: string }): { success: boolean; error?: string } {
  const projects = readProjectsFromFile();
  const idx = projects.findIndex(p => p.id === id);
  if (idx === -1) {
    return { success: false, error: 'Проєкт не знайдено' };
  }

  createCheckpoint(`delete_${id}`);

  const deletedName = projects[idx].name;
  projects.splice(idx, 1);
  writeProjectsToFile(projects);
  writeAuditLog("PROJECT_DELETE", `Видалено проєкт "${deletedName}" (${id})`, "SUCCESS", context?.ip || "server", { projectId: id, method: context?.method, endpoint: context?.endpoint, userAgent: context?.userAgent });
  return { success: true };
}
