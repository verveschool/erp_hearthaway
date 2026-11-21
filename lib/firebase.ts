import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import productionConfig from '../firebase-applet-config.json';

type AppConfig = FirebaseOptions & { firestoreDatabaseId: string };

const mode = process.env.NEXT_PUBLIC_FIREBASE_MODE || 'production';
const useEmulators = mode === 'emulator';

function selectFirebaseConfig(): AppConfig {
  if (useEmulators) {
    return { projectId: 'demo-hearthaway-qa', apiKey: 'local-qa-only', firestoreDatabaseId: '(default)' };
  }
  if (mode === 'production') return productionConfig;
  if (mode !== 'staging') throw new Error('Unknown Firebase environment.');

  let config: AppConfig | undefined;
  try {
    config = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_STAGING_CONFIG || '');
  } catch {
    throw new Error('Staging must have its own Firebase web configuration.');
  }
  if (!config?.projectId || config.projectId === productionConfig.projectId ||
      !config.apiKey || !config.appId || !config.authDomain || !config.firestoreDatabaseId) {
    throw new Error('Staging must use a complete configuration for a separate Firebase project.');
  }
  if (config.apiKey === productionConfig.apiKey || config.appId === productionConfig.appId ||
      config.authDomain === productionConfig.authDomain ||
      (config.storageBucket && config.storageBucket === productionConfig.storageBucket)) {
    throw new Error('Staging cannot reuse production Firebase app credentials or service endpoints.');
  }
  return config;
}

const config = selectFirebaseConfig();
const name = mode === 'production' ? '[DEFAULT]' : `hearthaway-${mode}`;
const existingApp = getApps().find((app) => app.name === name);
const app = existingApp ?? initializeApp(config, name);
export const db = getFirestore(app, config.firestoreDatabaseId);
export const auth = getAuth(app);

if (useEmulators && !existingApp) {
  connectAuthEmulator(auth, 'http://127.0.0.1:49199');
  connectFirestoreEmulator(db, '127.0.0.1', 48081);
}

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
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

// Startup connection verification as mandated by skill
if (typeof window !== 'undefined') {
  getDocFromServer(doc(db, 'test', 'connection')).catch((error) => {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection check: client is offline or starting up.');
    }
  });
}
