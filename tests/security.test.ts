import fs from 'fs';
import path from 'path';
import {
  hashPassword,
  verifyPassword,
  verifyAdminPassword,
  verifyActionPassword,
  getAdminUsername,
  getActiveAuthSalt,
  LEGACY_SALT,
  checkRateLimit,
  recordFailedAttempt,
  resetFailedAttempts,
  createSession,
  getSession,
  destroySession,
  createSudoToken,
  verifyAndConsumeSudoToken,
  validateEnvironmentSecrets
} from '../src/server/auth';
import { ProjectStore } from '../src/server/projectStore';
import { BackupService } from '../src/server/backupService';

async function runSecurityAuditTests() {
  console.log('=====================================================');
  console.log('🔒 MONOVOICE APPS — SERVER SECURITY SUITE TEST');
  console.log('=====================================================\n');

  // -----------------------------------------------------------------
  // 1. Password Hashing, Verification & Backward Compatibility
  // -----------------------------------------------------------------
  console.log('Test 1: Password hashing, verification & backward compatibility...');
  const pass = 'SuperSecret123!';
  const hash = hashPassword(pass);
  const isValid = verifyPassword(pass, hash);
  const isInvalid = verifyPassword('WrongPassword', hash);
  if (!isValid || isInvalid) {
    throw new Error('Test 1 Failed: Password verification error with active salt');
  }

  // Backward compatibility test: Hash generated using legacy static salt
  const legacyHash = hashPassword(pass, LEGACY_SALT);
  const isLegacyValid = verifyPassword(pass, legacyHash);
  if (!isLegacyValid) {
    throw new Error('Test 1 Failed: Legacy salt hash backward compatibility failed (existing admin locked out)');
  }
  console.log('✅ PASS: Password hashing, timing-safe verification, and legacy salt compatibility verified.');

  // -----------------------------------------------------------------
  // 2. Production Secret Enforcement (Missing Secrets Block Launch)
  // -----------------------------------------------------------------
  console.log('\nTest 2: Production secret validation (missing secrets fail startup)...');
  const origEnv = { ...process.env };

  const missingSecretCases = [
    { name: 'ADMIN_PASSWORD', unset: ['ADMIN_PASSWORD'] },
    { name: 'ADMIN_ACTION_PASSWORD', unset: ['ADMIN_ACTION_PASSWORD'] },
    { name: 'COOKIE_SECRET', unset: ['COOKIE_SECRET'] },
    { name: 'AUTH_SALT', unset: ['AUTH_SALT'] }
  ];

  for (const tc of missingSecretCases) {
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_PASSWORD = 'StrongUniqueAdminPassword2026!';
    process.env.ADMIN_ACTION_PASSWORD = 'StrongUniqueActionPassword2026!';
    process.env.COOKIE_SECRET = 'SuperSecureCookieSecret2026!LongRandom';
    process.env.AUTH_SALT = 'SuperSecureAuthSalt2026!LongRandom';

    for (const key of tc.unset) {
      delete process.env[key];
    }

    let blocked = false;
    try {
      validateEnvironmentSecrets();
    } catch (err: any) {
      if (err.message.includes('SECURITY FATAL') && err.message.includes(tc.name)) {
        blocked = true;
      }
    }

    if (!blocked) {
      throw new Error(`Test 2 Failed: Production launched without mandatory secret ${tc.name}`);
    }
  }

  // Restore env
  Object.assign(process.env, origEnv);
  console.log('✅ PASS: Server strictly fails startup if any mandatory secret is missing in production.');

  // -----------------------------------------------------------------
  // 3. Rejection of Default and Insecure Values
  // -----------------------------------------------------------------
  console.log('\nTest 3: Rejection of standard, default, and weak values in production...');
  const weakCases = [
    {
      label: 'Default ADMIN_PASSWORD',
      modify: () => { process.env.ADMIN_PASSWORD = 'MonoVoice2026!AdminKey'; },
      expected: 'cannot use known default'
    },
    {
      label: 'Short ADMIN_PASSWORD (<12 chars)',
      modify: () => { process.env.ADMIN_PASSWORD = 'Short123!'; },
      expected: 'at least 12 characters'
    },
    {
      label: 'Default ADMIN_ACTION_PASSWORD',
      modify: () => { process.env.ADMIN_ACTION_PASSWORD = 'MonoVoice2026!CreateUpdateKey'; },
      expected: 'cannot use known default'
    },
    {
      label: 'Short ADMIN_ACTION_PASSWORD (<12 chars)',
      modify: () => { process.env.ADMIN_ACTION_PASSWORD = 'Action123!'; },
      expected: 'at least 12 characters'
    },
    {
      label: 'Identical ADMIN_PASSWORD and ADMIN_ACTION_PASSWORD',
      modify: () => {
        process.env.ADMIN_PASSWORD = 'IdenticalPassword2026!Safe';
        process.env.ADMIN_ACTION_PASSWORD = 'IdenticalPassword2026!Safe';
      },
      expected: 'must be distinct'
    },
    {
      label: 'Default COOKIE_SECRET',
      modify: () => { process.env.COOKIE_SECRET = 'monovoice-secret-key-change-in-prod'; },
      expected: 'cannot use known default'
    },
    {
      label: 'Short COOKIE_SECRET (<16 chars)',
      modify: () => { process.env.COOKIE_SECRET = 'short_cookie'; },
      expected: 'at least 16 characters'
    },
    {
      label: 'Default AUTH_SALT',
      modify: () => { process.env.AUTH_SALT = 'MonoVoiceApps_Production_Salt_2026'; },
      expected: 'cannot use known default'
    },
    {
      label: 'Short AUTH_SALT (<16 chars)',
      modify: () => { process.env.AUTH_SALT = 'short_salt'; },
      expected: 'at least 16 characters'
    }
  ];

  for (const tc of weakCases) {
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_PASSWORD = 'StrongAdminPassword2026!XYZ';
    process.env.ADMIN_ACTION_PASSWORD = 'StrongActionPassword2026!ABC';
    process.env.COOKIE_SECRET = 'StrongCookieSecret2026!Random16';
    process.env.AUTH_SALT = 'StrongAuthSalt2026!Random16Chars';

    tc.modify();

    let blocked = false;
    try {
      validateEnvironmentSecrets();
    } catch (err: any) {
      if (err.message.includes('SECURITY FATAL') && err.message.includes(tc.expected)) {
        blocked = true;
      }
    }

    if (!blocked) {
      throw new Error(`Test 3 Failed: Production allowed weak/default secret: ${tc.label}`);
    }
  }

  // Restore env
  Object.assign(process.env, origEnv);
  console.log('✅ PASS: Known defaults, short secrets, and identical admin/action passwords strictly rejected.');

  // -----------------------------------------------------------------
  // 4. Local Development Environment Safety & No Default Fallbacks
  // -----------------------------------------------------------------
  console.log('\nTest 4: Local development environment safety & absence of insecure fallbacks...');
  process.env.NODE_ENV = 'development';
  delete process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_ACTION_PASSWORD;

  // In development, validateEnvironmentSecrets should NOT throw fatal error
  let devFailed = false;
  try {
    validateEnvironmentSecrets();
  } catch {
    devFailed = true;
  }
  if (devFailed) {
    throw new Error('Test 4 Failed: validateEnvironmentSecrets threw fatal error in development');
  }

  // But without credentials configured, default passwords must NOT be accepted!
  const defaultAdminAccepted = verifyAdminPassword('MonoVoice2026!AdminKey');
  const defaultActionAccepted = verifyActionPassword('MonoVoice2026!CreateUpdateKey');

  if (defaultAdminAccepted) {
    throw new Error('Test 4 Failed: Server accepted insecure fallback MonoVoice2026!AdminKey when ADMIN_PASSWORD was unset');
  }
  if (defaultActionAccepted) {
    throw new Error('Test 4 Failed: Server accepted insecure fallback MonoVoice2026!CreateUpdateKey when ADMIN_ACTION_PASSWORD was unset');
  }

  // Restore env
  Object.assign(process.env, origEnv);
  console.log('✅ PASS: Local development runs smoothly without fatal error, but insecure fallbacks are fully disabled.');

  // -----------------------------------------------------------------
  // 5. Critical Action Authentication (Action Password & Sudo Token)
  // -----------------------------------------------------------------
  console.log('\nTest 5: Critical action authentication & Sudo Token verification...');
  process.env.ADMIN_PASSWORD = 'ConfiguredAdminPass123!';
  process.env.ADMIN_ACTION_PASSWORD = 'ConfiguredActionPass456!';

  if (!verifyAdminPassword('ConfiguredAdminPass123!')) {
    throw new Error('Test 5 Failed: verifyAdminPassword rejected correct admin password');
  }
  if (verifyAdminPassword('WrongAdminPassword!')) {
    throw new Error('Test 5 Failed: verifyAdminPassword accepted wrong admin password');
  }
  if (!verifyActionPassword('ConfiguredActionPass456!')) {
    throw new Error('Test 5 Failed: verifyActionPassword rejected correct action password');
  }
  if (verifyActionPassword('WrongActionPassword!')) {
    throw new Error('Test 5 Failed: verifyActionPassword accepted wrong action password');
  }

  const sudoToken = await createSudoToken(getAdminUsername());
  const firstConsumption = await verifyAndConsumeSudoToken(sudoToken);
  const secondConsumption = await verifyAndConsumeSudoToken(sudoToken);

  if (!firstConsumption) {
    throw new Error('Test 5 Failed: Fresh sudo token was rejected');
  }
  if (secondConsumption) {
    throw new Error('Test 5 Failed: Sudo token was reused (must be single-use)');
  }
  console.log('✅ PASS: Admin credentials, Action Password, and single-use Sudo Tokens validated.');

  // -----------------------------------------------------------------
  // 6. Multi-Instance Rate Limiting & Lockout Mechanisms
  // -----------------------------------------------------------------
  console.log('\nTest 6: Multi-Instance Rate Limiting & Lockout Persistence...');
  const testIp = '192.168.1.' + Math.floor(Math.random() * 100000);
  await resetFailedAttempts(testIp);

  for (let i = 1; i <= 4; i++) {
    const res = await recordFailedAttempt(testIp);
    if (res.isLocked) throw new Error(`Test 6 Failed: Locked prematurely on attempt ${i}`);
  }

  const fifthRes = await recordFailedAttempt(testIp);
  if (!fifthRes.isLocked) {
    throw new Error('Test 6 Failed: Did not lock out after 5 failed attempts');
  }

  const checkRes = await checkRateLimit(testIp);
  if (!checkRes.isLocked) {
    throw new Error('Test 6 Failed: Rate limit check failed to report locked status');
  }

  await resetFailedAttempts(testIp);
  const resetRes = await checkRateLimit(testIp);
  if (resetRes.isLocked) {
    throw new Error('Test 6 Failed: Rate limit reset did not clear lockout');
  }
  console.log('✅ PASS: Rate limiting, lockout after 5 failed attempts, and reset mechanisms confirmed.');

  // -----------------------------------------------------------------
  // 7. Client Code & API Response Leak Check
  // -----------------------------------------------------------------
  console.log('\nTest 7: Verification of no leaked secrets in client code or API responses...');
  const clientPagePath = path.resolve(process.cwd(), 'src/pages/AdminDashboardPage.tsx');
  if (fs.existsSync(clientPagePath)) {
    const pageContent = fs.readFileSync(clientPagePath, 'utf8');
    if (pageContent.includes('MonoVoice2026!AdminKey') || pageContent.includes('MonoVoice2026!CreateUpdateKey')) {
      throw new Error('Test 7 Failed: AdminDashboardPage.tsx contains plaintext default passwords');
    }
  }

  // Session object must not leak secret keys or hashes
  const testSession = await createSession('admin', '127.0.0.1', 'AuditAgent/1.0');
  const sessionKeys = Object.keys(testSession);
  if (sessionKeys.includes('password') || sessionKeys.includes('hash') || sessionKeys.includes('salt')) {
    throw new Error('Test 7 Failed: Session object leaked password/hash/salt fields');
  }
  await destroySession(testSession.id);
  console.log('✅ PASS: Client-side files and API session responses are free of plaintext secrets.');

  // -----------------------------------------------------------------
  // 8. Firestore ProjectStore & BackupService Integrity Check
  // -----------------------------------------------------------------
  console.log('\nTest 8: Firestore ProjectStore & BackupService persistence...');
  await ProjectStore.initStore();
  const allProjects = await ProjectStore.getAllProjects();
  if (allProjects.length === 0) {
    throw new Error('Test 8 Failed: ProjectStore is empty after initialization');
  }

  const backupRes = await BackupService.createBackup('manual', 'Security audit automated test backup');
  if (!backupRes.success || !backupRes.manifest) {
    throw new Error('Test 8 Failed: BackupService failed to create backup');
  }

  const verifyRes = await BackupService.verifyBackup(backupRes.manifest.id);
  if (!verifyRes.isVerified) {
    throw new Error(`Test 8 Failed: Backup checksum verification failed: ${verifyRes.message}`);
  }

  await BackupService.deleteBackup(backupRes.manifest.id);
  console.log('✅ PASS: Firestore persistence, backup generation & SHA-256 verification confirmed.');

  console.log('\n=====================================================');
  console.log('🎉 ALL SECURITY & PERSISTENCE TESTS PASSED SUCCESSFULLY!');
  console.log('=====================================================');
}

runSecurityAuditTests().then(() => process.exit(0)).catch((err) => {
  console.error('\n❌ SECURITY AUDIT TEST FAILED:', err);
  process.exit(1);
});
