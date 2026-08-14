import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  doc,
  writeBatch,
} from 'firebase/firestore';
import type { Play } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (using specific databaseId if provided)
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const PLAYS_COLLECTION = 'plays';

/**
 * Subscribe to real-time changes in the 'plays' collection.
 */
export function subscribeToPlays(onUpdate: (plays: Play[]) => void, onError?: (err: Error) => void) {
  const playsRef = collection(db, PLAYS_COLLECTION);
  return onSnapshot(
    playsRef,
    (snapshot) => {
      const playsList: Play[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Play;
        playsList.push(data);
      });
      onUpdate(playsList);
    },
    (error) => {
      console.error('Firestore subscription error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Save or update a play in Firestore.
 */
export async function savePlayToCloud(play: Play): Promise<void> {
  if (!play.id) return;
  const playRef = doc(db, PLAYS_COLLECTION, play.id);
  const playData = {
    ...play,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(playRef, playData, { merge: true });
}

/**
 * Delete a play from Firestore.
 */
export async function deletePlayFromCloud(playId: string): Promise<void> {
  if (!playId) return;
  const playRef = doc(db, PLAYS_COLLECTION, playId);
  await deleteDoc(playRef);
}

/**
 * Upload initial set of plays to Cloud if missing or during initial sync.
 */
export async function syncLocalPlaysToCloud(plays: Play[]): Promise<void> {
  if (!plays.length) return;
  const batch = writeBatch(db);
  plays.forEach((play) => {
    if (play.id) {
      const playRef = doc(db, PLAYS_COLLECTION, play.id);
      batch.set(playRef, { ...play, updatedAt: new Date().toISOString() }, { merge: true });
    }
  });
  await batch.commit();
}
