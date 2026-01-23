import type { Firestore } from "firebase/firestore";
import type { Database } from "firebase/database";
import type { Auth } from "firebase/auth";
import { getContext, setContext } from "svelte";
import type { FirebaseStorage } from "firebase/storage";
import type { Analytics } from "firebase/analytics";

export interface FirebaseSDKContext {
  auth?: Auth;
  firestore?: Firestore;
  rtdb?: Database;
  storage?: FirebaseStorage;
  analytics?: Analytics | null;
}

// Internal context uses getters for reactivity
interface FirebaseSDKContextGetters {
  readonly auth?: Auth;
  readonly firestore?: Firestore;
  readonly rtdb?: Database;
  readonly storage?: FirebaseStorage;
  readonly analytics?: Analytics | null;
}

export const contextKey = "firebase";

export function setFirebaseContext(getters: {
  getAuth?: () => Auth | undefined;
  getFirestore?: () => Firestore | undefined;
  getRtdb?: () => Database | undefined;
  getStorage?: () => FirebaseStorage | undefined;
  getAnalytics?: () => Analytics | null | undefined;
}) {
  const context: FirebaseSDKContextGetters = {
    get auth() {
      return getters.getAuth?.();
    },
    get firestore() {
      return getters.getFirestore?.();
    },
    get rtdb() {
      return getters.getRtdb?.();
    },
    get storage() {
      return getters.getStorage?.();
    },
    get analytics() {
      return getters.getAnalytics?.();
    },
  };
  setContext(contextKey, context);
}

/**
 * Get the Firebase SDKs from Svelte context
 */
export function getFirebaseContext(): FirebaseSDKContext {
  return getContext(contextKey);
}
