<script lang="ts">
  import { logEvent, setUserId, isSupported } from "firebase/analytics";
  import { getFirebaseContext } from "$lib/stores/sdk.svelte.js";
  import { onMount } from "svelte";

  interface Props {
    eventName?: string;
    setUser?: boolean;
    customParams?: Record<string, unknown>;
  }

  let { eventName = "page_view", setUser = true, customParams = {} }: Props = $props();

  const analytics = getFirebaseContext().analytics!;
  const auth = getFirebaseContext().auth!;

  onMount(async () => {
    if (!(await isSupported())) {
      return;
    }
    if (setUser) {
      setUserId(analytics, auth.currentUser?.uid ?? null);
    }
    logEvent(analytics, eventName, {
      page_location: window.location.href,
      page_path: window.location.pathname,
      page_title: document.title,
      ...customParams,
    });
  });
</script>
