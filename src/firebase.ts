import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

const isConfigValid =
  Boolean(firebaseConfig?.projectId) &&
  firebaseConfig.projectId !== 'remixed-project-id' &&
  Boolean(firebaseConfig?.apiKey) &&
  Boolean(firebaseConfig?.firestoreDatabaseId);

export const firebaseConfigured = isConfigValid;
export const firebaseConfigError = isConfigValid
  ? null
  : 'Trading platform service connection is currently unavailable. Please contact support.';

let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let storageInstance: FirebaseStorage | null = null;

if (isConfigValid) {
  app = initializeApp(firebaseConfig);
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  authInstance = getAuth(app);
  storageInstance = getStorage(app);
}

export const db = dbInstance as Firestore;
export const auth = authInstance as Auth;
export const storage = storageInstance as FirebaseStorage;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentUser = authInstance?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid ?? null,
      email: currentUser?.email ?? null,
      emailVerified: currentUser?.emailVerified ?? null,
      isAnonymous: currentUser?.isAnonymous ?? null,
      tenantId: currentUser?.tenantId ?? null,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<{ ok: boolean; error?: string }> {
  if (!isConfigValid || !dbInstance) {
    return { ok: false, error: firebaseConfigError || 'Platform service unavailable' };
  }
  try {
    await getDocFromServer(doc(dbInstance, 'platform_settings', 'connection_check'));
    return { ok: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('the client is offline') || msg.includes('Failed to get document because the client is offline')) {
      return { ok: false, error: 'Unable to connect to the trading platform. Please check your internet connection and refresh.' };
    }
    // Permission errors or missing doc still confirm reachability
    return { ok: true };
  }
}
