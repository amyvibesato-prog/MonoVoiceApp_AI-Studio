import { APPS_DATA } from '../data/apps';
import { ADOBE_SCRIPTS_DATA, AdobeScriptItem } from '../data/adobeScripts';
import { AppItem, AppStatus } from '../types/app';

export interface ProjectItem extends AppItem {
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Data Access Layer (DAL) for MonoVoice Apps Public Catalog.
 * Strictly exposes ONLY items with status === 'published' or 'available'.
 * Drafts, archived records, or unreleased assets are filtered out at this layer.
 */

export const dataService = {
  /**
   * Get all published applications for the public catalog.
   */
  async getPublishedApps(): Promise<AppItem[]> {
    // Simulate async data fetching to match real API/database semantics
    return new Promise(resolve => {
      setTimeout(() => {
        const published = APPS_DATA.filter(app => app.status === 'available' || (app.status as string) === 'published');
        resolve(published);
      }, 30);
    });
  },

  /**
   * Get a single published application by slug.
   * Returns null if not found or if the application is not published.
   */
  async getPublishedAppBySlug(slug: string): Promise<AppItem | null> {
    return new Promise(resolve => {
      setTimeout(() => {
        const app = APPS_DATA.find(
          a => a.slug === slug && (a.status === 'available' || (a.status as string) === 'published')
        );
        resolve(app || null);
      }, 30);
    });
  },

  /**
   * Get all published Adobe ExtendScript / JSX tools.
   */
  async getPublishedScripts(): Promise<AdobeScriptItem[]> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(ADOBE_SCRIPTS_DATA);
      }, 30);
    });
  },

  /**
   * Get a single published Adobe script by slug.
   */
  async getPublishedScriptBySlug(slug: string): Promise<AdobeScriptItem | null> {
    return new Promise(resolve => {
      setTimeout(() => {
        const script = ADOBE_SCRIPTS_DATA.find(s => s.slug === slug);
        resolve(script || null);
      }, 30);
    });
  },

  /**
   * Search across published applications and Adobe scripts.
   */
  async searchPublishedItems(query: string, platformFilter: string = 'all', categoryFilter: string = 'all'): Promise<{
    apps: AppItem[];
    scripts: AdobeScriptItem[];
  }> {
    const apps = await this.getPublishedApps();
    const scripts = await this.getPublishedScripts();

    const q = query.toLowerCase().trim();

    const filteredApps = apps.filter(app => {
      if (platformFilter !== 'all' && !app.platforms.includes(platformFilter as any)) {
        return false;
      }
      if (categoryFilter !== 'all' && app.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        app.name.toLowerCase().includes(q) ||
        app.tagline.uk.toLowerCase().includes(q) ||
        app.tagline.en.toLowerCase().includes(q) ||
        app.description.uk.toLowerCase().includes(q) ||
        app.description.en.toLowerCase().includes(q)
      );
    });

    const filteredScripts = scripts.filter(script => {
      if (categoryFilter !== 'all' && categoryFilter !== 'AdobeScript' && categoryFilter !== 'Utility') {
        return false;
      }
      if (!q) return true;
      return (
        script.name.toLowerCase().includes(q) ||
        script.adobeApp.toLowerCase().includes(q) ||
        script.tagline.uk.toLowerCase().includes(q) ||
        script.tagline.en.toLowerCase().includes(q) ||
        script.description.uk.toLowerCase().includes(q) ||
        script.description.en.toLowerCase().includes(q)
      );
    });

    return { apps: filteredApps, scripts: filteredScripts };
  }
};
