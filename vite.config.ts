import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { defineConfig, Plugin } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function mascotCropPlugin(): Plugin {
  const imagesDir = path.resolve(__dirname, 'src/assets/images');
  const rootDir = path.resolve(__dirname);

  const ensureCropsFromSource = (sourcePath: string) => {
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    const origDest = path.join(imagesDir, 'mascot_original.png');
    if (path.resolve(sourcePath) !== path.resolve(origDest)) {
      fs.copyFileSync(sourcePath, origDest);
    }

    const heroDest = path.join(imagesDir, 'mascot_hero.png');
    const headDest = path.join(imagesDir, 'mascot_head.png');
    const cardDest = path.join(imagesDir, 'mascot_card.png');

    try {
      // Pure geometric crop + format conversion ONLY (no AI, no editing of character pixels)
      // 1. Hero crop: left 67.5% (front-facing mascot pose only, removing right side-profile)
      execFileSync('convert', [
        origDest,
        '-crop', '67.5%x100%+0+0',
        '+repage',
        heroDest
      ]);

      // 2. Navbar head crop: tight square around the cube-cat head & ears
      execFileSync('convert', [
        origDest,
        '-crop', '48%x65%+8%+0',
        '+repage',
        headDest
      ]);

      // 3. About Me card crop: front-facing mascot head + yellow collar
      execFileSync('convert', [
        origDest,
        '-crop', '64%x92%+2%+0',
        '+repage',
        cardDest
      ]);
    } catch (e) {
      console.error('ImageMagick crop error:', e);
    }
  };

  const scanForUploadedMascot = () => {
    const heroDest = path.join(imagesDir, 'mascot_hero.png');
    const origDest = path.join(imagesDir, 'mascot_original.png');
    if (fs.existsSync(origDest) && fs.existsSync(heroDest)) {
      return true;
    }

    // Check if user dropped the file into root or src/assets/images
    const searchDirs = [rootDir, imagesDir];
    const ignoreNames = new Set([
      'imagetool_preview_1790772522144.jpg',
      'monovoice_preview_1790772497988.jpg',
      'quicknotes_preview_1790772510460.jpg',
      'mascot_hero.png',
      'mascot_head.png',
      'mascot_card.png'
    ]);

    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;
      for (const file of fs.readdirSync(dir)) {
        if (ignoreNames.has(file)) continue;
        if (/\.(png|webp|jpg|jpeg)$/i.test(file)) {
          const fullPath = path.join(dir, file);
          if (
            file.toLowerCase().includes('monovoice') ||
            file.toLowerCase().includes('sticker') ||
            file.toLowerCase().includes('mascot')
          ) {
            ensureCropsFromSource(fullPath);
            return true;
          }
        }
      }
    }
    return false;
  };

  return {
    name: 'mascot-crop-plugin',
    configureServer(server) {
      server.middlewares.use('/api/mascot', (req, res) => {
        if (req.method === 'GET') {
          const hasOriginal = scanForUploadedMascot();
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              hasOriginal,
              heroUrl: hasOriginal ? `/src/assets/images/mascot_hero.png?t=${Date.now()}` : null,
              headUrl: hasOriginal ? `/src/assets/images/mascot_head.png?t=${Date.now()}` : null,
              cardUrl: hasOriginal ? `/src/assets/images/mascot_card.png?t=${Date.now()}` : null,
              originalUrl: hasOriginal ? `/src/assets/images/mascot_original.png?t=${Date.now()}` : null,
            })
          );
          return;
        }

        if (req.method === 'POST') {
          const chunks: Buffer[] = [];
          req.on('data', chunk => chunks.push(Buffer.from(chunk)));
          req.on('end', () => {
            try {
              const bodyStr = Buffer.concat(chunks).toString('utf8');
              const payload = JSON.parse(bodyStr);
              const dataUrl: string = payload.dataUrl || '';
              const base64Match = dataUrl.match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
              if (!base64Match) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid image dataUrl' }));
                return;
              }
              const imgBuffer = Buffer.from(base64Match[1], 'base64');
              if (!fs.existsSync(imagesDir)) {
                fs.mkdirSync(imagesDir, { recursive: true });
              }
              const origDest = path.join(imagesDir, 'mascot_original.png');
              fs.writeFileSync(origDest, imgBuffer);
              ensureCropsFromSource(origDest);

              const ts = Date.now();
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  hasOriginal: true,
                  heroUrl: `/src/assets/images/mascot_hero.png?t=${ts}`,
                  headUrl: `/src/assets/images/mascot_head.png?t=${ts}`,
                  cardUrl: `/src/assets/images/mascot_card.png?t=${ts}`,
                  originalUrl: `/src/assets/images/mascot_original.png?t=${ts}`,
                })
              );
            } catch (err) {
              console.error('Upload mascot error:', err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to save and crop mascot' }));
            }
          });
          return;
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), mascotCropPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
            }
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
