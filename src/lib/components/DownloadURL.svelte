<script lang="ts">
  import { downloadUrlStore } from "$lib/stores/storage.svelte.js";
  import { getFirebaseContext } from "$lib/stores/sdk.svelte.js";
  import type { FirebaseStorage, StorageReference } from "firebase/storage";
  import type { Snippet } from "svelte";

  interface Props {
    ref: string | StorageReference;
    children?: Snippet<
      [{ link: string | null; ref: StorageReference | null; storage?: FirebaseStorage }]
    >;
    loading?: Snippet;
  }

  let { ref, children, loading }: Props = $props();

  const { storage } = getFirebaseContext();
  const store = downloadUrlStore(storage!, ref);
</script>

{#if store.current !== undefined}
  {#if children}
    {@render children({ link: store.current, ref: store.reference, storage })}
  {/if}
{:else}
  {#if loading}
    {@render loading()}
  {/if}
{/if}
