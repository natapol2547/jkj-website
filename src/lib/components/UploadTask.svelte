<script lang="ts">
  import { uploadTaskStore } from "$lib/stores/storage.svelte.js";
  import { getFirebaseContext } from "$lib/stores/sdk.svelte.js";
  import type {
    FirebaseStorage,
    StorageReference,
    UploadMetadata,
    UploadTaskSnapshot,
  } from "firebase/storage";
  import type { Snippet } from "svelte";

  interface Props {
    ref: string | StorageReference;
    data: Blob | Uint8Array | ArrayBuffer;
    metadata?: UploadMetadata;
    children?: Snippet<
      [{ snapshot: UploadTaskSnapshot | null; ref: StorageReference | null; progress: number; storage?: FirebaseStorage }]
    >;
  }

  let { ref, data, metadata, children }: Props = $props();

  const { storage } = getFirebaseContext();
  const upload = uploadTaskStore(storage!, ref, data, metadata);

  let progress = $derived(
    upload.current ? (upload.current.bytesTransferred / upload.current.totalBytes) * 100 : 0
  );
</script>

{#if upload.current !== undefined && children}
  {@render children({ snapshot: upload.current, ref: upload.reference, progress, storage })}
{/if}
