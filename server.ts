import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { createServer as createViteServer } from 'vite';

import { validateEnvironmentSecrets } from './src/server/auth';
import { ProjectStore } from './src/server/projectStore';
import { BackupService } from './src/server/backupService';
import { adminRouter } from './src/server/adminRoutes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Parsing Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'monovoice-dev-only-cookie-secret')));

// Static directories for uploads and storage
const STORAGE_DIR = path.resolve(__dirname, 'storage');
const UPLOADS_PUBLIC_DIR = path.join(STORAGE_DIR, 'uploads/public');
const UPLOADS_PRIVATE_DIR = path.join(STORAGE_DIR, 'uploads/private');
const BACKUPS_DIR = path.join(STORAGE_DIR, 'backups');
const imagesDir = path.resolve(__dirname, 'src/assets/images');

[STORAGE_DIR, UPLOADS_PUBLIC_DIR, UPLOADS_PRIVATE_DIR, BACKUPS_DIR, imagesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Serve public uploads statically with nosniff header
app.use('/storage/uploads/public', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
}, express.static(UPLOADS_PUBLIC_DIR));

// Mascot cropping helper
function ensureCropsFromSource(sourceFile: string) {
  const headDest = path.join(imagesDir, 'mascot_head.png');
  const cardDest = path.join(imagesDir, 'mascot_card.png');
  const heroDest = path.join(imagesDir, 'mascot_hero.png');

  try {
    // Attempt imagemagick crop if available
    execFileSync('convert', [sourceFile, '-resize', '600x600^', '-gravity', 'center', '-extent', '600x600', heroDest], { stdio: 'ignore' });
    execFileSync('convert', [sourceFile, '-resize', '300x300^', '-gravity', 'center', '-extent', '300x300', cardDest], { stdio: 'ignore' });
    execFileSync('convert', [sourceFile, '-resize', '120x120^', '-gravity', 'center', '-extent', '120x120', headDest], { stdio: 'ignore' });
  } catch {
    // If ImageMagick is not available, copy file directly
    try {
      fs.copyFileSync(sourceFile, heroDest);
      fs.copyFileSync(sourceFile, cardDest);
      fs.copyFileSync(sourceFile, headDest);
    } catch (e) {
      console.warn('Could not copy fallback crop:', e);
    }
  }
}

function scanForUploadedMascot(): boolean {
  const orig = path.join(imagesDir, 'mascot_original.png');
  return fs.existsSync(orig);
}

// ==========================================
// --- PUBLIC CATALOG API ---
// ==========================================

const handleGetPublicProjects = async (req: Request, res: Response) => {
  try {
    const publicProjects = await ProjectStore.getPublishedProjects();
    res.setHeader('Cache-Control', 'public, max-age=10');
    // Support both raw array and { success: true, projects } format
    if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
      return res.json({
        success: true,
        count: publicProjects.length,
        projects: publicProjects
      });
    }
    return res.json(publicProjects);
  } catch (err) {
    console.error('Error serving public projects:', err);
    return res.status(500).json({ error: 'Помилка отримання каталогу програм' });
  }
};

app.get('/api/projects/public', handleGetPublicProjects);
app.get('/api/projects', handleGetPublicProjects);

const handleGetPublicProjectBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const project = await ProjectStore.getProjectBySlug(slug);

    if (!project) {
      return res.status(404).json({ error: 'Проєкт не знайдено або не опубліковано' });
    }

    res.setHeader('Cache-Control', 'public, max-age=10');
    return res.json(project);
  } catch (err) {
    console.error(`Error serving project slug "${req.params.slug}":`, err);
    return res.status(500).json({ error: 'Помилка отримання даних програми' });
  }
};

app.get('/api/projects/public/:slug', handleGetPublicProjectBySlug);
app.get('/api/projects/:slug', handleGetPublicProjectBySlug);

// Developer projects endpoint
app.get('/api/developer-projects', async (req: Request, res: Response) => {
  try {
    const all = await ProjectStore.getPublishedProjects();
    const devProjects = all.filter(p => p.category === 'Developer' || p.category === 'System' || p.platforms.includes('ExtendScript'));
    return res.json(devProjects);
  } catch (err) {
    return res.status(500).json({ error: 'Помилка отримання інструментів розробника' });
  }
});

// Mascot endpoints
app.get('/api/mascot', (req: Request, res: Response) => {
  const hasOriginal = scanForUploadedMascot();
  res.json({
    hasOriginal,
    heroUrl: hasOriginal ? `/src/assets/images/mascot_hero.png?t=${Date.now()}` : null,
    headUrl: hasOriginal ? `/src/assets/images/mascot_head.png?t=${Date.now()}` : null,
    cardUrl: hasOriginal ? `/src/assets/images/mascot_card.png?t=${Date.now()}` : null,
    originalUrl: hasOriginal ? `/src/assets/images/mascot_original.png?t=${Date.now()}` : null,
  });
});

app.post('/api/mascot', (req: Request, res: Response) => {
  try {
    const { dataUrl } = req.body || {};
    const base64Match = typeof dataUrl === 'string' && dataUrl.match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
    if (!base64Match) {
      return res.status(400).json({ error: 'Некоректний формат зображення (dataUrl)' });
    }

    const imgBuffer = Buffer.from(base64Match[1], 'base64');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    const origDest = path.join(imagesDir, 'mascot_original.png');
    fs.writeFileSync(origDest, imgBuffer);
    ensureCropsFromSource(origDest);

    const ts = Date.now();
    return res.json({
      hasOriginal: true,
      heroUrl: `/src/assets/images/mascot_hero.png?t=${ts}`,
      headUrl: `/src/assets/images/mascot_head.png?t=${ts}`,
      cardUrl: `/src/assets/images/mascot_card.png?t=${ts}`,
      originalUrl: `/src/assets/images/mascot_original.png?t=${ts}`,
    });
  } catch (err) {
    console.error('Upload mascot error:', err);
    return res.status(500).json({ error: 'Не вдалося зберегти маскот' });
  }
});

// ==========================================
// --- MOUNT CONSOLIDATED ADMIN ROUTER ---
// ==========================================
app.use('/api/admin', adminRouter);

// Unmatched API route catch-all (prevent SPA fallback returning HTML)
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// ==========================================
// --- SERVER INITIALIZATION ---
// ==========================================
async function startServer() {
  // 1. Mandatory secret validation in production (blocks startup if secrets are missing or weak)
  validateEnvironmentSecrets();

  // 2. Mount Vite in development or static dist in production
  if (process.env.NODE_ENV !== 'production' && fs.existsSync(path.resolve(__dirname, 'src/main.tsx'))) {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('Vite dev middleware warning, using static fallback:', e);
      app.use(express.static(path.resolve(__dirname, 'dist')));
      app.get('*', (_req: Request, res: Response) => {
        const indexPath = path.resolve(__dirname, 'dist/index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.send('MonoVoice Apps Server Running');
        }
      });
    }
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      const indexPath = path.resolve(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.send('MonoVoice Apps Server Running');
      }
    });
  }

  // 3. Bind port IMMEDIATELY so Cloud Run health check passes instantly (< 50ms)
  const portNum = Number(PORT) || 3000;
  app.listen(portNum, '0.0.0.0', () => {
    console.log(`🚀 MonoVoice Apps Server running on http://0.0.0.0:${portNum} with Cloud Firestore backend.`);

    // 4. Perform background initialization asynchronously after server bind
    Promise.all([
      ProjectStore.initStore().catch(err => console.error('Notice initializing ProjectStore:', err.message)),
      Promise.resolve(BackupService.initAutoBackup()).catch(err => console.error('Notice initializing BackupService:', err.message))
    ]).catch(err => {
      console.warn('Background initialization notice:', err);
    });
  });
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err?.message || err);
  process.exit(1);
});
