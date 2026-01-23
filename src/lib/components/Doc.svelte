<script lang="ts" generics="Data extends DocumentData">
  import type {
    DocumentData,
    DocumentReference,
    Firestore,
  } from "firebase/firestore";
  import { docStore } from "$lib/stores/firestore.svelte.js";
  import { getFirebaseContext } from "$lib/stores/sdk.svelte.js";
  import type { Snippet } from "svelte";

  interface Props {
    ref: string | DocumentReference<Data>;
    startWith?: Data;
    children?: Snippet<
      [{ data: Data; ref: DocumentReference<Data> | null; firestore?: Firestore }]
    >;
    loading?: Snippet;
  }

  let { ref, startWith, children, loading }: Props = $props();

  const { firestore } = getFirebaseContext();

  let store = docStore(firestore!, ref, startWith);
</script>

{#if store.current !== undefined && store.current !== null}
  {#if children}
    {@render children({ data: store.current, ref: store.ref, firestore })}
  {/if}
{:else}
  {#if loading}
    {@render loading()}
  {/if}
{/if}
