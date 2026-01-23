<script lang="ts">
  import { nodeStore } from "$lib/stores/rtdb.svelte.js";
  import { getFirebaseContext } from "$lib/stores/sdk.svelte.js";
  import type { DatabaseReference, Database } from "firebase/database";
  import type { Snippet } from "svelte";

  interface Props {
    path: string;
    startWith?: any;
    children?: Snippet<[{ data: any; ref: DatabaseReference; rtdb?: Database }]>;
    loading?: Snippet;
  }

  let { path, startWith, children, loading }: Props = $props();

  const { rtdb } = getFirebaseContext();
  let store = nodeStore(rtdb!, path, startWith);
</script>

{#if store.current !== undefined}
  {#if children}
    {@render children({ data: store.current, ref: store.ref, rtdb })}
  {/if}
{:else}
  {#if loading}
    {@render loading()}
  {/if}
{/if}
