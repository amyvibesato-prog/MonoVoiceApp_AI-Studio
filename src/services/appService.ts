import { AppItem, AppCategory, Platform } from '../types/app';
import { APPS_DATA } from '../data/apps';
import { ADOBE_SCRIPTS_DATA, AdobeScriptItem } from '../data/adobeScripts';

export interface AppQueryOptions {
  search?: string;
  category?: string;
  platform?: string;
  status?: string;
  featuredOnly?: boolean;
}

/**
 * Data Access Layer (DAL) for MonoVoice Applications and Scripts.
 * Provides asynchronous methods to retrieve public records.
 * Connects directly to server endpoints `/api/projects` while maintaining
 * resilient offline fallbacks to `APPS_DATA`.
 */
export const AppService = {
  /**
   * Get all published apps available for public viewing and download.
   * Enforces publication check: status must be 'published' or 'available'.
   * Drafts and private items are strictly filtered out.
   */
  async getPublishedApps(options?: AppQueryOptions): Promise<AppItem[]> {
    let baseApps: AppItem[] = [];

    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.projects)) {
          baseApps = data.projects;
        }
      }
    } catch (err) {
      // Fallback to local data on offline / static build mode
    }

    if (baseApps.length === 0) {
      baseApps = APPS_DATA.filter(app => app.status === 'published' || app.status === 'available');
    }

    let results = baseApps;

    if (!options) return results;

    // Filter featured apps
    if (options.featuredOnly) {
      results = results.filter(app => app.featured);
    }

    // Filter by platform
    if (options.platform && options.platform !== 'all') {
      results = results.filter(app =>
        app.platforms.includes(options.platform as Platform)
      );
    }

    // Filter by category
    if (options.category && options.category !== 'all') {
      results = results.filter(app => app.category === (options.category as AppCategory));
    }

    // Search term matching across name, taglines, descriptions, and features
    if (options.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      results = results.filter(app => {
        const matchName = app.name.toLowerCase().includes(q);
        const matchTagUk = app.tagline.uk.toLowerCase().includes(q);
        const matchTagEn = app.tagline.en.toLowerCase().includes(q);
        const matchDescUk = app.description.uk.toLowerCase().includes(q);
        const matchDescEn = app.description.en.toLowerCase().includes(q);
        const matchCategory = app.category.toLowerCase().includes(q);
        const matchPlatform = app.platforms.some(p => p.toLowerCase().includes(q));

        return matchName || matchTagUk || matchTagEn || matchDescUk || matchDescEn || matchCategory || matchPlatform;
      });
    }

    return results;
  },

  /**
   * Get a single published app by slug.
   * Returns null if not found or if item status is 'draft'.
   */
  async getAppBySlug(slug: string): Promise<AppItem | null> {
    try {
      const res = await fetch(`/api/projects/${slug}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.project) {
          return data.project;
        }
      }
    } catch (err) {
      // Fallback to static
    }

    const found = APPS_DATA.find(a => a.slug === slug);
    if (!found) return null;

    // Security check: Never expose draft / private records via public API
    if (found.status === 'draft') return null;

    return found;
  },

  /**
   * Get in-development items for laboratory / roadmap.
   */
  async getInDevelopmentApps(): Promise<AppItem[]> {
    try {
      const res = await fetch('/api/developer-projects');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.projects)) {
          return data.projects;
        }
      }
    } catch (err) {
      // Fallback
    }

    return APPS_DATA.filter(app => app.status === 'in-development');
  },

  /**
   * Get all Adobe ExtendScript / JSX automation scripts.
   */
  async getAdobeScripts(): Promise<AdobeScriptItem[]> {
    return ADOBE_SCRIPTS_DATA;
  }
};
