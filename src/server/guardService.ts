import crypto from 'crypto';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { getDb } from './firebase';

export interface GuardConfig {
  isPaired: boolean;
  phoneNumber: string;
  secretKey: string; // 32-byte hex secret for HMAC-SHA256 TOTP
  recoveryCode: string; // e.g. R-12345-ABCDE
  deviceName: string;
  pairedAt: string;
  lastUsedWindow?: number;
}

export interface SecurityIncident {
  id: string;
  timestamp: string;
  clientIp: string;
  location: string;
  userAgent: string;
  actionType: string;
  targetLabel: string;
  reason: 'EXPIRED_TIMEOUT' | 'INVALID_CODE' | 'BLOCKED_ATTEMPT';
  details: string;
}

const STEP_SECONDS = 15; // 15-second Steam Guard window
const CONFIG_DOC_ID = 'main_config';
const GUARD_CONFIG_COLLECTION = 'admin_guard_config';
const GUARD_INCIDENTS_COLLECTION = 'admin_guard_incidents';

/**
 * Generate 6-digit TOTP from secret for a given 15-second counter window
 */
export function generateGuardCode(secretHex: string, timeSeconds: number = Math.floor(Date.now() / 1000)): string {
  const counter = Math.floor(timeSeconds / STEP_SECONDS);
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(counter));

  const secretBuffer = Buffer.from(secretHex, 'hex');
  const hmac = crypto.createHmac('sha256', secretBuffer).update(buffer).digest();

  // Dynamic truncation (RFC 4226)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verify 6-digit TOTP with +-1 window tolerance (covering 15s window + clock drift buffer)
 */
export function verifyGuardCode(secretHex: string, inputCode: string, timeSeconds: number = Math.floor(Date.now() / 1000)): { valid: boolean; window: number } {
  const cleanCode = inputCode.replace(/[\s-]/g, '').trim();
  if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return { valid: false, window: 0 };
  }

  const currentCounter = Math.floor(timeSeconds / STEP_SECONDS);
  // Check windows: current, previous (-1), next (+1)
  for (let delta = -1; delta <= 1; delta++) {
    const counter = currentCounter + delta;
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(counter));

    const secretBuffer = Buffer.from(secretHex, 'hex');
    const hmac = crypto.createHmac('sha256', secretBuffer).update(buffer).digest();

    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const otp = (binary % 1000000).toString().padStart(6, '0');

    if (crypto.timingSafeEqual(Buffer.from(cleanCode), Buffer.from(otp))) {
      return { valid: true, window: counter };
    }
  }

  return { valid: false, window: 0 };
}

// In-memory fallback if Firestore is temporarily offline
let memoryConfig: GuardConfig | null = null;
let memoryIncidents: SecurityIncident[] = [];

export class GuardService {
  /**
   * Get current Guard pairing status
   */
  static async getConfig(): Promise<GuardConfig | null> {
    const db = getDb();
    if (db) {
      try {
        const snap = await getDoc(doc(db, GUARD_CONFIG_COLLECTION, CONFIG_DOC_ID));
        if (snap.exists()) {
          const cfg = snap.data() as GuardConfig;
          memoryConfig = cfg;
          return cfg;
        }
      } catch (err) {
        console.warn('Notice reading GuardConfig from Firestore:', err);
      }
    }
    return memoryConfig;
  }

  /**
   * Initialize a new pairing session with phone number
   */
  static async initPairing(
    phoneNumber: string,
    deviceName: string = 'Android Phone',
    clientIp: string,
    requestBaseUrl?: string
  ): Promise<{
    secretKey: string;
    qrUri: string;
    recoveryCode: string;
    phoneNumber: string;
  }> {
    const cleanPhone = phoneNumber.trim();
    if (!cleanPhone || cleanPhone.length < 9) {
      throw new Error('Вкажіть коректний номер телефону для прив’язки (наприклад, +380XXXXXXXXX)');
    }

    const secretKey = crypto.randomBytes(32).toString('hex');
    const recoveryCode = `R-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const rawBaseUrl =
      process.env.APP_URL?.trim() ||
      process.env.PUBLIC_URL?.trim() ||
      requestBaseUrl?.trim() ||
      'http://localhost:3000';
    const baseUrl = rawBaseUrl.replace(/\/+$/, '');
    const qrUri = `monovoice-guard://pair?endpoint=${encodeURIComponent(baseUrl)}&secret=${secretKey}&phone=${encodeURIComponent(cleanPhone)}&device=${encodeURIComponent(deviceName)}`;

    return {
      secretKey,
      qrUri,
      recoveryCode,
      phoneNumber: cleanPhone
    };
  }

  /**
   * Confirm and activate device pairing after user enters the first code from app
   */
  static async confirmPairing(params: {
    secretKey: string;
    phoneNumber: string;
    recoveryCode: string;
    deviceName: string;
    initialCode: string;
  }): Promise<GuardConfig> {
    const { secretKey, phoneNumber, recoveryCode, deviceName, initialCode } = params;

    const verification = verifyGuardCode(secretKey, initialCode);
    if (!verification.valid) {
      throw new Error('Невірний код перевірки з додатку. Переконайтеся, що час на телефоні синхронізовано.');
    }

    const config: GuardConfig = {
      isPaired: true,
      phoneNumber,
      secretKey,
      recoveryCode,
      deviceName: deviceName || 'Android Authenticator',
      pairedAt: new Date().toISOString()
    };

    memoryConfig = config;

    const db = getDb();
    if (db) {
      try {
        await setDoc(doc(db, GUARD_CONFIG_COLLECTION, CONFIG_DOC_ID), config);
      } catch (err) {
        console.warn('Notice saving GuardConfig to Firestore:', err);
      }
    }

    return config;
  }

  /**
   * Unpair Guard device using Action Password or Recovery Code
   */
  static async unpair(recoveryCodeOrActionPasswordValid: boolean): Promise<boolean> {
    if (!recoveryCodeOrActionPasswordValid) {
      throw new Error('Недійсний код відновлення або пароль дії');
    }

    memoryConfig = null;
    const db = getDb();
    if (db) {
      try {
        await deleteDoc(doc(db, GUARD_CONFIG_COLLECTION, CONFIG_DOC_ID));
      } catch (err) {
        console.warn('Notice deleting GuardConfig:', err);
      }
    }

    return true;
  }

  /**
   * Verify 15-second code for an administrative action
   */
  static async verifyActionCode(code: string): Promise<boolean> {
    const config = await this.getConfig();
    if (!config || !config.isPaired) {
      // If Guard is not enrolled yet, pass through (fallback mode)
      return true;
    }

    const { valid, window } = verifyGuardCode(config.secretKey, code);
    if (!valid) {
      return false;
    }

    // Anti-replay: cannot reuse the same window
    if (config.lastUsedWindow && config.lastUsedWindow === window) {
      throw new Error('Цей код уже був використаний. Будь ласка, зачекайте оновлення коду (15 сек).');
    }

    config.lastUsedWindow = window;
    memoryConfig = config;

    const db = getDb();
    if (db) {
      try {
        await setDoc(doc(db, GUARD_CONFIG_COLLECTION, CONFIG_DOC_ID), config, { merge: true });
      } catch (e) {}
    }

    return true;
  }

  /**
   * Resolve human-readable location from client headers / IP
   */
  static resolveLocation(req: any): string {
    const headers = req.headers || {};
    const country = headers['cf-ipcountry'] || headers['x-appengine-country'] || headers['x-country-code'] || '';
    const city = headers['x-appengine-city'] || headers['x-city'] || '';

    if (city && country) {
      return `${decodeURIComponent(city)}, ${country}`;
    }
    if (country) {
      return country === 'UA' ? 'Україна' : `Країна: ${country}`;
    }

    const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return 'Локальна мережа (Localhost / Office)';
    }

    return 'Мережа Інтернет';
  }

  /**
   * Record a security incident (e.g. 15-second timeout expired, wrong code, or blocked attempt)
   */
  static async recordIncident(params: {
    clientIp: string;
    location: string;
    userAgent: string;
    actionType: string;
    targetLabel: string;
    reason: SecurityIncident['reason'];
    details?: string;
  }): Promise<SecurityIncident> {
    const { clientIp, location, userAgent, actionType, targetLabel, reason, details } = params;

    const incident: SecurityIncident = {
      id: `inc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      timestamp: new Date().toISOString(),
      clientIp: clientIp || '127.0.0.1',
      location: location || 'Невідомо',
      userAgent: (userAgent || 'Browser').substring(0, 150),
      actionType,
      targetLabel,
      reason,
      details: details || `Зафіксовано спробу виконання дії "${actionType}" (${targetLabel}) без успішного підтвердження у 15-секундний інтервал.`
    };

    memoryIncidents.unshift(incident);
    if (memoryIncidents.length > 100) memoryIncidents = memoryIncidents.slice(0, 100);

    const db = getDb();
    if (db) {
      try {
        await setDoc(doc(db, GUARD_INCIDENTS_COLLECTION, incident.id), incident);
      } catch (err) {
        console.warn('Notice saving incident to Firestore:', err);
      }
    }

    return incident;
  }

  /**
   * Get list of recorded security incidents
   */
  static async listIncidents(max: number = 50): Promise<SecurityIncident[]> {
    const db = getDb();
    if (db) {
      try {
        const col = collection(db, GUARD_INCIDENTS_COLLECTION);
        const q = query(col, limit(max));
        const snap = await getDocs(q);
        const list: SecurityIncident[] = [];
        snap.forEach(d => list.push(d.data() as SecurityIncident));
        if (list.length > 0) {
          return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
      } catch (err) {
        console.warn('Notice reading incidents from Firestore:', err);
      }
    }
    return memoryIncidents;
  }
}
