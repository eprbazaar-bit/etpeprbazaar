import fs from 'node:fs';
import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import type { App, ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { Auth, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';

interface AppletFirebaseConfig {
  projectId: string;
  firestoreDatabaseId: string;
}

function loadAppletFirebaseConfig(): AppletFirebaseConfig {
  const raw = fs.readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8');
  return JSON.parse(raw) as AppletFirebaseConfig;
}

const appletConfig = loadAppletFirebaseConfig();

let adminAppInstance: App | null = null;
let adminDbInstance: Firestore | null = null;
let adminInitError: string | null = null;

export function getFirebaseAdminState(): { initialized: boolean; error: string | null; projectId: string; databaseId: string } {
  ensureFirebaseAdmin();
  return {
    initialized: Boolean(adminAppInstance && adminDbInstance),
    error: adminInitError,
    projectId: appletConfig.projectId,
    databaseId: appletConfig.firestoreDatabaseId,
  };
}

function ensureFirebaseAdmin(): { app: App | null; db: Firestore | null } {
  if (adminAppInstance && adminDbInstance) {
    return { app: adminAppInstance, db: adminDbInstance };
  }

  try {
    if (getApps().length > 0) {
      adminAppInstance = getApps()[0];
    } else {
      const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (saJson && saJson.trim().startsWith('{')) {
        const parsed = JSON.parse(saJson) as ServiceAccount;
        adminAppInstance = initializeApp({
          credential: cert(parsed),
          projectId: appletConfig.projectId,
        });
      } else {
        adminAppInstance = initializeApp({
          credential: applicationDefault(),
          projectId: appletConfig.projectId,
        });
      }
    }

    adminDbInstance = getFirestore(adminAppInstance, appletConfig.firestoreDatabaseId);
    adminInitError = null;
  } catch (err) {
    adminInitError = err instanceof Error ? err.message : String(err);
  }

  return { app: adminAppInstance, db: adminDbInstance };
}

export function getAdminAuth(): Auth {
  const { app } = ensureFirebaseAdmin();
  if (!app) {
    throw new Error(adminInitError || 'Firebase Admin Auth is not initialized.');
  }
  return getAuth(app);
}

export function getAdminDb(): Firestore {
  const { db } = ensureFirebaseAdmin();
  if (!db) {
    throw new Error(adminInitError || 'Firebase Admin Firestore is not initialized.');
  }
  return db;
}

export async function checkFirebaseAdminHealth(): Promise<{
  initialized: boolean;
  firestoreAccessOk: boolean;
  error: string | null;
  projectId: string;
  databaseId: string;
}> {
  const base = getFirebaseAdminState();
  if (!base.initialized) {
    return { ...base, firestoreAccessOk: false };
  }
  try {
    const db = getAdminDb();
    await db.collection('categories').limit(1).get();
    return { ...base, firestoreAccessOk: true, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isPermDenied =
      (err as { code?: number | string })?.code === 7 || msg.includes('PERMISSION_DENIED');
    return {
      ...base,
      firestoreAccessOk: false,
      error: isPermDenied
        ? 'Firebase Admin SDK lacks Firestore IAM permission on intense-brook-3fs6l. Set FIREBASE_SERVICE_ACCOUNT_JSON in backend environment secrets.'
        : msg,
    };
  }
}

export async function verifyBearerIdToken(authHeader: string | undefined): Promise<DecodedIdToken> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Missing or invalid Authorization Bearer token.');
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    const err = new Error('Empty Firebase ID token.');
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }
  const auth = getAdminAuth();
  try {
    const decoded = await auth.verifyIdToken(token);
    if (!decoded.email_verified) {
      const err = new Error('Authenticated email address must be verified.');
      (err as Error & { statusCode?: number }).statusCode = 403;
      throw err;
    }
    return decoded;
  } catch (err) {
    if ((err as Error & { statusCode?: number }).statusCode) {
      throw err;
    }
    const authErr = new Error('Invalid or expired Firebase ID token.');
    (authErr as Error & { statusCode?: number }).statusCode = 401;
    throw authErr;
  }
}
