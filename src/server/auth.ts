import crypto from 'crypto';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { getDb } from './firebase';

// Salt for password hashing and backward compatibility
export const LEGACY_SALT = 'MonoVoiceApps_Production_Salt_2026';

/**
 * Returns the active salt for cryptographic hashing.
 * In production, AUTH_SALT is strictly required from environment.
 * For non-production development/test runs where AUTH_SALT is omitted, returns an isolated development salt.
 */
export function getActiveAuthSalt(): string {
  const envSalt = process.env.AUTH_SALT;
  if (envSalt && envSalt.trim().length > 0) {
    return envSalt.trim();
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[SECURITY FATAL] AUTH_SALT environment variable is required in production.');
  }
  return 'MonoVoiceApps_DevTest_Salt_Dynamic';
}

// Known insecure / default passwords and secrets blocklist
export const KNOWN_INSECURE_PASSWORDS: readonly string[] = Object.freeze([
  'monovoice2026!adminkey',
  'monovoice2026!createupdatekey',
  'monovoiceadmin2026!',
  'admin',
  'admin123',
  'admin2026',
  'password',
  'password123',
  '12345678',
  '123456789',
  'root',
  'monovoice',
  'monovoice2026',
  'changeme',
  'secret'
]);

export const KNOWN_INSECURE_SECRETS: readonly string[] = Object.freeze([
  'monovoice_super_secret_session_key_2026',
  'monovoice-secret-key-change-in-prod',
  'monovoiceapps_production_salt_2026',
  'monovoice-dev-only-cookie-secret',
  'changeme',
  'secret',
  'session_secret',
  'cookie_secret'
]);

/**
 * Validates mandatory environment secrets upon server startup.
 * In production, fails immediately with a fatal error if any required secret is missing
 * or uses a known default/weak fallback.
 * Strictly avoids logging secret, password, or token contents to console or error objects.
 */
export function validateEnvironmentSecrets(): void {
  const isProd = process.env.NODE_ENV === 'production';
  const adminPassword = process.env.ADMIN_PASSWORD;
  const actionPassword = process.env.ADMIN_ACTION_PASSWORD;
  const cookieSecret = process.env.COOKIE_SECRET;
  const authSalt = process.env.AUTH_SALT;

  if (isProd) {
    // 1. ADMIN_PASSWORD
    if (!adminPassword || adminPassword.trim().length === 0) {
      throw new Error('[SECURITY FATAL] ADMIN_PASSWORD environment variable is missing in production.');
    }
    if (adminPassword.trim().length < 12) {
      throw new Error('[SECURITY FATAL] ADMIN_PASSWORD must be at least 12 characters long in production.');
    }
    if (KNOWN_INSECURE_PASSWORDS.includes(adminPassword.trim().toLowerCase())) {
      throw new Error('[SECURITY FATAL] ADMIN_PASSWORD cannot use known default or insecure fallback credentials in production.');
    }

    // 2. ADMIN_ACTION_PASSWORD
    if (!actionPassword || actionPassword.trim().length === 0) {
      throw new Error('[SECURITY FATAL] ADMIN_ACTION_PASSWORD environment variable is missing in production.');
    }
    if (actionPassword.trim().length < 12) {
      throw new Error('[SECURITY FATAL] ADMIN_ACTION_PASSWORD must be at least 12 characters long in production.');
    }
    if (KNOWN_INSECURE_PASSWORDS.includes(actionPassword.trim().toLowerCase())) {
      throw new Error('[SECURITY FATAL] ADMIN_ACTION_PASSWORD cannot use known default or insecure fallback credentials in production.');
    }
    if (adminPassword.trim() === actionPassword.trim()) {
      throw new Error('[SECURITY FATAL] ADMIN_ACTION_PASSWORD must be distinct from ADMIN_PASSWORD for defense-in-depth.');
    }

    // 3. COOKIE_SECRET
    if (!cookieSecret || cookieSecret.trim().length === 0) {
      throw new Error('[SECURITY FATAL] COOKIE_SECRET environment variable is missing in production.');
    }
    if (cookieSecret.trim().length < 16) {
      throw new Error('[SECURITY FATAL] COOKIE_SECRET must be at least 16 characters long in production.');
    }
    if (KNOWN_INSECURE_SECRETS.includes(cookieSecret.trim().toLowerCase())) {
      throw new Error('[SECURITY FATAL] COOKIE_SECRET cannot use known default or insecure fallback secrets in production.');
    }

    // 4. AUTH_SALT
    if (!authSalt || authSalt.trim().length === 0) {
      throw new Error('[SECURITY FATAL] AUTH_SALT environment variable is missing in production.');
    }
    if (authSalt.trim().length < 16) {
      throw new Error('[SECURITY FATAL] AUTH_SALT must be at least 16 characters long in production.');
    }
    if (KNOWN_INSECURE_SECRETS.includes(authSalt.trim().toLowerCase())) {
      throw new Error('[SECURITY FATAL] AUTH_SALT cannot use known default or insecure fallback secrets in production.');
    }
  } else {
    if (!adminPassword) {
      console.warn('[SECURITY NOTICE] ADMIN_PASSWORD is not set. Admin login is disabled until credentials are provided.');
    }
    if (!actionPassword) {
      console.warn('[SECURITY NOTICE] ADMIN_ACTION_PASSWORD is not set. Critical actions are disabled until credentials are provided.');
    }
  }
}

/**
 * Returns the configured administrator username (defaults to 'admin').
 */
export function getAdminUsername(): string {
  return (process.env.ADMIN_USERNAME || 'admin').trim();
}

/**
 * Verifies a candidate password against the current administrator credentials in environment.
 * If ADMIN_PASSWORD is not set, rejects all attempts without using any fallback credential.
 */
export function verifyAdminPassword(password: string): boolean {
  const currentPassword = process.env.ADMIN_PASSWORD;
  if (!currentPassword || typeof password !== 'string' || password.length === 0) {
    return false;
  }
  const currentHash = hashPassword(currentPassword);
  return verifyPassword(password.trim(), currentHash);
}

/**
 * Verifies a candidate password against the current action password credentials in environment.
 * If ADMIN_ACTION_PASSWORD is not set, rejects all attempts without using any fallback credential.
 */
export function verifyActionPassword(password: string): boolean {
  const currentActionPassword = process.env.ADMIN_ACTION_PASSWORD;
  if (!currentActionPassword || typeof password !== 'string' || password.length === 0) {
    return false;
  }
  const currentHash = hashPassword(currentActionPassword);
  return verifyPassword(password.trim(), currentHash);
}

export interface RateLimitRecord {
  attempts: number;
  firstAttemptTime: number;
  lockoutUntil: number;
  updatedAt?: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 min
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;   // 15 min

// Emergency local memory fallback in case Firestore connection drops
const memoryRateLimitFallback = new Map<string, RateLimitRecord>();

export interface AdminSession {
  id: string;
  username: string;
  csrfToken: string;
  createdAt: number;
  expiresAt: number;
  ipAddress: string;
  userAgent: string;
}

// Short-lived local cache (max 5 seconds) to avoid high Firestore latency on concurrent asset calls
interface CachedSessionItem {
  session: AdminSession;
  cachedAt: number;
}
const localSessionCache = new Map<string, CachedSessionItem>();

export interface SudoToken {
  token: string;
  username: string;
  expiresAt: number;
}

/**
 * Hashes a plaintext password using Node.js scrypt with a salt.
 */
export function hashPassword(password: string, salt?: string): string {
  const effectiveSalt = salt || getActiveAuthSalt();
  const derivedKey = crypto.scryptSync(password, effectiveSalt, 64);
  return derivedKey.toString('hex');
}

/**
 * Timing-safe comparison to verify password against stored hash.
 * Includes backward-compatibility check with LEGACY_SALT if salt was not explicitly passed,
 * guaranteeing existing administrators are never locked out.
 */
export function verifyPassword(password: string, storedHash: string, salt?: string): boolean {
  try {
    const effectiveSalt = salt || getActiveAuthSalt();
    const derivedKey = crypto.scryptSync(password, effectiveSalt, 64);
    const storedBuffer = Buffer.from(storedHash, 'hex');
    if (derivedKey.length === storedBuffer.length && crypto.timingSafeEqual(derivedKey, storedBuffer)) {
      return true;
    }

    // Backward-compatibility migration fallback:
    // If salt was not explicitly specified and check with active salt failed,
    // verify against the legacy salt so existing stored hashes or migrating admins are not locked out.
    if (!salt && effectiveSalt !== LEGACY_SALT) {
      const legacyKey = crypto.scryptSync(password, LEGACY_SALT, 64);
      if (legacyKey.length === storedBuffer.length && crypto.timingSafeEqual(legacyKey, storedBuffer)) {
        return true;
      }
    }

    return false;
  } catch (err) {
    return false;
  }
}

/**
 * Helper to safely merge distributed Firestore and local in-memory rate limit records.
 * Prevents bypasses across process restarts or concurrent request races.
 */
function mergeRateLimitRecords(a: RateLimitRecord | null, b: RateLimitRecord | null): RateLimitRecord | null {
  if (!a) return b;
  if (!b) return a;

  const now = Date.now();
  const lockoutUntil = Math.max(a.lockoutUntil || 0, b.lockoutUntil || 0);

  const aWithinWindow = now - (a.firstAttemptTime || 0) <= ATTEMPT_WINDOW_MS;
  const bWithinWindow = now - (b.firstAttemptTime || 0) <= ATTEMPT_WINDOW_MS;

  let attempts = 0;
  let firstAttemptTime = now;

  if (aWithinWindow && bWithinWindow) {
    attempts = Math.max(a.attempts || 0, b.attempts || 0);
    firstAttemptTime = Math.min(a.firstAttemptTime || now, b.firstAttemptTime || now);
  } else if (aWithinWindow) {
    attempts = a.attempts;
    firstAttemptTime = a.firstAttemptTime;
  } else if (bWithinWindow) {
    attempts = b.attempts;
    firstAttemptTime = b.firstAttemptTime;
  } else {
    attempts = Math.max(a.attempts || 0, b.attempts || 0);
    firstAttemptTime = Math.min(a.firstAttemptTime || now, b.firstAttemptTime || now);
  }

  return {
    attempts,
    firstAttemptTime,
    lockoutUntil,
    updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0, now)
  };
}

/**
 * Checks rate limiting for an IP across Cloud Run instances via Firestore and resilient in-memory fallback.
 * Does not rely on a single server instance's memory.
 */
export async function checkRateLimit(key: string): Promise<{ isLocked: boolean; remainingSeconds: number; attemptsLeft: number }> {
  const now = Date.now();
  const safeKey = crypto.createHash('sha256').update(key.trim().toLowerCase()).digest('hex').substring(0, 32);

  let memRecord = memoryRateLimitFallback.get(safeKey) || null;
  let firestoreRecord: RateLimitRecord | null = null;
  const db = getDb();

  if (db) {
    try {
      const docRef = doc(db, 'rate_limits', safeKey);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        firestoreRecord = snap.data() as RateLimitRecord;
      }
    } catch (err) {
      // Fall back to memory fallback if Firestore fails
    }
  }

  const record: RateLimitRecord | null = mergeRateLimitRecords(firestoreRecord, memRecord);

  if (!record) {
    return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_FAILED_ATTEMPTS };
  }

  // Active lockout check
  if (record.lockoutUntil > now) {
    const remainingSeconds = Math.ceil((record.lockoutUntil - now) / 1000);
    return { isLocked: true, remainingSeconds, attemptsLeft: 0 };
  }

  // Rolling window expiration check
  if (now - record.firstAttemptTime > ATTEMPT_WINDOW_MS) {
    memoryRateLimitFallback.delete(safeKey);
    if (db) {
      deleteDoc(doc(db, 'rate_limits', safeKey)).catch(() => {});
    }
    return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_FAILED_ATTEMPTS };
  }

  const attemptsLeft = Math.max(0, MAX_FAILED_ATTEMPTS - record.attempts);
  return { isLocked: false, remainingSeconds: 0, attemptsLeft };
}

/**
 * Records a failed login attempt for an IP synchronously across Cloud Run instances via Firestore.
 */
export async function recordFailedAttempt(key: string): Promise<{ isLocked: boolean; remainingSeconds: number; attemptsLeft: number }> {
  const now = Date.now();
  const safeKey = crypto.createHash('sha256').update(key.trim().toLowerCase()).digest('hex').substring(0, 32);
  const db = getDb();

  let memRecord = memoryRateLimitFallback.get(safeKey) || null;
  let firestoreRecord: RateLimitRecord | null = null;
  if (db) {
    try {
      const docRef = doc(db, 'rate_limits', safeKey);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        firestoreRecord = snap.data() as RateLimitRecord;
      }
    } catch {
      // Memory fallback remains active
    }
  }

  const existingRecord = mergeRateLimitRecords(firestoreRecord, memRecord);

  let attempts = 1;
  let firstAttemptTime = now;
  let lockoutUntil = 0;

  if (existingRecord) {
    if (now - existingRecord.firstAttemptTime > ATTEMPT_WINDOW_MS && existingRecord.lockoutUntil <= now) {
      attempts = 1;
      firstAttemptTime = now;
      lockoutUntil = 0;
    } else {
      attempts = (existingRecord.attempts || 0) + 1;
      firstAttemptTime = existingRecord.firstAttemptTime || now;
      if (existingRecord.lockoutUntil > now) {
        lockoutUntil = existingRecord.lockoutUntil;
      }
    }
  }

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    lockoutUntil = Math.max(lockoutUntil, now + LOCKOUT_DURATION_MS);
  }

  const updatedRecord: RateLimitRecord = {
    attempts,
    firstAttemptTime,
    lockoutUntil,
    updatedAt: now
  };

  memoryRateLimitFallback.set(safeKey, updatedRecord);

  if (db) {
    try {
      await setDoc(doc(db, 'rate_limits', safeKey), updatedRecord);
    } catch (err) {
      console.warn('Notice syncing distributed rate limit to Firestore:', err);
    }
  }

  if (lockoutUntil > now) {
    const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000);
    return { isLocked: true, remainingSeconds, attemptsLeft: 0 };
  }

  const attemptsLeft = Math.max(0, MAX_FAILED_ATTEMPTS - attempts);
  return { isLocked: false, remainingSeconds: 0, attemptsLeft };
}

/**
 * Resets failed attempts after successful login or authorized admin action.
 */
export async function resetFailedAttempts(key: string): Promise<void> {
  const safeKey = crypto.createHash('sha256').update(key.trim().toLowerCase()).digest('hex').substring(0, 32);
  memoryRateLimitFallback.delete(safeKey);

  const db = getDb();
  if (db) {
    try {
      await deleteDoc(doc(db, 'rate_limits', safeKey));
    } catch (err) {
      console.warn('Notice resetting rate limit in Firestore:', err);
    }
  }
}

/**
 * Creates a new secure admin session and persists it in distributed Firestore.
 */
export async function createSession(username: string, ipAddress: string, userAgent: string): Promise<AdminSession> {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const csrfToken = crypto.randomBytes(16).toString('hex');
  const now = Date.now();
  const expiresAt = now + (8 * 60 * 60 * 1000); // 8 Hours

  const session: AdminSession = {
    id: sessionId,
    username,
    csrfToken,
    createdAt: now,
    expiresAt,
    ipAddress,
    userAgent
  };

  localSessionCache.set(sessionId, { session, cachedAt: now });

  const db = getDb();
  if (db) {
    try {
      await setDoc(doc(db, 'admin_sessions', sessionId), session);
    } catch (err) {
      console.error('Failed to write admin session to distributed Firestore:', err);
    }
  }

  return session;
}

/**
 * Retrieves and validates an existing session token across Cloud Run instances.
 * Authoritative storage is Firestore; local cache is only used for brief burst throttling (< 5s).
 */
export async function getSession(sessionId: string): Promise<AdminSession | null> {
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length !== 64) {
    return null;
  }

  const now = Date.now();
  const cached = localSessionCache.get(sessionId);

  // If cached within the last 5 seconds, use it
  if (cached && now - cached.cachedAt < 5000) {
    if (now > cached.session.expiresAt) {
      await destroySession(sessionId);
      return null;
    }
    return cached.session;
  }

  const db = getDb();
  let session: AdminSession | null = null;

  if (db) {
    try {
      const snap = await getDoc(doc(db, 'admin_sessions', sessionId));
      if (snap.exists()) {
        session = snap.data() as AdminSession;
        localSessionCache.set(sessionId, { session, cachedAt: now });
      } else {
        localSessionCache.delete(sessionId);
        return null;
      }
    } catch (err) {
      if (cached) session = cached.session;
    }
  } else if (cached) {
    session = cached.session;
  }

  if (!session) return null;

  if (now > session.expiresAt) {
    await destroySession(sessionId);
    return null;
  }

  return session;
}

/**
 * Destroys an active session in Firestore and local caches across instances.
 */
export async function destroySession(sessionId: string): Promise<boolean> {
  localSessionCache.delete(sessionId);

  const db = getDb();
  if (db) {
    try {
      await deleteDoc(doc(db, 'admin_sessions', sessionId));
    } catch (err) {
      console.warn('Notice deleting admin session from Firestore:', err);
    }
  }

  return true;
}

/**
 * Generates a short-lived Sudo Token for high-risk operations (e.g. deletion, database restore).
 * Persisted in Firestore so it works seamlessly across multiple Cloud Run instances.
 */
export async function createSudoToken(username: string): Promise<string> {
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + (5 * 60 * 1000); // 5 Minutes
  const sudoToken: SudoToken = { token, username, expiresAt };

  const db = getDb();
  if (db) {
    try {
      await setDoc(doc(db, 'sudo_tokens', token), sudoToken);
    } catch (err) {
      console.error('Failed to write sudo token to distributed Firestore:', err);
    }
  }

  return token;
}

/**
 * Verifies and atomically consumes a short-lived Sudo Token in Firestore.
 * Single-use: once verified, the token is destroyed immediately across all instances.
 */
export async function verifyAndConsumeSudoToken(token: string): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;

  const db = getDb();
  if (!db) return false;

  try {
    const docRef = doc(db, 'sudo_tokens', token);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return false;
    }

    const item = snap.data() as SudoToken;

    // Single-use: delete immediately across instances
    await deleteDoc(docRef);

    return Date.now() <= item.expiresAt;
  } catch (err) {
    console.error('Failed to verify and consume sudo token in Firestore:', err);
    return false;
  }
}

/**
 * Helper to parse cookies from HTTP request header string.
 */
export function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach(pair => {
    const parts = pair.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      cookies[key] = decodeURIComponent(val);
    }
  });

  return cookies;
}
