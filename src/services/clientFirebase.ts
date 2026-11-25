import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp;
let dbInstance: Firestore | null = null;

export function getClientDb(): Firestore | null {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    const databaseId = (firebaseConfig as any).firestoreDatabaseId;
    if (databaseId) {
      dbInstance = getFirestore(app, databaseId);
    } else {
      dbInstance = getFirestore(app);
    }

    return dbInstance;
  } catch (err) {
    console.error('⚠️ Failed to initialize Client Firebase SDK:', err);
    return null;
  }
}
