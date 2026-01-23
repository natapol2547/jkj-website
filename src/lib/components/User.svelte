<script lang="ts">
  import type { User } from "firebase/auth";
  import { userStore } from "$lib/stores/auth.svelte.js";
  import { getFirebaseContext } from "$lib/stores/sdk.svelte.js";
  import type { Snippet } from "svelte";

  interface Props {
    children?: Snippet<[{ user: User }]>;
    signedOut?: Snippet;
  }

  let { children, signedOut }: Props = $props();

  const auth = getFirebaseContext().auth!;
  const user = userStore(auth);
</script>

{#if user.current}
  {#if children}
    {@render children({ user: user.current })}
  {/if}
{:else}
  {#if signedOut}
    {@render signedOut()}
  {/if}
{/if}