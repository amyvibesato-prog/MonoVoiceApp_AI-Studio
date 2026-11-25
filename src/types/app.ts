export type Platform = 'Android' | 'Windows' | 'Web' | 'Linux' | 'macOS' | 'ExtendScript';

export type AppCategory = 'Audio' | 'Utility' | 'Productivity' | 'System' | 'Developer' | 'Adobe Script';

export type AppStatus = 'available' | 'in-development' | 'archived' | 'published' | 'draft';

export type ProjectPublishStatus = 'Draft' | 'Published' | 'Archived';

export interface AppChangelogItem {
  version: string;
  date: string;
  changes: {
    en: string[];
    uk: string[];
  };
}

export interface AppScreenshot {
  url: string;
  caption: {
    en: string;
    uk: string;
  };
  aspectRatio?: '9:16' | '16:9' | '4:3';
}

export interface AppItem {
  id: string;
  slug: string;
  name: string;
  publishStatus?: ProjectPublishStatus; // 'Draft' | 'Published' | 'Archived'
  tagline: {
    en: string;
    uk: string;
  };
  description: {
    en: string;
    uk: string;
  };
  longDescription: {
    en: string[];
    uk: string[];
  };
  iconType: 'waves' | 'file-text' | 'image' | 'settings' | 'terminal' | 'clock' | 'book-open';
  customIconUrl?: string;
  platforms: Platform[];
  category: AppCategory;
  status: AppStatus;
  version: string;
  releaseDate: string;
  fileSize: string;
  featured: boolean;
  download: {
    android?: string;
    windows?: string;
    linux?: string;
    web?: string;
    mac?: string;
    extendscript?: string;
    fileName?: string;
  };
  github: string;
  features: {
    en: string[];
    uk: string[];
  };
  requirements: {
    os: string;
    architecture?: string;
    storage?: string;
    permissions?: {
      en: string[];
      uk: string[];
    };
  };
  screenshots: AppScreenshot[];
  changelog: AppChangelogItem[];
  // Adobe Script specific optional properties
  adobeApp?: 'Premiere Pro' | 'Photoshop' | 'Illustrator';
  appBadgeColor?: string;
  fileFormat?: string;
  codeSnippet?: string;
  installationGuide?: {
    uk: string[];
    en: string[];
  };
  downloadFileName?: string;
  createdAt?: number | string;
  updatedAt?: number | string;
}
