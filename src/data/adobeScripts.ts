export interface AdobeScriptItem {
  id: string;
  slug: string;
  name: string;
  adobeApp: 'After Effects' | 'Premiere Pro' | 'Photoshop' | 'Illustrator' | 'InDesign';
  appBadgeColor: string;
  tagline: { en: string; uk: string };
  description: { en: string; uk: string };
  version: string;
  releaseDate: string;
  fileFormat: '.jsx' | '.jsxbin' | '.js' | '.py';
  codeSnippet: string;
  installationGuide: {
    en: string[];
    uk: string[];
  };
  features: {
    en: string[];
    uk: string[];
  };
  downloadFileName: string;
  githubUrl: string;
}

export const ADOBE_SCRIPTS_DATA: AdobeScriptItem[] = [];
