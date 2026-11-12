import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  getDocFromServer,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with specific database ID if provided
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Connection state tracking
let isFirestoreConnected = false;

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    // Validate connection to Firestore using getDocFromServer as required by Firebase skill
    await getDocFromServer(doc(db, 'test', 'connection'));
    isFirestoreConnected = true;
    return true;
  } catch (error: any) {
    if (error?.message?.includes('the client is offline') || error?.code === 'unavailable') {
      console.warn('Firestore is running in offline mode or database is unreachable:', error);
      isFirestoreConnected = false;
      return false;
    }
    // If doc doesn't exist, it still means server responded
    isFirestoreConnected = true;
    return true;
  }
}

export function getFirestoreSyncStatus(): boolean {
  return isFirestoreConnected;
}

export {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  type User,
};
