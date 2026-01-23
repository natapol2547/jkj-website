<script lang="ts">
  import { userStore } from "$lib/stores/auth.svelte.js";
  import { getFirebaseContext } from "$lib/stores/sdk.svelte.js";
  import { signOut, type User, type Auth } from "firebase/auth";
  import type { Snippet } from "svelte";

  interface Props {
    children?: Snippet<[{ user: User; auth: Auth; signOut: () => Promise<void> }]>;
  }

  let { children }: Props = $props();

  const auth = getFirebaseContext().auth!;
  const user = userStore(auth);
</script>

{#if user.current && children}
  {@render children({ user: user.current, auth, signOut: () => signOut(auth) })}
{/if}