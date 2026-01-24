<script lang="ts">
    import type { PageProps } from './$types.js';

    let { data }: PageProps = $props();

    let message = $state<string>('');

    async function testGetData() {
        const response = await fetch('/api/python');
        const data = await response.json();
        message = data.message;
    }
</script>

<button onclick={testGetData} class="btn btn-primary">Test GET Data</button>
<p>{message}</p>