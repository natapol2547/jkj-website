<script lang="ts">
	import './layout.css';

    import FirebaseApp from "$lib/components/FirebaseApp.svelte";
    import { auth, firestore, storage, analytics } from "$lib/firebase.svelte.js";

	const { children } = $props();
</script>

<FirebaseApp {auth} {firestore} {storage} {analytics}>
    {@render children()}
</FirebaseApp>
