<script lang="ts" generics="Data extends DocumentData">
  import type {
    CollectionReference,
    DocumentData,
    Firestore,
    Query,
  } from "firebase/firestore";
  import { collectionStore } from "$lib/stores/firestore.svelte.js";
  import { getFirebaseContext } from "$lib/stores/sdk.svelte.js";
  import type { Snippet } from "svelte";

  interface Props {
    ref: string | CollectionReference<Data> | Query<Data>;
    startWith?: Data[];
    children?: Snippet<
      [{ data: Data[]; ref: CollectionReference<Data> | Query<Data> | null; count: number; firestore?: Firestore }]
    >;
    loading?: Snippet;
  }

  let { ref, startWith, children, loading }: Props = $props();

  const { firestore } = getFirebaseContext();

  let store = collectionStore<Data>(firestore!, ref, startWith);
</script>

{#if store.current !== undefined}
  {#if children}
    {@render children({ data: store.current, ref: store.ref, count: store.current?.length ?? 0, firestore })}
  {/if}
{:else}
  {#if loading}
    {@render loading()}
  {/if}
{/if}
