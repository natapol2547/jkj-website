import {
  getDownloadURL,
  list,
  ref,
  uploadBytesResumable,
} from "firebase/storage";

import type {
  StorageReference,
  FirebaseStorage,
  ListResult,
  UploadTaskSnapshot,
  UploadMetadata,
} from "firebase/storage";

const defaultListResult: ListResult = {
  prefixes: [],
  items: [],
};

interface StorageListStore {
  readonly current: ListResult;
  readonly reference: StorageReference | null;
}

/**
 * Creates a reactive storage list store using Svelte 5 runes
 * @param storage Firebase Storage instance
 * @param reference File or storage item path or reference
 * @param startWith Optional default data
 * @returns An object with reactive `current` property containing list result
 */
export function storageListStore(
  storage: FirebaseStorage,
  reference: string | StorageReference,
  startWith: ListResult = defaultListResult
): StorageListStore {
  let current = $state<ListResult>(startWith);

  // Fallback for SSR
  if (!globalThis.window) {
    return {
      get current() {
        return current;
      },
      reference: null,
    };
  }

  // Fallback for missing SDK
  if (!storage) {
    console.warn(
      "Cloud Storage is not initialized. Are you missing FirebaseApp as a parent component?"
    );
    return {
      get current() {
        return defaultListResult;
      },
      reference: null,
    };
  }

  const storageRef =
    typeof reference === "string" ? ref(storage, reference) : reference;

  list(storageRef).then((snapshot) => {
    current = snapshot;
  });

  return {
    get current() {
      return current;
    },
    reference: storageRef,
  };
}

interface DownloadUrlStore {
  readonly current: string | null;
  readonly reference: StorageReference | null;
}

/**
 * Creates a reactive download URL store using Svelte 5 runes
 * @param storage Firebase Storage instance
 * @param reference File or storage item path or reference
 * @param startWith Optional default data
 * @returns An object with reactive `current` property containing download URL
 */
export function downloadUrlStore(
  storage: FirebaseStorage,
  reference: string | StorageReference,
  startWith: string | null = null
): DownloadUrlStore {
  let current = $state<string | null>(startWith);

  // Fallback for SSR
  if (!globalThis.window) {
    return {
      get current() {
        return current;
      },
      reference: null,
    };
  }

  // Fallback for missing SDK
  if (!storage) {
    console.warn(
      "Cloud Storage is not initialized. Are you missing FirebaseApp as a parent component?"
    );
    return {
      get current() {
        return null;
      },
      reference: null,
    };
  }

  const storageRef =
    typeof reference === "string" ? ref(storage, reference) : reference;

  getDownloadURL(storageRef).then((url) => {
    current = url;
  });

  return {
    get current() {
      return current;
    },
    reference: storageRef,
  };
}

interface UploadTaskStore {
  readonly current: UploadTaskSnapshot | null;
  readonly reference: StorageReference | null;
  destroy: () => void;
}

/**
 * Creates a reactive upload task store using Svelte 5 runes
 * @param storage Firebase Storage instance
 * @param reference File or storage item path or reference
 * @param data Data to upload
 * @param metadata Optional upload metadata
 * @returns An object with reactive `current` property containing upload snapshot
 */
export function uploadTaskStore(
  storage: FirebaseStorage,
  reference: string | StorageReference,
  data: Blob | Uint8Array | ArrayBuffer,
  metadata?: UploadMetadata | undefined
): UploadTaskStore {
  let current = $state<UploadTaskSnapshot | null>(null);
  let unsubscribe: () => void = () => {};

  // Fallback for SSR
  if (!globalThis.window) {
    return {
      get current() {
        return current;
      },
      reference: null,
      destroy() {},
    };
  }

  // Fallback for missing SDK
  if (!storage) {
    console.warn(
      "Cloud Storage is not initialized. Are you missing FirebaseApp as a parent component?"
    );
    return {
      get current() {
        return null;
      },
      reference: null,
      destroy() {},
    };
  }

  const storageRef =
    typeof reference === "string" ? ref(storage, reference) : reference;

  const task = uploadBytesResumable(storageRef, data, metadata);
  unsubscribe = task.on(
    "state_changed",
    (snapshot) => {
      current = snapshot;
    },
    (error) => {
      console.error(error);
      current = task.snapshot;
    },
    () => {
      current = task.snapshot;
    }
  );

  return {
    get current() {
      return current;
    },
    reference: storageRef,
    destroy() {
      unsubscribe();
    },
  };
}
