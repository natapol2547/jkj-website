import { onAuthStateChanged, type Auth, type User } from "firebase/auth";

/**
 * Creates a reactive user store for Firebase Auth using Svelte 5 runes
 * @param auth Firebase auth instance
 * @param startWith Optional default data. Useful for server-side cookie-based auth
 * @returns An object with reactive `current` property containing the Firebase user
 */
export function userStore(auth: Auth, startWith: User | null = null) {
  let current = $state<User | null>(startWith);

  // Fallback for SSR
  if (!globalThis.window) {
    return {
      get current() {
        return current;
      },
    };
  }

  // Fallback for missing SDK
  if (!auth) {
    console.warn(
      "Firebase Auth is not initialized. Are you missing FirebaseApp as a parent component?"
    );
    return {
      get current() {
        return null;
      },
    };
  }

  // Set initial value from auth
  current = auth.currentUser;

  // Subscribe to auth state changes
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    current = user;
  });

  return {
    get current() {
      return current;
    },
    destroy() {
      unsubscribe();
    },
  };
}