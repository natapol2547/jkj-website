
<script lang="ts">
    import type { LayoutProps } from './$types';

    let { data, children }: LayoutProps = $props();
    import { user } from '$lib/firebase.svelte.js';
    import { goto } from '$app/navigation';

    // Redirect if already signed in
	$effect(() => {
		if (!user.current) {
			goto('/login');
		}
	});
</script>

{@render children()}