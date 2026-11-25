import { Router, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { collection, doc, getDoc, setDoc, getDocs, query, limit as firestoreLimit } from 'firebase/firestore';
import { getDb } from './firebase';
import {
  hashPassword,
  verifyPassword,
  verifyAdminPassword,
  verifyActionPassword,
  getAdminUsername,
  checkRateLimit,
  recordFailedAttempt,
  resetFailedAttempts,
  createSession,
  getSession,
  destroySession,
  createSudoToken,
  verifyAndConsumeSudoToken,
  parseCookies,
  validateEnvironmentSecrets,
  AdminSession
} from './auth';
import { ProjectStore } from './projectStore';
import { GitHubService } from './githubService';
import { BackupService } from './backupService';
import { DeviceAuthService } from './deviceAuthService';
import { GuardService } from './guardService';
import { guardRouter } from './guardRoutes';

dotenv.config();

// Storage directories
const STORAGE_DIR = path.resolve(process.cwd(), 'storage');
const UPLOADS_PUBLIC_DIR = path.join(STORAGE_DIR, 'uploads/public');
const UPLOADS_PRIVATE_DIR = path.join(STORAGE_DIR, 'uploads/private');
const CHECKPOINTS_DIR = path.join(STORAGE_DIR, 'checkpoints');
const BACKUPS_DIR = path.join(STORAGE_DIR, 'backups');

[STORAGE_DIR, UPLOADS_PUBLIC_DIR, UPLOADS_PRIVATE_DIR, CHECKPOINTS_DIR, BACKUPS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure Multer for multipart uploads
const storageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    const isPrivate = req.body.isPrivate === 'true';
    const targetDir = isPrivate ? UPLOADS_PRIVATE_DIR : UPLOADS_PUBLIC_DIR;
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const ext = path.extname(safeName);
    const base = path.basename(safeName, ext);
    const unique = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${base}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage: storageConfig,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Express Request Extension
export interface AuthenticatedRequest extends Request {
  adminSession?: AdminSession;
}

export const adminRouter = Router();

// Mount MonoVoice Guard Router
adminRouter.use('/guard', guardRouter);

// Middleware: Require valid session
async function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies['admin_session'];

    if (!sessionId) {
      res.status(401).json({ error: 'Необхідна автентифікація адміністратора' });
      return;
    }

    const session = await getSession(sessionId);
    if (!session) {
      res.status(401).json({ error: 'Сесія закінчилася або закрита. Будь ласка, увійдіть знову.' });
      return;
    }

    req.adminSession = session;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Помилка валідації сесії' });
  }
}

// Middleware: CSRF Token Check
function requireCsrfCheck(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const tokenFromHeader = (req.headers['x-csrf-token'] as string) || (req.headers['csrf-token'] as string);
  const tokenFromSession = req.adminSession?.csrfToken;

  if (!tokenFromHeader || !tokenFromSession) {
    res.status(403).json({ error: 'CSRF Token обовʼязковий для виконання чутливих дій' });
    return;
  }

  try {
    const headerBuf = Buffer.from(tokenFromHeader);
    const sessionBuf = Buffer.from(tokenFromSession);
    if (headerBuf.length !== sessionBuf.length || !crypto.timingSafeEqual(headerBuf, sessionBuf)) {
      res.status(403).json({ error: 'Недійсний CSRF Token' });
      return;
    }
  } catch {
    res.status(403).json({ error: 'Помилка валідації CSRF Token' });
    return;
  }

  next();
}

// Middleware: Require separate Action Password
function requireActionPassword(req: Request, res: Response, next: NextFunction) {
  const actionPassword = (req.headers['x-action-password'] as string) || req.body?.actionPassword;
  if (!actionPassword) {
    res.status(403).json({
      error: 'Пароль дії (Action Password) обовʼязковий для виконання цієї операції.'
    });
    return;
  }

  const isValid = verifyActionPassword(actionPassword.trim());
  if (!isValid) {
    res.status(403).json({
      error: 'Невірний пароль дії (Action Password). Будь ласка, вкажіть дійсний пароль для створення або редагування.'
    });
    return;
  }

  next();
}

// Middleware / Helper: Verify MonoVoice Guard (15-second Steam Guard Code)
async function verifyActionGuard(
  req: Request,
  res: Response,
  actionType: string,
  targetLabel: string
): Promise<boolean> {
  const config = await GuardService.getConfig();
  if (!config || !config.isPaired) {
    // If Guard is not enrolled yet, permit standard flow
    return true;
  }

  const code = (req.headers['x-guard-code'] as string) || req.body?.guardCode;
  const clientIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  const location = GuardService.resolveLocation(req);

  if (!code) {
    await GuardService.recordIncident({
      clientIp,
      location,
      userAgent: req.headers['user-agent'] || '',
      actionType,
      targetLabel,
      reason: 'BLOCKED_ATTEMPT',
      details: `Спроба виконати "${actionType}" (${targetLabel}) без обов’язкового 15-секундного коду Guard.`
    });
    res.status(403).json({
      error: 'Для збереження змін вимагається одноразовий 15-секундний код із додатку MonoVoice Guard',
      requiresGuardCode: true,
      actionType,
      targetLabel
    });
    return false;
  }

  try {
    const valid = await GuardService.verifyActionCode(String(code).trim());
    if (!valid) {
      await GuardService.recordIncident({
        clientIp,
        location,
        userAgent: req.headers['user-agent'] || '',
        actionType,
        targetLabel,
        reason: 'INVALID_CODE',
        details: `Введено невірний або прострочений 15-секундний код під час виконання "${actionType}" (${targetLabel}).`
      });
      res.status(403).json({
        error: 'Недійсний або прострочений 15-секундний код. Зачекайте оновлення коду в додатку.',
        requiresGuardCode: true,
        guardCodeInvalid: true
      });
      return false;
    }
  } catch (err: any) {
    await GuardService.recordIncident({
      clientIp,
      location,
      userAgent: req.headers['user-agent'] || '',
      actionType,
      targetLabel,
      reason: 'INVALID_CODE',
      details: err.message || 'Помилка валідації коду Guard'
    });
    res.status(403).json({
      error: err.message || 'Помилка перевірки 15-секундного коду',
      requiresGuardCode: true,
      guardCodeInvalid: true
    });
    return false;
  }

  return true;
}

// Security Audit Logger
async function logSecurityEvent(
  ip: string,
  action: string,
  status: 'SUCCESS' | 'FAILURE' | 'WARNING' | 'BLOCKED',
  details: string
): Promise<void> {
  const event = {
    id: `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    ip,
    action,
    status,
    details
  };

  const db = getDb();
  if (db) {
    try {
      const logRef = doc(db, 'admin_audit_logs', event.id);
      await setDoc(logRef, event);
    } catch (err) {
      console.warn('Notice logging security event to Firestore:', err);
    }
  }

  // Also write to local audit log file
  try {
    const auditFile = path.resolve(process.cwd(), 'storage', 'admin_audit_log.json');
    let logs = [];
    if (fs.existsSync(auditFile)) {
      try { logs = JSON.parse(fs.readFileSync(auditFile, 'utf8')); } catch (e) {}
    }
    logs.unshift(event);
    if (logs.length > 200) logs = logs.slice(0, 200);
    fs.writeFileSync(auditFile, JSON.stringify(logs, null, 2), 'utf8');
  } catch (e) {}
}

async function getRecentAuditLogs(max: number = 50): Promise<any[]> {
  const db = getDb();
  if (db) {
    try {
      const logsCol = collection(db, 'admin_audit_logs');
      const q = query(logsCol, firestoreLimit(max));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(docSnap => list.push(docSnap.data()));
      if (list.length > 0) {
        return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
    } catch (err) {
      console.error('Failed to fetch audit logs from Firestore:', err);
    }
  }

  // Fallback to local file
  try {
    const auditFile = path.resolve(process.cwd(), 'storage', 'admin_audit_log.json');
    if (fs.existsSync(auditFile)) {
      const logs = JSON.parse(fs.readFileSync(auditFile, 'utf8'));
      return logs.slice(0, max);
    }
  } catch (e) {}
  return [];
}

/**
 * POST /api/admin/reset-rate-limit
 */
adminRouter.post('/reset-rate-limit', requireAdminAuth, requireCsrfCheck, async (req: AuthenticatedRequest, res: Response) => {
  const ip = req.body?.ip || req.ip || req.socket.remoteAddress || '127.0.0.1';
  await resetFailedAttempts(ip);
  await logSecurityEvent(req.ip || '127.0.0.1', 'RATE_LIMIT_RESET', 'SUCCESS', `Адміністратор скинув ліміт спроб для IP ${ip}`);
  res.json({ success: true, message: 'Rate limit reset' });
});

/**
 * POST /api/admin/login
 */
adminRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const { username, password } = req.body || {};

    const rateCheck = await checkRateLimit(ip);
    if (rateCheck.isLocked) {
      await logSecurityEvent(ip, 'LOGIN_ATTEMPT', 'BLOCKED', `Заблоковано через забагато невдалих спроб (${rateCheck.remainingSeconds}s)`);
      res.status(429).json({
        error: `Забагато невдалих спроб входу. Доступ тимчасово заблоковано на ${rateCheck.remainingSeconds} секунд.`,
        remainingSeconds: rateCheck.remainingSeconds
      });
      return;
    }

    if (!password) {
      await recordFailedAttempt(ip);
      await logSecurityEvent(ip, 'LOGIN_ATTEMPT', 'FAILURE', 'Не вказано пароль');
      res.status(400).json({ error: 'Вкажіть пароль адміністратора' });
      return;
    }

    const adminUser = getAdminUsername();
    const usernameInput = (username || adminUser).trim().toLowerCase();
    const isUsernameValid = usernameInput === adminUser.toLowerCase();
    const isPasswordValid = verifyAdminPassword(password);

    if (!isUsernameValid || !isPasswordValid) {
      const failedInfo = await recordFailedAttempt(ip);
      await logSecurityEvent(ip, 'LOGIN_ATTEMPT', 'FAILURE', 'Невірні облікові дані');
      res.status(401).json({
        error: 'Невірні облікові дані доступу',
        attemptsLeft: failedInfo.attemptsLeft
      });
      return;
    }

    await resetFailedAttempts(ip);
    const session = await createSession(adminUser, ip, userAgent);

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('admin_session', session.id, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/'
    });

    await logSecurityEvent(ip, 'LOGIN_SUCCESS', 'SUCCESS', `Успішний вхід користувача ${adminUser}`);

    res.json({
      success: true,
      csrfToken: session.csrfToken,
      username: adminUser,
      expiresAt: session.expiresAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Помилка обробки запиту автентифікації' });
  }
});

/**
 * POST /api/admin/logout
 */
adminRouter.post('/logout', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies['admin_session'];
    if (sessionId) {
      await destroySession(sessionId);
    }

    res.clearCookie('admin_session', { path: '/' });
    await logSecurityEvent(req.ip || '127.0.0.1', 'LOGOUT', 'SUCCESS', 'Сесію закрито користувачем');

    res.json({ success: true, message: 'Успішно вийшли із системи' });
  } catch (err) {
    res.status(500).json({ error: 'Помилка виходу' });
  }
});

/**
 * GET /api/admin/session
 */
adminRouter.get('/session', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    authenticated: true,
    username: req.adminSession?.username || getAdminUsername(),
    csrfToken: req.adminSession?.csrfToken,
    expiresAt: req.adminSession?.expiresAt
  });
});

/**
 * POST /api/admin/sudo-auth and alias /verify-sudo
 */
const sudoAuthHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { password } = req.body || {};
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!password) {
      await logSecurityEvent(ip, 'SUDO_VERIFY', 'FAILURE', 'Спроба Sudo без пароля');
      res.status(400).json({ error: 'Вкажіть пароль' });
      return;
    }

    const isValid = verifyAdminPassword(password);
    if (!isValid) {
      await logSecurityEvent(ip, 'SUDO_VERIFY', 'FAILURE', 'Невірний пароль для Sudo');
      res.status(401).json({ error: 'Невірний пароль адміністратора' });
      return;
    }

    const adminUser = req.adminSession?.username || getAdminUsername();
    const sudoToken = await createSudoToken(adminUser);
    await logSecurityEvent(ip, 'SUDO_VERIFY', 'SUCCESS', 'Успішна Sudo автентифікація');

    res.json({ success: true, sudoToken });
  } catch (err) {
    res.status(500).json({ error: 'Помилка перевірки пароля' });
  }
};

adminRouter.post('/sudo-auth', requireAdminAuth, requireCsrfCheck, sudoAuthHandler);
adminRouter.post('/verify-sudo', requireAdminAuth, requireCsrfCheck, sudoAuthHandler);

/**
 * GET /api/admin/audit-logs
 */
adminRouter.get('/audit-logs', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await getRecentAuditLogs(100);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Помилка завантаження журналу аудиту' });
  }
});

/**
 * GET /api/admin/projects
 */
adminRouter.get('/projects', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projects = await ProjectStore.getAllProjects();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Помилка завантаження списку проєктів' });
  }
});

/**
 * POST /api/admin/projects
 */
adminRouter.post('/projects', requireAdminAuth, requireCsrfCheck, requireActionPassword, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { actionPassword, ...projectPayload } = req.body || {};
    const ok = await verifyActionGuard(req, res, 'CREATE_PROJECT', projectPayload.name || 'Новий проєкт');
    if (!ok) return;

    const created = await ProjectStore.createProject(projectPayload);
    await logSecurityEvent(req.ip || '127.0.0.1', 'PROJECT_CREATE', 'SUCCESS', `Створено проєкт "${created.name}" (${created.id})`);
    res.json({
      success: true,
      project: created
    });
  } catch (err) {
    res.status(500).json({ error: 'Помилка створення проєкту в базі' });
  }
});

/**
 * PUT /api/admin/projects/:id
 */
adminRouter.put('/projects/:id', requireAdminAuth, requireCsrfCheck, requireActionPassword, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { actionPassword, ...projectPayload } = req.body || {};
    const ok = await verifyActionGuard(req, res, 'UPDATE_PROJECT', projectPayload.name || id);
    if (!ok) return;

    const updated = await ProjectStore.updateProject(id, projectPayload);

    if (!updated) {
      res.status(404).json({ error: 'Проєкт не знайдено' });
      return;
    }

    await logSecurityEvent(req.ip || '127.0.0.1', 'PROJECT_UPDATE', 'SUCCESS', `Оновлено проєкт "${updated.name}" (${id})`);
    res.json({
      success: true,
      project: updated
    });
  } catch (err) {
    res.status(500).json({ error: 'Помилка оновлення проєкту' });
  }
});

/**
 * POST /api/admin/projects/:id/status
 */
adminRouter.post('/projects/:id/status', requireAdminAuth, requireCsrfCheck, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const ok = await verifyActionGuard(req, res, 'TOGGLE_STATUS_PROJECT', id);
    if (!ok) return;

    const { publishStatus, status } = req.body || {};
    const targetStatus = publishStatus || (status === 'available' || status === 'published' ? 'Published' : 'Draft');
    const updated = await ProjectStore.updateProjectPublishStatus(id, targetStatus);

    if (!updated) {
      res.status(404).json({ error: 'Проєкт не знайдено' });
      return;
    }

    await logSecurityEvent(req.ip || '127.0.0.1', 'PROJECT_STATUS', 'SUCCESS', `Оновлено статус проєкту ${id} -> ${targetStatus}`);
    res.json({
      success: true,
      project: updated
    });
  } catch (err) {
    res.status(500).json({ error: 'Помилка зміни статусу проєкту' });
  }
});

/**
 * DELETE /api/admin/projects/:id
 */
adminRouter.delete('/projects/:id', requireAdminAuth, requireCsrfCheck, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { sudoToken, sudoPassword, approvalChallengeId } = req.body || {};

    // 1. MonoVoice Guard (15-second Steam Guard Code) protection
    const guardConfig = await GuardService.getConfig();
    if (guardConfig && guardConfig.isPaired) {
      const ok = await verifyActionGuard(req, res, 'DELETE_PROJECT', id);
      if (!ok) return;

      const deleted = await ProjectStore.deleteProject(id);
      if (!deleted) {
        res.status(404).json({ error: 'Проєкт не знайдено' });
        return;
      }

      await logSecurityEvent(req.ip || '127.0.0.1', 'PROJECT_DELETE', 'SUCCESS', `Видалено проєкт ${id} (підтверджено кодом MonoVoice Guard)`);
      res.json({
        success: true,
        message: 'Проєкт успішно видалено з підтвердженням MonoVoice Guard'
      });
      return;
    }

    const hasDevice = await DeviceAuthService.hasActiveDevice();

    if (hasDevice) {
      if (!approvalChallengeId) {
        await logSecurityEvent(req.ip || '127.0.0.1', 'PROJECT_DELETE', 'BLOCKED', `Видалення проєкту ${id} заблоковано: увімкнено захист Android Authenticator`);
        res.status(403).json({ error: 'У системі зареєстровано активний Android-пристрій. Видалення проєкту вимагає криптографічного підтвердження через застосунок.' });
        return;
      }

      // Execute via state machine with crash recovery & idempotency
      const deleted = await DeviceAuthService.executeApprovedChallenge(
        approvalChallengeId,
        async (challenge) => {
          if (challenge.actionType !== 'DELETE_PROJECT' || challenge.targetObjectId !== id) {
            throw new Error('Виклик підтвердження не відповідає цільовому проєкту');
          }
          return await ProjectStore.deleteProject(id);
        },
        async () => {
          const proj = await ProjectStore.getProjectById(id);
          return { alreadyExecuted: !proj };
        }
      );

      if (!deleted) {
        res.status(404).json({ error: 'Проєкт не знайдено' });
        return;
      }

      await logSecurityEvent(req.ip || '127.0.0.1', 'PROJECT_DELETE', 'SUCCESS', `Видалено проєкт ${id} (підтверджено Android-пристроєм)`);
      res.json({
        success: true,
        message: 'Проєкт успішно видалено з криптографічним підтвердженням'
      });
      return;
    }

    // Fallback only when NO device is enrolled yet
    let isAuthorized = false;
    if (sudoToken && (await verifyAndConsumeSudoToken(sudoToken))) {
      isAuthorized = true;
    } else if (sudoPassword && verifyAdminPassword(sudoPassword.trim())) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      await logSecurityEvent(req.ip || '127.0.0.1', 'PROJECT_DELETE', 'BLOCKED', `Видалення проєкту ${id} заблоковано: потрібен дійсний Sudo-пароль`);
      res.status(403).json({ error: 'Для видалення проєкту потрібне підтвердження пароля адміністратора' });
      return;
    }

    const deleted = await ProjectStore.deleteProject(id);
    if (!deleted) {
      res.status(404).json({ error: 'Проєкт не знайдено' });
      return;
    }

    await logSecurityEvent(req.ip || '127.0.0.1', 'PROJECT_DELETE', 'SUCCESS', `Видалено проєкт ${id}`);
    res.json({
      success: true,
      message: 'Проєкт успішно видалено'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Помилка видалення проєкту' });
  }
});

/**
 * GET /api/admin/files
 */
adminRouter.get('/files', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const files = await ProjectStore.getUploadedFiles();
    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ error: 'Помилка отримання реєстру файлів' });
  }
});

/**
 * POST /api/admin/upload-file (Base64 file upload from FileUploaderWidget)
 */
adminRouter.post('/upload-file', requireAdminAuth, requireCsrfCheck, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fileName, fileDataUrl, usageLocation = 'General', isPrivate = false } = req.body || {};
    if (!fileName || !fileDataUrl) {
      res.status(400).json({ error: 'Відсутні обовʼязкові дані файлу' });
      return;
    }

    const matches = fileDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      res.status(400).json({ error: 'Невірний формат даних файлу (очікується Base64)' });
      return;
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    const result = await ProjectStore.registerUploadedFile(buffer, fileName, mimeType, usageLocation, isPrivate);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    // Save physical file to disk for backward compatibility
    const targetDir = isPrivate ? UPLOADS_PRIVATE_DIR : UPLOADS_PUBLIC_DIR;
    if (result.file) {
      fs.writeFileSync(path.join(targetDir, result.file.storedName), buffer);
    }

    await logSecurityEvent(req.ip || '127.0.0.1', 'FILE_UPLOAD', 'SUCCESS', `Завантажено файл "${fileName}"`);
    res.json({ success: true, file: result.file });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Помилка завантаження файлу' });
  }
});

/**
 * POST /api/admin/upload (Multipart upload via Multer)
 */
adminRouter.post('/upload', requireAdminAuth, requireCsrfCheck, (req: AuthenticatedRequest, res: Response) => {
  upload.single('file')(req as any, res as any, async (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Помилка завантаження файлу' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не обрано' });
    }

    const isPrivate = req.body.isPrivate === 'true';
    const filename = req.file.filename;
    const fileUrl = isPrivate ? `/api/admin/downloads/private/${filename}` : `/storage/uploads/public/${filename}`;

    const fileMeta = {
      id: `file_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      originalName: req.file.originalname,
      storedName: filename,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      sizeFormatted: `${(req.file.size / 1024).toFixed(1)} KB`,
      uploadedAt: new Date().toISOString(),
      url: fileUrl,
      usageLocation: 'Multipart Upload',
      isPrivate
    };

    const db = getDb();
    if (db) {
      try {
        await setDoc(doc(db, 'uploaded_files', fileMeta.id), fileMeta);
      } catch (e) {}
    }

    await logSecurityEvent(req.ip || '127.0.0.1', 'FILE_UPLOAD', 'SUCCESS', `Завантажено файл "${req.file.originalname}" -> ${filename}`);

    return res.json({
      success: true,
      originalName: req.file.originalname,
      filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      fileUrl,
      isPrivate
    });
  });
});

/**
 * DELETE /api/admin/files/:fileId
 */
adminRouter.delete('/files/:fileId', requireAdminAuth, requireCsrfCheck, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fileId } = req.params;
    const deleted = await ProjectStore.deleteUploadedFile(fileId);
    if (!deleted) {
      res.status(404).json({ error: 'Файл не знайдено' });
      return;
    }

    // Also remove from disk if present
    const safeFilename = path.basename(fileId);
    [UPLOADS_PUBLIC_DIR, UPLOADS_PRIVATE_DIR].forEach(dir => {
      const p = path.join(dir, safeFilename);
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch (e) {}
      }
    });

    await logSecurityEvent(req.ip || '127.0.0.1', 'FILE_DELETE', 'SUCCESS', `Видалено файл ${fileId}`);
    res.json({
      success: true,
      message: 'Файл успішно видалено з реєстру'
    });
  } catch (err) {
    res.status(500).json({ error: 'Помилка видалення файлу' });
  }
});

/**
 * GET /api/admin/downloads/private/:filename
 */
adminRouter.get('/downloads/private/:filename', requireAdminAuth, (req: Request, res: Response) => {
  const { filename } = req.params;
  const safeFilename = path.basename(filename);
  const filePath = path.join(UPLOADS_PRIVATE_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Приватний файл не знайдено' });
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  return res.sendFile(filePath);
});

/**
 * Backups API
 */
adminRouter.get('/backups', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const backups = await BackupService.getAllBackups();
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: 'Помилка отримання списку бекапів' });
  }
});

const createBackupHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type = 'manual', note = '' } = req.body || {};
    const result = await BackupService.createBackup(type, note);
    if (result.success && result.manifest) {
      await logSecurityEvent(req.ip || '127.0.0.1', 'BACKUP_CREATE', 'SUCCESS', `Створено бекап "${result.manifest.name}" (${result.manifest.id})`);
      res.json({ success: true, manifest: result.manifest });
    } else {
      res.status(500).json({ error: result.error || 'Помилка створення бекапу' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Помилка створення бекапу' });
  }
};

adminRouter.post('/backups', requireAdminAuth, requireCsrfCheck, createBackupHandler);
adminRouter.post('/backups/create', requireAdminAuth, requireCsrfCheck, createBackupHandler);

adminRouter.get('/backups/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const backup = await BackupService.getBackupById(id);
    if (!backup) {
      res.status(404).json({ error: 'Файл бекапу не знайдено' });
      return;
    }
    res.setHeader('Content-Disposition', `attachment; filename="${id}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(backup, null, 2));
  } catch (err) {
    res.status(500).json({ error: 'Помилка завантаження файлу бекапу' });
  }
});

adminRouter.get('/backups/download/:filename', requireAdminAuth, (req: Request, res: Response) => {
  const { filename } = req.params;
  const safeFilename = path.basename(filename);
  const filePath = path.join(BACKUPS_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Файл бекапу не знайдено' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  return res.sendFile(filePath);
});

adminRouter.post('/backups/:id/verify', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await BackupService.verifyBackup(id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Помилка верифікації бекапу' });
  }
});

const restoreBackupHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { sudoToken, sudoPassword, checkpointFilename, approvalChallengeId } = req.body || {};
    const targetId = id || (checkpointFilename ? checkpointFilename.replace('.json', '') : '');

    // 1. MonoVoice Guard Protection
    const guardConfig = await GuardService.getConfig();
    if (guardConfig && guardConfig.isPaired) {
      const ok = await verifyActionGuard(req, res, 'RESTORE_BACKUP', targetId);
      if (!ok) return;

      const result = await BackupService.restoreBackup(targetId);
      if (result.success) {
        await logSecurityEvent(req.ip || '127.0.0.1', 'BACKUP_RESTORE', 'SUCCESS', `Успішно відновлено стан з бекапу ${targetId} (підтверджено кодом MonoVoice Guard)`);
        res.json(result);
      } else {
        await logSecurityEvent(req.ip || '127.0.0.1', 'BACKUP_RESTORE', 'FAILURE', `Помилка відновлення ${targetId}: ${result.message}`);
        res.status(500).json({ error: result.message, operationId: result.operationId });
      }
      return;
    }

    const hasDevice = await DeviceAuthService.hasActiveDevice();

    if (hasDevice) {
      if (!approvalChallengeId) {
        await logSecurityEvent(req.ip || '127.0.0.1', 'BACKUP_RESTORE', 'BLOCKED', `Відновлення бекапу ${targetId} заблоковано: потрібне підтвердження Android Authenticator`);
        res.status(403).json({ error: 'У системі зареєстровано активний Android-пристрій. Відновлення бази вимагає криптографічного підтвердження через застосунок.' });
        return;
      }

      const result = await DeviceAuthService.executeApprovedChallenge(
        approvalChallengeId,
        async (challenge) => {
          if (challenge.actionType !== 'RESTORE_BACKUP') {
            throw new Error('Виклик підтвердження не призначений для відновлення бекапу');
          }
          return await BackupService.restoreBackup(targetId);
        }
      );

      if (result.success) {
        await logSecurityEvent(req.ip || '127.0.0.1', 'BACKUP_RESTORE', 'SUCCESS', `Успішно відновлено стан з бекапу ${targetId} (підтверджено Android-пристроєм)`);
        res.json(result);
      } else {
        await logSecurityEvent(req.ip || '127.0.0.1', 'BACKUP_RESTORE', 'FAILURE', `Помилка відновлення ${targetId}: ${result.message}`);
        res.status(500).json({ error: result.message, operationId: result.operationId });
      }
      return;
    }

    // Fallback only when NO device is enrolled
    let isAuthorized = false;
    if (sudoToken && (await verifyAndConsumeSudoToken(sudoToken))) {
      isAuthorized = true;
    } else if (sudoPassword && verifyAdminPassword(sudoPassword.trim())) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      await logSecurityEvent(req.ip || '127.0.0.1', 'BACKUP_RESTORE', 'BLOCKED', `Відновлення бекапу ${targetId} заблоковано: потрібен Sudo-пароль`);
      res.status(403).json({ error: 'Для відновлення бази потрібне повторне підтвердження пароля адміністратора' });
      return;
    }

    const result = await BackupService.restoreBackup(targetId);
    if (result.success) {
      await logSecurityEvent(req.ip || '127.0.0.1', 'BACKUP_RESTORE', 'SUCCESS', `Успішно відновлено стан з бекапу ${targetId} (op: ${result.operationId})`);
      res.json(result);
    } else {
      await logSecurityEvent(req.ip || '127.0.0.1', 'BACKUP_RESTORE', 'FAILURE', `Помилка відновлення ${targetId}: ${result.message}`);
      res.status(500).json({ error: result.message, operationId: result.operationId });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Помилка відновлення бекапу' });
  }
};

adminRouter.post('/backups/:id/restore', requireAdminAuth, requireCsrfCheck, restoreBackupHandler);
adminRouter.post('/backups/restore', requireAdminAuth, requireCsrfCheck, restoreBackupHandler);

adminRouter.delete('/backups/:id', requireAdminAuth, requireCsrfCheck, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { approvalChallengeId, actionPassword } = req.body || {};

    // 1. MonoVoice Guard Protection
    const guardConfig = await GuardService.getConfig();
    if (guardConfig && guardConfig.isPaired) {
      const ok = await verifyActionGuard(req, res, 'DELETE_BACKUP', id);
      if (!ok) return;

      const success = await BackupService.deleteBackup(id);
      if (!success) {
        res.status(404).json({ error: 'Файл бекапу не знайдено' });
        return;
      }
      await logSecurityEvent(req.ip || '127.0.0.1', 'BACKUP_DELETE', 'SUCCESS', `Видалено бекап ${id} (підтверджено кодом MonoVoice Guard)`);
      res.json({ success: true, message: 'Бекап успішно видалено' });
      return;
    }

    const hasDevice = await DeviceAuthService.hasActiveDevice();
    if (hasDevice) {
      if (!approvalChallengeId) {
        res.status(403).json({ error: 'Видалення бекапу вимагає криптографічного схвалення на довіреному Android-пристрої.' });
        return;
      }
      await DeviceAuthService.executeApprovedChallenge(approvalChallengeId, async (challenge) => {
        if (challenge.actionType !== 'DELETE_BACKUP' || challenge.targetObjectId !== id) {
          throw new Error('Виклик підтвердження не відповідає операції видалення даного бекапу');
        }
        const success = await BackupService.deleteBackup(id);
        if (!success) throw new Error('Файл бекапу не знайдено');
        return success;
      });
    } else {
      // Require action password if no device enrolled
      if (!actionPassword || !verifyActionPassword(actionPassword.trim())) {
        res.status(403).json({ error: 'Для видалення бекапу потрібен дійсний пароль дії' });
        return;
      }
      const success = await BackupService.deleteBackup(id);
      if (!success) {
        res.status(404).json({ error: 'Файл бекапу не знайдено' });
        return;
      }
    }

    await logSecurityEvent(req.ip || '127.0.0.1', 'BACKUP_DELETE', 'SUCCESS', `Видалено бекап ${id}`);
    res.json({ success: true, message: 'Бекап успішно видалено' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Помилка видалення бекапу' });
  }
});

adminRouter.get('/backups/settings', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json(BackupService.getSettings());
});

adminRouter.post('/backups/settings', requireAdminAuth, requireCsrfCheck, (req: AuthenticatedRequest, res: Response) => {
  const updated = BackupService.updateSettings(req.body);
  res.json({ success: true, settings: updated });
});

/**
 * Checkpoints endpoints
 */
adminRouter.get('/checkpoints', requireAdminAuth, (req: Request, res: Response) => {
  if (!fs.existsSync(CHECKPOINTS_DIR)) return res.json([]);
  const files = fs.readdirSync(CHECKPOINTS_DIR).filter(f => f.endsWith('.json'));
  const checkpoints = files.map(filename => {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(CHECKPOINTS_DIR, filename), 'utf8'));
      return {
        filename,
        timestamp: content.timestamp || '',
        action: content.action || 'system',
        projectsCount: content.projects ? content.projects.length : 0
      };
    } catch {
      return null;
    }
  }).filter(Boolean);
  res.json(checkpoints);
});

adminRouter.post('/checkpoints/restore', requireAdminAuth, requireCsrfCheck, restoreBackupHandler);

/**
 * GitHub Releases Integration Endpoints
 */
adminRouter.post('/projects/:id/github-check', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { customGithubUrl } = req.body || {};
    const project = await ProjectStore.getProjectById(id);
    if (!project) {
      res.status(404).json({ error: 'Проєкт не знайдено' });
      return;
    }
    const repoUrl = customGithubUrl || project.github;
    if (!repoUrl) {
      res.status(400).json({ error: 'Для цього проєкту не вказано посилання на GitHub репозиторій' });
      return;
    }
    const checkResult = await GitHubService.fetchReleasesForProject(repoUrl, project.version);
    res.json({ success: true, checkResult });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Помилка перевірки оновлень на GitHub' });
  }
});

adminRouter.post('/projects/:id/apply-github-release', requireAdminAuth, requireCsrfCheck, requireActionPassword, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { releaseData } = req.body || {};
    if (!releaseData) {
      res.status(400).json({ error: 'Відсутні дані релізу для оновлення' });
      return;
    }
    const project = await ProjectStore.getProjectById(id);
    if (!project) {
      res.status(404).json({ error: 'Проєкт не знайдено' });
      return;
    }

    const updates: any = {};
    if (releaseData.version) updates.version = releaseData.version;
    if (releaseData.releaseDate) updates.releaseDate = releaseData.releaseDate;
    if (releaseData.changelogSummary && releaseData.version) {
      const existingChangelog = project.changelog || [];
      const newEntry = {
        version: releaseData.version,
        date: releaseData.releaseDate || new Date().toISOString().split('T')[0],
        changes: {
          uk: [releaseData.changelogSummary],
          en: [releaseData.changelogSummary]
        }
      };
      updates.changelog = [newEntry, ...existingChangelog.filter((c: any) => c.version !== releaseData.version)];
    }

    if (releaseData.assets && releaseData.assets.length > 0) {
      const dl = { ...project.download };
      for (const asset of releaseData.assets) {
        const name = (asset.name || '').toLowerCase();
        if (name.endsWith('.apk')) dl.android = asset.downloadUrl;
        else if (name.endsWith('.exe') || name.endsWith('.msi')) dl.windows = asset.downloadUrl;
        else if (name.endsWith('.dmg') || name.endsWith('.pkg')) dl.mac = asset.downloadUrl;
        else if (name.endsWith('.deb') || name.endsWith('.appimage')) dl.linux = asset.downloadUrl;
      }
      updates.download = dl;
      if (releaseData.assets[0].sizeFormatted) {
        updates.fileSize = releaseData.assets[0].sizeFormatted;
      }
    }

    const updated = await ProjectStore.updateProject(id, updates);
    await logSecurityEvent(req.ip || '127.0.0.1', 'GITHUB_RELEASE_APPLIED', 'SUCCESS', `Застосовано реліз ${releaseData.version} до проєкту "${project.name}"`);

    res.json({ success: true, project: updated });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Помилка застосування оновлення з GitHub' });
  }
});

adminRouter.post('/github/check-all', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projects = await ProjectStore.getAllProjects();
    const results: any[] = [];
    for (const proj of projects) {
      if (proj.github && proj.github.includes('github.com')) {
        try {
          const check = await GitHubService.fetchReleasesForProject(proj.github, proj.version);
          results.push({
            projectId: proj.id,
            projectName: proj.name,
            currentVersion: proj.version,
            githubUrl: proj.github,
            checkResult: check
          });
        } catch {
          results.push({
            projectId: proj.id,
            projectName: proj.name,
            currentVersion: proj.version,
            githubUrl: proj.github,
            error: 'Не вдалося перевірити'
          });
        }
      }
    }
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: 'Помилка пакетної перевірки релізів' });
  }
});

/**
 * Device Auth & Cryptographic Synchronization Endpoints
 */

// 1. Generate pairing code (Protected by Admin Auth, CSRF, Action Password)
adminRouter.post('/device-auth/pairing/create-code', requireAdminAuth, requireCsrfCheck, requireActionPassword, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const { pairingCode, qrUri } = await DeviceAuthService.createPairingCode(clientIp);

    await logSecurityEvent(clientIp, 'DEVICE_PAIRING_CODE_CREATED', 'SUCCESS', `Створено одноразовий код прив’язки пристрою ${pairingCode.codeId}`);

    res.json({
      success: true,
      pairingCode: {
        codeId: pairingCode.codeId,
        attestationChallenge: pairingCode.attestationChallenge,
        expiresAt: pairingCode.expiresAt
      },
      qrUri,
      expiresInSeconds: 300
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Помилка створення коду прив’язки' });
  }
});

// 2. Claim pairing code & register device (Called by Android app or web simulator)
adminRouter.post('/device-auth/pairing/claim', async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const { pairingCode, deviceName, publicKey, certificateChain, allowSimulator } = req.body || {};

    if (!pairingCode || !publicKey) {
      res.status(400).json({ error: 'Недійсний код прив’язки або строк дії вичерпано' });
      return;
    }

    const device = await DeviceAuthService.claimPairingCodeAndRegisterDevice({
      pairingCode: String(pairingCode).trim(),
      deviceName: deviceName || 'Android Authenticator',
      publicKeyPem: publicKey,
      certificateChain: Array.isArray(certificateChain) ? certificateChain : undefined,
      clientIp,
      allowDevSimulator: Boolean(allowSimulator && process.env.NODE_ENV !== 'production')
    });

    await logSecurityEvent(clientIp, 'DEVICE_REGISTERED', 'SUCCESS', `Успішно зареєстровано довірений пристрій ${device.deviceId} (${device.deviceName})`);

    res.json({
      success: true,
      device: {
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        hardwareSecurityLevel: device.hardwareSecurityLevel,
        status: device.status,
        registeredAt: device.registeredAt
      }
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Недійсний код прив’язки або строк дії вичерпано' });
  }
});

// 3. Issue single-use challenge for device HTTP-request signing (Anti-Replay)
adminRouter.post('/device-auth/device-session/challenge', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.body || {};
    if (!deviceId) {
      res.status(400).json({ error: 'Потрібен deviceId' });
      return;
    }

    const result = await DeviceAuthService.issueDeviceAuthChallenge(deviceId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Помилка генерації виклику пристрою' });
  }
});

// 4. Get pending challenges (Signed REST Polling for Android App)
adminRouter.get('/device-auth/challenge/pending', async (req: Request, res: Response) => {
  try {
    const deviceId = req.headers['x-device-id'] as string;
    const authChallenge = req.headers['x-auth-challenge'] as string;
    const expiresAt = req.headers['x-expires-at'] as string;
    const signature = req.headers['x-device-signature'] as string;

    // Verify signed HTTP request from device using full canonical path (e.g. /api/admin/device-auth/challenge/pending)
    const canonicalPath = req.originalUrl ? req.originalUrl.split('?')[0] : ((req.baseUrl || '/api/admin') + req.path);
    await DeviceAuthService.verifyAndConsumeSignedDeviceRequest({
      deviceId,
      method: req.method,
      path: canonicalPath,
      body: '',
      authChallenge,
      expiresAt,
      signatureBase64: signature
    });

    const pending = await DeviceAuthService.listPendingChallenges();
    res.json({ success: true, challenges: pending });
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Помилка автентифікації запиту пристрою' });
  }
});

// 4b. Dedicated Heartbeat / Ping endpoint (Signed Heartbeat for Android App)
adminRouter.post('/device-auth/heartbeat', async (req: Request, res: Response) => {
  try {
    const { deviceId, authChallenge, expiresAt, signature, appVersion } = req.body || {};

    const result = await DeviceAuthService.recordDeviceHeartbeat({
      deviceId,
      authChallenge,
      expiresAt,
      signatureBase64: signature,
      appVersion
    });

    res.json({
      success: true,
      status: 'ONLINE',
      lastSeenAt: result.lastSeenAt,
      message: 'Сигнал активності пристрою успішно прийнято'
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Помилка автентифікації сигналу активності' });
  }
});

// 5. Submit signature for approval challenge
adminRouter.post('/device-auth/challenge/submit', async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const { requestId, deviceId, signature } = req.body || {};

    if (!requestId || !deviceId || !signature) {
      res.status(400).json({ error: 'Відсутні обов’язкові параметри підпису' });
      return;
    }

    await DeviceAuthService.verifyAndApproveChallenge(requestId, deviceId, signature);
    await logSecurityEvent(clientIp, 'CHALLENGE_APPROVED', 'SUCCESS', `Операцію ${requestId} успішно схвалено пристроєм ${deviceId}`);

    res.json({ success: true, message: 'Криптографічний підпис успішно перевірено' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Помилка верифікації підпису' });
  }
});

// 6. Reject approval challenge
adminRouter.post('/device-auth/challenge/reject', async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const { requestId, deviceId, authChallenge, expiresAt, signature } = req.body || {};

    if (!requestId || !deviceId) {
      res.status(400).json({ error: 'Відсутні обов’язкові параметри' });
      return;
    }

    if (authChallenge && signature) {
      const canonicalPath = req.originalUrl ? req.originalUrl.split('?')[0] : ((req.baseUrl || '/api/admin') + req.path);
      await DeviceAuthService.verifyAndConsumeSignedDeviceRequest({
        deviceId,
        method: req.method,
        path: canonicalPath,
        body: req.body,
        authChallenge,
        expiresAt,
        signatureBase64: signature
      });
    }

    await DeviceAuthService.rejectChallenge(requestId, deviceId);
    await logSecurityEvent(clientIp, 'CHALLENGE_REJECTED', 'BLOCKED', `Операцію ${requestId} відхилено користувачем на пристрої ${deviceId}`);

    res.json({ success: true, message: 'Операцію відхилено' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Помилка відхилення виклику' });
  }
});

// 7. Create challenge from Admin UI for a sensitive action
adminRouter.post('/device-auth/challenge/create', requireAdminAuth, requireCsrfCheck, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const { actionType, targetObjectId, targetObjectLabel, actionPayload } = req.body || {};

    if (!actionType || !targetObjectId) {
      res.status(400).json({ error: 'Потрібні actionType та targetObjectId' });
      return;
    }

    const challenge = await DeviceAuthService.createChallenge(
      actionType,
      targetObjectId,
      targetObjectLabel || targetObjectId,
      actionPayload || {},
      clientIp
    );

    res.json({ success: true, challenge });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Помилка створення виклику підтвердження' });
  }
});

// 8. Check challenge status
adminRouter.get('/device-auth/challenge/status/:requestId', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { requestId } = req.params;
    const db = getDb();
    if (!db) {
      res.status(500).json({ error: 'Database not initialized' });
      return;
    }

    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'admin_approval_requests', requestId));

    if (!snap.exists()) {
      res.status(404).json({ error: 'Виклик не знайдено' });
      return;
    }

    const data = snap.data();
    res.json({ success: true, challenge: data, status: data.status });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Помилка отримання статусу виклику' });
  }
});

// 9. List devices
adminRouter.get('/device-auth/devices', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const devices = await DeviceAuthService.listDevices();
    res.json({ success: true, devices });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Помилка отримання списку пристроїв' });
  }
});

// 10. Generate emergency recovery codes (One-time download)
adminRouter.post('/device-auth/recovery/generate', requireAdminAuth, requireCsrfCheck, requireActionPassword, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const recoveryCodes = await DeviceAuthService.generateRecoveryCodes();

    await logSecurityEvent(clientIp, 'RECOVERY_CODES_GENERATED', 'SUCCESS', 'Згенеровано новий комплект одноразових аварійних кодів відновлення');

    res.json({
      success: true,
      recoveryCodes,
      message: 'Збережіть ці коди у надійному місці. Кожен код є одноразовим і дозволяє аварійно відкликати втрачений пристрій.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Помилка генерації кодів відновлення' });
  }
});

// 11. Revoke lost device using Recovery Code
adminRouter.post('/device-auth/recovery/revoke-lost-device', async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const { recoveryCode, deviceId, actionPassword } = req.body || {};

    if (!recoveryCode || !deviceId || !actionPassword) {
      res.status(400).json({ error: 'Потрібні recoveryCode, deviceId та actionPassword' });
      return;
    }

    if (!verifyActionPassword(actionPassword.trim())) {
      await logSecurityEvent(clientIp, 'DEVICE_REVOCATION_ATTEMPT', 'BLOCKED', 'Невірний пароль дії при спробі аварійного відкликання пристрою');
      res.status(403).json({ error: 'Невірний пароль адміністративної дії' });
      return;
    }

    await DeviceAuthService.revokeLostDeviceWithRecoveryCode(recoveryCode, deviceId, clientIp);
    await logSecurityEvent(clientIp, 'DEVICE_REVOKED_VIA_RECOVERY_CODE', 'SUCCESS', `Пристрій ${deviceId} аварійно відкликано за допомогою Recovery Code`);

    res.json({
      success: true,
      message: 'Пристрій успішно відкликано. Для подальших критичних дій потрібно прив’язати новий довірений пристрій.'
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Помилка аварійного відкликання пристрою' });
  }
});

// 12. Public Connectivity Test endpoint for Android diagnostic check (Stage 1)
adminRouter.post('/device-auth/connectivity-test', async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const { testId, appVersion, sentAt } = req.body || {};

    const record = await DeviceAuthService.recordConnectivityTest({
      testId,
      appVersion,
      sentAt,
      clientIp
    });

    res.json({
      success: true,
      testId: record.testId,
      receivedAt: record.receivedAt,
      appVersion: record.appVersion,
      message: 'Тестовий сигнал доступності сервера успішно прийнято та зафіксовано'
    });
  } catch (err: any) {
    const isRateLimit = err.message?.includes('ліміт');
    const isValidationError = err.message?.includes('Недійсний') || err.message?.includes('Некоректні');
    const statusCode = isRateLimit ? 429 : isValidationError ? 400 : 500;
    res.status(statusCode).json({ error: err.message || 'Помилка виконання тесту доступності' });
  }
});

// 13. Admin-only latest connectivity test status reader (Stage 1)
adminRouter.get('/device-auth/connectivity-test/latest', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const result = await DeviceAuthService.getLatestConnectivityTest();
    res.json({
      success: true,
      status: result.status,
      lastResult: result.lastResult
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Помилка отримання результатів тестування' });
  }
});
