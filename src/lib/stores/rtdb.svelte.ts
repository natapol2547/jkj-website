import { onValue, ref as dbRef, type DatabaseReference } from "firebase/database";
import type { Database } from "firebase/database";

interface NodeStore<T> {
  readonly current: T | null;
  readonly ref: DatabaseReference;
  destroy: () => void;
}

/**
 * Creates a reactive node store for Firebase Realtime Database using Svelte 5 runes
 * @param rtdb Firebase Realtime Database instance
 * @param path Path to the individual database node
 * @param startWith Optional default data
 * @returns An object with reactive `current` property containing node data
 */
export function nodeStore<T = any>(
  rtdb: Database,
  path: string,
  startWith?: T
): NodeStore<T> {
  let current = $state<T | null>(startWith ?? null);
  const dataRef = dbRef(rtdb, path);

  const unsubscribe = onValue(dataRef, (snapshot) => {
    current = snapshot.val() as T;
  });

  return {
    get current() {
      return current;
    },
    ref: dataRef,
    destroy() {
      unsubscribe();
    },
  };
}

interface NodeListStore<T> {
  readonly current: T[];
  readonly ref: DatabaseReference;
  destroy: () => void;
}

/**
 * Creates a reactive node list store for Firebase Realtime Database using Svelte 5 runes
 * @param rtdb Firebase Realtime Database instance
 * @param path Path to the list of nodes
 * @param startWith Optional default data
 * @returns An object with reactive `current` property containing list data
 */
export function nodeListStore<T = any>(
  rtdb: Database,
  path: string,
  startWith: T[] = []
): NodeListStore<T> {
  let current = $state<T[]>(startWith);
  const listRef = dbRef(rtdb, path);

  const unsubscribe = onValue(listRef, (snapshot) => {
    const dataArr: T[] = [];
    snapshot.forEach((childSnapshot) => {
      const childData = childSnapshot.val();
      dataArr.push({
        nodeKey: childSnapshot.ref.key,
        ...(typeof childData === "object" ? childData : {}),
      } as T);
    });
    current = dataArr;
  });

  return {
    get current() {
      return current;
    },
    ref: listRef,
    destroy() {
      unsubscribe();
    },
  };
}
