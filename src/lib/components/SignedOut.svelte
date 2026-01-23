<script lang="ts">
  import { getFirebaseContext } from "$lib/stores/sdk.svelte.js";
  import { userStore } from "$lib/stores/auth.svelte.js";
  import type { Auth } from "firebase/auth";
  import type { Snippet } from "svelte";

  interface Props {
    children?: Snippet<[{ auth: Auth }]>;
  }

  let { children }: Props = $props();

  const auth = getFirebaseContext().auth!;
  const user = userStore(auth);
</script>

{#if !user.current && children}
  {@render children({ auth })}
{/if}