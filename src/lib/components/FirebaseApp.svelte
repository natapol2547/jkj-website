<script lang="ts">
  import { setFirebaseContext } from "$lib/stores/sdk.svelte.js";
  import type { Auth } from "firebase/auth";
  import type { Firestore } from "firebase/firestore";
  import type { Database } from "firebase/database";
  import type { FirebaseStorage } from "firebase/storage";
  import type { Analytics } from "firebase/analytics";
  import type { Snippet } from "svelte";

  interface Props {
    firestore?: Firestore;
    rtdb?: Database;
    auth?: Auth;
    storage?: FirebaseStorage;
    analytics?: Analytics;
    children?: Snippet;
  }

  let { firestore, rtdb, auth, storage, analytics, children }: Props = $props();

  // Pass getters to capture reactive props correctly
  setFirebaseContext({
    getAuth: () => auth,
    getFirestore: () => firestore,
    getRtdb: () => rtdb,
    getStorage: () => storage,
    getAnalytics: () => analytics,
  });
</script>

{#if children}
  {@render children()}
{/if}
