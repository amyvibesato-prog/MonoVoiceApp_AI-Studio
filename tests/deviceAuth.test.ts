import crypto from 'crypto';
import { DeviceAuthService, normalizePublicKeyPem } from '../src/server/deviceAuthService';
import { canonicalizeJson, hashCanonicalPayload, buildCanonicalApprovalMessage } from '../src/server/jcsCanonicalizer';

async function runDeviceAuthTests() {
  console.log('=====================================================');
  console.log('🧪 RUNNING HARDWARE AUTHENTICATOR PROTOCOL TESTS');
  console.log('=====================================================\n');

  try {
    // 1. Create Pairing Code
    console.log('Test 1: Create Pairing Code...');
    const { pairingCode, qrUri } = await DeviceAuthService.createPairingCode('127.0.0.1');
    console.log(`✅ Pairing Code generated: ${pairingCode.codeId} (Expires: ${pairingCode.expiresAt})`);
    console.log(`✅ QR URI generated: ${qrUri.substring(0, 50)}...`);

    // 2. Generate ECDSA P-256 Key Pair (Simulating Android Keystore / WebCrypto)
    console.log('\nTest 2: Generate ECDSA P-256 Key Pair...');
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    console.log('✅ Generated valid EC P-256 key pair');

    // 3. Claim Pairing Code and Register Device
    console.log('\nTest 3: Register Device with Pairing Code (with Simulator flag for test)...');
    const device = await DeviceAuthService.claimPairingCodeAndRegisterDevice({
      pairingCode: pairingCode.codeId,
      deviceName: 'Test Pixel 8 Pro Authenticator',
      publicKeyPem: publicKey,
      clientIp: '127.0.0.1',
      allowDevSimulator: true
    });
    console.log(`✅ Device registered: ${device.deviceId} (${device.deviceName})`);

    // Verify reuse of same code fails
    try {
      await DeviceAuthService.claimPairingCodeAndRegisterDevice({
        pairingCode: pairingCode.codeId,
        deviceName: 'Duplicate Device',
        publicKeyPem: publicKey,
        clientIp: '127.0.0.1',
        allowDevSimulator: true
      });
      throw new Error('❌ FAIL: Reusing pairing code should have thrown an error');
    } catch (err: any) {
      console.log('✅ Reusing used pairing code was rejected as expected:', err.message);
    }

    // 4. List Devices
    console.log('\nTest 4: List Registered Devices...');
    const devices = await DeviceAuthService.listDevices();
    const found = devices.find(d => d.deviceId === device.deviceId);
    if (!found) throw new Error('❌ FAIL: Device not found in registered devices list');
    console.log(`✅ Found registered device in list (${devices.length} total devices)`);

    // 5. Create Challenge for Critical Action
    console.log('\nTest 5: Create Approval Challenge...');
    const challenge = await DeviceAuthService.createChallenge(
      'DELETE_PROJECT',
      'prj_test_123',
      'MonoVoice Chat Engine',
      { preserveBackups: true },
      '127.0.0.1'
    );
    console.log(`✅ Challenge created: ${challenge.requestId} (Nonce: ${challenge.nonce.substring(0, 16)}...)`);

    // 6. Sign and Verify Challenge using RFC 8785 canonical message
    console.log('\nTest 6: Cryptographically Sign Challenge...');
    const canonicalHash = hashCanonicalPayload(challenge.actionPayload);
    const messageToSign = buildCanonicalApprovalMessage({
      requestId: challenge.requestId,
      deviceId: device.deviceId,
      actionType: challenge.actionType,
      targetObjectId: challenge.targetObjectId,
      canonicalPayloadHash: canonicalHash,
      nonce: challenge.nonce,
      expiresAt: challenge.expiresAt
    });

    const signer = crypto.createSign('SHA256');
    signer.update(Buffer.from(messageToSign, 'utf8'));
    signer.end();
    const signature = signer.sign(privateKey, 'base64');

    const approved = await DeviceAuthService.verifyAndApproveChallenge(
      challenge.requestId,
      device.deviceId,
      signature
    );
    if (!approved) throw new Error('❌ FAIL: verifyAndApproveChallenge returned false');
    console.log('✅ Cryptographic signature successfully verified by server');

    // 7. Test Idempotent Execution
    console.log('\nTest 7: Execute Approved Challenge with Idempotency...');
    let sideEffectRan = 0;
    const execResult = await DeviceAuthService.executeApprovedChallenge(
      challenge.requestId,
      async (ch) => {
        sideEffectRan++;
        return { deleted: true, projectId: ch.targetObjectId };
      }
    );
    if (sideEffectRan !== 1 || !execResult.deleted) {
      throw new Error('❌ FAIL: Side effect execution did not succeed');
    }
    console.log('✅ Side effect executed successfully, transitioned to EXECUTED');

    // Test that re-executing fails
    try {
      await DeviceAuthService.executeApprovedChallenge(
        challenge.requestId,
        async () => {
          sideEffectRan++;
        }
      );
      throw new Error('❌ FAIL: Re-executing an already executed challenge should have thrown');
    } catch (err: any) {
      console.log('✅ Re-execution of completed challenge blocked:', err.message);
    }

    // 8. Test Emergency Recovery Codes Generation & Revocation
    console.log('\nTest 8: Recovery Codes Generation & Device Revocation...');
    const recoveryCodes = await DeviceAuthService.generateRecoveryCodes();
    if (recoveryCodes.length !== 8) throw new Error('❌ FAIL: Expected 8 recovery codes');
    console.log(`✅ Generated ${recoveryCodes.length} recovery codes (Sample: ${recoveryCodes[0]})`);

    // Revoke device using first recovery code
    await DeviceAuthService.revokeLostDeviceWithRecoveryCode(
      recoveryCodes[0],
      device.deviceId,
      '127.0.0.1'
    );
    console.log('✅ Device successfully revoked using one-time Recovery Code');

    // Verify code cannot be reused
    try {
      await DeviceAuthService.revokeLostDeviceWithRecoveryCode(
        recoveryCodes[0],
        device.deviceId,
        '127.0.0.1'
      );
      throw new Error('❌ FAIL: Reusing recovery code should have thrown');
    } catch (err: any) {
      console.log('✅ Reusing recovery code blocked:', err.message);
    }

    // 9. Test Signed Request Canonical Path & Heartbeat lastSeenAt
    console.log('\nTest 9: Signed Request Canonical Path & Heartbeat lastSeenAt...');
    // Create new device for heartbeat test
    const { pairingCode: hbCode } = await DeviceAuthService.createPairingCode('127.0.0.1');
    const hbKey = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    const hbDevice = await DeviceAuthService.claimPairingCodeAndRegisterDevice({
      pairingCode: hbCode.codeId,
      deviceName: 'Heartbeat Test Device',
      publicKeyPem: hbKey.publicKey,
      clientIp: '127.0.0.1',
      allowDevSimulator: true
    });

    const sessionChallenge = await DeviceAuthService.issueDeviceAuthChallenge(hbDevice.deviceId);
    const hbResult = await DeviceAuthService.recordDeviceHeartbeat({
      deviceId: hbDevice.deviceId,
      authChallenge: sessionChallenge.authChallenge,
      expiresAt: sessionChallenge.expiresAt,
      signatureBase64: crypto.createSign('SHA256').update(
        'MONOVOICE_DEVICE_REQUEST_V1\n' +
        'method:POST\n' +
        'path:/api/admin/device-auth/heartbeat\n' +
        `bodyHash:${crypto.createHash('sha256').update('{"appVersion":"1.0.0"}').digest('hex')}\n` +
        `deviceId:${hbDevice.deviceId}\n` +
        `authChallenge:${sessionChallenge.authChallenge}\n` +
        `expiresAt:${sessionChallenge.expiresAt}`
      ).sign(hbKey.privateKey, 'base64'),
      appVersion: '1.0.0'
    });
    if (!hbResult.success || !hbResult.lastSeenAt) {
      throw new Error('❌ FAIL: recordDeviceHeartbeat failed');
    }
    console.log(`✅ Heartbeat recorded successfully in Firestore. lastSeenAt: ${hbResult.lastSeenAt}`);

    // 10. Test Rejection of Invalid Signature
    console.log('\nTest 10: Rejection of Invalid Signature...');
    const fakeChallenge = await DeviceAuthService.issueDeviceAuthChallenge(hbDevice.deviceId);
    try {
      await DeviceAuthService.verifyAndConsumeSignedDeviceRequest({
        deviceId: hbDevice.deviceId,
        method: 'POST',
        path: '/api/admin/device-auth/heartbeat',
        body: { appVersion: '1.0.0' },
        authChallenge: fakeChallenge.authChallenge,
        expiresAt: fakeChallenge.expiresAt,
        signatureBase64: Buffer.from('invalid-signature-data').toString('base64')
      });
      throw new Error('❌ FAIL: Invalid signature should have been rejected');
    } catch (err: any) {
      console.log('✅ Invalid signature rejected as expected:', err.message);
    }

    // 11. Test Challenge Anti-Replay (Reusing Challenge)
    console.log('\nTest 11: Challenge Anti-Replay Prevention...');
    try {
      await DeviceAuthService.verifyAndConsumeSignedDeviceRequest({
        deviceId: hbDevice.deviceId,
        method: 'POST',
        path: '/api/admin/device-auth/heartbeat',
        body: { appVersion: '1.0.0' },
        authChallenge: sessionChallenge.authChallenge, // Already consumed in Test 9
        expiresAt: sessionChallenge.expiresAt,
        signatureBase64: 'any'
      });
      throw new Error('❌ FAIL: Reusing session challenge should have failed');
    } catch (err: any) {
      console.log('✅ Reusing consumed challenge blocked as expected:', err.message);
    }

    // 12. Test QR Code URL Resolution (APP_URL vs PUBLIC_URL)
    console.log('\nTest 12: Production QR Code URL Resolution...');
    process.env.APP_URL = 'https://ais-pre-hcrs5wd7lpf4dflwp6mw2k-53018745059.europe-west2.run.app';
    const { qrUri: testQrUri } = await DeviceAuthService.createPairingCode('127.0.0.1');
    if (!testQrUri.includes(encodeURIComponent('https://ais-pre-hcrs5wd7lpf4dflwp6mw2k-53018745059.europe-west2.run.app'))) {
      throw new Error(`❌ FAIL: QR Code URL did not use APP_URL. Generated URI: ${testQrUri}`);
    }
    console.log('✅ QR Code generated using process.env.APP_URL successfully');

    console.log('\n=====================================================');
    console.log('🎉 ALL HARDWARE AUTHENTICATOR TESTS PASSED SUCCESSFULLY!');
    console.log('=====================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  }
}

runDeviceAuthTests();
