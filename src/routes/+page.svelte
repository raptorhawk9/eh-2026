<script lang="ts">
	import Login from '$lib/Login.svelte';
	/** @type {import('./$types').PageProps} */
	let { data } = $props();
</script>

{#if !data.user}
	<div class="flex h-screen w-screen flex-col items-center justify-center bg-neutral-900">
		<Login />
	</div>
{:else}
	<div class="h-screen w-screen bg-neutral-900 text-white">Main Dashboard</div>
{/if}
