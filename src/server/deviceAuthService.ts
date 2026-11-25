import crypto from 'crypto';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  updateDoc,
  runTransaction,
  Firestore
} from 'firebase/firestore';
import { getDb } from './firebase';
import {
  canonicalizeJson,
  hashCanonicalPayload,
  buildCanonicalApprovalMessage,
  buildDeviceRequestMessage
} from './jcsCanonicalizer';
import { verifyAndroidKeyAttestation } from './keyAttestation';

export interface DeviceRecord {
  deviceId: string;
  deviceName: string;
  publicKeyPem: string;
  algorithm: 'ECDSA_P256';
  hardwareSecurityLevel: 'STRONGBOX' | 'TEE' | 'SOFTWARE' | 'SIMULATOR';
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  registeredAt: string;
  lastUsedAt: string;
  lastSeenAt?: string;
  appVersion?: string;
  registeredByIp: string;
}

export interface ApprovalChallenge {
  requestId: string;
  actionType: 'DELETE_PROJECT' | 'RESTORE_BACKUP' | 'DELETE_BACKUP' | 'DEPLOY_RELEASE' | 'CHANGE_PASSWORD' | 'SYSTEM_RESET' | 'TEST_OPERATION';
  targetObjectId: string;
  targetObjectLabel: string;
  actionPayload: Record<string, any>;
  canonicalPayloadHash: string; // SHA-256 of RFC 8785 canonical JSON
  nonce: string; // 64-char hex
  status: 'PENDING' | 'APPROVED' | 'EXECUTING' | 'EXECUTED' | 'REJECTED' | 'EXPIRED' | 'FAILED';
  createdAt: string;
  expiresAt: string; // ISO string (120 seconds TTL)
  approvedAt?: string;
  signature?: string;
  signedByDeviceId?: string;
  clientIp: string;
  // Execution metadata & Crash recovery
  executionId?: string;
  executionStartedAt?: string;
  executionHeartbeatAt?: string;
  executionLog?: Array<{ stage: string; timestamp: string; details?: string }>;
  executionError?: string;
  executedAt?: string;
}

export interface PairingCode {
  codeId: string; // 6-digit numeric string
  attestationChallenge: string; // 64-char hex
  createdByIp: string;
  createdAt: string;
  expiresAt: string; // 5 min TTL
  attemptsLeft: number; // Max 5 attempts
  used: boolean;
}

export interface DeviceAuthChallenge {
  challengeId: string;
  deviceId: string;
  createdAt: string;
  expiresAt: string; // 30s TTL
  used: boolean;
}

export interface RecoveryCodeRecord {
  codeHash: string; // SHA-256 hex
  createdAt: string;
  used: boolean;
  usedAt?: string;
  usedByIp?: string;
}

export interface ConnectivityTestRecord {
  testId: string;
  appVersion: string;
  sentAt: string;
  receivedAt: string;
  clientIp: string;
  status: 'SUCCESS';
}

/**
 * Standardize Public Key PEM format
 */
export function normalizePublicKeyPem(rawKey: string): string {
  const clean = rawKey.trim();
  if (clean.includes('-----BEGIN PUBLIC KEY-----')) {
    return clean;
  }
  const formatted = clean.replace(/(.{64})/g, '$1\n');
  return `-----BEGIN PUBLIC KEY-----\n${formatted}\n-----END PUBLIC KEY-----`;
}

/**
 * Convert raw 64-byte IEEE P1363 signature (R + S) to ASN.1 DER format
 */
export function p1363ToDer(signatureBuffer: Buffer): Buffer {
  if (signatureBuffer.length !== 64) {
    return signatureBuffer;
  }
  const r = signatureBuffer.subarray(0, 32);
  const s = signatureBuffer.subarray(32, 64);

  function formatInteger(bytes: Buffer): Buffer {
    let start = 0;
    while (start < bytes.length && bytes[start] === 0) start++;
    const trimmed = bytes.subarray(start);
    if (trimmed.length === 0) return Buffer.from([0x02, 0x01, 0x00]);
    const needsZeroPrefix = (trimmed[0] & 0x80) !== 0;
    const len = trimmed.length + (needsZeroPrefix ? 1 : 0);
    const result = Buffer.alloc(2 + len);
    result[0] = 0x02; // INTEGER tag
    result[1] = len;
    if (needsZeroPrefix) {
      result[2] = 0x00;
      trimmed.copy(result, 3);
    } else {
      trimmed.copy(result, 2);
    }
    return result;
  }

  const rDer = formatInteger(r);
  const sDer = formatInteger(s);
  const seqLen = rDer.length + sDer.length;
  const der = Buffer.alloc(2 + seqLen);
  der[0] = 0x30; // SEQUENCE tag
  der[1] = seqLen;
  rDer.copy(der, 2);
  sDer.copy(der, 2 + rDer.length);
  return der;
}

/**
 * Verify ECDSA signature using PEM public key with fallback between DER and IEEE P1363
 */
export function verifyEcdsaSignature(message: string, publicKeyPem: string, signatureBase64: string): boolean {
  const sigBuffer = Buffer.from(signatureBase64, 'base64');

  // 1. Try standard DER verification
  try {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(Buffer.from(message, 'utf8'));
    verifier.end();
    if (verifier.verify(publicKeyPem, sigBuffer)) {
      return true;
    }
  } catch (e) {
    // Continue to fallback
  }

  // 2. Try IEEE P1363 -> DER conversion
  try {
    const derBuffer = p1363ToDer(sigBuffer);
    const verifier = crypto.createVerify('SHA256');
    verifier.update(Buffer.from(message, 'utf8'));
    verifier.end();
    if (verifier.verify(publicKeyPem, derBuffer)) {
      return true;
    }
  } catch (e) {
    // Continue
  }

  // 3. Try with explicit dsaEncoding 'ieee-p1363'
  try {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(Buffer.from(message, 'utf8'));
    verifier.end();
    if (verifier.verify({ key: publicKeyPem, dsaEncoding: 'ieee-p1363' }, sigBuffer)) {
      return true;
    }
  } catch (e) {
    // Return false
  }

  return false;
}

function getNonNullDb(): Firestore {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore database is not initialized');
  }
  return db;
}

export class DeviceAuthService {
  /**
   * Check if any active device is currently enrolled in the system
   */
  static async hasActiveDevice(): Promise<boolean> {
    try {
      const db = getNonNullDb();
      const q = query(
        collection(db, 'admin_devices'),
        where('status', '==', 'ACTIVE')
      );
      const snap = await getDocs(q);
      return !snap.empty;
    } catch (err) {
      return false;
    }
  }

  /**
   * Generate a 6-digit one-time pairing code with rate limits
   */
  static async createPairingCode(clientIp: string): Promise<{ pairingCode: PairingCode; qrUri: string }> {
    const db = getNonNullDb();

    // Check rate limit: maximum 3 codes per 15 minutes globally
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const codesQuery = query(
      collection(db, 'admin_pairing_codes'),
      where('createdAt', '>=', fifteenMinsAgo)
    );
    const recentCodes = await getDocs(codesQuery);
    if (recentCodes.size >= 3) {
      throw new Error('Перевищено ліміт створення кодів прив’язки (максимум 3 коди за 15 хвилин)');
    }

    // Clean up expired un-used codes
    for (const d of recentCodes.docs) {
      const data = d.data() as PairingCode;
      if (new Date(data.expiresAt).getTime() < Date.now() || data.used) {
        await deleteDoc(d.ref).catch(() => {});
      }
    }

    const codeId = Math.floor(100000 + Math.random() * 900000).toString();
    const attestationChallenge = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 min TTL

    const pairingCode: PairingCode = {
      codeId,
      attestationChallenge,
      createdByIp: clientIp,
      createdAt: now.toISOString(),
      expiresAt,
      attemptsLeft: 5,
      used: false
    };

    await setDoc(doc(db, 'admin_pairing_codes', codeId), pairingCode);

    const baseUrl = process.env.APP_URL || process.env.PUBLIC_URL || 'https://ais-pre-hcrs5wd7lpf4dflwp6mw2k-53018745059.europe-west2.run.app';
    const qrUri = `monovoice://pair?endpoint=${encodeURIComponent(baseUrl)}&code=${codeId}&challenge=${attestationChallenge}&exp=${encodeURIComponent(expiresAt)}`;

    return { pairingCode, qrUri };
  }

  /**
   * Register a new device using pairing code and verify Android Key Attestation
   */
  static async claimPairingCodeAndRegisterDevice(params: {
    pairingCode: string;
    deviceName: string;
    publicKeyPem: string;
    certificateChain?: string[];
    clientIp: string;
    allowDevSimulator?: boolean;
  }): Promise<DeviceRecord> {
    const { pairingCode, deviceName, publicKeyPem, certificateChain, clientIp, allowDevSimulator } = params;
    const db = getNonNullDb();
    const cleanCode = pairingCode?.trim();
    const genericErrorMessage = 'Недійсний код прив’язки або строк дії вичерпано';

    if (!cleanCode || cleanCode.length !== 6) {
      throw new Error(genericErrorMessage);
    }

    const codeRef = doc(db, 'admin_pairing_codes', cleanCode);
    const normalizedKey = normalizePublicKeyPem(publicKeyPem);

    // Verify key format
    try {
      crypto.createPublicKey(normalizedKey);
    } catch (e) {
      throw new Error('Наданий публічний ключ має недійсний формат EC P-256');
    }

    // Atomic transaction for claim validation and device creation
    return await runTransaction(db, async (transaction) => {
      const codeSnap = await transaction.get(codeRef);
      if (!codeSnap.exists()) {
        throw new Error(genericErrorMessage);
      }

      const codeData = codeSnap.data() as PairingCode;

      // Check if code was already used or expired or ran out of attempts
      if (codeData.used || new Date(codeData.expiresAt).getTime() < Date.now() || codeData.attemptsLeft <= 0) {
        throw new Error(genericErrorMessage);
      }

      // Verify Android Key Attestation if certificate chain provided
      let hardwareSecurityLevel: DeviceRecord['hardwareSecurityLevel'] = 'TEE';
      if (certificateChain && certificateChain.length > 0) {
        const attestationResult = await verifyAndroidKeyAttestation({
          certificateChainPem: certificateChain,
          expectedChallenge: codeData.attestationChallenge,
          expectedPublicKeyPem: normalizedKey,
          allowDevSimulator: allowDevSimulator ?? (process.env.NODE_ENV !== 'production')
        });

        if (!attestationResult.isValid) {
          // Decrement attempts counter on attestation failure
          const remaining = codeData.attemptsLeft - 1;
          transaction.update(codeRef, {
            attemptsLeft: remaining,
            used: remaining <= 0
          });
          throw new Error(attestationResult.errorMessage || genericErrorMessage);
        }

        hardwareSecurityLevel = attestationResult.securityLevel;
      } else if (process.env.NODE_ENV === 'production') {
        // In production, attestation certificate chain is mandatory
        const remaining = codeData.attemptsLeft - 1;
        transaction.update(codeRef, {
          attemptsLeft: remaining,
          used: remaining <= 0
        });
        throw new Error('У продуктивному середовищі вимагається підтвердження Android Key Attestation');
      }

      // Mark pairing code as used atomically
      transaction.update(codeRef, {
        used: true,
        attemptsLeft: 0
      });

      // Generate unique device ID
      const deviceId = 'dev_' + crypto.randomBytes(16).toString('hex');
      const now = new Date().toISOString();

      const deviceRecord: DeviceRecord = {
        deviceId,
        deviceName: deviceName || 'Android Authenticator',
        publicKeyPem: normalizedKey,
        algorithm: 'ECDSA_P256',
        hardwareSecurityLevel,
        status: 'ACTIVE',
        registeredAt: now,
        lastUsedAt: now,
        registeredByIp: clientIp
      };

      const deviceRef = doc(db, 'admin_devices', deviceId);
      transaction.set(deviceRef, deviceRecord);

      return deviceRecord;
    });
  }

  /**
   * Issue a single-use auth challenge for the phone to sign subsequent HTTP requests (30s TTL)
   */
  static async issueDeviceAuthChallenge(deviceId: string): Promise<{ authChallenge: string; expiresAt: string }> {
    const db = getNonNullDb();
    const deviceRef = doc(db, 'admin_devices', deviceId);
    const deviceSnap = await getDoc(deviceRef);

    if (!deviceSnap.exists()) {
      throw new Error('Пристрій не знайдено');
    }

    const device = deviceSnap.data() as DeviceRecord;
    if (device.status !== 'ACTIVE') {
      throw new Error('Пристрій не є активним');
    }

    const authChallenge = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = new Date(now + 5 * 60 * 1000).toISOString(); // 5 minutes TTL

    const challengeRecord: DeviceAuthChallenge = {
      challengeId: authChallenge,
      deviceId,
      createdAt: new Date(now).toISOString(),
      expiresAt,
      used: false
    };

    await setDoc(doc(db, 'admin_device_challenges', authChallenge), challengeRecord);
    return { authChallenge, expiresAt };
  }

  /**
   * Atomically verifies a signed HTTP request from the Android phone
   */
  static async verifyAndConsumeSignedDeviceRequest(params: {
    deviceId: string;
    method: string;
    path: string;
    body: any;
    authChallenge: string;
    expiresAt: string;
    signatureBase64: string;
  }): Promise<DeviceRecord> {
    const { deviceId, method, path, body, authChallenge, expiresAt, signatureBase64 } = params;
    const db = getNonNullDb();

    if (!deviceId || !authChallenge || !signatureBase64) {
      throw new Error('Відсутні обов’язкові параметри підписаного запиту пристрою');
    }

    const challengeDocRef = doc(db, 'admin_device_challenges', authChallenge);
    const deviceDocRef = doc(db, 'admin_devices', deviceId);

    return await runTransaction(db, async (transaction) => {
      const challengeSnap = await transaction.get(challengeDocRef);
      if (!challengeSnap.exists()) {
        throw new Error('Одноразовий виклик автентифікації пристрою не знайдено або вже використано');
      }

      const challengeData = challengeSnap.data() as DeviceAuthChallenge;
      if (challengeData.used || challengeData.deviceId !== deviceId) {
        throw new Error('Одноразовий виклик уже використано або він належить іншому пристрою');
      }

      if (new Date(challengeData.expiresAt).getTime() < Date.now()) {
        transaction.update(challengeDocRef, { used: true });
        throw new Error('Термін дії одноразового виклику автентифікації вичерпано (30s)');
      }

      const deviceSnap = await transaction.get(deviceDocRef);
      if (!deviceSnap.exists()) {
        throw new Error('Зареєстрований пристрій не знайдено');
      }

      const device = deviceSnap.data() as DeviceRecord;
      if (device.status !== 'ACTIVE') {
        throw new Error(`Пристрій заблоковано (статус: ${device.status})`);
      }

      // Mark challenge as used atomically to prevent replay attacks
      transaction.update(challengeDocRef, { used: true });

      // Compute body hash
      const rawBodyString = body ? (typeof body === 'string' ? body : canonicalizeJson(body)) : '';
      const bodyHash = crypto.createHash('sha256').update(Buffer.from(rawBodyString, 'utf8')).digest('hex');

      // Reconstruct exact canonical message
      const expectedMessage = buildDeviceRequestMessage({
        method,
        path,
        bodyHash,
        deviceId,
        authChallenge,
        expiresAt
      });

      // Verify signature
      const isValid = verifyEcdsaSignature(expectedMessage, device.publicKeyPem, signatureBase64);
      if (!isValid) {
        throw new Error('Криптографічний підпис запиту пристрою не пройшов перевірку');
      }

      // Update last active & seen timestamps
      const nowISO = new Date().toISOString();
      transaction.update(deviceDocRef, {
        lastUsedAt: nowISO,
        lastSeenAt: nowISO
      });

      return device;
    });
  }

  /**
   * Dedicated heartbeat / ping endpoint for Android App to signal online & confirmed active status
   */
  static async recordDeviceHeartbeat(params: {
    deviceId: string;
    authChallenge: string;
    expiresAt: string;
    signatureBase64: string;
    appVersion?: string;
  }): Promise<{ success: boolean; lastSeenAt: string; deviceId: string }> {
    const device = await this.verifyAndConsumeSignedDeviceRequest({
      deviceId: params.deviceId,
      method: 'POST',
      path: '/api/admin/device-auth/heartbeat',
      body: { appVersion: params.appVersion || '1.0.0' },
      authChallenge: params.authChallenge,
      expiresAt: params.expiresAt,
      signatureBase64: params.signatureBase64
    });

    const db = getNonNullDb();
    const nowISO = new Date().toISOString();
    await updateDoc(doc(db, 'admin_devices', device.deviceId), {
      lastSeenAt: nowISO,
      lastUsedAt: nowISO,
      ...(params.appVersion ? { appVersion: params.appVersion } : {})
    });

    return { success: true, lastSeenAt: nowISO, deviceId: device.deviceId };
  }

  /**
   * Create an approval challenge for a sensitive action with RFC 8785 canonical hash
   */
  static async createChallenge(
    actionType: ApprovalChallenge['actionType'],
    targetObjectId: string,
    targetObjectLabel: string,
    actionPayload: any,
    clientIp: string
  ): Promise<ApprovalChallenge> {
    const db = getNonNullDb();
    const requestId = 'req_' + crypto.randomBytes(16).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 120 * 1000).toISOString(); // 120s TTL

    // Deterministic RFC 8785 canonical payload hash
    const canonicalPayloadHash = hashCanonicalPayload(actionPayload || {});

    const challenge: ApprovalChallenge = {
      requestId,
      actionType,
      targetObjectId,
      targetObjectLabel,
      actionPayload: actionPayload || {},
      canonicalPayloadHash,
      nonce,
      status: 'PENDING',
      createdAt: now.toISOString(),
      expiresAt,
      clientIp
    };

    await setDoc(doc(db, 'admin_approval_requests', requestId), challenge);
    return challenge;
  }

  /**
   * Submit cryptographic signature and approve challenge
   */
  static async verifyAndApproveChallenge(
    requestId: string,
    deviceId: string,
    signatureBase64: string
  ): Promise<boolean> {
    const db = getNonNullDb();
    const challengeRef = doc(db, 'admin_approval_requests', requestId);
    const deviceRef = doc(db, 'admin_devices', deviceId);

    return await runTransaction(db, async (transaction) => {
      const challengeSnap = await transaction.get(challengeRef);
      if (!challengeSnap.exists()) {
        throw new Error('Запит на підтвердження не знайдено');
      }

      const challenge = challengeSnap.data() as ApprovalChallenge;
      if (challenge.status !== 'PENDING') {
        throw new Error(`Запит уже має статус: ${challenge.status}`);
      }

      if (new Date(challenge.expiresAt).getTime() < Date.now()) {
        transaction.update(challengeRef, { status: 'EXPIRED' });
        throw new Error('Строк дії підтвердження вичерпано (120s)');
      }

      const deviceSnap = await transaction.get(deviceRef);
      if (!deviceSnap.exists()) {
        throw new Error('Зареєстрований пристрій не знайдено');
      }

      const device = deviceSnap.data() as DeviceRecord;
      if (device.status !== 'ACTIVE') {
        throw new Error(`Пристрій не є активним (статус: ${device.status})`);
      }

      // Recalculate canonical hash from stored server payload - never trust client hash
      const verifiedPayloadHash = hashCanonicalPayload(challenge.actionPayload || {});

      // Build canonical approval string
      const messageToVerify = buildCanonicalApprovalMessage({
        requestId: challenge.requestId,
        deviceId,
        actionType: challenge.actionType,
        targetObjectId: challenge.targetObjectId,
        canonicalPayloadHash: verifiedPayloadHash,
        nonce: challenge.nonce,
        expiresAt: challenge.expiresAt
      });

      // Verify signature
      const isSignatureValid = verifyEcdsaSignature(messageToVerify, device.publicKeyPem, signatureBase64);
      if (!isSignatureValid) {
        throw new Error('Криптографічний підпис не відповідає зареєстрованому ключу пристрою');
      }

      const nowISO = new Date().toISOString();
      transaction.update(challengeRef, {
        status: 'APPROVED',
        approvedAt: nowISO,
        signature: signatureBase64,
        signedByDeviceId: deviceId
      });

      transaction.update(deviceRef, {
        lastUsedAt: nowISO
      });

      return true;
    });
  }

  /**
   * Reject a pending challenge
   */
  static async rejectChallenge(
    requestId: string,
    deviceId: string,
    signatureBase64?: string
  ): Promise<boolean> {
    const db = getNonNullDb();
    const challengeRef = doc(db, 'admin_approval_requests', requestId);
    const challengeSnap = await getDoc(challengeRef);

    if (!challengeSnap.exists()) {
      throw new Error('Запит не знайдено');
    }

    const challenge = challengeSnap.data() as ApprovalChallenge;
    if (challenge.status !== 'PENDING') {
      throw new Error(`Запит уже має статус: ${challenge.status}`);
    }

    await updateDoc(challengeRef, {
      status: 'REJECTED',
      signedByDeviceId: deviceId
    });

    return true;
  }

  /**
   * List pending challenges for the active registered device
   */
  static async listPendingChallenges(): Promise<ApprovalChallenge[]> {
    const db = getNonNullDb();
    const q = query(
      collection(db, 'admin_approval_requests'),
      where('status', '==', 'PENDING')
    );
    const snap = await getDocs(q);
    const now = Date.now();

    return snap.docs
      .map(d => d.data() as ApprovalChallenge)
      .filter(c => new Date(c.expiresAt).getTime() > now);
  }

  /**
   * Execute approved challenge idempotently with EXECUTING state machine and crash recovery
   */
  static async executeApprovedChallenge<T>(
    requestId: string,
    executorFn: (challenge: ApprovalChallenge) => Promise<T>,
    reconciliationFn?: (challenge: ApprovalChallenge) => Promise<{ alreadyExecuted: boolean; result?: T }>
  ): Promise<T> {
    const db = getNonNullDb();
    const challengeRef = doc(db, 'admin_approval_requests', requestId);
    const executionId = 'exec_' + crypto.randomBytes(12).toString('hex');
    const nowISO = new Date().toISOString();

    // 1. Enter EXECUTING state atomically
    const challenge = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(challengeRef);
      if (!snap.exists()) {
        throw new Error('Запит на виконання не знайдено');
      }

      const data = snap.data() as ApprovalChallenge;

      if (data.status === 'EXECUTED') {
        throw new Error('Цю операцію вже було успішно виконано');
      }

      if (data.status === 'EXECUTING') {
        // Check timeout (180s)
        const startedTime = new Date(data.executionStartedAt || 0).getTime();
        const isTimedOut = Date.now() - startedTime > 180 * 1000;

        if (!isTimedOut) {
          throw new Error('Операція вже виконується іншим процесом (HTTP 409 Conflict)');
        }

        // Recovery / reconciliation on timeout
        if (reconciliationFn) {
          const rec = await reconciliationFn(data);
          if (rec.alreadyExecuted) {
            transaction.update(challengeRef, {
              status: 'EXECUTED',
              executedAt: new Date().toISOString()
            });
            throw new Error('Операцію вже було фактично завершено попереднім процесом');
          }
        }
      }

      if (data.status !== 'APPROVED' && data.status !== 'EXECUTING') {
        throw new Error(`Неможливо виконати операцію зі статусом: ${data.status}`);
      }

      transaction.update(challengeRef, {
        status: 'EXECUTING',
        executionId,
        executionStartedAt: nowISO,
        executionHeartbeatAt: nowISO,
        executionLog: [{ stage: 'STARTED', timestamp: nowISO }]
      });

      return data;
    });

    // 2. Perform side effects
    try {
      const result = await executorFn(challenge);

      // 3. Mark EXECUTED
      await updateDoc(challengeRef, {
        status: 'EXECUTED',
        executedAt: new Date().toISOString()
      });

      return result;
    } catch (err: any) {
      await updateDoc(challengeRef, {
        status: 'FAILED',
        executionError: err.message || 'Помилка виконання операції'
      });
      throw err;
    }
  }

  /**
   * Generate 8 emergency one-time recovery codes
   */
  static async generateRecoveryCodes(): Promise<string[]> {
    const db = getNonNullDb();
    const codes: string[] = [];

    for (let i = 0; i < 8; i++) {
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part3 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const formatted = `${part1}-${part2}-${part3}`;
      codes.push(formatted);

      const codeHash = crypto.createHash('sha256').update(Buffer.from(formatted, 'utf8')).digest('hex');
      const record: RecoveryCodeRecord = {
        codeHash,
        createdAt: new Date().toISOString(),
        used: false
      };
      await setDoc(doc(db, 'admin_recovery_codes', codeHash), record);
    }

    return codes;
  }

  /**
   * Revoke lost device exclusively via single-use Recovery Code
   */
  static async revokeLostDeviceWithRecoveryCode(
    recoveryCode: string,
    deviceId: string,
    clientIp: string
  ): Promise<boolean> {
    const db = getNonNullDb();
    const cleanCode = recoveryCode?.trim().toUpperCase();
    if (!cleanCode) {
      throw new Error('Недійсний код відновлення');
    }

    const codeHash = crypto.createHash('sha256').update(Buffer.from(cleanCode, 'utf8')).digest('hex');
    const recoveryDocRef = doc(db, 'admin_recovery_codes', codeHash);
    const deviceDocRef = doc(db, 'admin_devices', deviceId);

    return await runTransaction(db, async (transaction) => {
      const recSnap = await transaction.get(recoveryDocRef);
      if (!recSnap.exists()) {
        throw new Error('Недійсний або використаний код відновлення');
      }

      const recData = recSnap.data() as RecoveryCodeRecord;
      if (recData.used) {
        throw new Error('Цей аварійний код відновлення вже було використано');
      }

      const devSnap = await transaction.get(deviceDocRef);
      if (!devSnap.exists()) {
        throw new Error('Пристрій не знайдено');
      }

      const now = new Date().toISOString();

      // Invalidate recovery code permanently
      transaction.update(recoveryDocRef, {
        used: true,
        usedAt: now,
        usedByIp: clientIp
      });

      // Revoke device permanently
      transaction.update(deviceDocRef, {
        status: 'REVOKED',
        lastUsedAt: now
      });

      return true;
    });
  }

  /**
   * List all registered devices
   */
  static async listDevices(): Promise<DeviceRecord[]> {
    const db = getNonNullDb();
    const q = query(collection(db, 'admin_devices'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as DeviceRecord);
  }

  /**
   * Record a server connectivity test signal (Stage 1 diagnostic endpoint)
   * CRITICAL: Does NOT touch admin_devices or cryptographic device state.
   */
  static async recordConnectivityTest(params: {
    testId: any;
    appVersion: any;
    sentAt: any;
    clientIp: string;
  }): Promise<ConnectivityTestRecord> {
    const { testId, appVersion, sentAt, clientIp } = params;

    // Rate limiting: Max 30 requests per minute per IP
    const nowMs = Date.now();
    const cleanIp = (clientIp || '127.0.0.1').trim();
    const timestamps = (connectivityRateLimitMap.get(cleanIp) || []).filter(ts => nowMs - ts < 60000);
    if (timestamps.length >= 30) {
      throw new Error('Перевищено ліміт частоти тестових сигналів (максимум 30 запитів на хвилину)');
    }
    timestamps.push(nowMs);
    connectivityRateLimitMap.set(cleanIp, timestamps);

    // Validation
    if (!testId || typeof testId !== 'string' || testId.trim().length === 0 || testId.length > 64) {
      throw new Error('Недійсний ідентифікатор тесту (testId має бути рядком 1..64 символів)');
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(testId.trim())) {
      throw new Error('Некоректні символи в testId');
    }

    if (!appVersion || typeof appVersion !== 'string' || appVersion.trim().length === 0 || appVersion.length > 32) {
      throw new Error('Недійсна версія застосунку (appVersion має бути рядком 1..32 символів)');
    }

    if (!sentAt || typeof sentAt !== 'string' || Number.isNaN(new Date(sentAt).getTime())) {
      throw new Error('Недійсний формат часу відправлення (sentAt має бути у форматі ISO 8601)');
    }

    const receivedAt = new Date(nowMs).toISOString();

    const record: ConnectivityTestRecord = {
      testId: testId.trim(),
      appVersion: appVersion.trim(),
      sentAt: new Date(sentAt).toISOString(),
      receivedAt,
      clientIp: cleanIp,
      status: 'SUCCESS'
    };

    // Save exclusively to admin_diagnostics/connectivity_test doc
    const db = getNonNullDb();
    const docRef = doc(db, 'admin_diagnostics', 'connectivity_test');

    try {
      await setDoc(docRef, record);
    } catch (err: any) {
      throw new Error(`Не вдалося зберегти результат тесту у базі даних (Firestore Write Failure): ${err.message || 'Error'}`);
    }

    return record;
  }

  /**
   * Get latest connectivity test result for Admin panel
   */
  static async getLatestConnectivityTest(): Promise<{ status: 'SUCCESS' | 'NO_TEST_RECEIVED'; lastResult: ConnectivityTestRecord | null }> {
    const db = getNonNullDb();
    const docRef = doc(db, 'admin_diagnostics', 'connectivity_test');
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return { status: 'NO_TEST_RECEIVED', lastResult: null };
    }

    return {
      status: 'SUCCESS',
      lastResult: snap.data() as ConnectivityTestRecord
    };
  }
}

// In-memory rate limiter for connectivity test
const connectivityRateLimitMap = new Map<string, number[]>();
