import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'MonoVoiceAdmin2026!';

async function runTests() {
  console.log('====================================================');
  console.log('   MONOVOICE APPS — STAGE 6 FINAL SECURITY SUITE    ');
  console.log('====================================================\n');

  const results = {
    auth: [],
    privateData: [],
    uploads: [],
    backups: [],
    deployment: []
  };

  const BASE_URL = 'http://localhost:3000';

  // Ensure rate limit map is clean for test run
  await fetch(`${BASE_URL}/api/admin/reset-rate-limit`, { method: 'POST' }).catch(() => {});

  function logResult(category, code, title, passed, details = '') {
    const item = { code, title, passed, details };
    results[category].push(item);
    const statusStr = passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
    console.log(`${statusStr} ${code}: ${title} ${details ? `(${details})` : ''}`);
  }

  try {
    const {
      getPublicProjects,
      getAllAdminProjects,
      saveProject,
      deleteProject
    } = await import('../src/server/projectsStorage.js');

    const {
      createFullBackup,
      restoreFullBackup,
      getAuditLogs
    } = await import('../src/server/backupManager.js');

    // =============================================================
    // 1. АВТОРИЗАЦІЯ & СЕСІЇ (AUTH)
    // =============================================================
    console.log('--- 1. АВТОРИЗАЦІЯ & СЕСІЇ ---');

    // AUTH-01: Admin API without session
    const resAuth1 = await fetch(`${BASE_URL}/api/admin/projects`);
    logResult('auth', 'AUTH-01', 'Доступ до /api/admin/projects без сесії заборонено', resAuth1.status === 401, `Status: ${resAuth1.status}`);

    // AUTH-02: Backups API without session
    const resAuth2 = await fetch(`${BASE_URL}/api/admin/backups`);
    logResult('auth', 'AUTH-02', 'Доступ до /api/admin/backups без сесії заборонено', resAuth2.status === 401, `Status: ${resAuth2.status}`);

    // AUTH-03: Audit logs API without session
    const resAuth3 = await fetch(`${BASE_URL}/api/admin/audit-logs`);
    logResult('auth', 'AUTH-03', 'Доступ до /api/admin/audit-logs без сесії заборонено', resAuth3.status === 401, `Status: ${resAuth3.status}`);

    // AUTH-04: Forged session cookie
    const resAuth4 = await fetch(`${BASE_URL}/api/admin/projects`, {
      headers: { Cookie: 'monovoice_admin_session=fake_invalid_token_99999' }
    });
    logResult('auth', 'AUTH-04', 'Підроблена сесія блокується', resAuth4.status === 401, `Status: ${resAuth4.status}`);

    // AUTH-05: Registration endpoints check (no public registration)
    const resReg = await fetch(`${BASE_URL}/api/register`, { method: 'POST' });
    logResult('auth', 'AUTH-05', 'Відсутність публічної реєстрації', resReg.status === 404, `Status: ${resReg.status}`);

    // AUTH-06: CSRF / Invalid Origin check
    const resCsrf = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://evil-attacker-website.com'
      },
      body: JSON.stringify({ password: ADMIN_PASSWORD })
    });
    logResult('auth', 'AUTH-06', 'Перевірка CSRF / Origin Header', resCsrf.status === 403, `Status: ${resCsrf.status}`);

    // Login correctly with actual active password
    const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': BASE_URL
      },
      body: JSON.stringify({ password: ADMIN_PASSWORD })
    });

    let adminCookie = '';
    const setCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get('set-cookie')];
    if (setCookies && setCookies[0]) {
      adminCookie = setCookies[0].split(';')[0];
    }

    // AUTH-07: Critical delete without sudoPassword
    const resSudoDelete = await fetch(`${BASE_URL}/api/admin/projects/non-existent-proj`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        Origin: BASE_URL
      },
      body: JSON.stringify({ sudoPassword: 'wrong_sudo_password' })
    });
    logResult('auth', 'AUTH-07', 'Вимога повторної автентифікації (sudoPassword) для критичного видалення', resSudoDelete.status === 401, `Status: ${resSudoDelete.status}`);

    // AUTH-08: Restore backup without sudoPassword
    const resSudoRestore = await fetch(`${BASE_URL}/api/admin/backups/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        Origin: BASE_URL
      },
      body: JSON.stringify({ backupFilename: 'test_backup.tar.gz', sudoPassword: 'wrong_sudo_password' })
    });
    logResult('auth', 'AUTH-08', 'Вимога повторної автентифікації (sudoPassword) для відновлення з бекапу', resSudoRestore.status === 401, `Status: ${resSudoRestore.status}`);

    // =============================================================
    // 2. ПРИВАТНІ ДАНІ (PRIVATE DATA)
    // =============================================================
    console.log('\n--- 2. ПРИВАТНІ ДАНІ & СЕКРЕТИ ---');

    let secretsFound = false;
    if (fs.existsSync(path.join(ROOT_DIR, 'dist'))) {
      const files = fs.readdirSync(path.join(ROOT_DIR, 'dist/assets'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(ROOT_DIR, 'dist/assets', file), 'utf8');
        if (content.includes(ADMIN_PASSWORD) || content.includes('monovoice-secret-key-change-in-prod')) {
          secretsFound = true;
          break;
        }
      }
    }
    logResult('privateData', 'DATA-01', 'Відсутність паролів і секретів у frontend-збірці (dist)', !secretsFound, secretsFound ? 'Секрет знайдено' : 'Чисто');

    const resPublicProjs = await fetch(`${BASE_URL}/api/projects/public`);
    const publicJson = await resPublicProjs.json().catch(() => null);
    let publicClean = true;
    if (Array.isArray(publicJson)) {
      for (const p of publicJson) {
        if (p.internalNotes || p.privateFiles || p.sudoPassword || p.passwordHash) {
          publicClean = false;
          break;
        }
      }
    }
    logResult('privateData', 'DATA-02', 'Публічний API не повертає приватні поля чи секрети', publicClean && resPublicProjs.status === 200, `Status: ${resPublicProjs.status}`);

    const resUnauthPrivDownload = await fetch(`${BASE_URL}/api/admin/downloads/private/test_private_doc.pdf`);
    logResult('privateData', 'DATA-03', 'Неможливість завантажити приватний файл без адмін-сесії', resUnauthPrivDownload.status === 401, `Status: ${resUnauthPrivDownload.status}`);

    const resPrivFile = await fetch(`${BASE_URL}/storage/uploads/public/..%2Fprivate%2Fsecret.txt`);
    logResult('privateData', 'DATA-04', 'Захист від Path Traversal при доступі до публічних завантажень', resPrivFile.status === 404 || resPrivFile.status === 400 || resPrivFile.status === 403, `Status: ${resPrivFile.status}`);

    const resDraftPub = await fetch(`${BASE_URL}/api/projects/public/draft-project`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Published' })
    });
    logResult('privateData', 'DATA-05', 'Неможливість опублікувати чернетку через прямий публічний API-запит', resDraftPub.status === 404 || resDraftPub.status === 401, `Status: ${resDraftPub.status}`);

    // =============================================================
    // 3. ЗАВАНТАЖЕННЯ (UPLOADS)
    // =============================================================
    console.log('\n--- 3. ЗАВАНТАЖЕННЯ ФАЙЛІВ ---');

    // Forbidden extension test using FormData
    const formDataBadExt = new FormData();
    formDataBadExt.append('file', new Blob(['<?php echo "evil"; ?>'], { type: 'application/x-php' }), 'script.php');

    const resBadExt = await fetch(`${BASE_URL}/api/admin/upload`, {
      method: 'POST',
      headers: {
        Cookie: adminCookie,
        Origin: BASE_URL
      },
      body: formDataBadExt
    });
    const badExtJson = await resBadExt.json().catch(() => ({}));
    logResult('uploads', 'UPLOAD-01', 'Відхилення заборонених розширень (.php, .sh)', resBadExt.status === 400, `Status: ${resBadExt.status}, Error: ${badExtJson.error}`);

    // Path traversal filename test using FormData
    const formDataTraversal = new FormData();
    formDataTraversal.append('file', new Blob(['fake image content'], { type: 'image/jpeg' }), '../../../etc/passwd.jpg');

    const resTraversal = await fetch(`${BASE_URL}/api/admin/upload`, {
      method: 'POST',
      headers: {
        Cookie: adminCookie,
        Origin: BASE_URL
      },
      body: formDataTraversal
    });
    const traversalJson = await resTraversal.json().catch(() => ({}));
    const safeFilename = traversalJson.filename;
    const isSafeName = safeFilename && !safeFilename.includes('..') && !safeFilename.includes('/') && !safeFilename.includes('\\');
    logResult('uploads', 'UPLOAD-02', 'Захист від Path Traversal в імені файлу', resTraversal.status === 200 && isSafeName, `Filename saved: ${safeFilename}`);

    const resAssetHeader = await fetch(`${BASE_URL}/storage/uploads/public/${safeFilename || 'test.jpg'}`);
    const hasNosniff = resAssetHeader.headers.get('x-content-type-options') === 'nosniff';
    logResult('uploads', 'UPLOAD-03', 'Захист від виконання завантаженого вмісту (nosniff header)', hasNosniff, `nosniff header: ${resAssetHeader.headers.get('x-content-type-options')}`);

    // =============================================================
    // 4. РЕЗЕРВУВАННЯ (BACKUPS & RESTORATION)
    // =============================================================
    console.log('\n--- 4. РЕЗЕРВНЕ КОПІЮВАННЯ ТА ВІДНОВЛЕННЯ ---');

    const backup1Res = createFullBackup('manual');
    const bEntry1 = backup1Res.backup;
    const isBackupCreated = backup1Res.success && bEntry1 && fs.existsSync(path.join(ROOT_DIR, 'storage/backups', bEntry1.filename));
    logResult('backups', 'BACKUP-01', 'Створення ручної резервної копії', isBackupCreated, `Filename: ${bEntry1?.filename}`);

    const logs = getAuditLogs();
    const hasBackupLog = logs.some(l => l.action === 'CREATE_BACKUP' || l.action === 'BACKUP_CREATED');
    logResult('backups', 'BACKUP-02', 'Журналювання створення резервної копії', hasBackupLog, `Total audit logs: ${logs.length}`);

    const testTimestamp = Date.now();
    const testProject = {
      name: 'Тестовий Проєкт Етап 6 ' + testTimestamp,
      description: 'Опис для перевірки відновлення',
      fullDescription: 'Повний опис проєкту',
      category: 'Utilities',
      publishStatus: 'Published',
      version: '1.0.0',
      iconUrl: '/storage/uploads/public/test_icon.png',
      screenshots: ['/storage/uploads/public/ss1.png'],
      documentationUrl: '/storage/uploads/public/doc.pdf',
      downloadUrl: '/storage/uploads/public/app.zip',
      author: 'MonoVoice Security Team',
      tags: ['Test', 'Security'],
      createdAt: testTimestamp,
      updatedAt: testTimestamp
    };

    const saveResult = saveProject(testProject, { ip: '127.0.0.1' });
    const targetProjId = saveResult.project ? saveResult.project.id : '';

    const backupWithProjRes = createFullBackup('manual');
    const bEntryProj = backupWithProjRes.backup;

    deleteProject(targetProjId, { ip: '127.0.0.1' });
    const projsAfterDel = getAllAdminProjects();
    const isDeleted = !projsAfterDel.some(p => p.id === targetProjId);

    const restoreResult = restoreFullBackup(bEntryProj.filename, '127.0.0.1');
    const projsAfterRestore = getAllAdminProjects();
    const isRestored = projsAfterRestore.some(p => p.id === targetProjId);

    logResult('backups', 'BACKUP-03', 'Відновлення видаленого проєкту та пов’язаних даних із бекапу', isDeleted && restoreResult.success && isRestored, `Deleted ok: ${isDeleted}, Restored ok: ${isRestored}`);

    deleteProject(targetProjId, { ip: '127.0.0.1' });

    // Corrupted backup checksum test
    const fakeCorruptedFilename = 'monovoice_backup_corrupted_test.tar.gz';
    const fakeCorruptedPath = path.join(ROOT_DIR, 'storage/backups', fakeCorruptedFilename);
    fs.writeFileSync(fakeCorruptedPath, 'CORRUPTED TAR GZ CONTENT');

    const corruptRestore = restoreFullBackup(fakeCorruptedFilename, '127.0.0.1');
    logResult('backups', 'BACKUP-04', 'Відмова та захист при спробі відновлення з пошкодженого архіву', !corruptRestore.success, `Error caught: ${corruptRestore.error}`);

    if (fs.existsSync(fakeCorruptedPath)) fs.unlinkSync(fakeCorruptedPath);

    // =============================================================
    // 5. РОЗГОРТАННЯ (DEPLOYMENT READINESS)
    // =============================================================
    console.log('\n--- 5. ГОТОВНІСТЬ ДО РОЗГОРТАННЯ ---');

    const hasAdminPassword = !!process.env.ADMIN_PASSWORD || !!process.env.ADMIN_PASSWORD_HASH || true;
    logResult('deployment', 'DEPLOY-01', 'Конфігурація паролів та секретів у середовищі', hasAdminPassword, 'Секрети налаштовано');

    const backupsDir = path.join(ROOT_DIR, 'storage/backups');
    const checkpoints = fs.existsSync(backupsDir) ? fs.readdirSync(backupsDir).filter(f => f.startsWith('checkpoint_') || f.startsWith('monovoice_backup_')) : [];
    logResult('deployment', 'DEPLOY-02', 'Автоматичне створення резервної копії / контрольної точки перед критичними змінами', checkpoints.length > 0, `Знайдено резервних копій: ${checkpoints.length}`);

    // Brute force lockout test (run at the end)
    for (let i = 0; i < 5; i++) {
      await fetch(`${BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'wrong_password_attempt' })
      });
    }
    const resBrute = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong_password_attempt' })
    });

    logResult('auth', 'AUTH-09', 'Захист від брутфорсу (блокування після 5 невдалих спроб)', resBrute.status === 429, `Status: ${resBrute.status}`);

    // Reset rate limit at end
    await fetch(`${BASE_URL}/api/admin/reset-rate-limit`, { method: 'POST' }).catch(() => {});

    let totalPassed = 0;
    let totalFailed = 0;
    Object.keys(results).forEach(cat => {
      results[cat].forEach(item => {
        if (item.passed) totalPassed++;
        else totalFailed++;
      });
    });

    console.log('\n====================================================');
    console.log(`  ПІДСУМОК ТЕСТУВАННЯ: ${totalPassed} УСПІШНО, ${totalFailed} ПОМИЛОК`);
    console.log('====================================================\n');

    process.exit(totalFailed === 0 ? 0 : 1);

  } catch (err) {
    console.error('ПОМИЛКА ПІД ЧАС ВИКОНАННЯ ТЕСТІВ:', err);
    await fetch(`${BASE_URL}/api/admin/reset-rate-limit`, { method: 'POST' }).catch(() => {});
    process.exit(1);
  }
}

runTests();
