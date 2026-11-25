import dotenv from 'dotenv';

dotenv.config();

export interface GitHubAsset {
  id: number;
  name: string;
  sizeBytes: number;
  sizeFormatted: string;
  downloadUrl: string;
  contentType: string;
  createdAt: string;
  matchedPlatform?: 'Android' | 'Windows' | 'Web' | 'Linux' | 'macOS' | 'Other';
}

export interface GitHubRelease {
  id: number;
  tagName: string;
  version: string; // Cleaned semver string, e.g. "1.3.0"
  name: string;
  body: string;
  publishedAt: string;
  htmlUrl: string;
  isPrerelease: boolean;
  isDraft: boolean;
  assets: GitHubAsset[];
}

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  fullRepoName: string;
  url: string;
}

export interface GitHubSyncResult {
  success: boolean;
  repoInfo?: GitHubRepoInfo;
  latestRelease?: GitHubRelease;
  allReleases?: GitHubRelease[];
  currentVersion?: string;
  hasUpdate?: boolean;
  syncStatus: 'UP_TO_DATE' | 'UPDATE_AVAILABLE' | 'NO_RELEASES' | 'ERROR';
  error?: string;
  isRateLimited?: boolean;
  lastCheckedAt: string;
}

/**
 * Utility to format byte count into human readable strings (e.g., 8.4 MB)
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Extracts owner and repo name from GitHub URL or 'owner/repo' string.
 * Examples:
 *  - "https://github.com/monovoice/monovoice" -> { owner: "monovoice", repo: "monovoice" }
 *  - "monovoice/quicknotes" -> { owner: "monovoice", repo: "quicknotes" }
 */
export function parseGitHubUrl(githubUrl: string): GitHubRepoInfo | null {
  if (!githubUrl || typeof githubUrl !== 'string') return null;

  let cleaned = githubUrl.trim();
  if (cleaned.endsWith('.git')) {
    cleaned = cleaned.slice(0, -4);
  }

  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');

  if (cleaned.startsWith('https://github.com/') || cleaned.startsWith('http://github.com/')) {
    const parts = cleaned.replace(/^https?:\/\/github\.com\//, '').split('/');
    if (parts.length >= 2) {
      return {
        owner: parts[0],
        repo: parts[1],
        fullRepoName: `${parts[0]}/${parts[1]}`,
        url: `https://github.com/${parts[0]}/${parts[1]}`
      };
    }
  }

  const parts = cleaned.split('/');
  if (parts.length === 2 && !cleaned.includes('://')) {
    return {
      owner: parts[0],
      repo: parts[1],
      fullRepoName: `${parts[0]}/${parts[1]}`,
      url: `https://github.com/${parts[0]}/${parts[1]}`
    };
  }

  return null;
}

/**
 * Matches asset filenames to targeted operating system platforms.
 * Rule 10 Enforcement: Does NOT assume first asset is automatically correct APK.
 */
export function matchAssetToPlatform(assetName: string): 'Android' | 'Windows' | 'Web' | 'Linux' | 'macOS' | 'Other' {
  const lower = assetName.toLowerCase();

  if (lower.endsWith('.apk')) {
    return 'Android';
  }

  if (lower.endsWith('.exe') || lower.endsWith('.msi') || (lower.endsWith('.zip') && (lower.includes('win') || lower.includes('windows')))) {
    return 'Windows';
  }

  if (lower.endsWith('.dmg') || lower.endsWith('.pkg') || (lower.endsWith('.tar.gz') && lower.includes('mac'))) {
    return 'macOS';
  }

  if (lower.endsWith('.appimage') || lower.endsWith('.deb') || lower.endsWith('.rpm') || (lower.endsWith('.tar.gz') && lower.includes('linux'))) {
    return 'Linux';
  }

  if (lower.includes('web') || lower.endsWith('.html')) {
    return 'Web';
  }

  return 'Other';
}

/**
 * Server-Side GitHub Releases Fetcher & Integration Service.
 * Uses optional GITHUB_TOKEN environment variable if available for rate limit mitigation.
 * Never exposes token to client or repository.
 */
export const GitHubService = {
  /**
   * Fetches latest releases from GitHub API for a given project repository URL.
   */
  async fetchReleasesForProject(githubUrl: string, currentProjectVersion?: string): Promise<GitHubSyncResult> {
    const lastCheckedAt = new Date().toISOString();
    const repoInfo = parseGitHubUrl(githubUrl);

    if (!repoInfo) {
      return {
        success: false,
        syncStatus: 'ERROR',
        error: `Невірний формат посилання на GitHub репозиторій: "${githubUrl}"`,
        lastCheckedAt
      };
    }

    const apiUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/releases`;

    const headers: Record<string, string> = {
      'User-Agent': 'MonoVoice-Apps-Server',
      'Accept': 'application/vnd.github.v3+json'
    };

    // Rule 8/9: Token stored securely on server only
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers
      });

      if (response.status === 404) {
        return {
          success: false,
          repoInfo,
          syncStatus: 'ERROR',
          error: `GitHub репозиторій ${repoInfo.fullRepoName} не знайдено (404)`,
          lastCheckedAt
        };
      }

      if (response.status === 403 || response.status === 429) {
        return {
          success: false,
          repoInfo,
          syncStatus: 'ERROR',
          error: 'Перевищено ліміт запитів до GitHub API (Rate Limit 403/429). Спробуйте пізніше.',
          isRateLimited: true,
          lastCheckedAt
        };
      }

      if (!response.ok) {
        return {
          success: false,
          repoInfo,
          syncStatus: 'ERROR',
          error: `Помилка GitHub API: HTTP ${response.status}`,
          lastCheckedAt
        };
      }

      const rawReleases = await response.json();

      if (!Array.isArray(rawReleases) || rawReleases.length === 0) {
        return {
          success: true,
          repoInfo,
          syncStatus: 'NO_RELEASES',
          error: 'Вказаний репозиторій не має опублікованих релізів',
          lastCheckedAt
        };
      }

      // Filter non-draft releases
      const publishedReleases = rawReleases.filter((r: any) => !r.draft);

      if (publishedReleases.length === 0) {
        return {
          success: true,
          repoInfo,
          syncStatus: 'NO_RELEASES',
          error: 'Не знайдено жодного публічного релізу (усі релізи є чернетками)',
          lastCheckedAt
        };
      }

      const parsedReleases: GitHubRelease[] = publishedReleases.map((rel: any) => {
        const tag = rel.tag_name || 'v1.0.0';
        const cleanVer = tag.replace(/^v/i, '').trim();

        const assets: GitHubAsset[] = Array.isArray(rel.assets)
          ? rel.assets.map((ast: any) => ({
              id: ast.id,
              name: ast.name,
              sizeBytes: ast.size || 0,
              sizeFormatted: formatBytes(ast.size || 0),
              downloadUrl: ast.browser_download_url,
              contentType: ast.content_type || 'application/octet-stream',
              createdAt: ast.created_at || new Date().toISOString(),
              matchedPlatform: matchAssetToPlatform(ast.name)
            }))
          : [];

        return {
          id: rel.id,
          tagName: tag,
          version: cleanVer,
          name: rel.name || tag,
          body: rel.body || 'Опис релізу відсутній',
          publishedAt: rel.published_at || new Date().toISOString(),
          htmlUrl: rel.html_url,
          isPrerelease: Boolean(rel.prerelease),
          isDraft: Boolean(rel.draft),
          assets
        };
      });

      const latestRelease = parsedReleases[0];

      // Check if update is available compared to current version
      const cleanCurrent = (currentProjectVersion || '').replace(/^v/i, '').trim();
      const hasUpdate = cleanCurrent !== '' && latestRelease.version !== cleanCurrent;

      return {
        success: true,
        repoInfo,
        latestRelease,
        allReleases: parsedReleases,
        currentVersion: cleanCurrent,
        hasUpdate,
        syncStatus: hasUpdate ? 'UPDATE_AVAILABLE' : 'UP_TO_DATE',
        lastCheckedAt
      };
    } catch (err: any) {
      return {
        success: false,
        repoInfo,
        syncStatus: 'ERROR',
        error: `Мережева помилка з’єднання з GitHub: ${err.message || 'Unknown network error'}`,
        lastCheckedAt
      };
    }
  }
};
