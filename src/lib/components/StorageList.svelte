<script lang="ts">
  import { storageListStore } from "$lib/stores/storage.svelte.js";
  import { getFirebaseContext } from "$lib/stores/sdk.svelte.js";
  import type { FirebaseStorage, ListResult, StorageReference } from "firebase/storage";
  import type { Snippet } from "svelte";

  interface Props {
    ref: string | StorageReference;
    children?: Snippet<
      [{ list: ListResult; ref: StorageReference | null; storage?: FirebaseStorage }]
    >;
    loading?: Snippet;
  }

  let { ref, children, loading }: Props = $props();

  const { storage } = getFirebaseContext();
  const listStore = storageListStore(storage!, ref);
</script>

{#if listStore.current !== undefined}
  {#if children}
    {@render children({ list: listStore.current, ref: listStore.reference, storage })}
  {/if}
{:else}
  {#if loading}
    {@render loading()}
  {/if}
{/if}
