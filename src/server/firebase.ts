import { initializeApp as initAdminApp, getApps as getAdminApps, type App as AdminApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, type Firestore as AdminFirestore } from 'firebase-admin/firestore';
import { initializeApp as initClientApp, getApps as getClientApps, type FirebaseApp } from 'firebase/app';
import { getFirestore as getClientFirestore, type Firestore as ClientFirestore } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let clientAppInstance: FirebaseApp | null = null;
let clientDbInstance: ClientFirestore | null = null;
let adminAppInstance: AdminApp | null = null;
let adminDbInstance: AdminFirestore | null = null;
let isInitialized = false;

function loadConfig(): Record<string, any> {
  const configFile = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configFile)) {
    try {
      return JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    } catch (e) {
      console.error('Failed to parse firebase-applet-config.json:', e);
    }
  }
  return {};
}

/**
 * Initializes Firebase Admin SDK on the Node.js server using Application Default Credentials (ADC).
 * In Cloud Run, ADC is automatically provisioned via the attached runtime service account.
 */
export function initFirebaseAdmin(): AdminFirestore | null {
  if (adminDbInstance) return adminDbInstance;

  try {
    const config = loadConfig();
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || config.projectId;
    const databaseId = config.firestoreDatabaseId;

    const existingApps = getAdminApps();
    if (existingApps.length === 0) {
      // Use Application Default Credentials (ADC) for Cloud Run
      const options: any = {
        projectId
      };

      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        options.credential = applicationDefault();
      }

      adminAppInstance = initAdminApp(options);
    } else {
      adminAppInstance = existingApps[0]!;
    }

    if (databaseId) {
      adminDbInstance = getAdminFirestore(adminAppInstance, databaseId);
    } else {
      adminDbInstance = getAdminFirestore(adminAppInstance);
    }

    console.log(`🛡️ Firebase Admin SDK initialized (Project: ${projectId}, Database: ${databaseId || 'default'}, ADC Ready)`);
    return adminDbInstance;
  } catch (err) {
    console.warn('⚠️ Notice initializing Firebase Admin SDK with ADC:', err);
    return null;
  }
}

/**
 * Initializes client Firestore SDK using configuration credentials.
 * Ensures uninterrupted local and dev container execution.
 */
export function initClientFirebase(): ClientFirestore | null {
  if (clientDbInstance) return clientDbInstance;

  try {
    const config = loadConfig();
    if (getClientApps().length === 0) {
      clientAppInstance = initClientApp(config);
    } else {
      clientAppInstance = getClientApps()[0];
    }

    const databaseId = config.firestoreDatabaseId;
    if (databaseId) {
      clientDbInstance = getClientFirestore(clientAppInstance, databaseId);
    } else {
      clientDbInstance = getClientFirestore(clientAppInstance);
    }

    console.log(`🔥 Client Firestore SDK bridge ready (Project: ${config.projectId}, Database: ${databaseId || 'default'})`);
    return clientDbInstance;
  } catch (err) {
    console.error('⚠️ Failed to initialize client Firestore bridge:', err);
    return null;
  }
}

export function initFirebase(): ClientFirestore | null {
  if (!isInitialized) {
    initFirebaseAdmin();
    initClientFirebase();
    isInitialized = true;
  }
  return clientDbInstance;
}

export function getDb(): ClientFirestore | null {
  if (!isInitialized) {
    return initFirebase();
  }
  return clientDbInstance;
}

export function getAdminDb(): AdminFirestore | null {
  if (!adminDbInstance) {
    return initFirebaseAdmin();
  }
  return adminDbInstance;
}
