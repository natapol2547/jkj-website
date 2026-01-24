<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let message = $state<string>('');

	async function testGetData() {
		const response = await fetch('/py/protected');
		const data = await response.json();
		message = JSON.stringify(data);
	}
</script>

<button onclick={testGetData} class="btn btn-primary">Test GET Data</button>
<p>{message}</p>