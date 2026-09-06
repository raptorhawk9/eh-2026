<script lang="ts">
	import Login from '$lib/Login.svelte';
	import SosButton from '$lib/SosButton.svelte';
	/** @type {import('./$types').PageProps} */
	let { data } = $props();
</script>

{#if !data.user}
	<div class="flex h-screen w-screen flex-col items-center justify-center">
		<Login />
	</div>
{:else}
	<div class="h-screen w-screen text-white">
		<SosButton />
		<p class="wrap-break-word">stuff</p>
	</div>
{/if}
