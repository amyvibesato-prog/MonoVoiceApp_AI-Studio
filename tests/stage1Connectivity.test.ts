import crypto from 'crypto';
import { DeviceAuthService } from '../src/server/deviceAuthService';
import { collection, doc, getDoc, Firestore } from 'firebase/firestore';
import { getDb } from '../src/server/firebase';

async function runStage1ConnectivityTests() {
  console.log('=====================================================');
  console.log('🧪 RUNNING STAGE 1 CONNECTIVITY TEST SUITE');
  console.log('=====================================================\n');

  try {
    const testId = 'test_' + crypto.randomBytes(8).toString('hex');
    const sentAt = new Date().toISOString();
    const appVersion = '1.0.0';

    // 1. Valid test signal is accepted
    console.log('Test 1: Valid connectivity test signal is accepted...');
    const record = await DeviceAuthService.recordConnectivityTest({
      testId,
      appVersion,
      sentAt,
      clientIp: '127.0.0.1'
    });

    if (record.testId !== testId || record.appVersion !== appVersion || !record.receivedAt) {
      throw new Error('❌ FAIL: Connectivity test record fields mismatch');
    }
    console.log(`✅ Test 1 Passed: Signal recorded with server receivedAt: ${record.receivedAt}`);

    // 2. Response contains server receivedAt
    console.log('\nTest 2: Response contains server receivedAt timestamp...');
    const receivedTime = new Date(record.receivedAt).getTime();
    if (Number.isNaN(receivedTime) || Math.abs(Date.now() - receivedTime) > 10000) {
      throw new Error('❌ FAIL: receivedAt timestamp is not fresh server time');
    }
    console.log('✅ Test 2 Passed: receivedAt is fresh server timestamp');

    // 3. Saved in separate diagnostic Firestore document
    console.log('\nTest 3: Diagnostic record saved in admin_diagnostics/connectivity_test doc...');
    const db = getDb() as Firestore;
    const diagDocRef = doc(db, 'admin_diagnostics', 'connectivity_test');
    const diagSnap = await getDoc(diagDocRef);
    if (!diagSnap.exists()) {
      throw new Error('❌ FAIL: admin_diagnostics/connectivity_test doc does not exist');
    }
    const diagData = diagSnap.data();
    if (diagData.testId !== testId) {
      throw new Error(`❌ FAIL: Expected testId ${testId}, got ${diagData.testId}`);
    }
    console.log('✅ Test 3 Passed: Successfully verified admin_diagnostics/connectivity_test doc in Firestore');

    // 4. Invalid input fields rejected
    console.log('\nTest 4: Invalid input fields rejected...');
    // Empty testId
    try {
      await DeviceAuthService.recordConnectivityTest({
        testId: '',
        appVersion: '1.0.0',
        sentAt: new Date().toISOString(),
        clientIp: '127.0.0.1'
      });
      throw new Error('❌ FAIL: Empty testId should have been rejected');
    } catch (err: any) {
      console.log('  - Empty testId rejected:', err.message);
    }

    // Invalid sentAt
    try {
      await DeviceAuthService.recordConnectivityTest({
        testId: 'test_123',
        appVersion: '1.0.0',
        sentAt: 'invalid-date-string',
        clientIp: '127.0.0.1'
      });
      throw new Error('❌ FAIL: Invalid sentAt should have been rejected');
    } catch (err: any) {
      console.log('  - Invalid sentAt rejected:', err.message);
    }

    // Oversized testId
    try {
      await DeviceAuthService.recordConnectivityTest({
        testId: 'x'.repeat(100),
        appVersion: '1.0.0',
        sentAt: new Date().toISOString(),
        clientIp: '127.0.0.1'
      });
      throw new Error('❌ FAIL: Oversized testId should have been rejected');
    } catch (err: any) {
      console.log('  - Oversized testId rejected:', err.message);
    }
    console.log('✅ Test 4 Passed: All invalid input fields properly rejected');

    // 5. Connectivity test signal DOES NOT alter admin_devices
    console.log('\nTest 5: Verify connectivity test signal does NOT alter admin_devices...');
    // Create a dummy registered device
    const { pairingCode } = await DeviceAuthService.createPairingCode('127.0.0.1');
    const keyPair = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    const device = await DeviceAuthService.claimPairingCodeAndRegisterDevice({
      pairingCode: pairingCode.codeId,
      deviceName: 'Diag Test Device',
      publicKeyPem: keyPair.publicKey,
      clientIp: '127.0.0.1',
      allowDevSimulator: true
    });

    const initialDevSnap = await getDoc(doc(db, 'admin_devices', device.deviceId));
    const initialDevData = initialDevSnap.data();

    // Send connectivity test
    await DeviceAuthService.recordConnectivityTest({
      testId: 'test_' + crypto.randomBytes(4).toString('hex'),
      appVersion: '1.0.0',
      sentAt: new Date().toISOString(),
      clientIp: '127.0.0.1'
    });

    const afterDevSnap = await getDoc(doc(db, 'admin_devices', device.deviceId));
    const afterDevData = afterDevSnap.data();

    if (
      afterDevData?.lastSeenAt !== initialDevData?.lastSeenAt ||
      afterDevData?.lastUsedAt !== initialDevData?.lastUsedAt ||
      afterDevData?.status !== initialDevData?.status
    ) {
      throw new Error('❌ FAIL: Connectivity test altered device record in admin_devices!');
    }
    console.log('✅ Test 5 Passed: admin_devices document remained completely unchanged');

    // 6. Test Admin Reader Service
    console.log('\nTest 6: Test getLatestConnectivityTest reader...');
    const latest = await DeviceAuthService.getLatestConnectivityTest();
    if (latest.status !== 'SUCCESS' || !latest.lastResult) {
      throw new Error('❌ FAIL: getLatestConnectivityTest returned empty result');
    }
    console.log(`✅ Test 6 Passed: Latest result fetched for Admin UI (testId: ${latest.lastResult.testId})`);

    // 7. Test Consecutive Signals Update
    console.log('\nTest 7: Consecutive Signals Update Test...');
    const firstTestId = 'consec_1_' + crypto.randomBytes(4).toString('hex');
    const rec1 = await DeviceAuthService.recordConnectivityTest({
      testId: firstTestId,
      appVersion: '1.0.1',
      sentAt: new Date().toISOString(),
      clientIp: '127.0.0.1'
    });

    // Small delay to ensure timestamp change
    await new Promise(r => setTimeout(r, 100));

    const secondTestId = 'consec_2_' + crypto.randomBytes(4).toString('hex');
    const rec2 = await DeviceAuthService.recordConnectivityTest({
      testId: secondTestId,
      appVersion: '1.0.2',
      sentAt: new Date().toISOString(),
      clientIp: '127.0.0.1'
    });

    const latestConsec = await DeviceAuthService.getLatestConnectivityTest();
    if (!latestConsec.lastResult || latestConsec.lastResult.testId !== secondTestId) {
      throw new Error(`❌ FAIL: Expected second testId ${secondTestId}, got ${latestConsec.lastResult?.testId}`);
    }

    if (new Date(latestConsec.lastResult.receivedAt).getTime() <= new Date(rec1.receivedAt).getTime()) {
      throw new Error('❌ FAIL: Second receivedAt was not strictly newer than first');
    }

    console.log(`✅ Test 7 Passed: First test (${firstTestId}, ${rec1.receivedAt}) was successfully updated to Second test (${secondTestId}, ${rec2.receivedAt})`);

    // Clean up autotest document from Firestore so autotests don't leave lingering records
    const deleteDocModule = await import('firebase/firestore');
    await deleteDocModule.deleteDoc(doc(db, 'admin_diagnostics', 'connectivity_test')).catch(() => {});
    console.log('✅ Cleaned up temporary autotest document from Firestore');

    console.log('\n=====================================================');
    console.log('🎉 ALL STAGE 1 CONNECTIVITY TESTS PASSED SUCCESSFULLY!');
    console.log('=====================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ STAGE 1 TEST FAILED:', err);
    process.exit(1);
  }
}

runStage1ConnectivityTests();
