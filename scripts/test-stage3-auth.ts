import {
  validateEnvironmentSecrets,
  KNOWN_INSECURE_PASSWORDS,
  KNOWN_INSECURE_SECRETS,
  hashPassword,
  verifyPassword,
  createSession,
  getSession,
  destroySession,
  createSudoToken,
  verifyAndConsumeSudoToken,
  checkRateLimit,
  recordFailedAttempt,
  resetFailedAttempts
} from '../src/server/auth';
import { getDb } from '../src/server/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

interface TestResult {
  name: string;
  passed: boolean;
  category: string;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, category: string, details: string) {
  results.push({
    name,
    passed: Boolean(condition),
    category,
    details
  });
  const symbol = condition ? '✅' : '❌';
  console.log(`${symbol} [${category}] ${name}: ${details}`);
}

async function runStage3TestSuite() {
  console.log('====================================================');
  console.log('🛡️  MONOVOICE APPS — STAGE 3 AUTHORIZATION AUDIT SUITE');
  console.log('====================================================\n');

  const INITIAL_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'MonoVoice2026!AdminKey';
  const INITIAL_ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
  const INITIAL_ACTION_PASSWORD = process.env.ADMIN_ACTION_PASSWORD || 'MonoVoice2026!CreateUpdateKey';

  // --- PART 1: Production Secrets Validation ---
  console.log('--- PART 1: PRODUCTION SECRETS AND SAFE STARTUP ---');
  const originalEnv = { ...process.env };

  try {
    process.env.COOKIE_SECRET = 'ValidSecureCookieSecret2026!LongRandomString';
    process.env.AUTH_SALT = 'ValidSecureAuthSalt2026!LongRandomString';

    // 1.1: Missing ADMIN_PASSWORD in production
    process.env.NODE_ENV = 'production';
    delete process.env.ADMIN_PASSWORD;
    process.env.ADMIN_ACTION_PASSWORD = 'ValidSecureActionPassword2026!';
    let threw = false;
    let errMessage = '';
    try {
      validateEnvironmentSecrets();
    } catch (e: any) {
      threw = true;
      errMessage = e.message;
    }
    assert(
      threw && errMessage.includes('ADMIN_PASSWORD'),
      'Production fails when ADMIN_PASSWORD is missing',
      'Secrets',
      `Error thrown safely without leaking secrets: "${errMessage}"`
    );

    // 1.2: Default known fallback ADMIN_PASSWORD in production
    process.env.ADMIN_PASSWORD = 'MonoVoice2026!AdminKey';
    threw = false;
    errMessage = '';
    try {
      validateEnvironmentSecrets();
    } catch (e: any) {
      threw = true;
      errMessage = e.message;
    }
    assert(
      threw && errMessage.includes('known default or insecure fallback'),
      'Production rejects known default ADMIN_PASSWORD fallback',
      'Secrets',
      `Blocked known default password: "${errMessage}"`
    );

    // 1.3: Default known fallback ADMIN_ACTION_PASSWORD in production
    process.env.ADMIN_PASSWORD = 'CustomUniqueAdminPassword2026!';
    process.env.ADMIN_ACTION_PASSWORD = 'MonoVoice2026!CreateUpdateKey';
    threw = false;
    errMessage = '';
    try {
      validateEnvironmentSecrets();
    } catch (e: any) {
      threw = true;
      errMessage = e.message;
    }
    assert(
      threw && errMessage.includes('ADMIN_ACTION_PASSWORD cannot use known default'),
      'Production rejects known default ADMIN_ACTION_PASSWORD fallback',
      'Secrets',
      `Blocked known default action password: "${errMessage}"`
    );

    // 1.4: Identical admin and action passwords rejected
    process.env.ADMIN_PASSWORD = 'IdenticalPassword2026!Key';
    process.env.ADMIN_ACTION_PASSWORD = 'IdenticalPassword2026!Key';
    threw = false;
    errMessage = '';
    try {
      validateEnvironmentSecrets();
    } catch (e: any) {
      threw = true;
      errMessage = e.message;
    }
    assert(
      threw && errMessage.includes('must be distinct from ADMIN_PASSWORD'),
      'Production rejects identical admin and action passwords (defense-in-depth)',
      'Secrets',
      `Enforces password separation: "${errMessage}"`
    );

    // 1.5: Missing / Default COOKIE_SECRET rejected
    process.env.ADMIN_PASSWORD = 'CustomUniqueAdminPassword2026!';
    process.env.ADMIN_ACTION_PASSWORD = 'DifferentUniqueActionPassword2026!ABC';
    delete process.env.COOKIE_SECRET;
    threw = false;
    errMessage = '';
    try {
      validateEnvironmentSecrets();
    } catch (e: any) {
      threw = true;
      errMessage = e.message;
    }
    assert(
      threw && errMessage.includes('COOKIE_SECRET'),
      'Production fails when COOKIE_SECRET is missing or insecure',
      'Secrets',
      `Blocked missing/insecure COOKIE_SECRET: "${errMessage}"`
    );

    // 1.6: Missing / Default AUTH_SALT rejected
    process.env.COOKIE_SECRET = 'ValidSecureCookieSecret2026!LongRandomString';
    delete process.env.AUTH_SALT;
    threw = false;
    errMessage = '';
    try {
      validateEnvironmentSecrets();
    } catch (e: any) {
      threw = true;
      errMessage = e.message;
    }
    assert(
      threw && errMessage.includes('AUTH_SALT'),
      'Production fails when AUTH_SALT is missing or insecure',
      'Secrets',
      `Blocked missing/insecure AUTH_SALT: "${errMessage}"`
    );

    // 1.7: Valid production secrets accepted
    process.env.ADMIN_PASSWORD = 'StrongUniqueAdminPassword2026!XYZ';
    process.env.ADMIN_ACTION_PASSWORD = 'DifferentUniqueActionPassword2026!ABC';
    process.env.COOKIE_SECRET = 'ValidSecureCookieSecret2026!LongRandomString';
    process.env.AUTH_SALT = 'ValidSecureAuthSalt2026!LongRandomString';
    threw = false;
    try {
      validateEnvironmentSecrets();
    } catch (e: any) {
      threw = true;
    }
    assert(
      !threw,
      'Valid production secrets pass validation successfully',
      'Secrets',
      'Server boots cleanly with robust unique secrets'
    );
  } finally {
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    process.env.ADMIN_PASSWORD = INITIAL_ADMIN_PASSWORD;
    process.env.ADMIN_ACTION_PASSWORD = INITIAL_ACTION_PASSWORD;
    process.env.COOKIE_SECRET = originalEnv.COOKIE_SECRET;
    process.env.AUTH_SALT = originalEnv.AUTH_SALT;
  }

  // --- PART 2: Cryptographic Password Verification ---
  console.log('\n--- PART 2: SCRYPT TIMING-SAFE VERIFICATION ---');
  const testPw = 'TestAdminSecretKey2026!';
  const pwHash = hashPassword(testPw);
  const verifyCorrect = verifyPassword(testPw, pwHash);
  const verifyWrong = verifyPassword('WrongPassword123', pwHash);
  assert(
    verifyCorrect && !verifyWrong,
    'Scrypt hashing and timingSafeEqual verification',
    'Crypto',
    'Correct password accepted, incorrect password rejected'
  );

  // --- PART 3: Multi-Instance Distributed Firestore Rate Limiting ---
  console.log('\n--- PART 3: MULTI-INSTANCE DISTRIBUTED RATE LIMITING ---');
  const testIp = `test_ip_${Date.now()}_audit`;
  await resetFailedAttempts(testIp);

  const initialCheck = await checkRateLimit(testIp);
  assert(
    !initialCheck.isLocked && initialCheck.attemptsLeft === 5,
    'Initial rate limit state is clear (5 attempts left)',
    'RateLimiter',
    `Initial attemptsLeft: ${initialCheck.attemptsLeft}`
  );

  // Simulate 5 failed attempts across instances
  for (let i = 1; i <= 5; i++) {
    await recordFailedAttempt(testIp);
  }

  const lockedCheck = await checkRateLimit(testIp);
  assert(
    lockedCheck.isLocked && lockedCheck.remainingSeconds > 0 && lockedCheck.attemptsLeft === 0,
    'Rate limit triggers lockout after 5 failed attempts across instances',
    'RateLimiter',
    `Locked: ${lockedCheck.isLocked}, Lockout seconds: ${lockedCheck.remainingSeconds}`
  );

  // Reset rate limit
  await resetFailedAttempts(testIp);
  const resetCheck = await checkRateLimit(testIp);
  assert(
    !resetCheck.isLocked && resetCheck.attemptsLeft === 5,
    'Authorized rate limit reset clears lock status in Firestore',
    'RateLimiter',
    'Rate limit state successfully cleared in distributed database'
  );

  // --- PART 4: Multi-Instance Distributed Admin Sessions ---
  console.log('\n--- PART 4: MULTI-INSTANCE DISTRIBUTED SESSIONS ---');
  const session = await createSession('admin', '192.168.1.1', 'AuditRunner/1.0');
  assert(
    Boolean(session.id && session.csrfToken && session.id.length === 64),
    'Admin session created with 256-bit crypto session ID and CSRF token',
    'Sessions',
    `Session ID: ${session.id.substring(0, 16)}..., CSRF: ${session.csrfToken.substring(0, 8)}...`
  );

  // Check Firestore directly to verify multi-instance persistence
  const db = getDb();
  let sessionFoundInFirestore = false;
  if (db) {
    const snap = await getDoc(doc(db, 'admin_sessions', session.id));
    sessionFoundInFirestore = snap.exists();
  }
  assert(
    sessionFoundInFirestore,
    'Session persisted directly in Cloud Firestore (accessible by any Cloud Run instance)',
    'Sessions',
    'Instance-independent session verified in Firestore document'
  );

  // Retrieve session
  const retrieved = await getSession(session.id);
  assert(
    retrieved !== null && retrieved.username === 'admin',
    'Session retrieved and validated successfully',
    'Sessions',
    `User: ${retrieved?.username}, Valid until: ${new Date(retrieved?.expiresAt || 0).toISOString()}`
  );

  // Destroy session
  await destroySession(session.id);
  const afterDestroy = await getSession(session.id);
  assert(
    afterDestroy === null,
    'Destroyed session is purged across all instances',
    'Sessions',
    'Logged-out session immediately rejected on subsequent checks'
  );

  // --- PART 5: Multi-Instance Distributed Sudo Tokens ---
  console.log('\n--- PART 5: MULTI-INSTANCE SINGLE-USE SUDO TOKENS ---');
  const sudoToken = await createSudoToken('admin');
  assert(
    Boolean(sudoToken && sudoToken.length === 48),
    'Sudo token created for high-risk operations',
    'SudoAuth',
    `Sudo token: ${sudoToken.substring(0, 12)}...`
  );

  // First consumption should succeed
  const firstConsume = await verifyAndConsumeSudoToken(sudoToken);
  assert(
    firstConsume === true,
    'First consumption of Sudo token succeeds',
    'SudoAuth',
    'Token verified and atomically deleted from Firestore'
  );

  // Second consumption (replay attack simulation) must fail
  const secondConsume = await verifyAndConsumeSudoToken(sudoToken);
  assert(
    secondConsume === false,
    'Second consumption fails (Replay attack blocked, strictly single-use)',
    'SudoAuth',
    'Atomically consumed token cannot be reused'
  );

  // --- PART 6: Live HTTP Endpoint Authorization Verification ---
  console.log('\n--- PART 6: LIVE HTTP ADMINISTRATIVE ENDPOINTS AUDIT ---');
  const BASE_URL = 'http://localhost:3000';

  // Test 6.1: Read admin data without auth
  const resProjects = await fetch(`${BASE_URL}/api/admin/projects`);
  assert(
    resProjects.status === 401,
    'GET /api/admin/projects requires authentication',
    'Endpoints',
    `Status: ${resProjects.status} (Expected: 401)`
  );

  const resFiles = await fetch(`${BASE_URL}/api/admin/files`);
  assert(
    resFiles.status === 401,
    'GET /api/admin/files requires authentication',
    'Endpoints',
    `Status: ${resFiles.status} (Expected: 401)`
  );

  const resAudit = await fetch(`${BASE_URL}/api/admin/audit-logs`);
  assert(
    resAudit.status === 401,
    'GET /api/admin/audit-logs requires authentication',
    'Endpoints',
    `Status: ${resAudit.status} (Expected: 401)`
  );

  const resBackups = await fetch(`${BASE_URL}/api/admin/backups`);
  assert(
    resBackups.status === 401,
    'GET /api/admin/backups requires authentication',
    'Endpoints',
    `Status: ${resBackups.status} (Expected: 401)`
  );

  // Test 6.2: Write admin data without auth
  const resPostProject = await fetch(`${BASE_URL}/api/admin/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Unauthorized App' })
  });
  assert(
    resPostProject.status === 401,
    'POST /api/admin/projects requires authentication',
    'Endpoints',
    `Status: ${resPostProject.status} (Expected: 401)`
  );

  const resDeleteProject = await fetch(`${BASE_URL}/api/admin/projects/any-id`, {
    method: 'DELETE'
  });
  assert(
    resDeleteProject.status === 401,
    'DELETE /api/admin/projects/:id requires authentication',
    'Endpoints',
    `Status: ${resDeleteProject.status} (Expected: 401)`
  );

  const resResetLimit = await fetch(`${BASE_URL}/api/admin/reset-rate-limit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip: '1.2.3.4' })
  });
  assert(
    resResetLimit.status === 401,
    'POST /api/admin/reset-rate-limit requires authentication (bypass blocked)',
    'Endpoints',
    `Status: ${resResetLimit.status} (Expected: 401)`
  );

  // Test 6.3: Valid admin login creates session and returns CSRF token
  const testAdminPassword = INITIAL_ADMIN_PASSWORD;
  const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: INITIAL_ADMIN_USERNAME, password: testAdminPassword })
  });
  const cookieHeader = loginRes.headers.get('set-cookie') || '';
  const loginData = await loginRes.json();
  const sessionCookie = cookieHeader.split(';')[0];

  assert(
    loginRes.status === 200 && Boolean(loginData.csrfToken) && cookieHeader.includes('HttpOnly'),
    'POST /api/admin/login succeeds with HttpOnly cookie and CSRF token',
    'Endpoints',
    `Status: ${loginRes.status}, HttpOnly: ${cookieHeader.includes('HttpOnly')}, CSRF issued`
  );

  // Test 6.4: Authenticated user without CSRF token on POST /projects
  const resNoCsrf = await fetch(`${BASE_URL}/api/admin/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie
    },
    body: JSON.stringify({ name: 'CSRF Exploit Attempt' })
  });
  assert(
    resNoCsrf.status === 403,
    'POST /api/admin/projects blocks requests without CSRF token (403 Forbidden)',
    'Endpoints',
    `Status: ${resNoCsrf.status} (Expected: 403)`
  );

  // Test 6.5: Authenticated user with CSRF but invalid Action Password
  const resInvalidActionPw = await fetch(`${BASE_URL}/api/admin/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
      'x-csrf-token': loginData.csrfToken
    },
    body: JSON.stringify({
      name: 'Action Password Test',
      actionPassword: 'WrongActionPassword123!'
    })
  });
  assert(
    resInvalidActionPw.status === 403,
    'POST /api/admin/projects blocks requests with invalid Action Password (403 Forbidden)',
    'Endpoints',
    `Status: ${resInvalidActionPw.status} (Expected: 403)`
  );

  // Test 6.6: Public catalog endpoints remain accessible and functional
  const resPublic = await fetch(`${BASE_URL}/api/projects`);
  assert(
    resPublic.status === 200,
    'GET /api/projects remains accessible to public visitors',
    'Endpoints',
    `Status: ${resPublic.status} (Expected: 200)`
  );

  // Cleanup session
  await fetch(`${BASE_URL}/api/admin/logout`, {
    method: 'POST',
    headers: { Cookie: sessionCookie }
  });

  // Summary
  console.log('\n====================================================');
  const allPassed = results.every(r => r.passed);
  const passedCount = results.filter(r => r.passed).length;
  console.log(`AUDIT RESULTS: ${passedCount}/${results.length} CHECKS PASSED`);
  console.log(allPassed ? '🎉 ALL STAGE 3 AUTHORIZATION CHECKS PASSED!' : '⚠️ SOME CHECKS FAILED');
  console.log('====================================================');

  process.exit(allPassed ? 0 : 1);
}

runStage3TestSuite().catch(err => {
  console.error('Fatal audit execution error:', err);
  process.exit(1);
});
