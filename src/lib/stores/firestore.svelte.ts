import { doc, collection, onSnapshot } from "firebase/firestore";
import type {
  Query,
  CollectionReference,
  DocumentReference,
  Firestore,
} from "firebase/firestore";

interface DocStore<T> {
  readonly current: T | null;
  readonly ref: DocumentReference<T> | null;
  readonly id: string;
  destroy: () => void;
}

/**
 * Creates a reactive document store for Firestore using Svelte 5 runes
 * @param firestore Firebase Firestore instance
 * @param ref Document path or reference
 * @param startWith Optional default data
 * @returns An object with reactive `current` property containing document data
 */
export function docStore<T = any>(
  firestore: Firestore,
  ref: string | DocumentReference<T>,
  startWith?: T
): DocStore<T> {
  let current = $state<T | null>(startWith ?? null);
  let unsubscribe: () => void = () => {};

  // Fallback for SSR
  if (!globalThis.window) {
    return {
      get current() {
        return current;
      },
      ref: null,
      id: "",
      destroy() {},
    };
  }

  // Fallback for missing SDK
  if (!firestore) {
    console.warn(
      "Firestore is not initialized. Are you missing FirebaseApp as a parent component?"
    );
    return {
      get current() {
        return null;
      },
      ref: null,
      id: "",
      destroy() {},
    };
  }

  const docRef =
    typeof ref === "string"
      ? (doc(firestore, ref) as DocumentReference<T>)
      : ref;

  unsubscribe = onSnapshot(docRef, (snapshot) => {
    current = (snapshot.data() as T) ?? null;
  });

  return {
    get current() {
      return current;
    },
    ref: docRef,
    id: docRef.id,
    destroy() {
      unsubscribe();
    },
  };
}

interface CollectionStore<T> {
  readonly current: T[];
  readonly ref: CollectionReference<T> | Query<T> | null;
  destroy: () => void;
}

/**
 * Creates a reactive collection store for Firestore using Svelte 5 runes
 * @param firestore Firebase Firestore instance
 * @param ref Collection path, reference, or query
 * @param startWith Optional default data
 * @returns An object with reactive `current` property containing collection data
 */
export function collectionStore<T>(
  firestore: Firestore,
  ref: string | Query<T> | CollectionReference<T>,
  startWith: T[] = []
): CollectionStore<T> {
  let current = $state<T[]>(startWith);
  let unsubscribe: () => void = () => {};

  // Fallback for SSR
  if (!globalThis.window) {
    return {
      get current() {
        return current;
      },
      ref: null,
      destroy() {},
    };
  }

  // Fallback for missing SDK
  if (!firestore) {
    console.warn(
      "Firestore is not initialized. Are you missing FirebaseApp as a parent component?"
    );
    return {
      get current() {
        return [];
      },
      ref: null,
      destroy() {},
    };
  }

  const colRef =
    typeof ref === "string"
      ? (collection(firestore, ref) as CollectionReference<T>)
      : ref;

  unsubscribe = onSnapshot(colRef, (snapshot) => {
    current = snapshot.docs.map((s) => {
      return { id: s.id, ref: s.ref, ...s.data() } as T;
    });
  });

  return {
    get current() {
      return current;
    },
    ref: colRef as CollectionReference<T> | Query<T>,
    destroy() {
      unsubscribe();
    },
  };
}
