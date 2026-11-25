import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { GuardService } from './guardService';
import { parseCookies, getSession, verifyActionPassword, AdminSession } from './auth';

export const guardRouter = Router();

export interface AuthenticatedGuardRequest extends Request {
  adminSession?: AdminSession;
}

// Middleware: Require valid admin session
async function requireAdminAuth(req: AuthenticatedGuardRequest, res: Response, next: NextFunction) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies['admin_session'];
    if (!sessionId) {
      res.status(401).json({ error: 'Необхідна автентифікація адміністратора' });
      return;
    }
    const session = await getSession(sessionId);
    if (!session) {
      res.status(401).json({ error: 'Сесія закінчилася. Будь ласка, увійдіть знову.' });
      return;
    }
    req.adminSession = session;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Помилка валідації сесії' });
  }
}

// Middleware: CSRF Token Check
function requireCsrfCheck(req: AuthenticatedGuardRequest, res: Response, next: NextFunction) {
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

/**
 * 1. GET /api/admin/guard/status
 * Public / Admin readable status of Guard binding
 */
guardRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const config = await GuardService.getConfig();
    res.json({
      success: true,
      isPaired: Boolean(config?.isPaired),
      phoneNumber: config?.isPaired ? config.phoneNumber : null,
      deviceName: config?.isPaired ? config.deviceName : null,
      pairedAt: config?.isPaired ? config.pairedAt : null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Помилка отримання статусу Guard' });
  }
});

/**
 * GET /api/admin/guard/time
 * Server UTC timestamp for TOTP clock-drift synchronization
 */
guardRouter.get('/time', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    success: true,
    serverTimeMs: Date.now(),
    stepSeconds: 15
  });
});

/**
 * 2. POST /api/admin/guard/pair/init
 * Initialize pairing session (Generate Secret + QR URI + Recovery Code)
 */
guardRouter.post('/pair/init', requireAdminAuth, requireCsrfCheck, async (req: Request, res: Response) => {
  try {
    const { phoneNumber, deviceName } = req.body || {};
    const clientIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';

    const forwardedProto = req.headers['x-forwarded-proto'];
    const rawProto = Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : typeof forwardedProto === 'string'
      ? forwardedProto.split(',')[0]
      : req.protocol;
    const proto = rawProto?.trim().toLowerCase() === 'https' ? 'https' : 'http';

    const forwardedHost = req.headers['x-forwarded-host'];
    const rawHost = Array.isArray(forwardedHost)
      ? forwardedHost[0]
      : typeof forwardedHost === 'string'
      ? forwardedHost.split(',')[0]
      : req.get('host');
    const cleanHost = rawHost?.trim();
    const requestBaseUrl =
      cleanHost && /^[a-zA-Z0-9.\-:\[\]]+$/.test(cleanHost)
        ? `${proto}://${cleanHost}`
        : undefined;

    const result = await GuardService.initPairing(
      phoneNumber || '+380000000000',
      deviceName || 'MonoVoice Guard Authenticator',
      clientIp,
      requestBaseUrl
    );

    res.json({
      success: true,
      secretKey: result.secretKey,
      qrUri: result.qrUri,
      recoveryCode: result.recoveryCode,
      phoneNumber: result.phoneNumber,
      stepSeconds: 15
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Помилка ініціалізації зв’язки' });
  }
});

/**
 * 3. POST /api/admin/guard/pair/confirm
 * Finalize pairing with the first 15-second code from the mobile app
 */
guardRouter.post('/pair/confirm', requireAdminAuth, requireCsrfCheck, async (req: Request, res: Response) => {
  try {
    const { secretKey, phoneNumber, recoveryCode, deviceName, initialCode } = req.body || {};

    if (!secretKey || !initialCode) {
      res.status(400).json({ error: 'Потрібні secretKey та код підтвердження з додатку' });
      return;
    }

    const config = await GuardService.confirmPairing({
      secretKey,
      phoneNumber: phoneNumber || '+380000000000',
      recoveryCode: recoveryCode || 'R-MANUAL',
      deviceName: deviceName || 'Android Authenticator',
      initialCode: String(initialCode).trim()
    });

    res.json({
      success: true,
      message: 'Пристрій успішно підключено як захисник MonoVoice Guard!',
      isPaired: true,
      phoneNumber: config.phoneNumber,
      pairedAt: config.pairedAt
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Помилка підтвердження зв’язки' });
  }
});

/**
 * 4. POST /api/admin/guard/unpair
 * Unpair device using Recovery Code or Action Password
 */
guardRouter.post('/unpair', requireAdminAuth, requireCsrfCheck, async (req: Request, res: Response) => {
  try {
    const { recoveryCode, actionPassword } = req.body || {};
    const config = await GuardService.getConfig();

    if (!config || !config.isPaired) {
      res.json({ success: true, message: 'Пристрій уже від’єднано' });
      return;
    }

    let isValid = false;
    if (recoveryCode && config.recoveryCode && recoveryCode.trim().toUpperCase() === config.recoveryCode.toUpperCase()) {
      isValid = true;
    } else if (actionPassword) {
      isValid = verifyActionPassword(actionPassword.trim());
    }

    if (!isValid) {
      const clientIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
      const location = GuardService.resolveLocation(req);
      await GuardService.recordIncident({
        clientIp,
        location,
        userAgent: req.headers['user-agent'] || '',
        actionType: 'UNPAIR_GUARD_ATTEMPT',
        targetLabel: 'MonoVoice Guard',
        reason: 'INVALID_CODE',
        details: 'Невдала спроба від’єднання Guard: невірний код відновлення або пароль дії.'
      });
      res.status(403).json({ error: 'Невірний код відновлення (Recovery Code) або пароль адміністративної дії' });
      return;
    }

    await GuardService.unpair(true);
    res.json({ success: true, message: 'Захист MonoVoice Guard успішно вимкнено для поточного пристрою' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Помилка від’єднання пристрою' });
  }
});

/**
 * 5. POST /api/admin/guard/record-incident
 * Client-notified security incident (e.g. 15s timer expired without user entering code)
 */
guardRouter.post('/record-incident', async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const location = GuardService.resolveLocation(req);
    const { actionType, targetLabel, reason, details } = req.body || {};

    const incident = await GuardService.recordIncident({
      clientIp,
      location,
      userAgent: req.headers['user-agent'] || '',
      actionType: actionType || 'GENERIC_ACTION',
      targetLabel: targetLabel || 'Адміністративна дія',
      reason: reason === 'EXPIRED_TIMEOUT' ? 'EXPIRED_TIMEOUT' : 'BLOCKED_ATTEMPT',
      details: details || 'Час (15 секунд) вийшов. Збереження скасовано.'
    });

    res.json({ success: true, incidentId: incident.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Помилка запису інциденту' });
  }
});

/**
 * 6. GET /api/admin/guard/incidents
 * Read security incidents log (For Android App & Website Admin)
 */
guardRouter.get('/incidents', async (req: Request, res: Response) => {
  try {
    const incidents = await GuardService.listIncidents(50);
    res.json({
      success: true,
      count: incidents.length,
      incidents
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Помилка завантаження журналу інцидентів' });
  }
});

/**
 * 7. POST /api/admin/guard/verify-code
 * Standalone verification endpoint for testing codes
 */
guardRouter.post('/verify-code', async (req: Request, res: Response) => {
  try {
    const { code, actionType, targetLabel } = req.body || {};
    const clientIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const location = GuardService.resolveLocation(req);

    if (!code) {
      await GuardService.recordIncident({
        clientIp,
        location,
        userAgent: req.headers['user-agent'] || '',
        actionType: actionType || 'UNKNOWN_ACTION',
        targetLabel: targetLabel || 'Операція',
        reason: 'INVALID_CODE',
        details: 'Спроба підтвердження без надання 15-секундного коду'
      });
      res.status(400).json({ error: 'Введіть код підтвердження' });
      return;
    }

    const isValid = await GuardService.verifyActionCode(String(code).trim());
    if (!isValid) {
      await GuardService.recordIncident({
        clientIp,
        location,
        userAgent: req.headers['user-agent'] || '',
        actionType: actionType || 'UNKNOWN_ACTION',
        targetLabel: targetLabel || 'Операція',
        reason: 'INVALID_CODE',
        details: `Введено недійсний код підтвердження "${code}". Можливо, час коду (15 сек) закінчився.`
      });
      res.status(403).json({ error: 'Недійсний або прострочений 15-секундний код' });
      return;
    }

    res.json({ success: true, message: 'Код успішно підтверджено' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Помилка перевірки коду' });
  }
});
