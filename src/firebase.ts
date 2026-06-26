import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBZOxdrkKiOA3GTHNJ8xRIhhZG1uA_wshQ",
  authDomain: "ileyshub.firebaseapp.com",
  databaseURL: "https://ileyshub-default-rtdb.firebaseio.com",
  projectId: "ileyshub",
  storageBucket: "ileyshub.firebasestorage.app",
  messagingSenderId: "599663425915",
  appId: "1:599663425915:web:a7176f26dd98608fed25de",
  measurementId: "G-VD19LSP1LN"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Helper to create a user in Firebase Auth using a secondary temporary App.
// This allows a Super Admin to register a new tenant admin without losing their session.
export async function createSecondaryAuthUser(email: string, pass: string): Promise<string> {
  const tempAppName = `temp-auth-app-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  const tempApp = initializeApp(firebaseConfig, tempAppName);
  const tempAuth = getAuth(tempApp);
  
  try {
    const userCredential = await createUserWithEmailAndPassword(tempAuth, email, pass);
    const uid = userCredential.user.uid;
    // Explicitly sign out of secondary app and destroy it
    await signOut(tempAuth);
    await deleteApp(tempApp);
    return uid;
  } catch (error) {
    try {
      await deleteApp(tempApp);
    } catch (_) {}
    throw error;
  }
}

// Operational helper for firestore errors
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
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}
